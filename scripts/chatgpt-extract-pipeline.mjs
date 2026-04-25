#!/usr/bin/env node
/**
 * ChatGPT Conversation Extraction Pipeline
 *
 * Phase 1: Stages RETAIN conversations into batched directories for mempalace mining
 * Phase 2: Produces extraction report with high-signal content identification
 *
 * Usage:
 *   node scripts/chatgpt-extract-pipeline.mjs --stage          # Create staging dirs
 *   node scripts/chatgpt-extract-pipeline.mjs --extract-batch 1 # Extract batch N
 *   node scripts/chatgpt-extract-pipeline.mjs --report          # Final summary report
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, symlinkSync, copyFileSync } from 'fs';
import { join, basename } from 'path';

const ROOT = process.cwd();
const TRIAGE_PATH = join(ROOT, 'scripts', 'chatgpt-triage-report.json');
const CONV_DIR = join(ROOT, 'obsidian_export', 'chatgpt-conversations');
const STAGE_DIR = join(ROOT, '.chatgpt-ingestion');
const BATCH_SIZE = 200;

// --- PII filter patterns ---
const PII_PATTERNS = [
  /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,                    // phone numbers
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // email addresses
  /\b\d{1,5}\s+[A-Z][a-z]+\s+(St|Ave|Rd|Dr|Ln|Ct|Blvd|Way|Pl|Cir)\b/gi, // street addresses
  /\b\d{5}(-\d{4})?\b/g,                                 // zip codes
];

// Known safe emails (don't redact these)
const SAFE_EMAILS = [
  'dfprivatechef@gmail.com',
  'davidferra13@gmail.com',
];

function redactPII(text) {
  let result = text;
  // Redact phone numbers
  result = result.replace(/\b(\d{3})[-.]?(\d{3})[-.]?(\d{4})\b/g, '[PHONE]');
  // Redact emails (except safe ones)
  result = result.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/gi, (match) => {
    return SAFE_EMAILS.includes(match.toLowerCase()) ? match : '[EMAIL]';
  });
  return result;
}

// --- Content categories for extraction ---
const SIGNAL_PATTERNS = {
  decision: [
    /\b(decided|decision|chose|choosing|went with|going with|picked|selected)\b/i,
    /\b(we should|we need to|let's go with|the plan is|the approach)\b/i,
  ],
  architecture: [
    /\b(architecture|schema|database|table|migration|endpoint|api|route)\b/i,
    /\b(component|layout|middleware|auth|session|token)\b/i,
    /\b(supabase|drizzle|nextjs|next\.js|react|postgres|stripe)\b/i,
  ],
  spec: [
    /\b(spec|specification|requirement|user story|acceptance criteria)\b/i,
    /\b(feature|function|capability|flow|workflow|process)\b/i,
  ],
  operational: [
    /\b(pricing|cost|charge|rate|per person|per head|total)\b/i,
    /\b(booking|event|dinner|client|guest|menu|course)\b/i,
    /\b(allergy|dietary|restriction|vegan|gluten)\b/i,
  ],
  failure: [
    /\b(bug|error|fix|broke|broken|crash|fail|issue|problem)\b/i,
    /\b(workaround|hack|temporary|fallback|regression)\b/i,
  ],
  prompt_engineering: [
    /\b(prompt|system prompt|instruction|custom instruction)\b/i,
    /\b(claude|gpt|ollama|gemma|remy|ai agent|bot)\b/i,
  ],
};

function categorizeContent(text) {
  const categories = [];
  for (const [category, patterns] of Object.entries(SIGNAL_PATTERNS)) {
    const matches = patterns.filter(p => p.test(text));
    if (matches.length > 0) {
      categories.push(category);
    }
  }
  return categories;
}

// --- Parse conversation file ---
function parseConversation(filepath) {
  const content = readFileSync(filepath, 'utf-8');
  const lines = content.split('\n');

  // Extract frontmatter
  let title = '';
  let conversationId = '';
  let messageCount = 0;
  let createdAt = '';
  let updatedAt = '';

  const fmEnd = content.indexOf('---', 4);
  if (fmEnd > 0) {
    const fm = content.substring(0, fmEnd);
    const titleMatch = fm.match(/title:\s*"(.+?)"/);
    if (titleMatch) title = titleMatch[1];
    const idMatch = fm.match(/conversation_id:\s*"(.+?)"/);
    if (idMatch) conversationId = idMatch[1];
    const mcMatch = fm.match(/message_count:\s*(\d+)/);
    if (mcMatch) messageCount = parseInt(mcMatch[1]);
    const caMatch = fm.match(/created_at:\s*"(.+?)"/);
    if (caMatch) createdAt = caMatch[1];
    const uaMatch = fm.match(/updated_at:\s*"(.+?)"/);
    if (uaMatch) updatedAt = uaMatch[1];
  }

  // Extract messages
  const messages = [];
  let currentRole = null;
  let currentContent = [];
  let currentTimestamp = '';

  for (const line of lines) {
    const msgMatch = line.match(/^### \d+ (User|ChatGPT|Assistant|file_search|System)/i);
    if (msgMatch) {
      if (currentRole && currentContent.length > 0) {
        messages.push({
          role: currentRole,
          timestamp: currentTimestamp,
          content: currentContent.join('\n').trim(),
        });
      }
      currentRole = msgMatch[1].toLowerCase();
      currentContent = [];
      currentTimestamp = '';
    } else if (line.startsWith('_') && line.endsWith('_') && line.includes('Z')) {
      // Timestamp line
      const tsMatch = line.match(/_(.+?)(?:\s*\|.*)?_/);
      if (tsMatch) currentTimestamp = tsMatch[1];
    } else {
      currentContent.push(line);
    }
  }
  // Push last message
  if (currentRole && currentContent.length > 0) {
    messages.push({
      role: currentRole,
      timestamp: currentTimestamp,
      content: currentContent.join('\n').trim(),
    });
  }

  return { title, conversationId, messageCount, createdAt, updatedAt, messages };
}

// --- Extract high-signal chunks from a conversation ---
function extractSignal(parsed) {
  const { title, conversationId, messages, createdAt, updatedAt } = parsed;

  const chunks = [];

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    if (msg.role === 'file_search' || msg.role === 'system') continue;

    const text = msg.content;
    if (text.length < 50) continue; // Skip trivially short messages

    const categories = categorizeContent(text);
    if (categories.length === 0) continue; // No signal detected

    // Redact PII
    const safeText = redactPII(text);

    // Truncate very long messages to first 2000 chars
    const truncated = safeText.length > 2000
      ? safeText.substring(0, 2000) + '\n[... truncated]'
      : safeText;

    chunks.push({
      role: msg.role,
      timestamp: msg.timestamp,
      categories,
      content: truncated,
      charCount: text.length,
    });
  }

  return {
    title,
    conversationId,
    createdAt,
    updatedAt,
    totalMessages: messages.length,
    signalChunks: chunks.length,
    categories: [...new Set(chunks.flatMap(c => c.categories))],
    chunks,
  };
}

// --- Stage command: create batched directories ---
function stageRetainFiles() {
  if (!existsSync(TRIAGE_PATH)) {
    console.error('Triage report not found. Run chatgpt-classify.mjs first.');
    process.exit(1);
  }

  const report = JSON.parse(readFileSync(TRIAGE_PATH, 'utf-8'));
  const retainFiles = report.retain.map(e => e.filename);

  console.log(`Staging ${retainFiles.length} RETAIN files into batches of ${BATCH_SIZE}...`);

  // Clean staging dir
  mkdirSync(STAGE_DIR, { recursive: true });

  const batches = [];
  for (let i = 0; i < retainFiles.length; i += BATCH_SIZE) {
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const batchFiles = retainFiles.slice(i, i + BATCH_SIZE);
    const batchDir = join(STAGE_DIR, `batch-${String(batchNum).padStart(3, '0')}`);
    mkdirSync(batchDir, { recursive: true });

    for (const filename of batchFiles) {
      const src = join(CONV_DIR, filename);
      const dest = join(batchDir, filename);
      if (existsSync(src)) {
        copyFileSync(src, dest);
      }
    }

    batches.push({
      batch: batchNum,
      dir: batchDir,
      fileCount: batchFiles.length,
      files: batchFiles,
    });

    console.log(`  Batch ${batchNum}: ${batchFiles.length} files -> ${batchDir}`);
  }

  // Save batch manifest
  const manifest = {
    createdAt: new Date().toISOString(),
    totalFiles: retainFiles.length,
    batchSize: BATCH_SIZE,
    batches,
  };
  writeFileSync(join(STAGE_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log(`\nManifest saved to ${join(STAGE_DIR, 'manifest.json')}`);
  return manifest;
}

// --- Extract command: process a batch ---
function extractBatch(batchNum) {
  const batchDir = join(STAGE_DIR, `batch-${String(batchNum).padStart(3, '0')}`);
  if (!existsSync(batchDir)) {
    console.error(`Batch directory not found: ${batchDir}`);
    process.exit(1);
  }

  const files = readdirSync(batchDir).filter(f => f.endsWith('.md'));
  console.log(`\nProcessing batch ${batchNum}: ${files.length} conversations...`);

  const results = [];
  let totalSignalChunks = 0;
  let totalMessages = 0;

  for (const file of files) {
    const filepath = join(batchDir, file);
    try {
      const parsed = parseConversation(filepath);
      const signal = extractSignal(parsed);
      totalMessages += signal.totalMessages;
      totalSignalChunks += signal.signalChunks;

      if (signal.signalChunks > 0) {
        results.push(signal);
      }
    } catch (err) {
      console.error(`  Error processing ${file}: ${err.message}`);
    }
  }

  // Sort by signal density
  results.sort((a, b) => b.signalChunks - a.signalChunks);

  const batchReport = {
    batch: batchNum,
    processedAt: new Date().toISOString(),
    filesProcessed: files.length,
    totalMessages,
    conversationsWithSignal: results.length,
    totalSignalChunks,
    categoryBreakdown: {},
    conversations: results,
  };

  // Count categories
  for (const r of results) {
    for (const cat of r.categories) {
      batchReport.categoryBreakdown[cat] = (batchReport.categoryBreakdown[cat] || 0) + 1;
    }
  }

  // Save batch extraction
  const outPath = join(STAGE_DIR, `extraction-batch-${String(batchNum).padStart(3, '0')}.json`);
  writeFileSync(outPath, JSON.stringify(batchReport, null, 2));

  console.log(`\n=== Batch ${batchNum} Extraction Report ===`);
  console.log(`  Files processed: ${files.length}`);
  console.log(`  Messages scanned: ${totalMessages}`);
  console.log(`  Conversations with signal: ${results.length}`);
  console.log(`  Signal chunks extracted: ${totalSignalChunks}`);
  console.log(`  Categories: ${JSON.stringify(batchReport.categoryBreakdown)}`);
  console.log(`  Output: ${outPath}`);

  return batchReport;
}

// --- Report command: summarize all batches ---
function generateReport() {
  if (!existsSync(STAGE_DIR)) {
    console.error('Staging directory not found. Run --stage first.');
    process.exit(1);
  }

  const extractions = readdirSync(STAGE_DIR)
    .filter(f => f.startsWith('extraction-batch-') && f.endsWith('.json'))
    .sort()
    .map(f => JSON.parse(readFileSync(join(STAGE_DIR, f), 'utf-8')));

  const triage = JSON.parse(readFileSync(TRIAGE_PATH, 'utf-8'));

  const totalReport = {
    generatedAt: new Date().toISOString(),
    source: 'ChatGPT export (2,519 conversations)',
    triageStats: triage.stats,
    ingestion: {
      batchesProcessed: extractions.length,
      totalFilesProcessed: extractions.reduce((s, e) => s + e.filesProcessed, 0),
      totalMessagesScanned: extractions.reduce((s, e) => s + e.totalMessages, 0),
      conversationsWithSignal: extractions.reduce((s, e) => s + e.conversationsWithSignal, 0),
      totalSignalChunks: extractions.reduce((s, e) => s + e.totalSignalChunks, 0),
    },
    categoryTotals: {},
    topConversations: [],
    discardedCount: triage.stats.discard,
    reviewPendingCount: triage.stats.review,
  };

  // Aggregate categories
  for (const ext of extractions) {
    for (const [cat, count] of Object.entries(ext.categoryBreakdown)) {
      totalReport.categoryTotals[cat] = (totalReport.categoryTotals[cat] || 0) + count;
    }
  }

  // Top 30 conversations across all batches
  const allConvos = extractions.flatMap(e => e.conversations);
  allConvos.sort((a, b) => b.signalChunks - a.signalChunks);
  totalReport.topConversations = allConvos.slice(0, 30).map(c => ({
    title: c.title,
    conversationId: c.conversationId,
    signalChunks: c.signalChunks,
    totalMessages: c.totalMessages,
    categories: c.categories,
    dateRange: `${c.createdAt?.substring(0, 10)} to ${c.updatedAt?.substring(0, 10)}`,
  }));

  const outPath = join(STAGE_DIR, 'ingestion-report.json');
  writeFileSync(outPath, JSON.stringify(totalReport, null, 2));

  // Also write markdown version
  let md = `# ChatGPT Ingestion Report\n\n`;
  md += `Generated: ${totalReport.generatedAt}\n\n`;
  md += `## Triage Summary\n\n`;
  md += `| Category | Count | Messages |\n|---|---|---|\n`;
  md += `| RETAIN | ${triage.stats.retain} | ${triage.stats.retainMessages} |\n`;
  md += `| REVIEW | ${triage.stats.review} | ${triage.stats.reviewMessages} |\n`;
  md += `| DISCARD | ${triage.stats.discard} | ${triage.stats.discardMessages} |\n`;
  md += `| **Total** | **${triage.stats.total}** | **${triage.stats.retainMessages + triage.stats.reviewMessages + triage.stats.discardMessages}** |\n\n`;
  md += `## Extraction Results\n\n`;
  md += `- Batches processed: ${totalReport.ingestion.batchesProcessed}\n`;
  md += `- Files processed: ${totalReport.ingestion.totalFilesProcessed}\n`;
  md += `- Messages scanned: ${totalReport.ingestion.totalMessagesScanned}\n`;
  md += `- Conversations with signal: ${totalReport.ingestion.conversationsWithSignal}\n`;
  md += `- Signal chunks extracted: ${totalReport.ingestion.totalSignalChunks}\n\n`;
  md += `## Category Breakdown\n\n`;
  md += `| Category | Conversations |\n|---|---|\n`;
  for (const [cat, count] of Object.entries(totalReport.categoryTotals).sort((a, b) => b[1] - a[1])) {
    md += `| ${cat} | ${count} |\n`;
  }
  md += `\n## Top 30 Conversations by Signal Density\n\n`;
  md += `| Title | Signal Chunks | Messages | Categories | Date Range |\n|---|---|---|---|---|\n`;
  for (const c of totalReport.topConversations) {
    md += `| ${c.title} | ${c.signalChunks} | ${c.totalMessages} | ${c.categories.join(', ')} | ${c.dateRange} |\n`;
  }
  md += `\n## What Was Discarded\n\n`;
  md += `${triage.stats.discard} conversations classified as noise (gaming, health/personal, entertainment/trivia). `;
  md += `Full list in \`scripts/chatgpt-triage-report.json\` under the "discard" key.\n\n`;
  md += `## What Needs Review\n\n`;
  md += `${triage.stats.review} conversations with generic titles that could not be classified by keyword alone. `;
  md += `These need a secondary content-based classification pass.\n`;

  writeFileSync(join(STAGE_DIR, 'ingestion-report.md'), md);

  console.log(`\n=== Final Ingestion Report ===`);
  console.log(JSON.stringify(totalReport.ingestion, null, 2));
  console.log(`\nReport saved to: ${outPath}`);
  console.log(`Markdown report: ${join(STAGE_DIR, 'ingestion-report.md')}`);
}

// --- CLI ---
const args = process.argv.slice(2);

if (args.includes('--stage')) {
  stageRetainFiles();
} else if (args.includes('--extract-batch')) {
  const idx = args.indexOf('--extract-batch');
  const batchNum = parseInt(args[idx + 1], 10);
  if (isNaN(batchNum)) {
    console.error('Usage: --extract-batch <batch-number>');
    process.exit(1);
  }
  extractBatch(batchNum);
} else if (args.includes('--extract-all')) {
  // Process all batches
  const manifest = JSON.parse(readFileSync(join(STAGE_DIR, 'manifest.json'), 'utf-8'));
  for (const batch of manifest.batches) {
    extractBatch(batch.batch);
  }
} else if (args.includes('--report')) {
  generateReport();
} else {
  console.log('ChatGPT Extraction Pipeline');
  console.log('');
  console.log('Commands:');
  console.log('  --stage          Create staged batch directories from triage report');
  console.log('  --extract-batch N  Extract signal from batch N');
  console.log('  --extract-all    Extract signal from all batches');
  console.log('  --report         Generate final ingestion report');
  console.log('');
  console.log('Typical workflow:');
  console.log('  1. node scripts/chatgpt-classify.mjs         # Classify all conversations');
  console.log('  2. node scripts/chatgpt-extract-pipeline.mjs --stage      # Stage RETAIN files');
  console.log('  3. node scripts/chatgpt-extract-pipeline.mjs --extract-all # Extract signal');
  console.log('  4. node scripts/chatgpt-extract-pipeline.mjs --report     # Generate report');
}
