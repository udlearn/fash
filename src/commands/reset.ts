import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import fs from 'fs-extra';
import * as path from 'path';
import { ConfigManager } from '../core/config-manager.js';

export function createResetCommand(): Command {
  const command = new Command('reset');

  command
    .description('Remove the mapping and log, keeping files in their current state')
    .option('-f, --force', 'Skip confirmation prompt')
    .action(async (options) => {
      try {
        const configManager = new ConfigManager(process.cwd());

        if (!(await configManager.pathExists())) {
          console.log(chalk.yellow('No fash configuration found. Nothing to reset.'));
          return;
        }

        if (!options.force) {
          const { confirm } = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'confirm',
              message:
                'This will delete the encrypted mapping and log. ' +
                'Files will remain in their current (hashed) state. Continue?',
              default: false,
            },
          ]);

          if (!confirm) {
            console.log(chalk.gray('Aborted.'));
            return;
          }
        }

        const fashDir = path.join(process.cwd(), '.fash');
        const mapPath = path.join(fashDir, 'map.encrypted');
        const logPath = configManager.getLogPath();

        if (await fs.pathExists(mapPath)) {
          await fs.remove(mapPath);
        }

        if (await fs.pathExists(logPath)) {
          await fs.writeFile(logPath, '');
        }

        console.log(chalk.green('✓ Mapping and log cleared. Files left unchanged.'));
        console.log(chalk.yellow('Config preserved. Use "fash destroy" to remove everything.'));
      } catch (err) {
        console.error(chalk.red('Error during reset:'), err);
        process.exit(1);
      }
    });

  return command;
}
