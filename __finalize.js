const {spawnSync} = require('child_process');
const fs = require('fs');
const root = 'c:/Users/david/Documents/CFv1';
const opts = {cwd: root, encoding: 'utf8', maxBuffer: 5*1024*1024};

// Remove __stage.js that snuck into the commit
try {
  spawnSync('git', ['rm', '--cached', '--force', '__stage.js'], opts);
  try { fs.unlinkSync(root + '/__stage.js'); } catch(e) {}
  console.log('Removed __stage.js from tracking');
} catch(e) { console.log('__stage.js already gone'); }

// Also remove __merge.js and this file from disk
['__merge.js', '__branchcheck.js'].forEach(f => {
  try { fs.unlinkSync(root + '/' + f); console.log('deleted', f); } catch(e) {}
});

// Confirm clean status
const status = spawnSync('git', ['status', '--short'], opts);
const lines = (status.stdout || '').trim().split('\n').filter(Boolean);
console.log('Remaining changes:', lines.length);
lines.slice(0, 10).forEach(l => console.log(' ', l));

const log = spawnSync('git', ['log', '--oneline', '-3'], opts);
console.log('\nMain branch:\n', log.stdout);
