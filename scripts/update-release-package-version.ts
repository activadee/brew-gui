#!/usr/bin/env npx tsx
/**
 * Align package.json version to a release version.
 * Usage: npx tsx scripts/update-release-package-version.ts <version> [--github-output]
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { appendGithubOutput } from './release-version';

const packageJsonPath = resolve(process.cwd(), 'package.json');

function main(): void {
  const version = process.argv[2];
  const writeOutput = process.argv.includes('--github-output');

  if (!version) {
    console.error('Usage: update-release-package-version.ts <version> [--github-output]');
    process.exit(1);
  }

  const raw = readFileSync(packageJsonPath, 'utf8');
  const pkg = JSON.parse(raw) as { version?: string };
  const changed = pkg.version !== version;

  if (changed) {
    pkg.version = version;
    writeFileSync(packageJsonPath, `${JSON.stringify(pkg, null, 2)}\n`);
  }

  if (writeOutput) {
    appendGithubOutput('changed', changed ? 'true' : 'false');
  } else if (!changed) {
    console.log('package.json version already matches release version.');
  }
}

main();
