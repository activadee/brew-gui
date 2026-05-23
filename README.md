# Brewdeck

Minimalistic macOS Electron wrapper around Homebrew with Angular 21, Tailwind CSS 4, and Signal Stores.

> **Upgrading from Brew Sidebar:** The macOS bundle ID changed from `com.brewsidebar.app` to `com.brewdeck.app`. Remove the old **Brew Sidebar** app from Applications before installing Brewdeck to avoid duplicate menu bar entries and conflicting auto-update state.

## Features

- Installed package inventory for formulae and casks
- Outdated package detection with upgrade actions (`upgrade one`, `upgrade all`, smart upgrade)
- Update channels (critical, security, normal)
- Catalog browsing backed by Homebrew API + local cache fallback
- Action templates, job history, and batch multi-select actions
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

## GitHub Release (unsigned)

Pushing a version tag builds unsigned macOS artifacts on GitHub Actions and publishes them to a GitHub Release (DMG for manual install, ZIP + `latest-mac.yml` for in-app auto-update):

```bash
git tag v0.5.0
git push origin v0.5.0
```

You can also run the **Release** workflow manually from the Actions tab (`workflow_dispatch`); artifacts are uploaded to the workflow run only (no GitHub Release unless you push a tag).

The CI job sets `CSC_IDENTITY_AUTO_DISCOVERY=false`, so builds are **unsigned**. macOS Gatekeeper may block first launch (and sometimes updated installs) until the user uses **Right-click → Open** or allows the app in **System Settings → Privacy & Security**.

### In-app auto-update (unsigned)

Release CI sets `ENABLE_AUTO_UPDATES=1` when packaging. Packaged apps with that flag check [GitHub Releases](https://github.com/activadee/brew-gui/releases) via `electron-updater` (GitHub provider in `package.json`). When a newer tag is published, the app downloads the ZIP in the background and shows **Restart to update** in a toast.

Limitations without code signing / notarization:

- Updates still rely on tagged releases (`v*`); local `package:mac` builds do not publish metadata.
- macOS may quarantine downloaded updates the same way as a fresh DMG install.
- Auto-update uses the **ZIP** artifact, not the DMG.

### Signing (optional, for stricter Gatekeeper)

Documented environment variables for signed/notarized macOS release:

- `CSC_LINK` — code signing certificate
- `CSC_KEY_PASSWORD` — certificate password
- `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID` — notarization

## IPC contract

Main channels (request-response):

- `app:openMain`, `app:windowControl`, `app:getWindowChrome`, `app:quitAndInstallUpdate`
- `brew:getAvailability`, `brew:getInstalled`, `brew:getOutdated`
- `brew:getTaps`, `brew:getServices`, `brew:getPackageDetails`
- `brew:searchCatalog`
- `brew:installOne`, `brew:reinstallOne`, `brew:uninstallOne`
- `brew:pinOne`, `brew:unpinOne`
- `brew:upgradeOne`, `brew:upgradeAll`, `brew:getSmartUpgradePlan`, `brew:upgradeSmart`
- `brew:upgradeMany`, `brew:uninstallMany`, `brew:pinMany`
- `brew:getUninstallImpact`
- `brew:tapAdd`, `brew:tapRemove`
- `brew:serviceStart`, `brew:serviceStop`, `brew:serviceRestart`
- `brew:cleanupPreview`, `brew:cleanupRun`, `brew:doctorRun`
- `brew:checkNow`, `brew:syncMetadata`
- `templates:list`, `templates:save`, `templates:delete`, `templates:run`
- `history:list`, `history:stats`
- `jobs:recover`
- `settings:get`, `settings:update`

Event channels:

- `updates:changed`
- `app:windowChromeChanged`
- `brew:job-progress`, `brew:job-complete`, `brew:job-failed`
- `app:updateAvailable` (packaged builds with auto-update enabled)

All contracts are defined in:

- `src/shared/contracts.ts`
- Channel names in `electron/ipc-channels.ts`
