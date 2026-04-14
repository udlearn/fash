import fs from 'fs-extra';
import * as path from 'path';
import { CryptoUtils } from '../utils/crypto.js';
import { FileSystemUtils } from '../utils/file-system.js';
import type { FashMap, FileMapping } from '../types/index.js';
import type { ConfigManager } from './config-manager.js';

export class MappingManager {
  private mapPath: string;
  private configManager: ConfigManager;

  constructor(projectRoot: string, configManager: ConfigManager) {
    this.mapPath = path.join(projectRoot, '.fash', 'map.encrypted');
    this.configManager = configManager;
  }

  async createMapping(projectRoot: string): Promise<FashMap> {
    const config = await this.configManager.loadConfig();
    const mappings: FileMapping[] = [];

    // Get all files and directories
    const files = await FileSystemUtils.getFilesRecursively(projectRoot, config.exclude || []);
    const directories = await FileSystemUtils.getDirectoriesRecursively(projectRoot, config.exclude || []);

    // Maps original directory path -> fully resolved hashed path
    const directoryRenames = new Map<string, string>();

    // Process directories in pre-order (parent before children) so ancestor
    // hashed paths are available when computing nested directory paths.
    for (const dirPath of directories) {
      const dirName = path.basename(dirPath);
      const hashedName = CryptoUtils.generateHashName(dirName, config.algorithm);

      let parentDir = path.dirname(dirPath);
      if (directoryRenames.has(parentDir)) {
        parentDir = directoryRenames.get(parentDir)!;
      }
      const hashedPath = path.join(parentDir, hashedName);

      const mapping = await FileSystemUtils.createMappingFromPath(dirPath, hashedPath, true, hashedName);
      mappings.push(mapping);

      directoryRenames.set(dirPath, hashedPath);
    }

    // Process files -- resolve parent through directoryRenames so the hashed
    // path accounts for the full chain of ancestor renames.
    for (const filePath of files) {
      const fileName = path.basename(filePath);
      const hashedName = CryptoUtils.generateHashName(fileName, config.algorithm);

      const parentDir = path.dirname(filePath);
      const resolvedParent = directoryRenames.get(parentDir) ?? parentDir;
      const hashedPath = path.join(resolvedParent, hashedName);

      const mapping = await FileSystemUtils.createMappingFromPath(filePath, hashedPath, false, hashedName);
      mappings.push(mapping);
    }

    const fashMap: FashMap = {
      version: '1.0.0',
      created: Date.now(),
      mappings,
      config,
    };

    return fashMap;
  }

  async saveEncryptedMap(fashMap: FashMap, secret?: string): Promise<void> {
    try {
      const key = await this.configManager.getSecretKey(secret);
      const mapJson = JSON.stringify(fashMap, null, 2);
      const encryptedMap = await CryptoUtils.encrypt(mapJson, key);
      await fs.writeFile(this.mapPath, encryptedMap);
    } catch (err) {
      throw new Error(`Failed to save encrypted map: ${err}`);
    }
  }

  async loadEncryptedMap(secret?: string): Promise<FashMap> {
    try {
      const key = await this.configManager.getSecretKey(secret);
      const encryptedData = await fs.readFile(this.mapPath, 'utf8');
      const decryptedData = await CryptoUtils.decrypt(encryptedData, key);
      return JSON.parse(decryptedData) as FashMap;
    } catch (err) {
      throw new Error(`Failed to load encrypted map: ${err}`);
    }
  }

  async applyMappings(fashMap: FashMap): Promise<void> {
    const workingMappings = fashMap.mappings.map((m) => ({ ...m }));

    // Directories first, shallow to deep
    const directoryMappings = workingMappings
      .filter((m) => m.isDirectory)
      .sort((a, b) => a.originalPath.split(path.sep).length - b.originalPath.split(path.sep).length);

    for (const mapping of directoryMappings) {
      try {
        await FileSystemUtils.renameFile(mapping.originalPath, mapping.hashedPath);
        console.log(`Renamed: ${mapping.originalPath} -> ${mapping.hashedPath}`);

        // After renaming a directory, update originalPath of nested items so
        // they reference the new on-disk location for subsequent renames.
        const prefix = mapping.originalPath + path.sep;
        for (const other of workingMappings) {
          if (other.originalPath.startsWith(prefix)) {
            other.originalPath = path.join(mapping.hashedPath, path.relative(mapping.originalPath, other.originalPath));
          }
        }
      } catch (err) {
        console.error(`Failed to rename ${mapping.originalPath}:`, err);
      }
    }

    const fileMappings = workingMappings.filter((m) => !m.isDirectory);
    for (const mapping of fileMappings) {
      try {
        await FileSystemUtils.renameFile(mapping.originalPath, mapping.hashedPath);
        console.log(`Renamed: ${mapping.originalPath} -> ${mapping.hashedPath}`);
      } catch (err) {
        console.error(`Failed to rename ${mapping.originalPath}:`, err);
      }
    }
  }

  async restoreMappings(fashMap: FashMap): Promise<void> {
    // Sort all mappings by depth (deepest first) so we restore from bottom up
    const sortedMappings = [...fashMap.mappings].sort((a, b) => {
      const aDepth = a.hashedPath.split(path.sep).length;
      const bDepth = b.hashedPath.split(path.sep).length;
      // Deepest first, and files before directories at same depth
      if (aDepth !== bDepth) return bDepth - aDepth;
      return a.isDirectory ? 1 : -1;
    });

    // Process each mapping in order
    for (const mapping of sortedMappings) {
      try {
        if (await fs.pathExists(mapping.hashedPath)) {
          // Restore to original name within the current parent directory
          const currentDir = path.dirname(mapping.hashedPath);
          const originalName = path.basename(mapping.originalPath);
          const targetPath = path.join(currentDir, originalName);

          await FileSystemUtils.renameFile(mapping.hashedPath, targetPath);
          console.log(`Restored: ${mapping.hashedPath} -> ${targetPath}`);

          // Update all subsequent mappings that are inside this directory
          if (mapping.isDirectory) {
            for (const otherMapping of sortedMappings) {
              if (otherMapping.hashedPath.startsWith(mapping.hashedPath + path.sep)) {
                const relativePath = path.relative(mapping.hashedPath, otherMapping.hashedPath);
                otherMapping.hashedPath = path.join(targetPath, relativePath);
              }
            }
          }
        } else {
          console.log(`Skipped: ${mapping.hashedPath} (not found - may already be restored)`);
        }
      } catch (err) {
        console.error(`Failed to restore ${mapping.hashedPath}:`, err);
      }
    }
  }

  async mapExists(): Promise<boolean> {
    return fs.pathExists(this.mapPath);
  }
}
