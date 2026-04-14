import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { ConfigManager } from '../core/config-manager.js';
import { MappingManager } from '../core/mapping-manager.js';

export function createUndoCommand(): Command {
  const command = new Command('undo');

  command.description('Restore original file and folder names from encrypted mapping').action(async () => {
    try {
      const configManager = new ConfigManager(process.cwd());
      const mappingManager = new MappingManager(process.cwd(), configManager);

      if (!(await mappingManager.mapExists())) {
        console.log(chalk.yellow('No mapping found. Nothing to undo.'));
        return;
      }

      // Prompt for secret
      const answers = await inquirer.prompt([
        {
          type: 'password',
          name: 'secret',
          message: 'Enter secret password to decrypt mapping:',
          mask: '*',
        },
      ]);

      console.log(chalk.blue('Loading encrypted mapping...'));
      const fashMap = await mappingManager.loadEncryptedMap(answers.secret);

      console.log(chalk.blue('Restoring original names...'));
      await mappingManager.restoreMappings(fashMap);

      await configManager.addLogEntry('undo', `${fashMap.mappings.length} items restored`);

      console.log(chalk.green(`✓ Successfully restored ${fashMap.mappings.length} items!`));
    } catch (err) {
      console.error(chalk.red('Error during undo:'), err);
      process.exit(1);
    }
  });

  return command;
}
