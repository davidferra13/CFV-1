#!/usr/bin/env node

import { existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const host = process.env.OPENCLAW_SSH_HOST || 'pi';
const remoteDir = process.env.OPENCLAW_REMOTE_DIR || '/home/davidferra/openclaw-prices';
const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '');
const backupDir = `${remoteDir}/backups/codex-hotfix-${stamp}`;
const hotfixRoot = join(__dirname, 'hotfixes', '2026-04-09');
const smoke = process.argv.includes('--smoke');

const files = [
  {
    local: join(hotfixRoot, 'services', 'aggregator.mjs'),
    remote: `${remoteDir}/services/aggregator.mjs`,
    verify: `node --check ${remoteDir}/services/aggregator.mjs`,
  },
  {
    local: join(hotfixRoot, 'services', 'cross-match.mjs'),
    remote: `${remoteDir}/services/cross-match.mjs`,
    verify: `node --check ${remoteDir}/services/cross-match.mjs`,
  },
  {
    local: join(hotfixRoot, 'scripts', 'growth-tracker.py'),
    remote: `${remoteDir}/scripts/growth-tracker.py`,
    verify: `python3 -m py_compile ${remoteDir}/scripts/growth-tracker.py`,
  },
];

function run(cmd, args, options = {}) {
  const result = spawnSync(cmd, args, {
    stdio: 'inherit',
    encoding: 'utf8',
    ...options,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${cmd} ${args.join(' ')} failed with exit code ${result.status}`);
  }
}

for (const file of files) {
  if (!existsSync(file.local)) {
    throw new Error(`Missing hotfix file: ${file.local}`);
  }
}

console.log(`Deploying OpenClaw hotfix bundle to ${host}:${remoteDir}`);
run('ssh', [
  host,
  'bash',
  '-lc',
  [
    `mkdir -p ${backupDir}`,
    `mkdir -p ${remoteDir}/services`,
    `mkdir -p ${remoteDir}/scripts`,
    ...files.map((file) => `[ -f ${file.remote} ] && cp ${file.remote} ${backupDir}/$(basename ${file.remote}) || true`),
  ].join(' && '),
]);

for (const file of files) {
  console.log(`Copying ${file.local} -> ${file.remote}`);
  run('scp', [file.local, `${host}:${file.remote}`]);
}

console.log('Running remote syntax checks');
for (const file of files) {
  run('ssh', [host, 'bash', '-lc', file.verify]);
}

if (smoke) {
  console.log('Running remote smoke checks');
  run('ssh', [host, 'bash', '-lc', `cd ${remoteDir} && python3 scripts/growth-tracker.py`]);
  run('ssh', [host, 'bash', '-lc', `cd ${remoteDir} && node services/aggregator.mjs`]);
}

console.log(`Deployment complete. Backups: ${backupDir}`);
