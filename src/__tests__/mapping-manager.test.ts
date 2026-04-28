import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import * as path from 'path';
import { ConfigManager } from '../core/config-manager';
import { MappingManager } from '../core/mapping-manager';

describe('MappingManager', () => {
  const testDir = path.join(__dirname, 'test-mapping');
  let configManager: ConfigManager;
  let mappingManager: MappingManager;

  beforeEach(async () => {
    await fs.ensureDir(testDir);
    await fs.ensureDir(path.join(testDir, 'docs'));
    await fs.ensureDir(path.join(testDir, 'docs', 'api'));
    await fs.writeFile(path.join(testDir, 'readme.md'), 'hello');
    await fs.writeFile(path.join(testDir, 'docs', 'guide.md'), 'guide content');
    await fs.writeFile(path.join(testDir, 'docs', 'api', 'ref.md'), 'reference');

    configManager = new ConfigManager(testDir);
    await configManager.initialize();
    mappingManager = new MappingManager(testDir, configManager);
  });

  afterEach(async () => {
    await fs.remove(testDir);
  });

  describe('createMapping', () => {
    it('should create mappings for all files and directories', async () => {
      const fashMap = await mappingManager.createMapping(testDir);

      expect(fashMap.mappings.length).toBe(5); // 2 dirs + 3 files
      expect(fashMap.version).toBe('1.0.0');
      expect(fashMap.config.algorithm).toBe('sha256');
    });

    it('should filter with include patterns', async () => {
      const fashMap = await mappingManager.createMapping(testDir, ['*.md']);

      const files = fashMap.mappings.filter((m) => !m.isDirectory);
      expect(files.length).toBeGreaterThan(0);
      for (const f of files) {
        expect(f.originalPath).toMatch(/\.md$/);
      }
    });

    it('should return empty mappings when include matches nothing', async () => {
      const fashMap = await mappingManager.createMapping(testDir, ['*.xyz']);
      expect(fashMap.mappings).toHaveLength(0);
    });
  });

  describe('saveEncryptedMap / loadEncryptedMap', () => {
    it('should round-trip through encryption', async () => {
      const fashMap = await mappingManager.createMapping(testDir);
      await mappingManager.saveEncryptedMap(fashMap, 'my-secret');

      const loaded = await mappingManager.loadEncryptedMap('my-secret');
      expect(loaded.mappings.length).toBe(fashMap.mappings.length);
      expect(loaded.version).toBe(fashMap.version);
    });

    it('should fail decryption with wrong secret', async () => {
      const fashMap = await mappingManager.createMapping(testDir);
      await mappingManager.saveEncryptedMap(fashMap, 'correct');

      await expect(mappingManager.loadEncryptedMap('wrong')).rejects.toThrow();
    });
  });

  describe('applyMappings + restoreMappings (rollback)', () => {
    it('should rename files and restore them', async () => {
      const fashMap = await mappingManager.createMapping(testDir);
      await mappingManager.saveEncryptedMap(fashMap, 'secret');
      await mappingManager.applyMappings(fashMap);

      expect(await fs.pathExists(path.join(testDir, 'readme.md'))).toBe(false);

      const loaded = await mappingManager.loadEncryptedMap('secret');
      await mappingManager.restoreMappings(loaded);

      expect(await fs.pathExists(path.join(testDir, 'readme.md'))).toBe(true);
      expect(await fs.readFile(path.join(testDir, 'readme.md'), 'utf8')).toBe('hello');
    });
  });

  describe('rekey workflow', () => {
    it('should allow decryption with new secret after rekey', async () => {
      const fashMap = await mappingManager.createMapping(testDir);
      await mappingManager.saveEncryptedMap(fashMap, 'old-secret');

      const loaded = await mappingManager.loadEncryptedMap('old-secret');
      await mappingManager.saveEncryptedMap(loaded, 'new-secret');

      const reloaded = await mappingManager.loadEncryptedMap('new-secret');
      expect(reloaded.mappings.length).toBe(fashMap.mappings.length);

      await expect(mappingManager.loadEncryptedMap('old-secret')).rejects.toThrow();
    });
  });

  describe('mapExists', () => {
    it('should return false when no map exists', async () => {
      expect(await mappingManager.mapExists()).toBe(false);
    });

    it('should return true after saving a map', async () => {
      const fashMap = await mappingManager.createMapping(testDir);
      await mappingManager.saveEncryptedMap(fashMap, 'secret');
      expect(await mappingManager.mapExists()).toBe(true);
    });
  });
});
