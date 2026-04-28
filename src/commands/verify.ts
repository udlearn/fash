import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import fs from 'fs-extra';
import { ConfigManager } from '../core/config-manager.js';
import { MappingManager } from '../core/mapping-manager.js';

export function createVerifyCommand(): Command {
  const command = new Command('verify');

  command.description('Verify that files on disk match the encrypted mapping').action(async () => {
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

      console.log(chalk.blue('Verifying integrity...\n'));
      const fashMap = await mappingManager.loadEncryptedMap(answers.secret);

      let missingCount = 0;
      let presentCount = 0;
      let unexpectedCount = 0;

      for (const mapping of fashMap.mappings) {
        const exists = await fs.pathExists(mapping.hashedPath);
        if (exists) {
          presentCount++;
        } else {
          missingCount++;
          console.log(chalk.red(`  MISSING  ${mapping.hashedPath}`));
        }
      }

      const allHashedPaths = new Set(fashMap.mappings.map((m) => m.hashedPath));
      const onDiskFiles = await getAllPaths(process.cwd());
      for (const filePath of onDiskFiles) {
        if (!allHashedPaths.has(filePath)) {
          unexpectedCount++;
          console.log(chalk.yellow(`  EXTRA    ${filePath}`));
        }
      }

      console.log();
      if (missingCount === 0 && unexpectedCount === 0) {
        console.log(chalk.green(`✓ All ${presentCount} mapped items verified on disk.`));
      } else {
        if (missingCount > 0) {
          console.log(chalk.red(`✗ ${missingCount} mapped item(s) missing from disk.`));
        }
        if (unexpectedCount > 0) {
          console.log(chalk.yellow(`! ${unexpectedCount} extra item(s) on disk not in the mapping.`));
        }
        console.log(chalk.gray(`  ${presentCount} item(s) verified OK.`));
      }
    } catch (err) {
      console.error(chalk.red('Error during verify:'), err);
      process.exit(1);
    }
  });

  return command;
}

async function getAllPaths(dirPath: string): Promise<string[]> {
  const results: string[] = [];
  const entries = await fs.readdir(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.name === '.fash') continue;
    const fullPath = `${dirPath}/${entry.name}`;
    results.push(fullPath);
    if (entry.isDirectory()) {
      const sub = await getAllPaths(fullPath);
      results.push(...sub);
    }
  }

  return results;
}
