#!/usr/bin/env node
/**
 * save-ticket.cjs — Save a patch ticket to .patches/queue/
 *
 * Usage:
 *   npm run save:ticket -- "short description"
 *
 * Reads the clipboard content and writes it to .patches/queue/NNNN-short-description.md
 * The ticket number is auto-incremented based on existing files in the queue.
 *
 * Examples:
 *   npm run save:ticket -- "add-travel-panel"
 *   npm run save:ticket -- "fix-auth-guard-missing"
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const QUEUE_DIR = path.join(__dirname, '..', '.patches', 'queue');

// ── Helpers ──────────────────────────────────────────────────────────────────

function getNextTicketNumber() {
  if (!fs.existsSync(QUEUE_DIR)) {
    fs.mkdirSync(QUEUE_DIR, { recursive: true });
  }

  const files = fs.readdirSync(QUEUE_DIR)
    .filter(f => /^\d{4}-.*\.md$/.test(f))
    .sort();

  if (files.length === 0) return 1;

  const lastNum = parseInt(files[files.length - 1].slice(0, 4), 10);
  return lastNum + 1;
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
}

function readClipboard() {
  try {
    // Windows — PowerShell
    if (process.platform === 'win32') {
      return execSync('powershell.exe -NoProfile -Command "Get-Clipboard -Raw"', {
        encoding: 'utf8',
        timeout: 5000,
      });
    }
    // macOS
    if (process.platform === 'darwin') {
      return execSync('pbpaste', { encoding: 'utf8', timeout: 5000 });
    }
    // Linux (xclip)
    return execSync('xclip -selection clipboard -o', {
      encoding: 'utf8',
      timeout: 5000,
    });
  } catch {
    return null;
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────

function main() {
  const description = process.argv.slice(2).join(' ').trim();

  if (!description) {
    console.error('\n  Usage: npm run save:ticket -- "short description"\n');
    console.error('  Example: npm run save:ticket -- "add-travel-panel"\n');
    process.exit(1);
  }

  // Read clipboard
  const content = readClipboard();

  if (!content || content.trim().length < 20) {
    console.error('\n  ERROR: Clipboard is empty or too short.');
    console.error('  Copy the patch ticket from Continue first, then run this command.\n');
    process.exit(1);
  }

  // Check it looks like a ticket (loose check — just needs a heading)
  if (!content.includes('# Ticket:') && !content.includes('## Intent') && !content.includes('## Patches')) {
    console.error('\n  WARNING: Clipboard content doesn\'t look like a patch ticket.');
    console.error('  Expected to find "# Ticket:", "## Intent", or "## Patches".');
    console.error('  Saving anyway — review the file before integration.\n');
  }

  // Build filename
  const num = getNextTicketNumber();
  const slug = slugify(description);
  const filename = `${String(num).padStart(4, '0')}-${slug}.md`;
  const filepath = path.join(QUEUE_DIR, filename);

  // Write
  fs.writeFileSync(filepath, content.trim() + '\n', 'utf8');

  console.log(`\n  ✓ Saved: .patches/queue/${filename}`);
  console.log(`  ✓ ${content.trim().split('\n').length} lines written`);
  console.log(`\n  Next step: When Claude is back, say "Integrate queued patches"\n`);
}

main();
