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

### `fash commit`

Hash all file and folder names and save an AES-256-CBC encrypted mapping. You will be prompted for a secret password -- this is required to decrypt the mapping later.

```bash
fash commit
fash commit --force   # overwrite an existing mapping
```

### `fash show`

Inspect the current mapping (requires your secret to decrypt).

```bash
fash show              # show all items
fash show --files      # files only
fash show --directories # directories only
fash show --config     # print configuration
```

### `fash undo`

Restore all original file and folder names from the encrypted mapping.

```bash
fash undo
```

## How It Works

1. **`init`** creates a `.fash/` directory with `config.json` and an empty `log.jsonl`.
2. **`commit`** walks the directory tree, computes a hash for every file and folder name, builds a full mapping, encrypts it with your secret (AES-256-CBC), saves it as `map.encrypted`, then renames everything on disk.
3. **`undo`** decrypts the mapping and renames everything back to the original names, working from the deepest paths upward.

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

## License

MIT
