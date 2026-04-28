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

  async createMapping(projectRoot: string, includePatterns?: string[]): Promise<FashMap> {
    const config = await this.configManager.loadConfig();
    const mappings: FileMapping[] = [];

    let files = await FileSystemUtils.getFilesRecursively(projectRoot, config.exclude || []);
    let directories = await FileSystemUtils.getDirectoriesRecursively(projectRoot, config.exclude || []);

    if (includePatterns && includePatterns.length > 0) {
      const matchesInclude = (filePath: string): boolean => {
        return includePatterns.some((pattern) => {
          const regex = new RegExp(pattern.replace(/\*/g, '.*'));
          return regex.test(filePath) || regex.test(path.basename(filePath));
        });
      };
      files = files.filter(matchesInclude);
      directories = directories.filter(matchesInclude);
    }

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
    const completed: Array<{ from: string; to: string }> = [];

    // Directories first, shallow to deep
    const directoryMappings = workingMappings
      .filter((m) => m.isDirectory)
      .sort((a, b) => a.originalPath.split(path.sep).length - b.originalPath.split(path.sep).length);

    try {
      for (const mapping of directoryMappings) {
        await FileSystemUtils.renameFile(mapping.originalPath, mapping.hashedPath);
        completed.push({ from: mapping.originalPath, to: mapping.hashedPath });
        console.log(`Renamed: ${mapping.originalPath} -> ${mapping.hashedPath}`);

        const prefix = mapping.originalPath + path.sep;
        for (const other of workingMappings) {
          if (other.originalPath.startsWith(prefix)) {
            other.originalPath = path.join(mapping.hashedPath, path.relative(mapping.originalPath, other.originalPath));
          }
        }
      }

      const fileMappings = workingMappings.filter((m) => !m.isDirectory);
      for (const mapping of fileMappings) {
        await FileSystemUtils.renameFile(mapping.originalPath, mapping.hashedPath);
        completed.push({ from: mapping.originalPath, to: mapping.hashedPath });
        console.log(`Renamed: ${mapping.originalPath} -> ${mapping.hashedPath}`);
      }
    } catch (err) {
      console.error(`Rename failed, rolling back ${completed.length} completed rename(s)...`);
      await this.rollback(completed);
      throw new Error(`Commit aborted and rolled back: ${err}`);
    }
  }

  async restoreMappings(fashMap: FashMap): Promise<void> {
    const sortedMappings = [...fashMap.mappings].sort((a, b) => {
      const aDepth = a.hashedPath.split(path.sep).length;
      const bDepth = b.hashedPath.split(path.sep).length;
      if (aDepth !== bDepth) return bDepth - aDepth;
      return a.isDirectory ? 1 : -1;
    });

    const completed: Array<{ from: string; to: string }> = [];

    try {
      for (const mapping of sortedMappings) {
        if (!(await fs.pathExists(mapping.hashedPath))) {
          console.log(`Skipped: ${mapping.hashedPath} (not found - may already be restored)`);
          continue;
        }

        const currentDir = path.dirname(mapping.hashedPath);
        const originalName = path.basename(mapping.originalPath);
        const targetPath = path.join(currentDir, originalName);

        await FileSystemUtils.renameFile(mapping.hashedPath, targetPath);
        completed.push({ from: mapping.hashedPath, to: targetPath });
        console.log(`Restored: ${mapping.hashedPath} -> ${targetPath}`);

        if (mapping.isDirectory) {
          for (const otherMapping of sortedMappings) {
            if (otherMapping.hashedPath.startsWith(mapping.hashedPath + path.sep)) {
              const relativePath = path.relative(mapping.hashedPath, otherMapping.hashedPath);
              otherMapping.hashedPath = path.join(targetPath, relativePath);
            }
          }
        }
      }
    } catch (err) {
      console.error(`Restore failed, rolling back ${completed.length} completed rename(s)...`);
      await this.rollback(completed);
      throw new Error(`Undo aborted and rolled back: ${err}`);
    }
  }

  private async rollback(completed: Array<{ from: string; to: string }>): Promise<void> {
    for (const { from, to } of completed.reverse()) {
      try {
        await FileSystemUtils.renameFile(to, from);
        console.log(`Rolled back: ${to} -> ${from}`);
      } catch (rollbackErr) {
        console.error(`Rollback failed for ${to} -> ${from}:`, rollbackErr);
      }
    }
  }

  async mapExists(): Promise<boolean> {
    return fs.pathExists(this.mapPath);
  }
}
