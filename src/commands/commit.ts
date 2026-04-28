import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { ConfigManager } from '../core/config-manager.js';
import { MappingManager } from '../core/mapping-manager.js';

export function createCommitCommand(): Command {
  const command = new Command('commit');

  command
    .description('Hash file and folder names and create encrypted mapping')
    .option('-f, --force', 'Force commit even if mapping already exists')
    .option('-i, --include <patterns...>', 'Only hash paths matching these patterns')
    .action(async (options) => {
      try {
        const configManager = new ConfigManager(process.cwd());
        const mappingManager = new MappingManager(process.cwd(), configManager);

        if ((await mappingManager.mapExists()) && !options.force) {
          console.log(chalk.yellow('Files are already hashed. Use --force to re-hash.'));
          return;
        }

        const answers = await inquirer.prompt([
          {
            type: 'password',
            name: 'secret',
            message: 'Enter secret password to encrypt mapping:',
            mask: '*',
          },
        ]);

        console.log(chalk.blue('Creating mapping...'));
        const fashMap = await mappingManager.createMapping(process.cwd(), options.include);

        if (fashMap.mappings.length === 0) {
          console.log(chalk.yellow('No files matched. Nothing to commit.'));
          return;
        }

        console.log(chalk.blue('Saving encrypted mapping...'));
        await mappingManager.saveEncryptedMap(fashMap, answers.secret);

        console.log(chalk.blue('Applying hashed names...'));
        await mappingManager.applyMappings(fashMap);

        await configManager.addLogEntry('commit', `${fashMap.mappings.length} items hashed`);

        console.log(chalk.green(`✓ Successfully hashed ${fashMap.mappings.length} items!`));
        console.log(chalk.yellow('Use "fash undo" to restore original names.'));
      } catch (err) {
        console.error(chalk.red('Error during commit:'), err);
        process.exit(1);
      }
    });

  return command;
}
