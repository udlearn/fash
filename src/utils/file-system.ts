import fs from 'fs-extra';
import * as path from 'path';
import type { FileMapping } from '../types/index.js';

export class FileSystemUtils {
  static async getFilesRecursively(dirPath: string, excludePatterns: string[] = []): Promise<string[]> {
    const allFiles: string[] = [];

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);

        // Skip .fash directory
        if (entry.name === '.fash') {
          continue;
        }

        // Check if path matches any exclude pattern
        const shouldExclude = excludePatterns.some((pattern) => {
          const regex = new RegExp(pattern.replace(/\*/g, '.*'));
          return regex.test(fullPath) || regex.test(entry.name);
        });

        if (shouldExclude) {
          continue;
        }

        if (entry.isDirectory()) {
          const subFiles = await this.getFilesRecursively(fullPath, excludePatterns);
          allFiles.push(...subFiles);
        } else {
          allFiles.push(fullPath);
        }
      }
    } catch (err) {
      console.error(`Error reading directory ${dirPath}:`, err);
    }

    return allFiles;
  }

  static async getDirectoriesRecursively(dirPath: string, excludePatterns: string[] = []): Promise<string[]> {
    const allDirs: string[] = [];

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);

        // Skip .fash directory
        if (entry.name === '.fash') {
          continue;
        }

        // Check if path matches any exclude pattern
        const shouldExclude = excludePatterns.some((pattern) => {
          const regex = new RegExp(pattern.replace(/\*/g, '.*'));
          return regex.test(fullPath) || regex.test(entry.name);
        });

        if (shouldExclude) {
          continue;
        }

        if (entry.isDirectory()) {
          allDirs.push(fullPath);
          const subDirs = await this.getDirectoriesRecursively(fullPath, excludePatterns);
          allDirs.push(...subDirs);
        }
      }
    } catch (err) {
      console.error(`Error reading directory ${dirPath}:`, err);
    }

    return allDirs;
  }

  static async createMappingFromPath(
    originalPath: string,
    hashedPath: string,
    isDirectory: boolean,
    hash: string
  ): Promise<FileMapping> {
    const stats = await fs.stat(originalPath);
    return {
      originalPath,
      hashedPath,
      isDirectory,
      hash,
      timestamp: stats.mtime.getTime(),
    };
  }

  static async renameFile(originalPath: string, newPath: string): Promise<void> {
    await fs.rename(originalPath, newPath);
  }

  static async ensureDirectoryExists(dirPath: string): Promise<void> {
    await fs.ensureDir(dirPath);
  }

  static async pathExists(filePath: string): Promise<boolean> {
    return fs.pathExists(filePath);
  }

  static async isDirectory(filePath: string): Promise<boolean> {
    try {
      const stats = await fs.stat(filePath);
      return stats.isDirectory();
    } catch {
      return false;
    }
  }
}
