import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { ConfigManager } from '../core/config-manager.js';
import { MappingManager } from '../core/mapping-manager.js';

export function createRekeyCommand(): Command {
  const command = new Command('rekey');

  command.description('Change the encryption secret for the mapping file').action(async () => {
    try {
      const configManager = new ConfigManager(process.cwd());
      const mappingManager = new MappingManager(process.cwd(), configManager);

      if (!(await mappingManager.mapExists())) {
        console.log(chalk.yellow('No mapping found. Nothing to rekey.'));
        return;
      }

      const { currentSecret } = await inquirer.prompt([
        {
          type: 'password',
          name: 'currentSecret',
          message: 'Enter current secret password:',
          mask: '*',
        },
      ]);

      console.log(chalk.blue('Decrypting mapping with current secret...'));
      const fashMap = await mappingManager.loadEncryptedMap(currentSecret);

      const { newSecret } = await inquirer.prompt([
        {
          type: 'password',
          name: 'newSecret',
          message: 'Enter new secret password:',
          mask: '*',
        },
      ]);

      const { confirmSecret } = await inquirer.prompt([
        {
          type: 'password',
          name: 'confirmSecret',
          message: 'Confirm new secret password:',
          mask: '*',
        },
      ]);

      if (newSecret !== confirmSecret) {
        console.error(chalk.red('Secrets do not match. Aborting.'));
        process.exit(1);
      }

      if (newSecret === currentSecret) {
        console.log(chalk.yellow('New secret is the same as the current one. No changes made.'));
        return;
      }

      console.log(chalk.blue('Re-encrypting mapping with new secret...'));
      await mappingManager.saveEncryptedMap(fashMap, newSecret);

      await configManager.addLogEntry('rekey', 'Encryption secret rotated');
      console.log(chalk.green('✓ Mapping re-encrypted with new secret!'));
    } catch (err) {
      console.error(chalk.red('Error during rekey:'), err);
      process.exit(1);
    }
  });

  return command;
}
