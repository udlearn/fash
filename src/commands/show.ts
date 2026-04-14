import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { ConfigManager } from '../core/config-manager.js';
import { MappingManager } from '../core/mapping-manager.js';

export function createShowCommand(): Command {
  const command = new Command('show');

  command
    .description('Show hashed items and configuration')
    .option('-a, --all', 'Show all items')
    .option('-f, --files', 'Show files only')
    .option('-d, --directories', 'Show directories only')
    .option('-c, --config', 'Show configuration')
    .action(async (options) => {
      try {
        const configManager = new ConfigManager(process.cwd());
        const mappingManager = new MappingManager(process.cwd(), configManager);

        if (options.config) {
          const config = await configManager.loadConfig();
          console.log(chalk.blue('Configuration:'));
          console.log(JSON.stringify(config, null, 2));
          return;
        }

        if (!(await mappingManager.mapExists())) {
          console.log(chalk.yellow('No mapping found. Run "fash commit" first.'));
          return;
        }

        // Prompt for secret to decrypt mapping
        const answers = await inquirer.prompt([
          {
            type: 'password',
            name: 'secret',
            message: 'Enter secret password to decrypt mapping:',
            mask: '*',
          },
        ]);

        const fashMap = await mappingManager.loadEncryptedMap(answers.secret);

        if (options.all || (!options.files && !options.directories)) {
          console.log(chalk.blue('All hashed items:'));
          fashMap.mappings.forEach((mapping) => {
            const type = mapping.isDirectory ? chalk.blue('[DIR]') : chalk.green('[FILE]');
            console.log(`${type} ${mapping.originalPath} -> ${mapping.hashedPath}`);
          });
        } else if (options.files) {
          console.log(chalk.green('Hashed files:'));
          fashMap.mappings
            .filter((mapping) => !mapping.isDirectory)
            .forEach((mapping) => {
              console.log(`${mapping.originalPath} -> ${mapping.hashedPath}`);
            });
        } else if (options.directories) {
          console.log(chalk.blue('Hashed directories:'));
          fashMap.mappings
            .filter((mapping) => mapping.isDirectory)
            .forEach((mapping) => {
              console.log(`${mapping.originalPath} -> ${mapping.hashedPath}`);
            });
        }

        console.log(chalk.gray(`\nTotal items: ${fashMap.mappings.length}`));
        console.log(chalk.gray(`Created: ${new Date(fashMap.created).toLocaleString()}`));
      } catch (err) {
        console.error(chalk.red('Error showing items:'), err);
        process.exit(1);
      }
    });

  return command;
}
