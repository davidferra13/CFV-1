const {spawnSync} = require('child_process');
const fs = require('fs');
const root = 'c:/Users/david/Documents/CFv1';
const opts = {cwd: root, encoding: 'utf8', maxBuffer: 5*1024*1024};

// Delete this script from disk before committing
// (will be run last)

// Stage everything
spawnSync('git', ['add', '-A'], opts);

// Also explicitly remove __stage.js if still tracked
spawnSync('git', ['rm', '--cached', '--force', '--ignore-unmatch', '__stage.js'], opts);

const status = spawnSync('git', ['diff', '--cached', '--name-only'], opts);
const files = (status.stdout || '').trim().split('\n').filter(Boolean);
console.log('Staging', files.length, 'files:');
files.forEach(f => console.log(' ', f));

const msg = [
  'chore: workflow doc, gitignore fixes, merge cleanup',
  '',
  '- Add docs/AGENT-WORKFLOW.md — persistent professional workflow',
  '  playbook covering health checks, migration safety, parallel',
  '  agent rules, and merge procedure',
  '- Update CLAUDE.md with health check commands and workflow reference',
  '- Extend .gitignore to cover PWA fallback/worker build artifacts',
  '- Remove __stage.js temp script that was accidentally committed',
  '- Add loading skeletons for client, event, inquiry, quote detail pages',
  '',
  'Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>',
].join('\n');

const commit = spawnSync('git', ['commit', '-m', msg], opts);
console.log('\nCommit exit:', commit.status);
console.log(commit.stdout.trim());

// Clean up this script from disk
try { fs.unlinkSync(root + '/__final-commit.js'); } catch(e) {}
try { fs.unlinkSync(root + '/__finalize.js'); } catch(e) {}

const log = spawnSync('git', ['log', '--oneline', '-4'], opts);
console.log('\nMain branch now:\n', log.stdout);
