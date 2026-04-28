import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import fs from 'fs-extra';
import * as path from 'path';
import { ConfigManager } from '../core/config-manager.js';
import { MappingManager } from '../core/mapping-manager.js';

export function createDestroyCommand(): Command {
  const command = new Command('destroy');

  command
    .description('Restore original names (if possible) and remove the .fash directory entirely')
    .option('-f, --force', 'Skip confirmation prompt')
    .action(async (options) => {
      try {
        const configManager = new ConfigManager(process.cwd());

        if (!(await configManager.pathExists())) {
          console.log(chalk.yellow('No fash configuration found. Nothing to destroy.'));
          return;
        }

        if (!options.force) {
          const { confirm } = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'confirm',
              message:
                'This will restore original names (if mapping exists) and ' +
                'permanently delete the .fash directory. Continue?',
              default: false,
            },
          ]);

          if (!confirm) {
            console.log(chalk.gray('Aborted.'));
            return;
          }
        }

        const mappingManager = new MappingManager(process.cwd(), configManager);

        if (await mappingManager.mapExists()) {
          const answers = await inquirer.prompt([
            {
              type: 'password',
              name: 'secret',
              message: 'Enter secret password to decrypt and restore names:',
              mask: '*',
            },
          ]);

          console.log(chalk.blue('Restoring original names...'));
          const fashMap = await mappingManager.loadEncryptedMap(answers.secret);
          await mappingManager.restoreMappings(fashMap);
          console.log(chalk.green(`✓ Restored ${fashMap.mappings.length} items.`));
        }

        const fashDir = path.join(process.cwd(), '.fash');
        await fs.remove(fashDir);

        console.log(chalk.green('✓ .fash directory removed. Fash fully uninstalled from this project.'));
      } catch (err) {
        console.error(chalk.red('Error during destroy:'), err);
        process.exit(1);
      }
    });

  return command;
}
