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
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '..');

const SCORE_HISTORY_FILE = join(ROOT, 'system', 'persona-batch-synthesis', 'score-history.json');

// --- CLI ---

function parseArgs(argv) {
  const opts = {
    slug: null,
    model: process.env.PERSONA_MODEL || 'qwen3:4b',
    ollamaUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
  };

  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--slug' && argv[i + 1]) {
      opts.slug = argv[++i];
    } else if (argv[i] === '--model' && argv[i + 1]) {
      opts.model = argv[++i];
    } else if (argv[i] === '--ollama-url' && argv[i + 1]) {
      opts.ollamaUrl = argv[++i];
    }
  }

  if (!opts.slug) {
    console.error('Usage: node devtools/persona-rescore.mjs --slug <persona-slug>');
    console.error('       node devtools/persona-rescore.mjs --slug kai-donovan --model gemma3:4b');
    process.exit(1);
  }

  return opts;
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
        const fileSlug = f
          .replace(/\.[^.]+$/, '')
          .toLowerCase()
          .replace(/\s+/g, '-')
          .replace(/[^a-z0-9-]/g, '');

        if (fileSlug === slug || fileSlug.includes(slug)) {
          return join(typePath, f);
        }
      }
    }
  }

  return null;
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

// --- Main ---

function main() {
  const opts = parseArgs(process.argv);

  // Step 1: Find persona source file
  const personaFile = findPersonaFile(opts.slug);
  if (!personaFile) {
    console.error(`ERROR: No persona file found matching slug "${opts.slug}"`);
    console.error('Searched: Chef Flow Personas/Completed/ and Chef Flow Personas/Uncompleted/');
    process.exit(1);
  }
  console.log(`[rescore] Found persona: ${personaFile}`);

  // Step 2: Run analyzer
  console.log(`[rescore] Running analyzer (model: ${opts.model})...`);
  let analyzerOutput;
  try {
    analyzerOutput = execSync(
      `node devtools/persona-analyzer.mjs "${personaFile}" --model ${opts.model} --ollama-url ${opts.ollamaUrl}`,
      { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'], timeout: 120000, cwd: ROOT }
    );
  } catch (err) {
    const stderr = err.stderr ? err.stderr.toString().trim() : err.message;
    console.error(`[rescore] Analyzer failed: ${stderr}`);
    process.exit(1);
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
    console.error('[rescore] Could not parse report path from analyzer output');
    process.exit(1);
  }

  const fullReportPath = resolve(ROOT, reportPath);
  console.log(`[rescore] Report: ${reportPath}`);

  // Step 4: Extract score
  const score = extractScore(fullReportPath);
  if (score === null) {
    console.error(`[rescore] Could not extract score from ${reportPath}`);
    process.exit(1);
  }
  console.log(`[rescore] Score: ${score}/100`);

  // Step 5: Append to score history
  const history = loadScoreHistory();
  const today = new Date().toISOString().slice(0, 10);
  history.push({ slug: opts.slug, date: today, score });
  saveScoreHistory(history);
  console.log(`[rescore] Score history updated (${history.filter(h => h.slug === opts.slug).length} entries for ${opts.slug})`);

  // Step 6: Run synthesizer
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

  console.log(`[rescore] Done. ${opts.slug} scored ${score}/100 on ${today}.`);
}

main();
