import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const version = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).version;
const tag = `v${version}`;

const branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
if (branch !== 'main') {
  console.error(`release:tag must run on main (current branch: ${branch})`);
  process.exit(1);
}

execSync('git fetch origin main', { stdio: 'inherit', cwd: root });
execSync('git merge --ff-only origin/main', { stdio: 'inherit', cwd: root });

try {
  execSync(`git rev-parse ${tag}^{commit}`, { stdio: 'ignore', cwd: root });
  console.log(`Tag ${tag} already exists`);
} catch {
  execSync(`git tag ${tag}`, { stdio: 'inherit', cwd: root });
}

execSync(`git push origin ${tag}`, { stdio: 'inherit', cwd: root });
console.log(`Pushed ${tag} — Release workflow will build and publish.`);
