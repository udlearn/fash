import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import fs from 'fs-extra';
import * as path from 'path';
import { ConfigManager } from '../core/config-manager.js';
import { MappingManager } from '../core/mapping-manager.js';
import type { FashMap } from '../types/index.js';

export function createImportCommand(): Command {
  const command = new Command('import');

  command
    .description('Import a mapping from a JSON file and encrypt it')
    .argument('<file>', 'Path to the JSON mapping file')
    .option('-f, --force', 'Overwrite existing encrypted mapping')
    .action(async (file, options) => {
      try {
        const configManager = new ConfigManager(process.cwd());
        const mappingManager = new MappingManager(process.cwd(), configManager);

        if (!(await configManager.pathExists())) {
          console.log(chalk.yellow('No fash configuration found. Run "fash init" first.'));
          return;
        }

        if ((await mappingManager.mapExists()) && !options.force) {
          console.log(chalk.yellow('Encrypted mapping already exists. Use --force to overwrite.'));
          return;
        }

        const filePath = path.resolve(process.cwd(), file);
        if (!(await fs.pathExists(filePath))) {
          console.error(chalk.red(`File not found: ${filePath}`));
          process.exit(1);
        }

        const fashMap: FashMap = await fs.readJson(filePath);

        if (!fashMap.version || !fashMap.mappings || !fashMap.config) {
          console.error(chalk.red('Invalid mapping file format.'));
          process.exit(1);
        }

        const answers = await inquirer.prompt([
          {
            type: 'password',
            name: 'secret',
            message: 'Enter secret password to encrypt the imported mapping:',
            mask: '*',
          },
        ]);

        await mappingManager.saveEncryptedMap(fashMap, answers.secret);

        console.log(chalk.green(`✓ Imported and encrypted ${fashMap.mappings.length} mappings.`));
        await configManager.addLogEntry('import', `Imported ${fashMap.mappings.length} mappings from ${file}`);
      } catch (err) {
        console.error(chalk.red('Error during import:'), err);
        process.exit(1);
      }
    });

  return command;
}
