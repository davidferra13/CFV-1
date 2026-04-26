#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const REPORTS_DIR = path.join(ROOT, 'docs', 'stress-tests');
const HISTORY_DIR = path.join(ROOT, 'system', 'persona-batch-synthesis');
const HISTORY_FILE = path.join(HISTORY_DIR, 'score-history.json');

const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const force = args.has('--force');
const PREFIX = '[score-seeder]';

function extractScore(text) {
  // Pattern 1: ## Score: N/100
  const m1 = /##\s*(?:\d+\)\s*)?Score[:\s]*\**(\d+)\s*\/\s*100\**/i.exec(text);
  if (m1) return parseInt(m1[1], 10);
  // Pattern 2: **N / 100** or **N/100**
  const m2 = /\*\*(\d+)\s*\/\s*100\*\*/i.exec(text);
  if (m2) return parseInt(m2[1], 10);
  return null;
}

function countPersonas(entries) {
  return new Set(entries.map((entry) => entry.slug)).size;
}

if (fs.existsSync(HISTORY_FILE) && !force) {
  let existingEntries = [];
  try {
    const existingText = fs.readFileSync(HISTORY_FILE, 'utf8');
    const parsed = JSON.parse(existingText);
    if (Array.isArray(parsed)) existingEntries = parsed;
  } catch {
    existingEntries = [];
  }

  console.error(
    `${PREFIX} Score history already exists with ${existingEntries.length} entries. Use --force to overwrite.`
  );
  process.exit(0);
}

console.error(`${PREFIX} Scanning docs/stress-tests/...`);

let reportNames = [];
try {
  reportNames = fs
    .readdirSync(REPORTS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isFile() && /^persona-.*\.md$/.test(entry.name))
    .map((entry) => entry.name)
    .sort();
} catch (error) {
  console.error(`${PREFIX} Failed to read docs/stress-tests/: ${error.message}`);
  process.exit(1);
}

if (reportNames.length === 0) {
  console.error(`${PREFIX} No stress test reports found in docs/stress-tests/`);
  process.exit(1);
}

console.error(`${PREFIX} Found ${reportNames.length} reports`);

const history = [];
const reportPattern = /^persona-(.+)-(\d{4}-\d{2}-\d{2})\.md$/;

for (const reportName of reportNames) {
  const match = reportPattern.exec(reportName);
  if (!match) {
    console.error(`${PREFIX} Warning: skipping ${reportName}; filename does not match persona-{slug}-{YYYY-MM-DD}.md`);
    continue;
  }

  const [, slug, date] = match;
  const reportPath = path.join(REPORTS_DIR, reportName);
  const text = fs.readFileSync(reportPath, 'utf8');
  const score = extractScore(text);

  if (score === null) {
    console.error(`${PREFIX} Warning: skipping ${reportName}; no extractable score`);
    continue;
  }

  history.push({ slug, date, score });
  console.error(`${PREFIX}   ${slug} (${date}): ${score}/100`);
}

history.sort((a, b) => {
  const dateComparison = a.date.localeCompare(b.date);
  if (dateComparison !== 0) return dateComparison;
  return a.slug.localeCompare(b.slug);
});

const personaCount = countPersonas(history);

if (dryRun) {
  process.stdout.write(`${JSON.stringify(history, null, 2)}\n`);
  console.error(`${PREFIX} Would write ${history.length} entries for ${personaCount} personas`);
} else {
  fs.mkdirSync(HISTORY_DIR, { recursive: true });
  fs.writeFileSync(HISTORY_FILE, `${JSON.stringify(history, null, 2)}\n`, 'utf8');
  console.error(`${PREFIX} Seeded score history with ${history.length} entries for ${personaCount} personas.`);
}
