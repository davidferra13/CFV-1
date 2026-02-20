const {spawnSync} = require('child_process');
const root = 'c:/Users/david/Documents/CFv1';
const opts = {cwd: root, encoding: 'utf8', maxBuffer: 10*1024*1024};

const add = spawnSync('git', ['add', '-A'], opts);
if (add.status) {
  console.log('git add failed:', add.stderr);
  process.exit(1);
}
console.log('Staged successfully');

const status = spawnSync('git', ['diff', '--cached', '--name-only'], opts);
const count = (status.stdout || '').trim().split('\n').filter(Boolean).length;
console.log('Files staged for commit:', count);
