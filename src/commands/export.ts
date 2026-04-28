import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import fs from 'fs-extra';
import * as path from 'path';
import { ConfigManager } from '../core/config-manager.js';
import { MappingManager } from '../core/mapping-manager.js';

export function createExportCommand(): Command {
  const command = new Command('export');

  command
    .description('Export the decrypted mapping to a JSON file')
    .option('-o, --output <path>', 'Output file path', 'fash-map.json')
    .action(async (options) => {
      try {
        const configManager = new ConfigManager(process.cwd());
        const mappingManager = new MappingManager(process.cwd(), configManager);

        if (!(await mappingManager.mapExists())) {
          console.log(chalk.yellow('No mapping found. Run "fash commit" first.'));
          return;
        }

        const answers = await inquirer.prompt([
          {
            type: 'password',
            name: 'secret',
            message: 'Enter secret password to decrypt mapping:',
            mask: '*',
          },
        ]);

        const fashMap = await mappingManager.loadEncryptedMap(answers.secret);

        const outputPath = path.resolve(process.cwd(), options.output);
        await fs.writeJson(outputPath, fashMap, { spaces: 2 });

        console.log(chalk.green(`✓ Mapping exported to ${outputPath}`));
        console.log(chalk.yellow('Warning: This file contains unencrypted mapping data.'));
      } catch (err) {
        console.error(chalk.red('Error during export:'), err);
        process.exit(1);
      }
    });

  return command;
}
