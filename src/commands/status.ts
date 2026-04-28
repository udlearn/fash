import { Command } from 'commander';
import chalk from 'chalk';
import * as path from 'path';
import { ConfigManager } from '../core/config-manager.js';
import { MappingManager } from '../core/mapping-manager.js';

export function createStatusCommand(): Command {
  const command = new Command('status');

  command
    .description('Preview what would change on the next commit (dry run)')
    .option('-f, --files', 'Show files only')
    .option('-d, --directories', 'Show directories only')
    .action(async (options) => {
      try {
        const configManager = new ConfigManager(process.cwd());

        if (!(await configManager.pathExists())) {
          console.log(chalk.yellow('No fash configuration found. Run "fash init" first.'));
          return;
        }

        const mappingManager = new MappingManager(process.cwd(), configManager);

        if (await mappingManager.mapExists()) {
          console.log(chalk.yellow('Files are already hashed. Run "fash undo" before previewing a new commit.'));
          return;
        }

        console.log(chalk.blue('Scanning files and directories...\n'));
        const fashMap = await mappingManager.createMapping(process.cwd());

        const dirs = fashMap.mappings.filter((m) => m.isDirectory);
        const files = fashMap.mappings.filter((m) => !m.isDirectory);

        const showDirs = !options.files;
        const showFiles = !options.directories;

        if (showDirs && dirs.length > 0) {
          console.log(chalk.blue.bold('Directories to rename:'));
          for (const mapping of dirs) {
            const original = path.relative(process.cwd(), mapping.originalPath);
            const hashed = path.relative(process.cwd(), mapping.hashedPath);
            console.log(`  ${chalk.cyan(original)} ${chalk.gray('->')} ${chalk.white(hashed)}`);
          }
          console.log();
        }

        if (showFiles && files.length > 0) {
          console.log(chalk.green.bold('Files to rename:'));
          for (const mapping of files) {
            const original = path.relative(process.cwd(), mapping.originalPath);
            const hashed = path.relative(process.cwd(), mapping.hashedPath);
            console.log(`  ${chalk.cyan(original)} ${chalk.gray('->')} ${chalk.white(hashed)}`);
          }
          console.log();
        }

        if (fashMap.mappings.length === 0) {
          console.log(chalk.yellow('Nothing to hash. All files/directories are excluded.'));
          return;
        }

        const dirLabel = `${dirs.length} director${dirs.length === 1 ? 'y' : 'ies'}`;
        const fileLabel = `${files.length} file${files.length === 1 ? '' : 's'}`;
        console.log(chalk.gray(`${dirLabel}, ${fileLabel} would be renamed`));
        console.log(chalk.gray(`Algorithm: ${fashMap.config.algorithm}`));

        if (fashMap.config.exclude && fashMap.config.exclude.length > 0) {
          console.log(chalk.gray(`Excluded patterns: ${fashMap.config.exclude.join(', ')}`));
        }
      } catch (err) {
        console.error(chalk.red('Error during status:'), err);
        process.exit(1);
      }
    });

  return command;
}
