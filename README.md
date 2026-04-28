# fash

Obfuscate file and folder names without tampering their content. Fash recursively hashes names using
a configurable algorithm, stores an encrypted mapping so you can restore them later, and leaves file
contents completely untouched.

## Why

You have a directory of sensitive documents, project files, or media and you want to share or store
them without revealing the original naming structure. Fash turns every file and folder name into a hash
digest while preserving the directory tree and all file contents.

## Installation

```bash
npm install -g @udlearn/fash
```

Requires **Node.js >= 22**.

## Quick Start

```bash
# Navigate to the directory you want to obfuscate
cd my-project

# Initialize fash (creates a .fash/ config directory)
fash init

# Preview what will be renamed
fash status

# Hash all file and folder names (you will be prompted for a secret)
fash commit

# Restore original names when needed
fash undo
```

## Commands

### `fash init`

Initialize fash in the current directory. Creates a `.fash/` directory with default configuration.

```bash
fash init
fash init --algorithm sha1 --exclude "*.log" "node_modules"
```

| Option | Description | Default |
| --- | --- | --- |
| `-a, --algorithm <alg>` | Hash algorithm (`md5`, `sha1`, `sha256`) | `sha256` |
| `-e, --exclude <patterns...>` | Glob patterns to skip | none |

### `fash config`

View or update configuration. Run without options to print current settings.

```bash
fash config
fash config --algorithm md5
fash config --exclude "*.log" "*.tmp" "dist"
```

### `fash status`

Preview what would change on the next commit without modifying anything (dry run).

```bash
fash status
fash status --files        # show files only
fash status --directories  # show directories only
```

### `fash commit`

Hash all file and folder names and save an AES-256-CBC encrypted mapping. You will be prompted for
a secret password -- this is required to decrypt the mapping later.

If a rename fails midway, all completed renames are automatically rolled back.

```bash
fash commit
fash commit --force              # overwrite an existing mapping
fash commit --include "*.jpg"    # only hash files matching a pattern
```

| Option | Description |
| --- | --- |
| `-f, --force` | Overwrite existing mapping |
| `-i, --include <patterns...>` | Only hash paths matching these patterns |

### `fash show`

Inspect the current mapping (requires your secret to decrypt).

```bash
fash show              # show all items
fash show --files      # files only
fash show --directories # directories only
fash show --config     # print configuration
```

### `fash undo`

Restore all original file and folder names from the encrypted mapping. Rolls back automatically on
partial failure.

```bash
fash undo
```

### `fash verify`

Check that every entry in the encrypted mapping still exists on disk.

```bash
fash verify
```

### `fash diff`

Show differences between the current disk state and the encrypted mapping. Detects files that have
been manually renamed back or deleted.

```bash
fash diff
```

### `fash rekey`

Change the encryption secret without performing a full undo/commit cycle.

```bash
fash rekey
```

### `fash export`

Export the decrypted mapping to a plain JSON file for backup or transfer.

```bash
fash export
fash export --output backup.json
```

### `fash import`

Import a plain JSON mapping file and encrypt it with a new secret.

```bash
fash import fash-map.json
fash import backup.json --force  # overwrite existing mapping
```

### `fash reset`

Remove the encrypted mapping and clear the log while keeping files in their current (hashed) state.
Configuration is preserved.

```bash
fash reset
fash reset --force  # skip confirmation
```

### `fash destroy`

Restore original names (if a mapping exists) and permanently remove the `.fash/` directory. A
single command to fully uninstall fash from a project.

```bash
fash destroy
fash destroy --force  # skip confirmation
```

### `fash log`

View the activity log (newest first by default).

```bash
fash log
fash log --limit 5     # last 5 entries
fash log --reverse     # oldest first
fash log --json        # raw JSONL output
```

## How It Works

1. **`init`** creates a `.fash/` directory with `config.json` and an empty `log.jsonl`.
2. **`status`** scans the tree and shows what *would* be renamed -- no side effects.
3. **`commit`** walks the directory tree, computes a hash for every file and folder name, builds a
   full mapping, encrypts it with your secret (AES-256-CBC), saves it as `map.encrypted`, then
   renames everything on disk. If any rename fails, all completed renames are rolled back.
4. **`undo`** decrypts the mapping and renames everything back to the original names, working from
   the deepest paths upward. Rollback applies here too.
5. **`verify`** / **`diff`** let you audit the on-disk state against the mapping at any time.
6. **`rekey`** rotates the encryption secret without touching files.
7. **`export`** / **`import`** let you back up or transfer mappings between machines.
8. **`reset`** / **`destroy`** provide escape hatches for cleanup.

The `.fash/` directory contains:

| File | Purpose |
| --- | --- |
| `config.json` | Algorithm and exclude patterns |
| `log.jsonl` | Append-only action log ([JSON Lines](https://jsonlines.org/)) |
| `map.encrypted` | Encrypted original-to-hashed name mapping |

> **Tip:** Add `.fash/` to your `.gitignore` -- the encrypted mapping and log are local state.

## Security

- Mappings are encrypted with **AES-256-CBC** using a key derived from your secret.
- Hash names use the full digest length, making the original names unguessable.
- The secret is never stored on disk. If you lose it, the mapping cannot be decrypted.
- Exclude patterns let you skip files that should remain untouched.
- Operations that fail midway are automatically rolled back to prevent partial-rename corruption.

## License

MIT
