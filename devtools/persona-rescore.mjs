#!/usr/bin/env node

/**
 * Persona Re-score
 *
 * Re-runs the analyzer on an existing persona to measure improvement after building features.
 * Tracks score history over time.
 *
 * Usage:
 *   node devtools/persona-rescore.mjs --slug kai-donovan
 *   node devtools/persona-rescore.mjs --slug kai-donovan --model gemma3:4b
 */

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname, join, extname } from 'path';
import { execFileSync, execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '..');

const SCORE_HISTORY_FILE = join(ROOT, 'system', 'persona-batch-synthesis', 'score-history.json');

// --- CLI ---

function parseArgs(argv) {
  const opts = {
    slug: null,
    all: false,
    model: process.env.PERSONA_MODEL || 'qwen3:4b',
    ollamaUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
  };

  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--all') {
      opts.all = true;
    } else if (argv[i] === '--slug' && argv[i + 1]) {
      opts.slug = argv[++i];
    } else if (argv[i] === '--model' && argv[i + 1]) {
      opts.model = argv[++i];
    } else if (argv[i] === '--ollama-url' && argv[i + 1]) {
      opts.ollamaUrl = argv[++i];
    }
  }

  if (!opts.slug && !opts.all) {
    console.error('Usage: node devtools/persona-rescore.mjs --slug <persona-slug>');
    console.error('       node devtools/persona-rescore.mjs --all');
    console.error('       node devtools/persona-rescore.mjs --slug kai-donovan --model gemma3:4b');
    process.exit(1);
  }

  return opts;
}

function getGitCommit() {
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf-8', cwd: ROOT }).trim();
  } catch {
    return 'unknown';
  }
}

function slugFromFilename(file) {
  return file
    .replace(/\.[^.]+$/, '')
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

// --- Find persona source file ---

function findPersonaFile(slug) {
  const searchDirs = [
    join(ROOT, 'Chef Flow Personas', 'Completed'),
    join(ROOT, 'Chef Flow Personas', 'Uncompleted'),
  ];

  for (const baseDir of searchDirs) {
    if (!existsSync(baseDir)) continue;

    let typeDirs;
    try {
      typeDirs = readdirSync(baseDir);
    } catch {
      continue;
    }

    for (const typeDir of typeDirs) {
      const typePath = join(baseDir, typeDir);
      let files;
      try {
        files = readdirSync(typePath);
      } catch {
        continue;
      }

      for (const f of files) {
        const ext = extname(f).toLowerCase();
        if (ext !== '.txt' && ext !== '.md') continue;

        // Normalize filename to slug form
        const fileSlug = slugFromFilename(f);

        if (fileSlug === slug || fileSlug.includes(slug)) {
          return join(typePath, f);
        }
      }
    }
  }

  return null;
}

function findCompletedSlugs() {
  const completedDir = join(ROOT, 'Chef Flow Personas', 'Completed');
  const slugs = [];
  const seen = new Set();

  if (!existsSync(completedDir)) return slugs;

  let typeDirs;
  try {
    typeDirs = readdirSync(completedDir);
  } catch {
    return slugs;
  }

  for (const typeDir of typeDirs) {
    const typePath = join(completedDir, typeDir);
    let files;
    try {
      files = readdirSync(typePath);
    } catch {
      continue;
    }

    for (const file of files) {
      const ext = extname(file).toLowerCase();
      if (ext !== '.txt' && ext !== '.md') continue;
      const slug = slugFromFilename(file);
      if (seen.has(slug)) continue;
      seen.add(slug);
      slugs.push(slug);
    }
  }

  return slugs.sort();
}

// --- Score extraction ---

function extractScore(reportPath) {
  if (!existsSync(reportPath)) return null;
  const content = readFileSync(reportPath, 'utf-8');
  const match = content.match(/^## Score:\s*(\d+)\/100/m);
  return match ? parseInt(match[1], 10) : null;
}

// --- Score history ---

function loadScoreHistory() {
  if (!existsSync(SCORE_HISTORY_FILE)) return [];
  try {
    return JSON.parse(readFileSync(SCORE_HISTORY_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

function saveScoreHistory(history) {
  const dir = dirname(SCORE_HISTORY_FILE);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(SCORE_HISTORY_FILE, JSON.stringify(history, null, 2) + '\n', 'utf-8');
}

function latestScoreForSlug(history, slug) {
  for (let i = history.length - 1; i >= 0; i--) {
    const entry = history[i];
    if (entry?.slug === slug && Number.isFinite(entry.score)) return entry.score;
  }
  return null;
}

// --- Rescore ---

function rescoreSlug(opts) {
  // Step 1: Find persona source file
  const personaFile = findPersonaFile(opts.slug);
  if (!personaFile) {
    throw new Error(`No persona file found matching slug "${opts.slug}"`);
  }
  console.log(`[rescore] Found persona: ${personaFile}`);

  // Step 2: Run analyzer
  console.log(`[rescore] Running analyzer (model: ${opts.model})...`);
  let analyzerOutput;
  try {
    analyzerOutput = execFileSync(
      process.execPath,
      ['devtools/persona-analyzer.mjs', personaFile, '--model', opts.model, '--ollama-url', opts.ollamaUrl],
      { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'], timeout: 120000, cwd: ROOT }
    );
  } catch (err) {
    const stderr = err.stderr ? err.stderr.toString().trim() : err.message;
    throw new Error(`Analyzer failed: ${stderr}`);
  }

  // Step 3: Parse report path from analyzer stdout (last non-empty line)
  const lines = analyzerOutput.trim().split('\n');
  let reportPath = null;
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();
    if (line.length > 0) {
      reportPath = line;
      break;
    }
  }

  if (!reportPath) {
    throw new Error('Could not parse report path from analyzer output');
  }

  const fullReportPath = resolve(ROOT, reportPath);
  console.log(`[rescore] Report: ${reportPath}`);

  // Step 4: Extract score
  const score = extractScore(fullReportPath);
  if (score === null) {
    throw new Error(`Could not extract score from ${reportPath}`);
  }
  console.log(`[rescore] Score: ${score}/100`);

  // Step 5: Append to score history
  const history = loadScoreHistory();
  const previousScore = latestScoreForSlug(history, opts.slug);
  const today = new Date().toISOString().slice(0, 10);
  history.push({ slug: opts.slug, date: today, score, commit: getGitCommit() });
  saveScoreHistory(history);
  console.log(`[rescore] Score history updated (${history.filter(h => h.slug === opts.slug).length} entries for ${opts.slug})`);

  return { slug: opts.slug, score, previousScore, reportPath, date: today };
}

function runSynthesis() {
  console.log('[rescore] Running batch synthesis...');
  try {
    execSync('node devtools/persona-batch-synthesizer.mjs', {
      stdio: 'inherit',
      timeout: 60000,
      cwd: ROOT,
    });
    console.log('[rescore] Synthesis complete.');
  } catch (err) {
    console.log(`[rescore] Warning: synthesis failed - ${err.message}`);
  }
}

function printBatchSummary(results, failures) {
  const scored = results.length;
  const improved = results.filter(r => r.previousScore !== null && r.score > r.previousScore).length;
  const unchanged = results.filter(r => r.previousScore !== null && r.score === r.previousScore).length;
  const regressed = results.filter(r => r.previousScore !== null && r.score < r.previousScore).length;
  const newEntries = results.filter(r => r.previousScore === null).length;
  const avg = scored > 0 ? Math.round(results.reduce((sum, r) => sum + r.score, 0) / scored) : 0;
  const previousScores = results.filter(r => r.previousScore !== null);
  const prevAvg = previousScores.length > 0
    ? Math.round(previousScores.reduce((sum, r) => sum + r.previousScore, 0) / previousScores.length)
    : null;

  console.log('');
  console.log(`[rescore] Batch complete. ${scored} inputs re-scored.${failures.length ? ` ${failures.length} failed.` : ''}`);
  console.log(`[rescore]   Improved: ${improved}  |  Unchanged: ${unchanged}  |  Regressed: ${regressed}  |  New: ${newEntries}`);
  console.log(`[rescore]   Average score: ${avg}/100${prevAvg === null ? '' : ` (was ${prevAvg}/100)`}`);

  if (results.length > 0) {
    console.log('');
    console.log('[rescore]   Input                                    Score   Previous  Delta');
    console.log('[rescore]   -----                                    -----   --------  -----');
    for (const result of results) {
      const previous = result.previousScore === null ? '--' : `${result.previousScore}`;
      const delta = result.previousScore === null ? '--' : `${result.score - result.previousScore >= 0 ? '+' : ''}${result.score - result.previousScore}`;
      console.log(`[rescore]   ${result.slug.padEnd(40).slice(0, 40)} ${String(result.score).padEnd(7)} ${previous.padEnd(9)} ${delta}`);
    }
  }

  if (failures.length > 0) {
    console.log('[rescore]   Failures:');
    for (const failure of failures) {
      console.log(`[rescore]     ${failure.slug}: ${failure.error}`);
    }
  }
}

function runBatch(opts) {
  const slugs = findCompletedSlugs();
  if (slugs.length === 0) {
    console.log('[rescore] No completed inputs found in Chef Flow Personas/Completed/.');
    return;
  }

  console.log(`[rescore] Re-scoring ${slugs.length} completed inputs...`);
  const results = [];
  const failures = [];

  for (const slug of slugs) {
    console.log('');
    console.log(`[rescore] === ${slug} ===`);
    try {
      results.push(rescoreSlug({ ...opts, slug }));
    } catch (err) {
      const message = err?.message || String(err);
      console.error(`[rescore] Failed ${slug}: ${message}`);
      failures.push({ slug, error: message });
    }
  }

  printBatchSummary(results, failures);
  if (failures.length > 0) process.exitCode = 1;
}

// --- Main ---

function main() {
  const opts = parseArgs(process.argv);

  if (opts.all) {
    runBatch(opts);
    return;
  }

  let result;
  try {
    result = rescoreSlug(opts);
  } catch (err) {
    console.error(`[rescore] ${err?.message || err}`);
    console.error('Searched: Chef Flow Personas/Completed/ and Chef Flow Personas/Uncompleted/');
    process.exit(1);
  }

  // Step 6: Run synthesizer
  runSynthesis();

  console.log(`[rescore] Done. ${opts.slug} scored ${result.score}/100 on ${result.date}.`);
}

main();
