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
 *   node devtools/persona-orchestrator.mjs --overnight --generate-count 10
 */

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync, renameSync, appendFileSync } from 'fs';
import { resolve, basename, dirname, join, extname, relative } from 'path';
import { execSync, spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { validatePersona } from './persona-validator.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '..');

// Quick recursive grep for codebase validation (cross-platform, no shell dependency)
function quickGrep(pattern, dirs, maxResults = 3) {
  const results = [];
  function walk(dir) {
    if (results.length >= maxResults) return;
    let entries;
    try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      if (results.length >= maxResults) return;
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === '.next' || entry.name === '.git') continue;
        walk(full);
      } else if (/\.(ts|tsx)$/.test(entry.name)) {
        try {
          const content = readFileSync(full, 'utf8');
          if (pattern.test(content)) {
            results.push(relative(ROOT, full).replace(/\\/g, '/'));
          }
        } catch {}
      }
    }
  }
  for (const d of dirs) {
    const absDir = join(ROOT, d);
    if (existsSync(absDir)) walk(absDir);
  }
  return results;
}

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
    overnight: false,
    interval: 300,
    model: process.env.PERSONA_MODEL || 'gemma4:e4b',
    analyzerModel: null, // resolved after parsing
    plannerModel: null,  // resolved after parsing
    ollamaUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
    generateCount: 10,
    max: null, // resolved after parsing
    dryRun: false,
    retryFailed: false,
    file: null,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--once':
        opts.once = true;
        break;
      case '--watch':
        opts.watch = true;
        break;
      case '--overnight':
        opts.overnight = true;
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
      case '--generate-count': {
        const value = parseInt(args[++i], 10);
        opts.generateCount = Number.isFinite(value) && value >= 0 ? value : 10;
        break;
      }
      case '--file':
        opts.file = args[++i] || null;
        break;
      case '--max':
        opts.max = parseInt(args[++i], 10);
        break;
      case '--dry-run':
        opts.dryRun = true;
        break;
      case '--retry-failed':
        opts.retryFailed = true;
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

  if (!opts.once && !opts.watch && !opts.overnight) {
    console.log('Usage: node devtools/persona-orchestrator.mjs --once|--watch|--overnight [options]');
    console.log('');
    console.log('Options:');
    console.log('  --once               Single pass, then exit');
    console.log('  --watch              Continuous loop');
    console.log('  --overnight          Generate personas, analyze/plan, force synthesis, and write summary log');
    console.log('  --interval <seconds> Seconds between cycles (default: 300)');
    console.log('  --model <name>       Default model for analyzer stage (default: PERSONA_MODEL env or gemma4:e4b)');
    console.log('  --analyzer-model <name>  Model for Stage 1 analysis (default: PERSONA_ANALYZER_MODEL env or --model value)');
    console.log('  --planner-model <name>   Model for Stage 2 planning (default: PERSONA_PLANNER_MODEL env or hermes3:8b)');
    console.log('  --ollama-url <url>   Ollama base URL (default: OLLAMA_BASE_URL env or http://localhost:11434)');
    console.log('  --generate-count <N> Generate N personas in overnight mode (default: 10)');
    console.log('  --file <path>        Process one specific persona file');
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

function toPosixPath(pathValue) {
  return String(pathValue).replace(/\\/g, '/');
}

function pendingFromSpecificFile(filePath) {
  const absFile = resolve(ROOT, filePath);
  if (!existsSync(absFile)) {
    console.log(`[orchestrator] File not found: ${filePath}`);
    return [];
  }

  const ext = extname(absFile).toLowerCase();
  if (ext !== '.txt' && ext !== '.md') {
    console.log(`[orchestrator] Unsupported file type: ${filePath}`);
    return [];
  }

  return [{
    filepath: absFile,
    relpath: toPosixPath(relative(ROOT, absFile)),
    filename: basename(absFile),
    slug: slugFromFilename(absFile),
    type: basename(dirname(absFile)),
  }];
}

function scanPendingFiles(state, filePath = null) {
  if (filePath) return pendingFromSpecificFile(filePath);

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

// --- File Locking ---

const LOCK_FILE = join(ROOT, 'system', '.pipeline.lock');
const LOCK_STALE_MS = 15 * 60 * 1000; // 15 min = stale lock

function acquireLock() {
  if (existsSync(LOCK_FILE)) {
    try {
      const data = JSON.parse(readFileSync(LOCK_FILE, 'utf-8'));
      const age = Date.now() - (data.acquired || 0);
      if (age < LOCK_STALE_MS) {
        console.log(`[orchestrator] Pipeline locked by PID ${data.pid} (${Math.round(age / 1000)}s ago). Waiting...`);
        return false;
      }
      console.log(`[orchestrator] Stale lock detected (${Math.round(age / 1000)}s), breaking it.`);
    } catch {}
  }
  writeFileSync(LOCK_FILE, JSON.stringify({ pid: process.pid, acquired: Date.now() }), 'utf-8');
  return true;
}

function releaseLock() {
  try {
    if (existsSync(LOCK_FILE)) {
      const data = JSON.parse(readFileSync(LOCK_FILE, 'utf-8'));
      if (data.pid === process.pid) {
        const { unlinkSync } = require ? require('fs') : { unlinkSync: () => {} };
        try { unlinkSync(LOCK_FILE); } catch {}
      }
    }
  } catch {}
}

// Clean up lock on exit
process.on('exit', releaseLock);
process.on('SIGINT', () => { releaseLock(); process.exit(130); });
process.on('SIGTERM', () => { releaseLock(); process.exit(143); });

// --- Ollama Pre-flight ---

function checkOllamaHealth(ollamaUrl) {
  try {
    const result = execSync(`node -e "fetch('${ollamaUrl}/api/tags').then(r=>{if(!r.ok)throw new Error(r.status);return r.json()}).then(d=>console.log('OK:'+d.models?.length+' models')).catch(e=>console.log('FAIL:'+e.message))"`, {
      encoding: 'utf-8',
      timeout: 10000,
      cwd: ROOT,
    });
    const ok = result.trim().startsWith('OK:');
    if (!ok) console.log(`[orchestrator] Ollama health check failed: ${result.trim()}`);
    return ok;
  } catch (err) {
    console.log(`[orchestrator] Ollama unreachable: ${err.message}`);
    return false;
  }
}

// --- Structured Error Capture ---

function captureError(err) {
  const stderr = String(err.stderr || '').trim();
  const stdout = String(err.stdout || '').trim();
  const message = err.message || 'Unknown error';

  // Truncate to useful portion (first 500 chars, skip token counter noise)
  let detail = stderr || message;
  // Filter out raw token stats lines
  detail = detail.split('\n')
    .filter(l => !l.match(/^\s*\d+\s+tokens?/) && !l.match(/^total\s+duration/i) && !l.match(/^load\s+duration/i))
    .join('\n')
    .trim();
  if (detail.length > 500) detail = detail.slice(0, 500) + '...';

  // Classify error type
  let errorType = 'unknown';
  if (/timeout|ETIMEDOUT/i.test(message)) errorType = 'timeout';
  else if (/ECONNREFUSED|ENOTFOUND/i.test(message)) errorType = 'ollama_down';
  else if (/out of memory|OOM/i.test(detail)) errorType = 'oom';
  else if (/parse|JSON|syntax/i.test(detail)) errorType = 'parse_error';
  else if (/not found|ENOENT/i.test(message)) errorType = 'file_not_found';
  else if (stderr) errorType = 'process_error';

  return { detail, errorType, hasStdout: stdout.length > 0, stdout: stdout.slice(0, 1000) };
}

// --- Execution with Retry ---

function runWithRetry(cmd, label, maxRetries = 2) {
  let lastError = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = execSync(cmd, {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 420000,
        cwd: ROOT,
      });
      if (attempt > 0) console.log(`[orchestrator] ${label} succeeded on retry ${attempt}`);
      return result;
    } catch (err) {
      lastError = err;
      const captured = captureError(err);

      if (attempt < maxRetries) {
        // Exponential backoff: 5s, 15s
        const backoffMs = (attempt + 1) * 5000 * (attempt + 1);
        console.log(`[orchestrator] ${label} failed (attempt ${attempt + 1}/${maxRetries + 1}, ${captured.errorType}): ${captured.detail.split('\n')[0]}`);

        // Don't retry if Ollama is down or file not found
        if (captured.errorType === 'ollama_down' || captured.errorType === 'file_not_found') {
          console.log(`[orchestrator] ${label}: non-retryable error (${captured.errorType}), skipping retries`);
          break;
        }

        console.log(`[orchestrator] Retrying in ${backoffMs / 1000}s...`);
        spawnSync('node', ['-e', `setTimeout(()=>{},${backoffMs})`], { timeout: backoffMs + 1000 });
      }
    }
  }
  throw lastError;
}

function runAnalyzer(filepath, model, ollamaUrl) {
  const cmd = `node devtools/persona-analyzer.mjs "${filepath}" --model ${model} --ollama-url ${ollamaUrl}`;
  return runWithRetry(cmd, `Analyzer(${basename(filepath)})`);
}

function runPlanner(reportPath, model, ollamaUrl) {
  const cmd = `node devtools/persona-planner.mjs "${reportPath}" --model ${model} --ollama-url ${ollamaUrl}`;
  return runWithRetry(cmd, `Planner(${basename(reportPath)})`);
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

function countNewReportsSinceLastSynthesis(state) {
  const lastSynthesisAt = state.last_synthesis_at ? Date.parse(state.last_synthesis_at) : 0;
  return state.processed.filter((entry) => {
    // Count all analyzed entries, not just planned ones.
    // Synthesis reads from docs/stress-tests/ (analyzer output) and does not need build plans.
    const analyzedAt = Date.parse(entry.analyzed_at || '');
    return Number.isFinite(analyzedAt) && analyzedAt > lastSynthesisAt;
  }).length;
}

function runBatchSynthesis(state) {
  console.log(`[orchestrator] Running batch synthesis...`);
  const result = spawnSync(process.execPath, ['devtools/persona-batch-synthesizer.mjs'], {
    stdio: 'inherit',
    timeout: 60000,
    cwd: ROOT,
  });

  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`synthesis exited ${result.status}`);

  state.last_synthesis_at = new Date().toISOString();
  console.log(`[orchestrator] Synthesis complete.`);
}

function runGenerator(count, model, ollamaUrl) {
  const args = ['devtools/persona-generator.mjs', '--count', String(count), '--spread'];
  if (model) args.push('--model', model);
  if (ollamaUrl) args.push('--ollama-url', ollamaUrl);

  const result = spawnSync(process.execPath, args, {
    cwd: ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: count * 120000,
    encoding: 'utf8',
  });

  if (result.error) {
    console.error(`[overnight] Generator failed: ${result.error.message}`);
    return false;
  }

  if (result.status !== 0) {
    const detail = (result.stderr || result.stdout || '').slice(0, 500);
    console.error(`[overnight] Generator failed: ${detail}`);
  }

  return result.status === 0;
}

// --- Cycle ---

function runCycle(opts) {
  // Acquire lock to prevent concurrent runs
  if (!acquireLock()) {
    console.log('[orchestrator] Could not acquire lock, aborting cycle.');
    return { processed: 0, failed: 0, tasksQueued: 0 };
  }

  // Pre-flight: check Ollama is alive
  if (!opts.dryRun) {
    const ollamaOk = checkOllamaHealth(opts.ollamaUrl);
    if (!ollamaOk) {
      console.log('[orchestrator] ABORT: Ollama is not reachable. Fix connectivity before running pipeline.');
      releaseLock();
      return { processed: 0, failed: 0, tasksQueued: 0 };
    }
  }

  const cycleStartTime = Date.now();
  const state = loadState();

  // Initialize metrics if missing
  if (!state.metrics) state.metrics = { total_cycles: 0, total_analyzer_time_ms: 0, total_planner_time_ms: 0, total_synthesis_time_ms: 0, last_cycle_duration_ms: 0, retries_used: 0 };
  state.metrics.total_cycles++;

  if (opts.retryFailed && state.failed.length > 0) {
    console.log(`[orchestrator] Retrying ${state.failed.length} previously failed personas...`)
    // Move failed persona files back to Uncompleted/ if they exist in Failed/
    for (const entry of state.failed) {
      const failedPath = join(
        ROOT,
        'Chef Flow Personas',
        'Failed',
        basename(dirname(entry.source_file)),
        basename(entry.source_file)
      )
      const uncompletedPath = join(ROOT, entry.source_file)
      if (existsSync(failedPath)) {
        const destDir = dirname(uncompletedPath)
        mkdirSync(destDir, { recursive: true })
        try {
          renameSync(failedPath, uncompletedPath)
          console.log(`[orchestrator] Moved back: ${basename(entry.source_file)}`)
        } catch (err) {
          console.log(`[orchestrator] Could not move ${basename(entry.source_file)}: ${err.message}`)
        }
      }
    }
    state.failed = []
    saveState(state)
  }

  const pending = scanPendingFiles(state, opts.file);

  if (pending.length === 0) {
    console.log('[orchestrator] No pending personas found.');
    state.last_cycle = new Date().toISOString();
    saveState(state);
    releaseLock();
    return { processed: 0, failed: 0, tasksQueued: 0 };
  }

  if (opts.dryRun) {
    console.log(`[orchestrator] Dry run: ${pending.length} pending persona(s):`);
    for (const p of pending) {
      console.log(`  ${p.type}/${p.filename} (slug: ${p.slug})`);
    }
    releaseLock();
    return { processed: 0, failed: 0, tasksQueued: 0 };
  }

  const batch = pending.slice(0, opts.max);
  let processedCount = 0;
  let failedCount = 0;
  let tasksQueued = 0;
  let plannedSuccessCount = 0;

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

    // Stage 1: Analyze (with timing and retry)
    console.log(`[orchestrator] Analyzing: ${persona.filename}`);
    const analyzerStart = Date.now();
    let analyzerStdout;
    try {
      analyzerStdout = runAnalyzer(persona.filepath, opts.analyzerModel, opts.ollamaUrl);
    } catch (err) {
      const captured = captureError(err);
      console.log(`[orchestrator] FAILED: ${persona.filename} [${captured.errorType}] - ${captured.detail.split('\n')[0]}`);

      // Capture partial report if analyzer produced any stdout
      let partialReport = null;
      if (captured.hasStdout) {
        try {
          const partialDir = join(ROOT, 'system', 'persona-debug');
          mkdirSync(partialDir, { recursive: true });
          const partialPath = join(partialDir, `partial-${persona.slug}-${new Date().toISOString().slice(0, 10)}.txt`);
          writeFileSync(partialPath, `# Partial Analyzer Output for ${persona.filename}\n# Error: ${captured.errorType}\n# Failed: ${new Date().toISOString()}\n\n${captured.stdout}`, 'utf-8');
          partialReport = `system/persona-debug/partial-${persona.slug}-${new Date().toISOString().slice(0, 10)}.txt`;
          console.log(`[orchestrator] Partial output saved: ${partialReport}`);
        } catch {}
      }

      state.failed.push({
        source_file: persona.relpath,
        error: captured.detail,
        error_type: captured.errorType,
        partial_report: partialReport,
        failed_at: new Date().toISOString(),
        retries_exhausted: true,
      });
      failedCount++;
      state.metrics.total_analyzer_time_ms += Date.now() - analyzerStart;
      saveState(state);
      continue;
    }
    state.metrics.total_analyzer_time_ms += Date.now() - analyzerStart;

    const reportPath = parseReportPath(analyzerStdout);
    if (!reportPath) {
      console.log(`[orchestrator] FAILED: ${persona.filename} - could not parse report path from analyzer output`);
      state.failed.push({
        source_file: persona.relpath,
        error: 'Could not parse report path from analyzer stdout',
        error_type: 'parse_error',
        failed_at: new Date().toISOString(),
      });
      failedCount++;
      saveState(state);
      continue;
    }

    // Stage 2: Plan (with timing, retry, and silent failure detection)
    console.log(`[orchestrator] Planning: ${persona.filename}`);
    const plannerStart = Date.now();
    let plannedAt = null;
    let buildTasks = [];
    let plannerAttempts = 0;
    const MAX_PLANNER_ATTEMPTS = 2;

    while (plannerAttempts < MAX_PLANNER_ATTEMPTS) {
      plannerAttempts++;
      try {
        runPlanner(reportPath, opts.plannerModel, opts.ollamaUrl);
        buildTasks = countTaskFiles(persona.slug);

        // Silent failure detection: planner ran but produced zero tasks
        if (buildTasks.length === 0 && plannerAttempts < MAX_PLANNER_ATTEMPTS) {
          console.log(`[orchestrator] Planner produced 0 tasks for ${persona.filename} (attempt ${plannerAttempts}/${MAX_PLANNER_ATTEMPTS}), retrying...`);
          state.metrics.retries_used++;
          continue;
        }

        if (buildTasks.length > 0) {
          plannedAt = new Date().toISOString();
          plannedSuccessCount++;
        } else {
          console.log(`[orchestrator] WARNING: Planner produced 0 tasks for ${persona.filename} after ${plannerAttempts} attempts`);
        }
        break;
      } catch (err) {
        const captured = captureError(err);
        console.log(`[orchestrator] PLANNER FAILED for ${persona.filename} [${captured.errorType}]: ${captured.detail.split('\n')[0]}`);
        if (plannerAttempts < MAX_PLANNER_ATTEMPTS && captured.errorType !== 'ollama_down') {
          console.log(`[orchestrator] Retrying planner...`);
          state.metrics.retries_used++;
          continue;
        }
        // Analysis succeeded, so add to processed with planned_at: null
        break;
      }
    }
    state.metrics.total_planner_time_ms += Date.now() - plannerStart;

    // Analyzer moves file from Uncompleted/ to Completed/; record the final path
    const completedRelpath = toPosixPath(persona.relpath).replace('/Uncompleted/', '/Completed/');
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

  // Stage 3: Synthesize after enough newly planned reports exist
  const newReportsSinceLastSynthesis = countNewReportsSinceLastSynthesis(state);
  if (processedCount > 0 && newReportsSinceLastSynthesis >= 2) {
    try {
      runBatchSynthesis(state);

      // Stage 4: Auto-validate gaps against codebase (free, no AI cost)
      console.log(`[orchestrator] Running codebase gap validation...`);
      try {
        const satPath = join(ROOT, 'system', 'persona-batch-synthesis', 'saturation.json');
        if (existsSync(satPath)) {
          const satData = JSON.parse(readFileSync(satPath, 'utf-8'));

          // Inline validation if validator doesn't export it (self-contained)
          const results = [];
          const seenTitles = new Set();
          for (const [catId, catInfo] of Object.entries(satData.categories || {})) {
            for (const gap of catInfo.gaps || []) {
              const key = gap.title.toLowerCase();
              if (seenTitles.has(key)) continue;
              seenTitles.add(key);
              const result = { category: catId, title: gap.title, severity: gap.severity, from: gap.from, status: 'MISSING', evidence: [] };

              // Check known-built file existence
              if (gap.search_hints?.known_built_matches?.length > 0) {
                for (const match of gap.search_hints.known_built_matches) {
                  if (existsSync(join(ROOT, match.file))) {
                    result.status = 'BUILT';
                    result.evidence.push({ type: 'file_exists', path: match.file, label: match.label });
                  }
                }
              }

              // Grep search_hints terms
              if (result.status === 'MISSING' && gap.search_hints?.grep_terms?.length > 0) {
                for (const term of gap.search_hints.grep_terms.slice(0, 3)) {
                  try {
                    const pattern = new RegExp(term.replace(/\./g, '[._\\-]?'), 'i');
                    const matches = quickGrep(pattern, ['lib', 'components', 'app'], 3);
                    if (matches.length > 0) {
                      result.status = 'PARTIAL';
                      result.evidence.push({ type: 'grep_match', term, files: matches });
                    }
                  } catch {}
                }
                if (result.evidence.length >= 2) result.status = 'BUILT';
              }
              results.push(result);
            }
          }

          const built = results.filter(r => r.status === 'BUILT').length;
          const partial = results.filter(r => r.status === 'PARTIAL').length;
          const missing = results.filter(r => r.status === 'MISSING').length;
          const validation = {
            validated_at: new Date().toISOString(),
            summary: { total: results.length, built, partial, missing, false_positive_rate: results.length > 0 ? Math.round((built / results.length) * 100) : 0 },
            gaps: results,
          };

          const validationPath = join(ROOT, 'system', 'persona-batch-synthesis', 'validation.json');
          writeFileSync(validationPath, JSON.stringify(validation, null, 2) + '\n', 'utf-8');
          console.log(`[orchestrator] Validation: ${built} BUILT, ${partial} PARTIAL, ${missing} MISSING (${validation.summary.false_positive_rate}% false positive rate)`);
        }
      } catch (err) {
        console.log(`[orchestrator] Warning: validation failed - ${err.message}`);
      }
    } catch (err) {
      console.log(`[orchestrator] Warning: synthesis failed - ${err.message}`);
    }
  } else if (plannedSuccessCount > 0) {
    console.log(`[orchestrator] Synthesis skipped: ${newReportsSinceLastSynthesis}/2 new planned reports since last synthesis.`);
  }

  state.last_cycle = new Date().toISOString();
  state.metrics.last_cycle_duration_ms = Date.now() - cycleStartTime;
  saveState(state);
  releaseLock();

  const duration = Math.round(state.metrics.last_cycle_duration_ms / 1000);
  console.log(`Cycle complete in ${duration}s: ${processedCount} analyzed, ${failedCount} failed, ${tasksQueued} build tasks queued.`);
  return { processed: processedCount, failed: failedCount, tasksQueued };
}

// --- Main ---

function main() {
  const opts = parseArgs(process.argv);

  if (opts.overnight) {
    const logDir = join(ROOT, 'logs');
    mkdirSync(logDir, { recursive: true });
    const logPath = join(logDir, `overnight-${new Date().toISOString().slice(0, 10)}.log`);
    const logLines = [];
    const log = (msg) => {
      const line = `[${new Date().toISOString()}] ${msg}`;
      console.log(line);
      logLines.push(line);
    };

    log(`Overnight mode: generating ${opts.generateCount} personas, then full pipeline`);

    log('Phase 1/4: Generating personas...');
    const genOk = runGenerator(opts.generateCount, opts.analyzerModel || opts.model, opts.ollamaUrl);
    log(genOk ? 'Generation complete' : 'Generation had errors (continuing)');

    log('Phase 2/4: Analyzing and planning...');
    opts.once = true;
    opts.watch = false;
    opts.max = 50;
    const cycleResult = runCycle(opts);
    log(`Analysis + planning complete: ${cycleResult.processed} analyzed, ${cycleResult.failed} failed, ${cycleResult.tasksQueued} build tasks queued`);

    log('Phase 3/4: Synthesizing...');
    const synthesisState = loadState();
    try {
      runBatchSynthesis(synthesisState);
      saveState(synthesisState);
      log('Synthesis complete');
    } catch (err) {
      log(`Synthesis failed: ${err.message}`);
    }

    const state = loadState();
    log('Phase 4/4: Summary');
    log(`  Total processed: ${state.total_personas_processed || 0}`);
    log(`  Total build tasks: ${state.total_build_tasks_queued || 0}`);
    log(`  Failed: ${(state.failed || []).length}`);
    log(`Writing log to ${relative(ROOT, logPath)}`);

    writeFileSync(logPath, logLines.join('\n') + '\n', 'utf8');
    return;
  }

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
