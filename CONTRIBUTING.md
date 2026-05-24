# Contributing

## Branching

All work targets **`main`**.

```text
feature/* --[PR]--> main
```

CI runs on every pull request to `main`.

## Releases

Release automation uses **tag-driven** stable releases, **scheduled / manual beta** pre-releases, preflight checks, `softprops/action-gh-release`, and a finalize step that bumps `package.json` on `main` (via a GitHub App).

Merges to `main` do **not** auto-tag or auto-release.

### Beta pre-releases

| Trigger | Behavior |
|---------|----------|
| **Schedule** (every 6h) | If `main` changed since the last `v*-beta.*` tag → next beta pre-release |
| **Actions → Release → `beta`** | Beta pre-release from current `main` |

Beta tags look like `v0.6.0-beta.1`, `v0.6.0-beta.2`, … (see `scripts/resolve-prerelease.ts`).

### Stable releases

| Trigger | Behavior |
|---------|----------|
| **Push tag** `vX.Y.Z` (no `-beta`) | Stable release, marked **Latest** |
| **Actions → Release → `stable`** | Requires **version** input (e.g. `0.6.1` or `v0.6.1`); creates the GitHub Release at current `main` |

You can tag locally and push:

```bash
git tag v0.6.1
git push origin v0.6.1
```

Or use workflow dispatch with channel `stable` and a version (no tag push required; the release action creates the tag).

### Unsigned build only

**Release** workflow → channel **`build-only`** → test + macOS build; artifacts on the workflow run only.

### Finalize (stable only)

After a **stable** release, the workflow commits `chore(release): prepare vX.Y.Z` to `main` using a **GitHub App**.

Repository secrets (required for finalize with branch protection):

- `RELEASE_APP_ID`
- `RELEASE_APP_PRIVATE_KEY`

Create a GitHub App with contents write access, install it on this repo, and allow it to bypass branch rules for release commits if needed.

Publishing uses the app token when configured; otherwise `GITHUB_TOKEN` is used (may be enough without branch protection on finalize).

## Auto-update

By default, shipped apps auto-update from **stable** releases (`vX.Y.Z` without `-beta`).

Users can switch to **nightly** in Settings → General → App release channel. That opts into prerelease builds (CI **beta** channel: `vX.Y.Z-beta.N`, about every 6 hours when `main` changes).

## Local development

See [README.md](README.md).

## CI

Pull requests to `main` run **CI** (`test:all` + production build).
