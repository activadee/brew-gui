# Changelog

## 0.4.0 — 2026-05-23

### Added
- Action templates: reusable multi-step brew command presets with confirmation preview
- Local job history and analytics at `/history` with retention and stats
- Multi-select batch actions for upgrade, uninstall, and pin on Installed/Updates
- Command palette package actions: install, uninstall, pin, details, run template
- Diagnostic panel for empty/error states with copyable output
- Upgrade diff preview in confirm dialogs
- Undo toasts for pin and smart-upgrade exclude reversals
- Uninstall dependency-impact warning via `brew uses --installed`
- Advanced install `--force` option (settings toggle)
- Brew command allowlist registry and token validation
- Crash resilience: active job persistence and recovery banner
- Structured JSON logging with job correlation IDs
- Opt-in local telemetry aggregates (no package names)
- GitHub Actions CI workflow (`test:all` + build on macOS)

### Changed
- Version aligned to feature-complete Phase 3 automation baseline
- README IPC channel list synced with `ipc-channels.ts`
- Roadmap checkboxes updated for smart upgrade, update channels, templates, history

### Security
- All brew spawns routed through allowlisted command keys
- Package/service names validated with `brewTokenSchema`

## 0.3.0 — 2026-02-26

- Cleanup tools with dry-run preview
- Services management dashboard
- Doctor diagnostics with grouped findings
- Deprecated/disabled package insights

## 0.2.0 — 2026-02-25

- Install, uninstall, reinstall flows with confirmation modals
- Pin/unpin formulae with visual badges
- Package details drawer (hybrid `brew info` + API)
- Per-action progress log / activity drawer
