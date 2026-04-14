import { Command } from 'commander';
import chalk from 'chalk';
import { ConfigManager } from '../core/config-manager.js';
import type { FashConfig } from '../types/index.js';

export function createInitCommand(): Command {
  const command = new Command('init');

  command
    .description('Initialize fash in the current directory')
    .option('-a, --algorithm <algorithm>', 'Set hashing algorithm (md5, sha1, sha256)', 'sha256')
    .option('-e, --exclude <patterns...>', 'Exclude patterns (glob patterns)')
    .action(async (options) => {
      try {
        console.log(chalk.blue('Initializing fash...'));

        const configManager = new ConfigManager(process.cwd());
        await configManager.initialize();

        const config: FashConfig = {
          algorithm: options.algorithm || 'sha256',
          exclude: options.exclude || [],
        };

        await configManager.saveConfig(config);
        await configManager.addLogEntry('init', 'fash initialized successfully');

        console.log(chalk.green('✓ fash initialized successfully!'));
        console.log(chalk.yellow('Next steps:'));
        console.log(chalk.gray('  1. Configure your settings: fash config'));
        console.log(chalk.gray('  2. Commit changes: fash commit'));
      } catch (err) {
        console.error(chalk.red('Error initializing fash:'), err);
        process.exit(1);
      }
    });

  return command;
}
