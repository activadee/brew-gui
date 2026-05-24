#!/usr/bin/env npx tsx
/**
 * Resolve stable release metadata from package.json on main.
 * Usage: npx tsx scripts/resolve-stable-release.ts [--github-output]
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { appendGithubOutput, stableCore } from './release-version';

const packageJsonPath = resolve(process.cwd(), 'package.json');
const STABLE_VERSION_RE = /^(\d+)\.(\d+)\.(\d+)$/;

function main(): void {
  const writeOutput = process.argv.includes('--github-output');
  const raw = readFileSync(packageJsonPath, 'utf8');
  const pkg = JSON.parse(raw) as { version: string };
  const version = stableCore(pkg.version);

  if (!STABLE_VERSION_RE.test(version)) {
    console.error(`package.json version is not a valid stable semver: ${pkg.version}`);
    process.exit(1);
  }

  const tag = `v${version}`;
  const outputs: Record<string, string> = {
    version,
    tag,
    name: `Brewdeck v${version}`
  };

  if (writeOutput) {
    for (const [key, value] of Object.entries(outputs)) {
      appendGithubOutput(key, value);
    }
  } else {
    for (const [key, value] of Object.entries(outputs)) {
      console.log(`${key}=${value}`);
    }
  }
}

main();
