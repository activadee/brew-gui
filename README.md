# Brew Sidebar

Minimalistic macOS Electron wrapper around Homebrew with Angular 21, Tailwind CSS 4, and Signal Stores.

## Features

- Installed package inventory for formulae and casks
- Outdated package detection with upgrade actions (`upgrade one`, `upgrade all`)
- Catalog browsing backed by Homebrew API + local cache fallback
- Tray popover with update count, interval settings, and quick actions
- Typed, validated IPC boundary between renderer and Electron main process

## Stack

- Angular `21.1.5` (standalone + control flow + hash routing)
- `@ngrx/signals` signal stores
- Tailwind CSS `4.2.1`
- Electron `40.6.1`
- electron-builder `26.8.1`

## Development

```bash
npm install
npm run dev
```

This starts:

1. Angular dev server on `http://127.0.0.1:4200`
2. Electron TypeScript build watcher (`tsup`)
3. Electron desktop app

## Test

```bash
npm run test        # Angular unit tests
npm run test:node   # Electron/node tests (vitest)
npm run test:all
```

## Production Build

```bash
npm run build
npm run package:mac
```

Outputs are generated in `release/`.

## Auto-update readiness

`electron-builder` publish config is intentionally set to a placeholder URL:

- `https://example.com/auto-updates/`

Replace this and provide signing/notarization secrets in CI before enabling release auto-updates.

## IPC contract

Main channels (request-response):

- `brew:getInstalled`
- `brew:getOutdated`
- `brew:searchCatalog`
- `brew:upgradeOne`
- `brew:upgradeAll`
- `brew:checkNow`
- `settings:get`
- `settings:update`

Event channels:

- `updates:changed`
- `brew:job-progress`
- `brew:job-complete`
- `brew:job-failed`

All contracts are defined in:

- `src/shared/contracts.ts`
