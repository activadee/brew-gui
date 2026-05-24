# Contributing

## Branching and merges

Brewdeck uses a two-branch git flow:

| Branch | Role | Incoming merges |
|--------|------|-----------------|
| `development` | Default branch; integration and pre-releases | Feature branches via **squash** PR |
| `main` | Production-ready history and stable releases | `development` only via **rebase** PR (not squash) |

```text
feature/* --[squash PR]--> development --[rebase PR]--> main
```

### Merge methods (required)

Configure GitHub branch rules when possible:

- **`development`**: allow **squash** only for feature PRs.
- **`main`**: allow **rebase** only for promotion PRs from `development`.

Repo settings should have squash and rebase enabled; merge commits disabled.

## Releases (automated)

Do **not** push version tags manually. CI creates tags and GitHub Releases.

| Event | Result |
|-------|--------|
| Push to `development` (after a squash merge) | Next `vX.Y.Z-beta.N` pre-release (unsigned macOS DMG/ZIP) |
| Push to `main` (after rebase-merge from `development`) | Stable `vX.Y.Z` release marked **Latest** |

Packaged apps auto-update from **stable** releases only (`v*.*.*` without a prerelease suffix). Pre-releases are for manual testing.

### Typical workflow

1. Open a PR into `development` from your feature branch.
2. Squash-merge when CI passes → pre-release is published automatically.
3. When ready to ship, open a PR from `development` into `main`.
4. Rebase-merge when CI passes → stable release is published automatically.

`chore(release):` commits from GitHub Actions are ignored by the tag workflow to avoid loops.

## Local development

See [README.md](README.md) for install, `npm run dev`, and tests.

## CI

Pull requests targeting `development` or `main` run the **CI** workflow (`test:all` + production build).
