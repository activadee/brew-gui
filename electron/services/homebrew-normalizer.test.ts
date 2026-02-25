import { describe, expect, it } from 'vitest';

import { normalizeInstalled, normalizeOutdated } from './homebrew-normalizer';

describe('homebrew normalizer', () => {
  it('normalizes installed formulae and casks', () => {
    const normalized = normalizeInstalled({
      formulae: [
        {
          name: 'ripgrep',
          desc: 'Recursively search directories',
          versions: { stable: '14.0.3' },
          installed: [{ version: '14.0.1' }],
          pinned: false,
          tap: 'homebrew/core',
          homepage: 'https://github.com/BurntSushi/ripgrep'
        }
      ],
      casks: [
        {
          token: 'visual-studio-code',
          full_token: 'visual-studio-code',
          desc: 'Code editor',
          version: '1.99.0',
          installed: ['1.98.3'],
          tap: 'homebrew/cask',
          homepage: 'https://code.visualstudio.com'
        }
      ]
    });

    expect(normalized).toHaveLength(2);
    expect(normalized[0]?.id).toMatch(/cask:visual-studio-code|formula:ripgrep/);
    expect(normalized.map((item) => item.kind)).toContain('formula');
    expect(normalized.map((item) => item.kind)).toContain('cask');
  });

  it('normalizes outdated packages', () => {
    const normalized = normalizeOutdated({
      formulae: [
        {
          name: 'node',
          installed_versions: ['22.6.0'],
          current_version: '22.7.0',
          pinned: false
        }
      ],
      casks: [
        {
          token: 'docker',
          installed_versions: ['4.37.0'],
          current_version: '4.38.0'
        }
      ]
    });

    expect(normalized).toHaveLength(2);
    expect(normalized.find((item) => item.kind === 'formula')?.name).toBe('node');
    expect(normalized.find((item) => item.kind === 'cask')?.name).toBe('docker');
  });
});
