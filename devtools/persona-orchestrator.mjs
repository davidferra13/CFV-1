#!/usr/bin/env node

/**
 * Persona Orchestrator (v2 Pipeline)
 *
 * Watches for new persona files, runs persona-analyzer.mjs then persona-planner.mjs
 * for each one, tracks state. Does NOT run builds. Only analyzes and plans.
 *
 * Usage:
 *   node devtools/persona-orchestrator.mjs --once
 *   node devtools/persona-orchestrator.mjs --watch --interval 300
 *   node devtools/persona-orchestrator.mjs --once --dry-run
 */

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync, renameSync, appendFileSync } from 'fs';
import { resolve, basename, dirname, join, extname } from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { validatePersona } from './persona-validator.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '..');

const STATE_FILE = join(ROOT, 'system', 'persona-pipeline-state.json');

const SCAN_DIRS = [
  'Chef Flow Personas/Uncompleted/Chef/',
  'Chef Flow Personas/Uncompleted/Client/',
  'Chef Flow Personas/Uncompleted/Guest/',
  'Chef Flow Personas/Uncompleted/Vendor/',
  'Chef Flow Personas/Uncompleted/Staff/',
  'Chef Flow Personas/Uncompleted/Partner/',
  'Chef Flow Personas/Uncompleted/Public/',
];

// --- CLI ---

function parseArgs(argv) {
  const args = argv.slice(2);
  const opts = {
    once: false,
    watch: false,
    interval: 300,
    model: process.env.PERSONA_MODEL || 'qwen3:4b',
    analyzerModel: null, // resolved after parsing
    plannerModel: null,  // resolved after parsing
    ollamaUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
    max: null, // resolved after parsing
    dryRun: false,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--once':
        opts.once = true;
        break;
      case '--watch':
        opts.watch = true;
        break;
      case '--interval':
        opts.interval = parseInt(args[++i], 10) || 300;
        break;
      case '--model':
        opts.model = args[++i];
        break;
      case '--analyzer-model':
        opts.analyzerModel = args[++i];
        break;
      case '--planner-model':
        opts.plannerModel = args[++i];
        break;
      case '--ollama-url':
        opts.ollamaUrl = args[++i];
        break;
      case '--max':
        opts.max = parseInt(args[++i], 10);
        break;
      case '--dry-run':
        opts.dryRun = true;
        break;
      default:
        break;
    }
  }

  // Resolve per-stage models: CLI flag > env var > fallback
  if (!opts.analyzerModel) {
    opts.analyzerModel = process.env.PERSONA_ANALYZER_MODEL || opts.model;
  }
  if (!opts.plannerModel) {
    opts.plannerModel = process.env.PERSONA_PLANNER_MODEL || 'hermes3:8b';
  }

  if (!opts.once && !opts.watch) {
    console.log('Usage: node devtools/persona-orchestrator.mjs --once|--watch [options]');
    console.log('');
    console.log('Options:');
    console.log('  --once               Single pass, then exit');
    console.log('  --watch              Continuous loop');
    console.log('  --interval <seconds> Seconds between cycles (default: 300)');
    console.log('  --model <name>       Default model for both stages (default: PERSONA_MODEL env or qwen3:4b)');
    console.log('  --analyzer-model <name>  Model for Stage 1 analysis (default: PERSONA_ANALYZER_MODEL env or --model value)');
    console.log('  --planner-model <name>   Model for Stage 2 planning (default: PERSONA_PLANNER_MODEL env or hermes3:8b)');
    console.log('  --ollama-url <url>   Ollama base URL (default: OLLAMA_BASE_URL env or http://localhost:11434)');
    console.log('  --max <N>            Max personas per cycle (default: 1 for watch, 999 for once)');
    console.log('  --dry-run            Print pending files and exit');
    process.exit(1);
  }

  // Default max: 1 for watch, 999 for once
  if (opts.max === null) {
    opts.max = opts.watch && !opts.once ? 1 : 999;
  }

  return opts;
}

// --- State ---

function loadState() {
  if (!existsSync(STATE_FILE)) {
    return {
      version: 2,
      processed: [],
      failed: [],
      last_cycle: null,
      total_personas_processed: 0,
      total_build_tasks_queued: 0,
    };
  }
  try {
    return JSON.parse(readFileSync(STATE_FILE, 'utf-8'));
  } catch {
    console.log('[orchestrator] Warning: corrupt state file, reinitializing.');
    return {
      version: 2,
      processed: [],
      failed: [],
      last_cycle: null,
      total_personas_processed: 0,
      total_build_tasks_queued: 0,
    };
  }
}

function saveState(state) {
  const dir = dirname(STATE_FILE);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2) + '\n', 'utf-8');
}

// --- Scanning ---

function slugFromFilename(filename) {
  const name = basename(filename).replace(/\.(txt|md)$/i, '');
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

function typeFromDir(dirPath) {
  // Extract the persona type from the parent directory name
  // e.g. "Chef Flow Personas/Uncompleted/Chef/" -> "Chef"
  const parts = dirPath.replace(/[\\/]+$/, '').split(/[\\/]/);
  return parts[parts.length - 1];
}

function scanPendingFiles(state) {
  const knownSlugs = new Set();
  for (const entry of state.processed) knownSlugs.add(entry.slug);
  for (const entry of state.failed) {
    const slug = slugFromFilename(entry.source_file);
    knownSlugs.add(slug);
  }

  const pending = [];

  for (const relDir of SCAN_DIRS) {
    const absDir = join(ROOT, relDir);
    if (!existsSync(absDir)) continue;

    let entries;
    try {
      entries = readdirSync(absDir);
    } catch {
      continue;
    }

    for (const entry of entries) {
      const ext = extname(entry).toLowerCase();
      if (ext !== '.txt' && ext !== '.md') continue;

      const slug = slugFromFilename(entry);
      if (knownSlugs.has(slug)) continue;

      pending.push({
        filepath: join(absDir, entry),
        relpath: join(relDir, entry),
        filename: entry,
        slug,
        type: typeFromDir(relDir),
      });
    }
  }

  return pending;
}

// --- Execution ---

function runAnalyzer(filepath, model, ollamaUrl) {
  const cmd = `node devtools/persona-analyzer.mjs "${filepath}" --model ${model} --ollama-url ${ollamaUrl}`;
  const result = execSync(cmd, {
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'pipe'],
    timeout: 120000,
    cwd: ROOT,
  });
  return result;
}

function runPlanner(reportPath, model, ollamaUrl) {
  const cmd = `node devtools/persona-planner.mjs "${reportPath}" --model ${model} --ollama-url ${ollamaUrl}`;
  const result = execSync(cmd, {
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'pipe'],
    timeout: 180000,
    cwd: ROOT,
  });
  return result;
}

function parseReportPath(stdout) {
  // Last non-empty line of stdout is the report path
  const lines = stdout.trim().split('\n');
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();
    if (line.length > 0) return line;
  }
  return null;
}

function countTaskFiles(slug) {
  const dir = join(ROOT, 'system', 'persona-build-plans', slug);
  if (!existsSync(dir)) return [];

  const files = readdirSync(dir)
    .filter(f => f.startsWith('task-') && f.endsWith('.md'))
    .map(f => `system/persona-build-plans/${slug}/${f}`);

  return files;
}

// --- Cycle ---

function runCycle(opts) {
  const state = loadState();
  const pending = scanPendingFiles(state);

  if (pending.length === 0) {
    console.log('[orchestrator] No pending personas found.');
    state.last_cycle = new Date().toISOString();
    saveState(state);
    return { processed: 0, failed: 0, tasksQueued: 0 };
  }

  if (opts.dryRun) {
    console.log(`[orchestrator] Dry run: ${pending.length} pending persona(s):`);
    for (const p of pending) {
      console.log(`  ${p.type}/${p.filename} (slug: ${p.slug})`);
    }
    return { processed: 0, failed: 0, tasksQueued: 0 };
  }

  const batch = pending.slice(0, opts.max);
  let processedCount = 0;
  let failedCount = 0;
  let tasksQueued = 0;

  for (const persona of batch) {
    // Stage 0: Validate
    const validation = validatePersona(persona.filepath);
    if (!validation.valid) {
      console.log(`[orchestrator] INVALID: ${persona.filename} (score: ${validation.score}) - ${validation.rejection_reasons.join('; ')}`);
      // Move to Failed/
      const failedDir = join(ROOT, 'Chef Flow Personas', 'Failed', persona.type);
      mkdirSync(failedDir, { recursive: true });
      const failedDest = join(failedDir, persona.filename);
      const comment = `\n\n---\n<!-- PIPELINE VALIDATION FAILED (score: ${validation.score})\n${validation.rejection_reasons.join('\n')}\nFlags: ${validation.flags.join('; ') || 'none'}\nRejected: ${new Date().toISOString()}\n-->\n`;
      try {
        appendFileSync(persona.filepath, comment, 'utf-8');
        renameSync(persona.filepath, failedDest);
      } catch (err) {
        console.log(`[orchestrator] Warning: could not move to Failed/: ${err.message}`);
      }
      state.failed.push({
        source_file: persona.relpath,
        error: `Validation failed (score: ${validation.score}): ${validation.rejection_reasons.join('; ')}`,
        failed_at: new Date().toISOString(),
      });
      failedCount++;
      saveState(state);
      continue;
    }
    console.log(`[orchestrator] Validated: ${persona.filename} (score: ${validation.score})`);

    // Stage 1: Analyze
    console.log(`[orchestrator] Analyzing: ${persona.filename}`);
    let analyzerStdout;
    try {
      analyzerStdout = runAnalyzer(persona.filepath, opts.analyzerModel, opts.ollamaUrl);
    } catch (err) {
      const stderr = err.stderr || err.message || 'Unknown error';
      console.log(`[orchestrator] FAILED: ${persona.filename} - ${stderr.trim()}`);
      state.failed.push({
        source_file: persona.relpath,
        error: stderr.trim(),
        failed_at: new Date().toISOString(),
      });
      failedCount++;
      saveState(state);
      continue;
    }

    const reportPath = parseReportPath(analyzerStdout);
    if (!reportPath) {
      console.log(`[orchestrator] FAILED: ${persona.filename} - could not parse report path from analyzer output`);
      state.failed.push({
        source_file: persona.relpath,
        error: 'Could not parse report path from analyzer stdout',
        failed_at: new Date().toISOString(),
      });
      failedCount++;
      saveState(state);
      continue;
    }

    // Stage 2: Plan
    console.log(`[orchestrator] Planning: ${persona.filename}`);
    let plannedAt = null;
    let buildTasks = [];

    try {
      runPlanner(reportPath, opts.plannerModel, opts.ollamaUrl);
      plannedAt = new Date().toISOString();
      buildTasks = countTaskFiles(persona.slug);
    } catch (err) {
      const stderr = err.stderr ? err.stderr.toString().trim() : err.message || 'Unknown error';
      console.log(`[orchestrator] PLANNER FAILED for ${persona.filename}: ${stderr}`);
      // Analysis succeeded, so add to processed with planned_at: null
    }

    // Analyzer moves file from Uncompleted/ to Completed/; record the final path
    const completedRelpath = persona.relpath.replace('/Uncompleted/', '/Completed/');
    const entry = {
      slug: persona.slug,
      type: persona.type,
      source_file: completedRelpath,
      report: reportPath,
      build_tasks: buildTasks,
      analyzed_at: new Date().toISOString(),
      planned_at: plannedAt,
    };

    state.processed.push(entry);
    state.total_personas_processed++;
    state.total_build_tasks_queued += buildTasks.length;
    tasksQueued += buildTasks.length;
    processedCount++;

    saveState(state);
  }

  // Stage 3: Synthesize (aggregate findings across all reports)
  if (state.processed.length > 0) {
    console.log(`[orchestrator] Running batch synthesis...`);
    try {
      execSync('node devtools/persona-batch-synthesizer.mjs', {
        stdio: 'inherit',
        timeout: 60000,
        cwd: ROOT,
      });
      console.log(`[orchestrator] Synthesis complete.`);
    } catch (err) {
      console.log(`[orchestrator] Warning: synthesis failed - ${err.message}`);
    }
  }

  state.last_cycle = new Date().toISOString();
  saveState(state);

  console.log(`Cycle complete: ${processedCount} analyzed, ${failedCount} failed, ${tasksQueued} build tasks queued.`);
  return { processed: processedCount, failed: failedCount, tasksQueued };
}

// --- Main ---

function main() {
  const opts = parseArgs(process.argv);

  // Check base directory exists
  const baseDir = join(ROOT, 'Chef Flow Personas', 'Uncompleted');
  if (!existsSync(baseDir)) {
    console.log(`[orchestrator] Warning: "${baseDir}" does not exist. Nothing to process.`);
    process.exit(0);
  }

  if (opts.once || opts.dryRun) {
    runCycle(opts);
    process.exit(0);
  }

  // Watch mode: recursive setTimeout (not setInterval)
  function tick() {
    runCycle(opts);
    console.log(`[orchestrator] Next cycle in ${opts.interval}s...`);
    setTimeout(tick, opts.interval * 1000);
  }

  tick();
}

main();
