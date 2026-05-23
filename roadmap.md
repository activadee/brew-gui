# Brewdeck Roadmap

## Vision
Brewdeck becomes the safest and fastest desktop control plane for Homebrew: inspect, upgrade, install, remove, and automate package hygiene without dropping to terminal.

## Guiding Principles
- Keep destructive actions explicit and reversible where possible.
- Prefer fast local data paths; fall back gracefully when offline.
- Preserve Homebrew semantics instead of hiding important CLI behavior.
- Make power-user workflows keyboard-first.

## Phase 1: Core Package Management (Completed February 25, 2026)
- [x] Add install package flow (completed February 25, 2026):
  - Install formula or cask from Browse.
  - Confirmation modal with exact command preview.
  - Progress via existing command job drawer/events.
  - Post-install refresh for Installed/Updates/Browse while staying on Browse.
  - Advanced install flags remain deferred (`--force`, custom args).
- [x] Add uninstall package flow (completed February 25, 2026):
  - Uninstall from Installed list.
  - Optional cask cleanup (`brew uninstall --zap`) for casks.
  - Confirmation with command preview and live job output.
  - Dependency-impact warning remains deferred to a later phase.
- [x] Add reinstall package flow (completed February 25, 2026):
  - Reinstall formulae and casks from Installed row overflow actions.
  - Optional cask cleanup (`brew reinstall --zap`) with explicit confirmation.
  - Progress via existing command job drawer/events.
  - Post-reinstall refresh for Installed/Updates/Browse while staying on Installed.
- [x] Add pin/unpin actions (completed February 25, 2026):
  - Pin/unpin formulae from Installed and Updates rows.
  - Visual pinned badges and pinned filtering in Installed and Updates.
  - Pinned formulae stay visible in Updates and require unpin before upgrade.
- [x] Add package details drawer (completed February 25, 2026):
  - Right-side details sheet from Installed, Updates, and Browse overflow actions.
  - Hybrid details resolution (`brew info` + Homebrew API fallback) with partial warnings.
  - Version snapshot, homepage, license, dependencies, and caveats.
- [x] Add per-action progress log (completed February 25, 2026):
  - Structured activity drawer with grouped jobs, filters, and live stage updates.
  - Full command preview, streamed output, exit code, and duration metadata.

## Phase 2: Advanced Homebrew Controls (Completed February 26, 2026)
- [x] Tap management (completed February 26, 2026):
  - Add/remove/list taps.
  - Track tapped repos health and update status.
- [x] Cleanup tools (completed February 26, 2026):
  - Run `brew cleanup` with dry-run preview.
  - Show reclaimable disk space before confirming.
- [x] Services management (completed February 26, 2026):
  - Start/stop/restart formula services (`brew services`).
  - Service status dashboard.
- [x] Doctor diagnostics (completed February 26, 2026):
  - Run `brew doctor`.
  - Group findings by severity with suggested fixes.
- [x] Deprecated/disabled package insights (completed February 26, 2026):
  - Flag deprecated/disabled installed packages.
  - Recommend replacements where available.

## Phase 3: Automation and Intelligence
- [x] Scheduled jobs (completed February 26, 2026):
  - Scheduled update checks, cleanup, and metadata sync.
  - Quiet hours and notification windows.
- [x] Smart upgrade strategy (completed May 23, 2026):
  - Batch upgrades by risk level.
  - Exclude pinned or user-blocked packages.
- [x] Update channels (completed May 23, 2026):
  - Separate critical, security-related, and normal update views.
- [x] Action templates (completed May 23, 2026):
  - Save reusable command presets (for example: install + pin).
- [x] Local history and analytics (completed May 23, 2026):
  - Track upgrade/install/uninstall timeline.
  - Time-to-complete and failure-rate insights.

## UX Improvements
- [x] Multi-select package actions (completed May 23, 2026):
  - Install/uninstall/upgrade selected packages in one job queue.
- [x] Better empty/error states (completed May 23, 2026):
  - CLI-style troubleshooting with copyable diagnostic output.
- [x] Keyboard command palette expansion (completed May 23, 2026):
  - “Install package…”, “Uninstall package…”, “Pin package…”.
- [x] Undo-safe patterns (completed May 23, 2026):
  - Post-action “revert” affordance where feasible (for non-destructive ops).
- [x] Diff preview (completed May 23, 2026):
  - Before/after version diff for upgrades.

## Reliability and Security
- [x] Safer command executor (completed May 23, 2026):
  - Strict command allowlist with typed params only.
  - Defensive validation for all IPC inputs.
- [x] Crash resilience (completed May 23, 2026):
  - Recover and display unfinished jobs after restart.
- [x] Structured logging (completed May 23, 2026):
  - Separate renderer/main logs with correlation IDs per job.
- [x] Telemetry (optional, local-first by default) (completed May 23, 2026):
  - Opt-in anonymized event telemetry for UX improvements.

## Platform and Distribution
- [x] CI pipeline (completed May 23, 2026):
  - macOS GitHub Actions for test:all and build.
- Production release pipeline:
  - Harden notarization/signing automation.
- [x] Auto-update event wiring (completed May 23, 2026):
  - Download + renderer notification (staged via ENABLE_AUTO_UPDATES).
- Apple Silicon and Intel validation matrix.
- Better icon and branding pack:
  - Full app icon set + polished tray variants for all menu bar states.

## Testing Roadmap
- Add integration tests for install/uninstall/pin/unpin flows.
- Add E2E coverage for tray interactions and scheduler.
- Add snapshot/visual regression checks for major screens.
- Add failure-mode tests:
  - Missing brew, network failures, malformed CLI output, permission errors.

## Nice-to-Have Ideas
- Formula and cask favorites/watchlist.
- Security advisory feed overlays for installed packages.
- Homebrew bundle support (`Brewfile` import/export).
- Team mode:
  - Share recommended package sets across machines.
- Plugin system for custom actions/scripts.

## Milestone Proposal
- `v0.2`: Install + uninstall + pin/unpin + details drawer.
- `v0.3`: Cleanup + services + doctor + stronger diagnostics.
- `v0.4`: Scheduler/automation + history analytics + batch actions.
- `v1.0`: Polished release pipeline, update channels, and production hardening.
