import fs from 'fs-extra';
import * as path from 'path';
import { CryptoUtils } from '../utils/crypto.js';
import type { FashConfig, FashLog } from '../types/index.js';

export class ConfigManager {
  private configPath: string;
  private logPath: string;

  constructor(projectRoot: string) {
    this.configPath = path.join(projectRoot, '.fash', 'config.json');
    this.logPath = path.join(projectRoot, '.fash', 'log.jsonl');
  }

  async initialize(): Promise<void> {
    const fashDir = path.dirname(this.configPath);
    await fs.ensureDir(fashDir);

    // Initialize config if it doesn't exist
    if (!(await fs.pathExists(this.configPath))) {
      const defaultConfig: FashConfig = {
        algorithm: 'sha256',
        exclude: [],
      };
      await this.saveConfig(defaultConfig);
    }

    if (!(await fs.pathExists(this.logPath))) {
      await fs.writeFile(this.logPath, '');
    }
  }

  async loadConfig(): Promise<FashConfig> {
    try {
      const configData = await fs.readJson(this.configPath);
      return configData as FashConfig;
    } catch (err) {
      throw new Error(`Failed to load config: ${err}`);
    }
  }

  async saveConfig(config: FashConfig): Promise<void> {
    try {
      await fs.writeJson(this.configPath, config, { spaces: 2 });
    } catch (err) {
      throw new Error(`Failed to save config: ${err}`);
    }
  }

  async updateConfig(updates: Partial<FashConfig>): Promise<void> {
    const currentConfig = await this.loadConfig();
    const updatedConfig = { ...currentConfig, ...updates };

    await this.saveConfig(updatedConfig);
    await this.addLogEntry('config', `Updated configuration: ${JSON.stringify(updates)}`);
  }

  async loadLog(): Promise<FashLog[]> {
    try {
      const content = await fs.readFile(this.logPath, 'utf8');
      return content
        .split('\n')
        .filter((line) => line.trim().length > 0)
        .map((line) => JSON.parse(line) as FashLog);
    } catch {
      return [];
    }
  }

  async addLogEntry(action: FashLog['action'], details: string): Promise<void> {
    const entry: FashLog = { action, timestamp: Date.now(), details };
    await fs.appendFile(this.logPath, JSON.stringify(entry) + '\n');
  }

  async getSecretKey(secret?: string): Promise<string> {
    if (!secret) {
      throw new Error('Secret is required for this operation. Please provide the secret.');
    }
    return CryptoUtils.generateKey(secret);
  }

  getConfigPath(): string {
    return this.configPath;
  }

  getLogPath(): string {
    return this.logPath;
  }

  async pathExists(): Promise<boolean> {
    return fs.pathExists(this.configPath);
  }
}
