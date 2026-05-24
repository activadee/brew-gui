#!/usr/bin/env npx tsx
/**
 * Resolve the next development pre-release tag (vX.Y.Z-beta.N).
 * Usage: npx tsx scripts/resolve-prerelease.ts [--github-output]
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  appendGithubOutput,
  bumpPatch,
  compareStableCores,
  findLatestStableTag,
  hasPrerelease,
  listGitTags,
  parseBetaTag,
  parseStableTag,
  stableCore
} from './release-version';

const packageJsonPath = resolve(process.cwd(), 'package.json');

function resolveTargetBase(packageVersion: string, tags: readonly string[]): string {
  const core = stableCore(packageVersion);

  if (hasPrerelease(packageVersion)) {
    return core;
  }

  const latestStableTag = findLatestStableTag(tags);
  const latestStableCore = latestStableTag ? parseStableTag(latestStableTag) : undefined;

  if (latestStableCore && compareStableCores(core, latestStableCore) > 0) {
    return core;
  }

  return bumpPatch(core);
}

function resolveNextBeta(targetBase: string, tags: readonly string[]): number {
  let maxBeta = 0;

  for (const tag of tags) {
    const parsed = parseBetaTag(tag);
    if (parsed?.base === targetBase) {
      maxBeta = Math.max(maxBeta, parsed.beta);
    }
  }

  return maxBeta + 1;
}

function main(): void {
  const writeOutput = process.argv.includes('--github-output');
  const raw = readFileSync(packageJsonPath, 'utf8');
  const pkg = JSON.parse(raw) as { version: string };
  const tags = listGitTags();

  const targetBase = resolveTargetBase(pkg.version, tags);
  const beta = resolveNextBeta(targetBase, tags);
  const version = `${targetBase}-beta.${beta}`;
  const tag = `v${version}`;

  const outputs: Record<string, string> = {
    version,
    tag,
    name: `Brewdeck ${version}`,
    target_base: targetBase
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
