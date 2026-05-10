import { cp, rm } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const here = dirname(fileURLToPath(import.meta.url));
const websiteDir = resolve(here, '..');
const repoRoot = resolve(websiteDir, '..');
const networkArchiveDir = resolve(repoRoot, 'sites/network-archive');
const outputDir = resolve(websiteDir, 'build');
const distDir = resolve(networkArchiveDir, 'dist');

function run(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  if (result.status !== 0) {
    const pretty = [command, ...args].join(' ');
    throw new Error(`${pretty} failed with exit code ${result.status}`);
  }
}

run('npm', ['ci'], networkArchiveDir);
run('npm', ['run', 'build'], networkArchiveDir);

await rm(outputDir, { recursive: true, force: true });
await cp(distDir, outputDir, { recursive: true });

console.log(`Copied network archive build to ${outputDir}`);
