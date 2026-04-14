# Contributing to Fash

Thanks for your interest in contributing! This guide covers how to set up the project locally, run tests, and submit changes.

## Prerequisites

- **Node.js >= 22** (use `nvm use 22` if needed)
- **pnpm** as the package manager

## Setup

```bash
git clone <repository-url>
cd fash
pnpm install
```

## Development Workflow

```bash
# Build (TypeScript -> dist/)
pnpm run build

# Run in development mode (tsx, no build step)
pnpm run dev

# Run the test suite
pnpm test

# Lint
pnpm run lint

# Format with Prettier
pnpm run format
```

### Linking Locally

To test the CLI globally on your machine:

```bash
pnpm run build
pnpm link --global
```

Then run `fash` from any directory. To unlink:

```bash
pnpm unlink --global fash
```

## Project Structure

```txt
src/
  index.ts              # CLI entry point (Commander setup)
  commands/             # Subcommand handlers (init, config, show, commit, undo)
  core/
    config-manager.ts   # .fash/ config and JSONL log I/O
    mapping-manager.ts  # Mapping creation, encryption, apply/restore
  utils/
    crypto.ts           # Hashing and AES-256-CBC encryption
    file-system.ts      # Recursive file/directory traversal and rename
  types/
    index.ts            # Shared interfaces
  __tests__/            # Vitest integration and unit tests
```

## Coding Standards

- **TypeScript** with strict checks enabled.
- **Prettier** for formatting (printWidth: 120, semicolons, single quotes).
- **ESLint** for linting.
- Prefer `interface` over `type` for object shapes.
- Use `camelCase` for variables/functions, `PascalCase` for classes/interfaces, `kebab-case` for file names.
- Keep lines under 120 characters.

## Testing

Tests live in `src/__tests__/` and run with Vitest:

```bash
pnpm test
```

When adding a new feature or fixing a bug, include a test that covers the change.

## Submitting Changes

1. Create a branch from `main`.
2. Make your changes with clear, focused commits.
3. Ensure `pnpm test` and `pnpm run lint` pass.
4. Open a pull request describing the change and why it's needed.
