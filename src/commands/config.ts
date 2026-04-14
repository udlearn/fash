import { Command } from 'commander';
import chalk from 'chalk';
import { ConfigManager } from '../core/config-manager.js';
import type { FashConfig } from '../types/index.js';

export function createConfigCommand(): Command {
  const command = new Command('config');

  command
    .description('Manage fash configuration')
    .option('-a, --algorithm <algorithm>', 'Set hashing algorithm')
    .option('-e, --exclude <patterns...>', 'Set exclude patterns')
    .action(async (options) => {
      try {
        const configManager = new ConfigManager(process.cwd());

        if (!(await configManager.pathExists())) {
          console.log(chalk.yellow('No fash configuration found. Run "fash init" first.'));
          return;
        }

        const currentConfig = await configManager.loadConfig();

        // If no options provided, show current config
        if (!options.algorithm && !options.exclude) {
          console.log(chalk.blue('Current configuration:'));
          console.log(JSON.stringify(currentConfig, null, 2));
          return;
        }

        const updates: Partial<FashConfig> = {};

        if (options.algorithm) {
          if (!['md5', 'sha1', 'sha256'].includes(options.algorithm)) {
            console.error(chalk.red('Invalid algorithm. Must be one of: md5, sha1, sha256'));
            process.exit(1);
          }
          updates.algorithm = options.algorithm as FashConfig['algorithm'];
        }

        if (options.exclude) {
          updates.exclude = options.exclude;
        }

        await configManager.updateConfig(updates);
        console.log(chalk.green('✓ Configuration updated successfully!'));
      } catch (err) {
        console.error(chalk.red('Error updating configuration:'), err);
        process.exit(1);
      }
    });

  return command;
}
