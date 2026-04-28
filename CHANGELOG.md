# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

Added

- `fash status` command — dry-run preview of what would change on the next commit.
- `fash log` command — pretty-print the activity log with `--limit`, `--reverse`, and `--json`.
- `fash verify` command — integrity check confirming disk state matches the encrypted mapping.
- `fash diff` command — show differences between disk and the mapping.
- `fash rekey` command — rotate the encryption secret without a full undo/commit cycle.
- `fash export` command — export decrypted mapping to a portable JSON file.
- `fash import` command — import a JSON mapping file and encrypt it with a new secret.
- `fash reset` command — remove mapping and log while preserving config and file state.
- `fash destroy` command — restore names and permanently remove the `.fash/` directory.
- Selective commit via `--include <patterns...>` flag on `fash commit`.
- Automatic rollback on partial failure during `commit` and `undo`.
- Algorithm validation in `fash init` (parity with `fash config`).
- Comprehensive test suite: `config-manager`, `mapping-manager`, `file-system`, and command
  workflow tests (54 tests total).

## [0.1.0] - 2026-04-27

Added

- Initial release: CLI to obfuscate file and directory names while preserving contents.
- Commands: `init`, `config`, `commit`, `show`, `undo`.
- Encrypted mapping storage and configurable hash algorithms.

[Unreleased]: https://github.com/udlearn/fash/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/udlearn/fash/releases/tag/v0.1.0
