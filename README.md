# stx

A personal Syncthing helper CLI.

Goals:
- Register servers (name/url/apiKey)
- Pair folders from your Mac to a server in one command
  - server: Receive Only
  - mac: Send & Receive
- Push a default `.stignore` template

## Dev

```bash
npm i
npm run dev -- --help
```

## Build

```bash
npm run build
node dist/cli.js --help
```
