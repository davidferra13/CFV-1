#!/usr/bin/env node
/**
 * ChatGPT REVIEW Bucket Secondary Classifier
 *
 * For the 1,516 conversations with generic titles that couldn't be classified
 * by title alone, this script reads the first ~50 lines of content to check
 * for ChefFlow-relevant signals.
 *
 * Promotes qualifying conversations from REVIEW -> RETAIN.
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const ROOT = process.cwd();
const TRIAGE_PATH = join(ROOT, 'scripts', 'chatgpt-triage-report.json');
const CONV_DIR = join(ROOT, 'obsidian_export', 'chatgpt-conversations');

// Content signals that indicate ChefFlow relevance
const CONTENT_SIGNALS = [
  // Product names
  /chefflow/i, /chef\s*flow/i, /chefos/i, /chef\s*os/i,
  /openclaw/i, /open\s*claw/i, /chefbot/i,
  // Chef business
  /private\s*chef/i, /private\s*dining/i, /catering/i,
  /food\s*cost/i, /per\s*person/i, /per\s*head/i,
  /courses?\s*[-—]\s*\$/i, /tasting\s*menu/i,
  /booking\s*(form|page|system)/i,
  /client\s*portal/i, /chef\s*portal/i,
  // Tech stack
  /next\.?js/i, /supabase/i, /drizzle/i, /postgres/i,
  /auth\.?js/i, /stripe/i, /playwright/i,
  /ollama/i, /gemma/i, /remy/i,
  /raspberry\s*pi/i,
  // Dev context
  /dfprivatechef/i, /cheflowhq/i,
  /claude\s*code/i, /codex/i,
  /vs\s*code.*agent/i, /copilot.*agent/i,
  // Domain objects
  /recipe\s*(book|form|card)/i,
  /event\s*(fsm|state|lifecycle)/i,
  /ledger\s*entr/i, /financial\s*summary/i,
  /ingredient\s*(catalog|price|match)/i,
  /menu\s*(builder|creation|draft)/i,
  /inquiry\s*(form|page|system)/i,
];

function hasContentSignal(filepath) {
  try {
    const content = readFileSync(filepath, 'utf-8');
    // Read first 3000 chars after frontmatter
    const fmEnd = content.indexOf('---', 4);
    const body = fmEnd > 0 ? content.substring(fmEnd + 3, fmEnd + 3 + 3000) : content.substring(0, 3000);

    for (const pattern of CONTENT_SIGNALS) {
      if (pattern.test(body)) {
        return { found: true, pattern: pattern.source };
      }
    }
    return { found: false, pattern: null };
  } catch (err) {
    return { found: false, pattern: null, error: err.message };
  }
}

// --- Main ---
const report = JSON.parse(readFileSync(TRIAGE_PATH, 'utf-8'));
const reviewItems = report.review;

console.log(`Scanning ${reviewItems.length} REVIEW conversations for content signals...`);

const promoted = [];
const stillReview = [];

for (const item of reviewItems) {
  const filepath = join(CONV_DIR, item.filename);
  const result = hasContentSignal(filepath);

  if (result.found) {
    promoted.push({ ...item, contentSignal: result.pattern });
  } else {
    stillReview.push(item);
  }
}

console.log(`\n=== Secondary Classification Results ===`);
console.log(`  Promoted to RETAIN: ${promoted.length}`);
console.log(`  Still REVIEW: ${stillReview.length}`);
console.log(`  Promotion rate: ${((promoted.length / reviewItems.length) * 100).toFixed(1)}%`);

// Sort promoted by message count (most content = most value)
promoted.sort((a, b) => b.messageCount - a.messageCount);

console.log(`\nTop 20 promoted conversations:`);
for (const p of promoted.slice(0, 20)) {
  console.log(`  [${p.messageCount} msg] ${p.title} (signal: ${p.contentSignal})`);
}

// Save results
const output = {
  generatedAt: new Date().toISOString(),
  originalReviewCount: reviewItems.length,
  promotedCount: promoted.length,
  stillReviewCount: stillReview.length,
  promotedMessages: promoted.reduce((s, p) => s + p.messageCount, 0),
  promoted,
  stillReview: stillReview.map(r => ({ title: r.title, filename: r.filename, messageCount: r.messageCount })),
};

const outPath = join(ROOT, 'scripts', 'chatgpt-review-reclassified.json');
writeFileSync(outPath, JSON.stringify(output, null, 2));
console.log(`\nFull results: ${outPath}`);
