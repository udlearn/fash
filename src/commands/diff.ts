import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import fs from 'fs-extra';
import { ConfigManager } from '../core/config-manager.js';
import { MappingManager } from '../core/mapping-manager.js';

export function createDiffCommand(): Command {
  const command = new Command('diff');

  command.description('Show differences between disk state and the encrypted mapping').action(async () => {
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

      const missing: string[] = [];
      const renamed: Array<{ expected: string; actual: string }> = [];

      for (const mapping of fashMap.mappings) {
        const hashedExists = await fs.pathExists(mapping.hashedPath);
        if (!hashedExists) {
          const originalExists = await fs.pathExists(mapping.originalPath);
          if (originalExists) {
            renamed.push({ expected: mapping.hashedPath, actual: mapping.originalPath });
          } else {
            missing.push(mapping.hashedPath);
          }
        }
      }

      if (missing.length === 0 && renamed.length === 0) {
        console.log(chalk.green('✓ Disk state matches the mapping. No differences.'));
        return;
      }

      console.log(chalk.blue.bold('Differences detected:\n'));

      if (renamed.length > 0) {
        console.log(chalk.yellow('  Reverted (original name on disk):'));
        for (const { expected, actual } of renamed) {
          console.log(`    ${chalk.red(expected)}`);
          console.log(`    ${chalk.green(actual)}\n`);
        }
      }

      if (missing.length > 0) {
        console.log(chalk.red('  Missing from disk:'));
        for (const m of missing) {
          console.log(`    ${m}`);
        }
        console.log();
      }

      const total = missing.length + renamed.length;
      console.log(chalk.gray(`${total} difference(s) found.`));
    } catch (err) {
      console.error(chalk.red('Error during diff:'), err);
      process.exit(1);
    }
  });

  return command;
}
