# stx

A personal Syncthing helper CLI.

## Features

- Register servers (name/url/apiKey)
- Pair folders from your Mac to a server in one command
  - server: Receive Only
  - mac: Send & Receive
- Push a default `.stignore` template
- Query server status, errors, and events

## Installation

```bash
npm i
npm run build
npm link  # optional: makes 'stx' available globally
```

## Commands

### Server Management

```bash
# Add a server (prompts for API key)
stx add-server <name> <url>
stx add-server safe-101 http://100.x.y.z:8384

# List registered servers
stx list-servers

# Remove a server
stx remove-server <name>
```

### Folder Pairing

```bash
# Pair a folder (folder-id auto-generated from label)
stx pair --server safe-101 --label "My Project" \
  --local-path ~/projects/myproject \
  --server-path /data/syncthing/myproject

# With explicit folder-id
stx pair --server safe-101 --folder-id my-custom-id --label "My Project" \
  --local-path ~/projects/myproject \
  --server-path /data/syncthing/myproject

# With one-time API key (not saved)
stx pair --server safe-101 --server-key "your-api-key" --label "My Project" \
  --local-path ~/projects/myproject \
  --server-path /data/syncthing/myproject

# With SSH path preparation
stx pair --server safe-101 --label "My Project" \
  --local-path ~/projects/myproject \
  --server-path /data/syncthing/myproject \
  --ssh root@myserver

# Options
#   --server <name>          (required) registered server name
#   --folder-id <id>         folder ID (auto-generated if omitted)
#   --label <label>          (required) folder label
#   --local-path <path>      (required) mac local path
#   --server-path <path>     (required) server path
#   --local-url <url>        mac syncthing url (default: http://127.0.0.1:8384)
#   --server-key <key>       override server API key (not saved)
#   --ssh <host>             SSH host to prepare server path (mkdir + chown)
#   --ignore-git             also ignore .git directory
#   --ignore-template <name> ignore template (default: nodepython)
```

### Status

```bash
# Query a single server
stx status --server safe-101

# Query all servers
stx status --all

# JSON output
stx status --server safe-101 --json
```

### Errors

```bash
# View errors for a server
stx errors --server safe-101

# View errors for all servers
stx errors --all

# Clear errors
stx errors --server safe-101 --clear
stx errors --all --clear

# JSON output
stx errors --server safe-101 --json
```

### Events

```bash
# View recent events
stx events --server safe-101

# Filter by event types (comma-separated)
stx events --server safe-101 --types FolderSummary,DeviceConnected

# Limit results
stx events --server safe-101 --limit 10

# Events since a specific ID
stx events --server safe-101 --since 100

# JSON output
stx events --server safe-101 --json
```

## Development

```bash
npm i
npm run dev -- --help
npm test
```

## Build

```bash
npm run build
node dist/cli.js --help
```

## Testing

```bash
npm test           # run tests once
npm run test:watch # watch mode
```
