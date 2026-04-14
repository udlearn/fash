import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import * as path from 'path';
import { ConfigManager } from '../core/config-manager';
import { MappingManager } from '../core/mapping-manager';

describe('Integration Tests', () => {
  const testDir = path.join(__dirname, 'test-project');
  let configManager: ConfigManager;
  let mappingManager: MappingManager;

  beforeEach(async () => {
    await fs.ensureDir(testDir);
    await fs.ensureDir(path.join(testDir, 'subdir'));
    await fs.writeFile(path.join(testDir, 'file1.txt'), 'content1');
    await fs.writeFile(path.join(testDir, 'file2.txt'), 'content2');
    await fs.writeFile(path.join(testDir, 'subdir', 'file3.txt'), 'content3');

    configManager = new ConfigManager(testDir);
    mappingManager = new MappingManager(testDir, configManager);
  });

  afterEach(async () => {
    await fs.remove(testDir);
  });

  it('should initialize configuration', async () => {
    await configManager.initialize();

    const config = await configManager.loadConfig();
    expect(config.algorithm).toBe('sha256');
    expect(config.exclude).toEqual([]);
  });

  it('should create and load encrypted mapping', async () => {
    await configManager.initialize();

    const fashMap = await mappingManager.createMapping(testDir);
    expect(fashMap.mappings.length).toBeGreaterThan(0);

    await mappingManager.saveEncryptedMap(fashMap, 'test-secret');
    const loadedMap = await mappingManager.loadEncryptedMap('test-secret');

    expect(loadedMap.version).toBe(fashMap.version);
    expect(loadedMap.mappings.length).toBe(fashMap.mappings.length);
  });

  it('should handle exclude patterns', async () => {
    await configManager.initialize();
    await configManager.updateConfig({
      exclude: ['*.txt'],
    });

    const fashMap = await mappingManager.createMapping(testDir);
    const txtFiles = fashMap.mappings.filter((m) => m.originalPath.endsWith('.txt'));
    expect(txtFiles).toHaveLength(0);
  });

  it('should commit and undo with nested directories', async () => {
    await fs.ensureDir(path.join(testDir, 'subdir', 'nested'));
    await fs.writeFile(path.join(testDir, 'subdir', 'nested', 'deep.txt'), 'deep-content');

    await configManager.initialize();

    const originalFiles = [
      path.join(testDir, 'file1.txt'),
      path.join(testDir, 'file2.txt'),
      path.join(testDir, 'subdir', 'file3.txt'),
      path.join(testDir, 'subdir', 'nested', 'deep.txt'),
    ];

    for (const f of originalFiles) {
      expect(await fs.pathExists(f)).toBe(true);
    }

    const fashMap = await mappingManager.createMapping(testDir);
    await mappingManager.saveEncryptedMap(fashMap, 'test-secret');
    await mappingManager.applyMappings(fashMap);

    // Originals should no longer exist under their old names
    for (const f of originalFiles) {
      expect(await fs.pathExists(f)).toBe(false);
    }

    // Load from encrypted map (same data undo would use) and restore
    const loadedMap = await mappingManager.loadEncryptedMap('test-secret');
    await mappingManager.restoreMappings(loadedMap);

    // All original files should be back with their content intact
    expect(await fs.readFile(path.join(testDir, 'file1.txt'), 'utf8')).toBe('content1');
    expect(await fs.readFile(path.join(testDir, 'file2.txt'), 'utf8')).toBe('content2');
    expect(await fs.readFile(path.join(testDir, 'subdir', 'file3.txt'), 'utf8')).toBe('content3');
    expect(await fs.readFile(path.join(testDir, 'subdir', 'nested', 'deep.txt'), 'utf8')).toBe('deep-content');
  });

  it('should write and read JSONL log entries', async () => {
    await configManager.initialize();

    await configManager.addLogEntry('init', 'initialized');
    await configManager.addLogEntry('commit', 'hashed 5 items');

    const logs = await configManager.loadLog();
    expect(logs).toHaveLength(2);
    expect(logs[0].action).toBe('init');
    expect(logs[0].details).toBe('initialized');
    expect(logs[1].action).toBe('commit');
    expect(logs[1].details).toBe('hashed 5 items');

    // Verify the file is valid JSONL (one JSON object per line)
    const raw = await fs.readFile(configManager.getLogPath(), 'utf8');
    const lines = raw.split('\n').filter((l) => l.trim().length > 0);
    expect(lines).toHaveLength(2);
    for (const line of lines) {
      expect(() => JSON.parse(line)).not.toThrow();
    }
  });
});
