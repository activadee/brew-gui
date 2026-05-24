#!/usr/bin/env npx tsx
/**
 * Resolve the previous release tag for release notes.
 * Usage: npx tsx scripts/resolve-previous-release-tag.ts --channel <beta|stable> --current-tag <tag> [--github-output]
 */

import { appendGithubOutput, compareStableCores, listGitTags, parseBetaTag, parseStableTag } from './release-version';

type Channel = 'beta' | 'stable';

function parseArgs(): { channel: Channel; currentTag: string; writeOutput: boolean } {
  const args = process.argv.slice(2);
  let channel: Channel | undefined;
  let currentTag: string | undefined;
  let writeOutput = false;

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--github-output') {
      writeOutput = true;
      continue;
    }
    if (arg === '--channel') {
      channel = args[++i] as Channel;
      continue;
    }
    if (arg === '--current-tag') {
      currentTag = args[++i];
    }
  }

  if (!channel || !currentTag) {
    console.error(
      'Usage: resolve-previous-release-tag.ts --channel <beta|stable> --current-tag <tag> [--github-output]'
    );
    process.exit(1);
  }

  return { channel, currentTag, writeOutput };
}

function resolvePreviousBeta(currentTag: string, tags: readonly string[]): string | undefined {
  const current = parseBetaTag(currentTag);
  if (!current) {
    throw new Error(`Invalid beta release tag: ${currentTag}`);
  }

  const candidates = tags
    .map((tag) => ({ tag, parsed: parseBetaTag(tag) }))
    .filter(
      (entry): entry is { tag: string; parsed: { base: string; beta: number } } =>
        entry.parsed !== undefined &&
        entry.parsed.base === current.base &&
        entry.parsed.beta < current.beta
    )
    .sort((a, b) => b.parsed.beta - a.parsed.beta);

  return candidates[0]?.tag;
}

function resolvePreviousStable(currentTag: string, tags: readonly string[]): string | undefined {
  const currentCore = parseStableTag(currentTag);
  if (!currentCore) {
    throw new Error(`Invalid stable release tag: ${currentTag}`);
  }

  const candidates = tags
    .map((tag) => ({ tag, core: parseStableTag(tag) }))
    .filter((entry): entry is { tag: string; core: string } => entry.core !== undefined)
    .filter((entry) => compareStableCores(entry.core, currentCore) < 0)
    .sort((a, b) => compareStableCores(b.core, a.core));

  return candidates[0]?.tag;
}

function main(): void {
  const { channel, currentTag, writeOutput } = parseArgs();
  const tags = listGitTags();

  const previousTag =
    channel === 'beta' ? resolvePreviousBeta(currentTag, tags) : resolvePreviousStable(currentTag, tags);

  if (writeOutput) {
    appendGithubOutput('previous_tag', previousTag ?? '');
  } else {
    console.log(`previous_tag=${previousTag ?? ''}`);
  }
}

main();
