#!/usr/bin/env node

import { Command } from 'commander';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import {
  InitCommand,
  ConfigCommand,
  ShowCommand,
  CommitCommand,
  UndoCommand,
  StatusCommand,
  LogCommand,
} from './commands/index.js';

// Read version from package.json
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJson = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf8'));

const program = new Command();

program
  .name(packageJson.name)
  .description(packageJson.description)
  .version(packageJson.version, '-v, --version', 'display version information');

// Add commands
program.addCommand(InitCommand());
program.addCommand(ConfigCommand());
program.addCommand(StatusCommand());
program.addCommand(ShowCommand());
program.addCommand(CommitCommand());
program.addCommand(UndoCommand());
program.addCommand(LogCommand());

// Parse arguments
program.parse();
