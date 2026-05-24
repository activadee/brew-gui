/** Shared semver helpers for release scripts. */

import { appendFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const STABLE_CORE_RE = /^(\d+)\.(\d+)\.(\d+)$/;
const TAG_STABLE_RE = /^v(\d+)\.(\d+)\.(\d+)$/;
const TAG_BETA_RE = /^v(\d+)\.(\d+)\.(\d+)-beta\.(\d+)$/;

export function stableCore(version: string): string {
  return version.replace(/[-+].*$/, '');
}

export function hasPrerelease(version: string): boolean {
  return /[-+]/.test(version);
}

export function bumpPatch(version: string): string {
  const match = STABLE_CORE_RE.exec(stableCore(version));
  if (!match) {
    throw new Error(`Invalid semver core: ${version}`);
  }
  const major = Number(match[1]);
  const minor = Number(match[2]);
  const patch = Number(match[3]);
  return `${major}.${minor}.${patch + 1}`;
}

export function compareStableCores(left: string, right: string): number {
  const l = STABLE_CORE_RE.exec(stableCore(left));
  const r = STABLE_CORE_RE.exec(stableCore(right));
  if (!l || !r) {
    throw new Error(`Invalid semver core: ${left} or ${right}`);
  }
  for (let i = 1; i <= 3; i += 1) {
    const diff = Number(l[i]) - Number(r[i]);
    if (diff !== 0) {
      return diff;
    }
  }
  return 0;
}

export function parseStableTag(tag: string): string | undefined {
  const match = TAG_STABLE_RE.exec(tag);
  if (!match) {
    return undefined;
  }
  return `${match[1]}.${match[2]}.${match[3]}`;
}

export function parseBetaTag(tag: string): { base: string; beta: number } | undefined {
  const match = TAG_BETA_RE.exec(tag);
  if (!match) {
    return undefined;
  }
  return {
    base: `${match[1]}.${match[2]}.${match[3]}`,
    beta: Number(match[4])
  };
}

export function listGitTags(): string[] {
  const output = execSync('git tag --list', { encoding: 'utf8' });
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function findLatestStableTag(tags: readonly string[]): string | undefined {
  const stable = tags
    .map((tag) => ({ tag, core: parseStableTag(tag) }))
    .filter((entry): entry is { tag: string; core: string } => entry.core !== undefined)
    .sort((a, b) => compareStableCores(b.core, a.core));
  return stable[0]?.tag;
}

export function appendGithubOutput(key: string, value: string): void {
  const path = process.env.GITHUB_OUTPUT;
  if (!path) {
    console.log(`${key}=${value}`);
    return;
  }
  appendFileSync(path, `${key}=${value}\n`);
}
