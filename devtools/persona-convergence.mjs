#!/usr/bin/env node

/**
 * Persona Convergence Engine
 *
 * Epoch-based re-score and build batching for pipeline inputs.
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'fs';
import { dirname, extname, join, resolve } from 'path';
import { execSync, spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { generateGapBuildSpec } from './persona-pipeline-core.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '..');

const STATE_FILE = join(ROOT, 'system', 'convergence-state.json');
const SCORE_HISTORY_FILE = join(ROOT, 'system', 'persona-batch-synthesis', 'score-history.json');
const VALIDATION_FILE = join(ROOT, 'system', 'persona-batch-synthesis', 'validation.json');
const PRIORITY_QUEUE_FILE = join(ROOT, 'system', 'persona-batch-synthesis', 'priority-queue.json');
const CODEX_QUEUE_DIR = join(ROOT, 'system', 'codex-queue');

const args = process.argv.slice(2);
const command = args[0] || 'status';

function getFlag(name, defaultValue) {
  const idx = args.indexOf(`--${name}`);
  if (idx === -1) return defaultValue;
  return args[idx + 1] || defaultValue;
}

function parseLimit(defaultValue = 10) {
  const parsed = Number.parseInt(getFlag('limit', String(defaultValue)), 10);
  return Number.isFinite(parsed) ? Math.max(parsed, 0) : defaultValue;
}

function readJson(path, fallback) {
  if (!existsSync(path)) return fallback;
  try {
    return JSON.parse(readFileSync(path, 'utf-8'));
  } catch {
    return fallback;
  }
}

function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(value, null, 2) + '\n', 'utf-8');
}

function getGitCommit() {
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf-8', cwd: ROOT }).trim();
  } catch {
    return 'unknown';
  }
}

function defaultState() {
  const target = Number.parseInt(getFlag('target-score', '90'), 10);
  const minImprovement = Number.parseFloat(getFlag('min-improvement', '2'));
  return {
    version: 1,
    current_epoch: 0,
    target_score: Number.isFinite(target) ? target : 90,
    min_improvement: Number.isFinite(minImprovement) ? minImprovement : 2,
    epochs: [],
  };
}

function readState() {
  const state = readJson(STATE_FILE, defaultState());
  if (!Array.isArray(state.epochs)) state.epochs = [];
  if (!Number.isFinite(state.current_epoch)) state.current_epoch = state.epochs.length;
  if (!Number.isFinite(state.target_score)) state.target_score = 90;
  if (!Number.isFinite(state.min_improvement)) state.min_improvement = 2;
  if (!state.version) state.version = 1;
  return state;
}

function saveState(state) {
  writeJson(STATE_FILE, state);
}

function slugFromFilename(file) {
  return file
    .replace(/\.[^.]+$/, '')
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
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

function latestScores() {
  const history = readJson(SCORE_HISTORY_FILE, []);
  const scores = {};
  for (const entry of Array.isArray(history) ? history : []) {
    if (!entry?.slug || !Number.isFinite(entry.score)) continue;
    scores[entry.slug] = entry.score;
  }
  return scores;
}

function averageScore(scores) {
  const values = Object.values(scores).filter(Number.isFinite);
  if (values.length === 0) return 0;
  return Math.round(values.reduce((sum, score) => sum + score, 0) / values.length);
}

function latestEpoch(state) {
  return state.epochs[state.epochs.length - 1] || null;
}

function previousEpoch(state, epoch) {
  const idx = state.epochs.findIndex((item) => item.epoch === epoch.epoch);
  return idx > 0 ? state.epochs[idx - 1] : null;
}

function countAboveTarget(scores, targetScore) {
  return Object.values(scores).filter((score) => Number.isFinite(score) && score >= targetScore).length;
}

function formatDelta(delta) {
  if (!Number.isFinite(delta)) return '--';
  return delta > 0 ? `+${delta}` : String(delta);
}

function runNode(script, scriptArgs = []) {
  return spawnSync(process.execPath, [script, ...scriptArgs], {
    cwd: ROOT,
    stdio: 'inherit',
    encoding: 'utf-8',
  });
}

function validationGapCount() {
  const validation = readJson(VALIDATION_FILE, null);
  if (!validation) return 0;
  if (Number.isFinite(validation.summary?.total)) return validation.summary.total;
  return Array.isArray(validation.gaps) ? validation.gaps.length : 0;
}

function readMissingGaps() {
  const validation = readJson(VALIDATION_FILE, null);
  const missing = Array.isArray(validation?.gaps)
    ? validation.gaps.filter((gap) => gap.status === 'MISSING')
    : [];

  if (!existsSync(PRIORITY_QUEUE_FILE)) return missing;

  try {
    const priorityQueue = JSON.parse(readFileSync(PRIORITY_QUEUE_FILE, 'utf-8'));
    if (!Array.isArray(priorityQueue.queue)) return missing;

    const missingByTitle = new Map(missing.map((gap) => [String(gap.title || '').toLowerCase(), gap]));
    const used = new Set();
    const ranked = [];

    for (const queuedGap of priorityQueue.queue) {
      const key = String(queuedGap.title || '').toLowerCase();
      const validationGap = missingByTitle.get(key);
      if (!validationGap || used.has(key)) continue;
      ranked.push({ ...validationGap, ...queuedGap, status: validationGap.status });
      used.add(key);
    }

    return [
      ...ranked,
      ...missing.filter((gap) => !used.has(String(gap.title || '').toLowerCase())),
    ];
  } catch (err) {
    console.warn(`Could not read priority queue, using validation order: ${err.message}`);
    return missing;
  }
}

function cmdStatus() {
  if (!existsSync(STATE_FILE)) {
    console.log('No epochs yet. Run: start-epoch');
    return;
  }

  const state = readState();
  const epoch = latestEpoch(state);
  if (!epoch) {
    console.log('No epochs yet. Run: start-epoch');
    return;
  }

  const prev = previousEpoch(state, epoch);
  const delta = prev ? epoch.average_score - prev.average_score : null;
  const aboveTarget = countAboveTarget(epoch.scores || {}, state.target_score);

  console.log('Convergence status');
  console.log('==================');
  console.log(`Current epoch: ${epoch.epoch}`);
  console.log(`Phase: ${epoch.phase}`);
  console.log(`Average score: ${epoch.average_score}/100`);
  console.log(`Target: ${state.target_score}/100`);
  console.log(`Inputs above target: ${aboveTarget}/${epoch.persona_count || 0}`);
  console.log(`Improvement since previous epoch: ${formatDelta(delta)}`);
  console.log(`Gaps found: ${epoch.gaps_found || 0}`);
  console.log(`Gaps built: ${epoch.gaps_built || 0}`);
}

function cmdStartEpoch() {
  const state = readState();
  const epochNumber = (state.current_epoch || 0) + 1;
  const commitBefore = getGitCommit();
  const startedAt = new Date().toISOString();

  console.log(`Starting epoch ${epochNumber} at ${commitBefore}...`);
  const rescore = runNode('devtools/persona-rescore.mjs', ['--all']);
  if (rescore.status !== 0) {
    console.warn(`[convergence] Warning: rescore exited with ${rescore.status}. Saving scores that were produced.`);
  }

  const scoresBySlug = latestScores();
  const completedSlugs = findCompletedSlugs();
  const scores = {};
  for (const slug of completedSlugs) {
    if (Number.isFinite(scoresBySlug[slug])) scores[slug] = scoresBySlug[slug];
  }

  console.log('[convergence] Running batch synthesizer...');
  const synthesis = runNode('devtools/persona-batch-synthesizer.mjs');
  if (synthesis.status !== 0) {
    console.warn(`[convergence] Warning: synthesizer exited with ${synthesis.status}.`);
  }

  const average = averageScore(scores);
  const belowTarget = Object.values(scores).filter((score) => score < state.target_score).length;
  const epoch = {
    epoch: epochNumber,
    started_at: startedAt,
    completed_at: null,
    commit_before: commitBefore,
    commit_after: null,
    persona_count: Object.keys(scores).length,
    average_score: average,
    scores,
    gaps_found: validationGapCount(),
    gaps_built: 0,
    phase: 'scored',
  };

  state.current_epoch = epochNumber;
  state.epochs.push(epoch);
  saveState(state);

  console.log(`Epoch ${epochNumber} started. Average: ${average}/100. ${belowTarget} inputs below target. ${epoch.gaps_found} gaps found.`);
}

function cmdBuildBatch() {
  const state = readState();
  const epoch = latestEpoch(state);
  if (!epoch) {
    console.log('No epochs yet. Run: start-epoch');
    return;
  }
  if (epoch.phase !== 'scored') {
    console.log(`Current epoch is phase "${epoch.phase}". build-batch requires phase "scored".`);
    return;
  }

  const missing = readMissingGaps();
  const limit = parseLimit(10);
  const batch = missing.slice(0, limit);
  mkdirSync(CODEX_QUEUE_DIR, { recursive: true });

  let written = 0;
  for (let i = 0; i < batch.length; i++) {
    const { slug, spec } = generateGapBuildSpec(batch[i], i + 1);
    const outPath = join(CODEX_QUEUE_DIR, `${slug}.md`);
    writeFileSync(outPath, spec, 'utf-8');
    written++;
  }

  epoch.phase = 'building';
  epoch.gaps_built = written;
  saveState(state);

  console.log(`Queued ${written} specs to system/codex-queue/. Build them, then run: close-epoch`);
}

function cmdCloseEpoch() {
  const state = readState();
  const epoch = latestEpoch(state);
  if (!epoch) {
    console.log('No epochs yet. Run: start-epoch');
    return;
  }

  const commitAfter = getGitCommit();
  if (epoch.commit_before === commitAfter) {
    console.warn('WARNING: No commits since epoch start, scores will not change');
  }

  epoch.commit_after = commitAfter;
  epoch.completed_at = new Date().toISOString();
  epoch.phase = 'complete';
  saveState(state);

  const prev = previousEpoch(state, epoch);
  const improvement = prev ? epoch.average_score - prev.average_score : 0;
  const aboveTarget = countAboveTarget(epoch.scores || {}, state.target_score);

  if (prev && improvement < state.min_improvement) {
    console.warn(`WARNING: Diminishing returns. Only ${formatDelta(improvement)} points this epoch. Consider stopping or changing strategy.`);
  }
  if (epoch.persona_count > 0 && aboveTarget === epoch.persona_count) {
    console.log('CONVERGENCE REACHED. All inputs at or above target.');
  }

  console.log(`Epoch ${epoch.epoch} complete. Average: ${epoch.average_score}/100. Delta: ${formatDelta(prev ? improvement : null)}. Ready for: start-epoch`);
}

function cmdHistory() {
  const state = readState();
  if (state.epochs.length === 0) {
    console.log('No epochs yet. Run: start-epoch');
    return;
  }

  console.log('Epoch | Commit  | Avg Score | Delta | Gaps Found | Gaps Built | Phase');
  for (let i = 0; i < state.epochs.length; i++) {
    const epoch = state.epochs[i];
    const prev = i > 0 ? state.epochs[i - 1] : null;
    const delta = prev ? epoch.average_score - prev.average_score : null;
    const commit = epoch.commit_after || epoch.commit_before || 'unknown';
    console.log([
      String(epoch.epoch).padEnd(5),
      String(commit).padEnd(7),
      `${epoch.average_score}/100`.padEnd(9),
      formatDelta(delta).padEnd(5),
      String(epoch.gaps_found || 0).padEnd(10),
      String(epoch.gaps_built || 0).padEnd(10),
      epoch.phase || 'unknown',
    ].join(' | '));
  }
}

function cmdHelp() {
  console.log('Usage: node devtools/persona-convergence.mjs <command>');
  console.log('');
  console.log('Commands:');
  console.log('  status        Show current epoch, scores, and convergence trend');
  console.log('  start-epoch   Re-score all completed inputs and save a new epoch');
  console.log('  build-batch   Generate Codex specs for top MISSING gaps');
  console.log('  close-epoch   Mark the current epoch complete and print convergence metrics');
  console.log('  history       Show epoch-over-epoch convergence table');
}

const commands = {
  status: cmdStatus,
  'start-epoch': cmdStartEpoch,
  'build-batch': cmdBuildBatch,
  'close-epoch': cmdCloseEpoch,
  history: cmdHistory,
  help: cmdHelp,
};

const handler = commands[command];
if (!handler) {
  console.log(`Unknown command: ${command}`);
  cmdHelp();
  process.exit(1);
}

handler();
