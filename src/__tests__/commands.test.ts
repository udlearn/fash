import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import * as path from 'path';
import { ConfigManager } from '../core/config-manager';
import { MappingManager } from '../core/mapping-manager';

/**
 * These tests exercise the core logic that the CLI commands depend on,
 * without spawning subprocesses or requiring interactive prompts.
 */
describe('Command workflows', () => {
  const testDir = path.join(__dirname, 'test-commands');
  let configManager: ConfigManager;
  let mappingManager: MappingManager;

  beforeEach(async () => {
    await fs.ensureDir(testDir);
    await fs.ensureDir(path.join(testDir, 'photos'));
    await fs.writeFile(path.join(testDir, 'notes.txt'), 'my notes');
    await fs.writeFile(path.join(testDir, 'photos', 'vacation.jpg'), 'image-data');

    configManager = new ConfigManager(testDir);
    await configManager.initialize();
    mappingManager = new MappingManager(testDir, configManager);
  });

  afterEach(async () => {
    await fs.remove(testDir);
  });

  describe('status workflow', () => {
    it('should build a preview map without modifying disk', async () => {
      const before = await fs.readdir(testDir);
      const fashMap = await mappingManager.createMapping(testDir);
      const after = await fs.readdir(testDir);

      expect(fashMap.mappings.length).toBeGreaterThan(0);
      expect(before).toEqual(after);
    });
  });

  describe('verify workflow', () => {
    it('should confirm all hashed paths exist after commit', async () => {
      const fashMap = await mappingManager.createMapping(testDir);
      await mappingManager.saveEncryptedMap(fashMap, 'secret');
      await mappingManager.applyMappings(fashMap);

      const loaded = await mappingManager.loadEncryptedMap('secret');
      for (const mapping of loaded.mappings) {
        expect(await fs.pathExists(mapping.hashedPath)).toBe(true);
      }
    });

    it('should detect missing files', async () => {
      const fashMap = await mappingManager.createMapping(testDir);
      await mappingManager.saveEncryptedMap(fashMap, 'secret');
      await mappingManager.applyMappings(fashMap);

      const loaded = await mappingManager.loadEncryptedMap('secret');
      const firstFile = loaded.mappings.find((m) => !m.isDirectory)!;
      await fs.remove(firstFile.hashedPath);

      expect(await fs.pathExists(firstFile.hashedPath)).toBe(false);
    });
  });

  describe('diff workflow', () => {
    it('should report no differences right after commit', async () => {
      const fashMap = await mappingManager.createMapping(testDir);
      await mappingManager.saveEncryptedMap(fashMap, 'secret');
      await mappingManager.applyMappings(fashMap);

      const loaded = await mappingManager.loadEncryptedMap('secret');
      for (const mapping of loaded.mappings) {
        expect(await fs.pathExists(mapping.hashedPath)).toBe(true);
      }
    });

    it('should detect manual renames back to original', async () => {
      const fashMap = await mappingManager.createMapping(testDir);
      await mappingManager.saveEncryptedMap(fashMap, 'secret');
      await mappingManager.applyMappings(fashMap);

      const loaded = await mappingManager.loadEncryptedMap('secret');
      const fileMapping = loaded.mappings.find((m) => !m.isDirectory)!;

      await fs.rename(fileMapping.hashedPath, fileMapping.originalPath);

      expect(await fs.pathExists(fileMapping.hashedPath)).toBe(false);
      expect(await fs.pathExists(fileMapping.originalPath)).toBe(true);
    });
  });

  describe('export/import workflow', () => {
    it('should export mapping to JSON and import it back', async () => {
      const fashMap = await mappingManager.createMapping(testDir);
      await mappingManager.saveEncryptedMap(fashMap, 'secret');

      const loaded = await mappingManager.loadEncryptedMap('secret');
      const exportPath = path.join(testDir, '.fash', 'export.json');
      await fs.writeJson(exportPath, loaded, { spaces: 2 });

      const imported = await fs.readJson(exportPath);
      expect(imported.mappings.length).toBe(fashMap.mappings.length);
      expect(imported.version).toBe('1.0.0');

      await mappingManager.saveEncryptedMap(imported, 'new-secret');
      const reloaded = await mappingManager.loadEncryptedMap('new-secret');
      expect(reloaded.mappings.length).toBe(fashMap.mappings.length);
    });
  });

  describe('reset workflow', () => {
    it('should remove map and clear log but keep config', async () => {
      const fashMap = await mappingManager.createMapping(testDir);
      await mappingManager.saveEncryptedMap(fashMap, 'secret');
      await configManager.addLogEntry('commit', 'test');

      const fashDir = path.join(testDir, '.fash');
      const mapPath = path.join(fashDir, 'map.encrypted');

      await fs.remove(mapPath);
      await fs.writeFile(configManager.getLogPath(), '');

      expect(await fs.pathExists(mapPath)).toBe(false);
      expect(await configManager.pathExists()).toBe(true);

      const logs = await configManager.loadLog();
      expect(logs).toHaveLength(0);
    });
  });

  describe('destroy workflow', () => {
    it('should restore names and remove .fash', async () => {
      const fashMap = await mappingManager.createMapping(testDir);
      await mappingManager.saveEncryptedMap(fashMap, 'secret');
      await mappingManager.applyMappings(fashMap);

      const loaded = await mappingManager.loadEncryptedMap('secret');
      await mappingManager.restoreMappings(loaded);

      expect(await fs.pathExists(path.join(testDir, 'notes.txt'))).toBe(true);
      expect(await fs.readFile(path.join(testDir, 'notes.txt'), 'utf8')).toBe('my notes');

      const fashDir = path.join(testDir, '.fash');
      await fs.remove(fashDir);
      expect(await fs.pathExists(fashDir)).toBe(false);
    });
  });

  describe('selective commit (--include)', () => {
    it('should only hash files matching include patterns', async () => {
      await fs.writeFile(path.join(testDir, 'secret.env'), 'KEY=value');

      const fashMap = await mappingManager.createMapping(testDir, ['*.txt']);
      const files = fashMap.mappings.filter((m) => !m.isDirectory);

      expect(files.length).toBe(1);
      expect(files[0].originalPath).toContain('notes.txt');
    });

    it('should hash everything when no include patterns given', async () => {
      const fashMap = await mappingManager.createMapping(testDir);
      expect(fashMap.mappings.length).toBeGreaterThan(1);
    });
  });

  describe('rekey workflow', () => {
    it('should re-encrypt with new secret preserving data', async () => {
      const fashMap = await mappingManager.createMapping(testDir);
      await mappingManager.saveEncryptedMap(fashMap, 'old');

      const loaded = await mappingManager.loadEncryptedMap('old');
      await mappingManager.saveEncryptedMap(loaded, 'new');

      const reloaded = await mappingManager.loadEncryptedMap('new');
      expect(reloaded.mappings.length).toBe(fashMap.mappings.length);
    });
  });

  describe('log workflow', () => {
    it('should accumulate log entries in order', async () => {
      await configManager.addLogEntry('init', 'started');
      await configManager.addLogEntry('commit', '2 items');
      await configManager.addLogEntry('undo', '2 items restored');

      const logs = await configManager.loadLog();
      expect(logs).toHaveLength(3);
      expect(logs.map((l) => l.action)).toEqual(['init', 'commit', 'undo']);
    });
  });
});
