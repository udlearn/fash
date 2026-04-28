import { Command } from 'commander';
import chalk from 'chalk';
import { ConfigManager } from '../core/config-manager.js';
import type { FashLog } from '../types/index.js';

const ACTION_COLORS: Record<FashLog['action'], (text: string) => string> = {
  init: chalk.green,
  config: chalk.blue,
  show: chalk.gray,
  commit: chalk.yellow,
  undo: chalk.magenta,
  status: chalk.cyan,
  log: chalk.gray,
  rekey: chalk.red,
};

export function createLogCommand(): Command {
  const command = new Command('log');

  command
    .description('Show the fash activity log')
    .option('-n, --limit <count>', 'Show only the last N entries')
    .option('--json', 'Output raw JSON lines')
    .option('--reverse', 'Show oldest entries first')
    .action(async (options) => {
      try {
        const configManager = new ConfigManager(process.cwd());

        if (!(await configManager.pathExists())) {
          console.log(chalk.yellow('No fash configuration found. Run "fash init" first.'));
          return;
        }

        let entries = await configManager.loadLog();

        if (entries.length === 0) {
          console.log(chalk.yellow('No log entries found.'));
          return;
        }

        if (!options.reverse) {
          entries = entries.reverse();
        }

        if (options.limit) {
          const limit = parseInt(options.limit, 10);
          if (isNaN(limit) || limit < 1) {
            console.error(chalk.red('Invalid limit. Must be a positive integer.'));
            process.exit(1);
          }
          entries = entries.slice(0, limit);
        }

        if (options.json) {
          for (const entry of entries) {
            console.log(JSON.stringify(entry));
          }
          return;
        }

        console.log(chalk.blue.bold('Activity log:\n'));

        for (const entry of entries) {
          const date = new Date(entry.timestamp);
          const timestamp = chalk.gray(date.toLocaleString());
          const colorize = ACTION_COLORS[entry.action] ?? chalk.white;
          const action = colorize(entry.action.padEnd(8));

          console.log(`  ${timestamp}  ${action}  ${entry.details}`);
        }

        console.log(chalk.gray(`\n${entries.length} entr${entries.length === 1 ? 'y' : 'ies'} shown`));
      } catch (err) {
        console.error(chalk.red('Error reading log:'), err);
        process.exit(1);
      }
    });

  return command;
}
