import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-brew-missing-view',
  template: `
    <section class="card-surface mx-auto max-w-xl space-y-4 p-6">
      <p class="mono text-[10px] uppercase tracking-[0.16em] text-[var(--text-muted)]">Homebrew Required</p>
      <h2 class="text-xl font-semibold">Homebrew was not detected on this machine</h2>
      <p class="text-sm text-[var(--text-muted)]">
        Install Homebrew, then relaunch Brew Sidebar. This app only works as a wrapper around a local brew
        installation.
      </p>
      <pre class="subtle-scroll overflow-x-auto rounded-md border border-[var(--stroke)] bg-[#f0ece3] p-3 text-xs mono text-[var(--text-main)]">/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"</pre>
      <p class="text-xs text-[var(--text-muted)]">After install, run <span class="mono">brew --version</span> to verify.</p>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BrewMissingViewComponent {}
