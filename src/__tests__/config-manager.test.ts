import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import * as path from 'path';
import { ConfigManager } from '../core/config-manager';

describe('ConfigManager', () => {
  const testDir = path.join(__dirname, 'test-config');
  let configManager: ConfigManager;

  beforeEach(async () => {
    await fs.ensureDir(testDir);
    configManager = new ConfigManager(testDir);
  });

  afterEach(async () => {
    await fs.remove(testDir);
  });

  describe('initialize', () => {
    it('should create .fash directory with config and log', async () => {
      await configManager.initialize();

      expect(await fs.pathExists(configManager.getConfigPath())).toBe(true);
      expect(await fs.pathExists(configManager.getLogPath())).toBe(true);
    });

    it('should set default config values', async () => {
      await configManager.initialize();
      const config = await configManager.loadConfig();

      expect(config.algorithm).toBe('sha256');
      expect(config.exclude).toEqual([]);
    });

    it('should not overwrite existing config on re-init', async () => {
      await configManager.initialize();
      await configManager.updateConfig({ algorithm: 'md5' });

      await configManager.initialize();
      const config = await configManager.loadConfig();
      expect(config.algorithm).toBe('md5');
    });
  });

  describe('updateConfig', () => {
    it('should merge updates with existing config', async () => {
      await configManager.initialize();
      await configManager.updateConfig({ exclude: ['node_modules'] });

      const config = await configManager.loadConfig();
      expect(config.algorithm).toBe('sha256');
      expect(config.exclude).toEqual(['node_modules']);
    });
  });

  describe('log', () => {
    it('should append and read log entries', async () => {
      await configManager.initialize();

      await configManager.addLogEntry('init', 'test init');
      await configManager.addLogEntry('commit', '3 items');

      const logs = await configManager.loadLog();
      expect(logs).toHaveLength(2);
      expect(logs[0].action).toBe('init');
      expect(logs[1].action).toBe('commit');
      expect(logs[0].timestamp).toBeLessThanOrEqual(logs[1].timestamp);
    });

    it('should return empty array when log is empty', async () => {
      await configManager.initialize();
      const logs = await configManager.loadLog();
      expect(logs).toEqual([]);
    });
  });

  describe('pathExists', () => {
    it('should return false before initialization', async () => {
      expect(await configManager.pathExists()).toBe(false);
    });

    it('should return true after initialization', async () => {
      await configManager.initialize();
      expect(await configManager.pathExists()).toBe(true);
    });
  });

  describe('getSecretKey', () => {
    it('should throw when no secret provided', async () => {
      await expect(configManager.getSecretKey()).rejects.toThrow('Secret is required');
    });

    it('should return a 64-char hex key from a secret', async () => {
      const key = await configManager.getSecretKey('my-password');
      expect(key).toHaveLength(64);
      expect(key).toMatch(/^[a-f0-9]+$/);
    });

    it('should produce consistent keys for the same secret', async () => {
      const key1 = await configManager.getSecretKey('hello');
      const key2 = await configManager.getSecretKey('hello');
      expect(key1).toBe(key2);
    });
  });
});
