import { readFileSync, writeFileSync } from 'fs';

const htmlPath = 'c:/Users/david/Documents/CFv1/scripts/launcher/index.html';
const jsPath = 'c:/Users/david/Documents/CFv1/scripts/pixel-office.js';

let html = readFileSync(htmlPath, 'utf8');
const newJS = readFileSync(jsPath, 'utf8');

// Find and replace the old pixel office code
const startMarker = '// ── Pixel Office';
const endMarker = '})();\n\n</script>';

const startIdx = html.indexOf(startMarker);
const endIdx = html.indexOf('})();', startIdx);

if (startIdx === -1) {
  console.log('ERROR: Could not find start marker');
  process.exit(1);
}
if (endIdx === -1) {
  console.log('ERROR: Could not find end marker');
  process.exit(1);
}

// Replace from startMarker through the closing })();
const beforeJS = html.slice(0, startIdx);
const afterJS = html.slice(endIdx + 5); // skip past })();

html = beforeJS + newJS + afterJS;

writeFileSync(htmlPath, html, 'utf8');
console.log('Pixel Office v2 injected. Old code replaced.');
