#!/usr/bin/env node
/**
 * save-ticket.cjs — Save a patch ticket to .patches/queue/
 *
 * Usage:
 *   npm run save:ticket                        ← auto-extracts title from clipboard
 *   npm run save:ticket -- "custom name"       ← manual override
 *
 * Reads the clipboard, auto-numbers the file, and saves to .patches/queue/.
 * Title is pulled from "# Ticket: ..." in the clipboard content if present.
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
    if (process.platform === 'win32') {
      return execSync('powershell.exe -NoProfile -Command "Get-Clipboard -Raw"', {
        encoding: 'utf8',
        timeout: 5000,
      });
    }
    if (process.platform === 'darwin') {
      return execSync('pbpaste', { encoding: 'utf8', timeout: 5000 });
    }
    return execSync('xclip -selection clipboard -o', {
      encoding: 'utf8',
      timeout: 5000,
    });
  } catch {
    return null;
  }
}

function extractTitle(content) {
  // Try "# Ticket: Some Title"
  const ticketMatch = content.match(/^#\s*Ticket:\s*(.+)/m);
  if (ticketMatch) return ticketMatch[1].trim();

  // Try "## Intent\n Some description"
  const intentMatch = content.match(/^##\s*Intent\s*\n+\s*(.+)/m);
  if (intentMatch) return intentMatch[1].trim().slice(0, 60);

  // Fallback: first heading
  const headingMatch = content.match(/^#+\s+(.+)/m);
  if (headingMatch) return headingMatch[1].trim();

  return 'untitled-ticket';
}

// ── Main ─────────────────────────────────────────────────────────────────────

function main() {
  // Read clipboard
  const content = readClipboard();

  if (!content || content.trim().length < 20) {
    console.error('\n  ERROR: Clipboard is empty or too short.');
    console.error('  Copy the patch ticket from Continue first, then run this command.\n');
    process.exit(1);
  }

  // Get description: from argument or auto-extract from content
  const argDescription = process.argv.slice(2).join(' ').trim();
  const description = argDescription || extractTitle(content);

  // Build filename
  const num = getNextTicketNumber();
  const slug = slugify(description);
  const filename = `${String(num).padStart(4, '0')}-${slug}.md`;
  const filepath = path.join(QUEUE_DIR, filename);

  // Write
  fs.writeFileSync(filepath, content.trim() + '\n', 'utf8');

  console.log(`\n  Saved: .patches/queue/${filename}`);
  console.log(`  ${content.trim().split('\n').length} lines written`);
  console.log(`\n  When Claude is back, say "Integrate queued patches"\n`);
}

main();
