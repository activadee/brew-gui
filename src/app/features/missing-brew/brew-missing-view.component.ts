import { ChangeDetectionStrategy, Component } from '@angular/core';

import { ZardBadgeComponent } from '@/shared/components/badge';
import { ZardButtonComponent } from '@/shared/components/button';
import { ZardCardComponent } from '@/shared/components/card';

@Component({
  selector: 'app-brew-missing-view',
  imports: [ZardCardComponent, ZardBadgeComponent, ZardButtonComponent],
  template: `
    <section class="mx-auto max-w-xl">
      <z-card class="space-y-3 border-border/70 bg-card/95 shadow-sm">
        <z-badge zType="outline" zShape="pill">Homebrew Required</z-badge>

        <div class="space-y-1.5">
          <h2 class="text-xl font-semibold">Homebrew was not detected on this machine</h2>
          <p class="text-sm text-muted-foreground">
            Install Homebrew, then relaunch Brew Sidebar. This app runs as a local UI wrapper around the brew binary.
          </p>
        </div>

        <pre class="overflow-x-auto rounded-md border border-border bg-muted/40 p-2 text-xs mono">/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"</pre>

        <div class="flex items-center justify-between gap-3">
          <p class="text-xs text-muted-foreground">
            After install, run <span class="mono">brew --version</span> to verify.
          </p>
          <a z-button zType="outline" zSize="sm" href="https://brew.sh" target="_blank" rel="noreferrer">
            Open brew.sh
          </a>
        </div>
      </z-card>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BrewMissingViewComponent {}
