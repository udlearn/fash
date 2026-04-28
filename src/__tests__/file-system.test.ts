import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import * as path from 'path';
import { FileSystemUtils } from '../utils/file-system';

describe('FileSystemUtils', () => {
  const testDir = path.join(__dirname, 'test-fs');

  beforeEach(async () => {
    await fs.ensureDir(testDir);
    await fs.ensureDir(path.join(testDir, 'src'));
    await fs.ensureDir(path.join(testDir, 'src', 'utils'));
    await fs.ensureDir(path.join(testDir, '.fash'));
    await fs.writeFile(path.join(testDir, 'index.ts'), 'export {};');
    await fs.writeFile(path.join(testDir, 'src', 'app.ts'), 'const x = 1;');
    await fs.writeFile(path.join(testDir, 'src', 'utils', 'helper.ts'), 'function h() {}');
    await fs.writeFile(path.join(testDir, '.fash', 'config.json'), '{}');
  });

  afterEach(async () => {
    await fs.remove(testDir);
  });

  describe('getFilesRecursively', () => {
    it('should return all files excluding .fash', async () => {
      const files = await FileSystemUtils.getFilesRecursively(testDir);

      expect(files).toHaveLength(3);
      expect(files.some((f) => f.includes('.fash'))).toBe(false);
    });

    it('should respect exclude patterns', async () => {
      const files = await FileSystemUtils.getFilesRecursively(testDir, ['helper']);
      expect(files).toHaveLength(2);
      expect(files.some((f) => f.includes('helper'))).toBe(false);
    });
  });

  describe('getDirectoriesRecursively', () => {
    it('should return all directories excluding .fash', async () => {
      const dirs = await FileSystemUtils.getDirectoriesRecursively(testDir);

      expect(dirs).toHaveLength(2); // src, src/utils
      expect(dirs.some((d) => d.includes('.fash'))).toBe(false);
    });

    it('should respect exclude patterns', async () => {
      const dirs = await FileSystemUtils.getDirectoriesRecursively(testDir, ['utils']);
      expect(dirs).toHaveLength(1);
      expect(dirs.some((d) => d.includes('utils'))).toBe(false);
    });
  });

  describe('renameFile', () => {
    it('should rename a file', async () => {
      const original = path.join(testDir, 'index.ts');
      const renamed = path.join(testDir, 'main.ts');

      await FileSystemUtils.renameFile(original, renamed);

      expect(await fs.pathExists(original)).toBe(false);
      expect(await fs.pathExists(renamed)).toBe(true);
      expect(await fs.readFile(renamed, 'utf8')).toBe('export {};');
    });
  });

  describe('pathExists', () => {
    it('should return true for existing paths', async () => {
      expect(await FileSystemUtils.pathExists(testDir)).toBe(true);
    });

    it('should return false for non-existing paths', async () => {
      expect(await FileSystemUtils.pathExists(path.join(testDir, 'nope'))).toBe(false);
    });
  });

  describe('isDirectory', () => {
    it('should return true for directories', async () => {
      expect(await FileSystemUtils.isDirectory(path.join(testDir, 'src'))).toBe(true);
    });

    it('should return false for files', async () => {
      expect(await FileSystemUtils.isDirectory(path.join(testDir, 'index.ts'))).toBe(false);
    });

    it('should return false for non-existing paths', async () => {
      expect(await FileSystemUtils.isDirectory(path.join(testDir, 'nope'))).toBe(false);
    });
  });
});
