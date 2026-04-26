#!/usr/bin/env node

import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from 'fs';
import {
  dirname,
  extname,
  join,
  relative,
  resolve,
} from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '..');

const SCORE_HISTORY_FILE = join(ROOT, 'system', 'persona-batch-synthesis', 'score-history.json');
const COMPLETED_DIR = join(ROOT, 'Chef Flow Personas', 'Completed');
const REPORT_DIR = join(ROOT, 'system', 'regression-reports');
const TYPES = ['Chef', 'Client', 'Guest', 'Vendor', 'Staff', 'Partner', 'Public'];
const SATURATION_FILE = join(ROOT, 'system', 'persona-batch-synthesis', 'saturation.json');
const BUILD_RECEIPTS_DIR = join(ROOT, 'system', 'build-receipts');
const STRESS_TEST_DIR = join(ROOT, 'docs', 'stress-tests');

const GAP_CATEGORY_KEYWORDS = {
  'event-lifecycle': ['event lifecycle', 'ephemeral', 'pop-up', 'temporary event'],
  'access-control': ['access control', 'invite-only', 'tiered access', 'waitlist'],
  'ticketing-drops': ['ticket', 'drop', 'sell-out', 'controlled release'],
  'audience-community': ['audience', 'community', 'guest tracking', 'repeat guest'],
  'location-venue': ['location', 'venue', 'setup', 'mobile', 'site'],
  'payment-financial': ['payment', 'financial', 'billing', 'pricing', 'cost', 'revenue', 'deposit', 'invoice'],
  'compliance-legal': ['compliance', 'legal', 'regulation', 'audit', 'license', 'liability'],
  'dosing-cannabis': ['dose', 'dosing', 'cannabis', 'thc', 'cbd', 'infusion', 'potency'],
  'dietary-medical': ['dietary', 'medical', 'allergy', 'allergen', 'restriction'],
  'recipe-menu': ['recipe', 'menu', 'dish', 'course', 'ingredient', 'prep'],
  'scheduling-calendar': ['schedule', 'calendar', 'booking', 'availability', 'conflict'],
  'communication': ['communication', 'email', 'message', 'notification'],
  'staffing-team': ['staff', 'team', 'hire', 'brigade', 'delegation'],
  'sourcing-supply': ['sourcing', 'supplier', 'vendor', 'procurement', 'farm'],
  'costing-margin': ['food cost', 'margin', 'costing', 'markup', 'waste'],
  'reporting-analytics': ['report', 'analytics', 'dashboard', 'metrics', 'performance'],
  'onboarding-ux': ['onboarding', 'first time', 'setup', 'learning curve'],
  'scaling-multi': ['scale', 'multi-location', 'growth', 'franchise'],
  'delivery-logistics': ['delivery', 'logistics', 'transport', 'packaging'],
  'documentation-records': ['document', 'record', 'archive', 'history', 'trail'],
};

function stderr(message) {
  process.stderr.write(`${message}\n`);
}

function parseArgs(argv) {
  const opts = {
    threshold: 5,
    slug: null,
    dryRun: false,
    smart: false,
    model: process.env.PERSONA_MODEL || 'qwen3:4b',
  };

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];

    if (arg === '--threshold' && argv[i + 1]) {
      const threshold = Number(argv[++i]);
      if (!Number.isFinite(threshold) || threshold < 0) {
        throw new Error('--threshold must be a non-negative number');
      }
      opts.threshold = threshold;
    } else if (arg === '--slug' && argv[i + 1]) {
      opts.slug = slugify(argv[++i]);
    } else if (arg === '--dry-run') {
      opts.dryRun = true;
    } else if (arg === '--smart') {
      opts.smart = true;
    } else if (arg === '--model' && argv[i + 1]) {
      opts.model = argv[++i];
    } else {
      throw new Error(`Unknown or incomplete argument: ${arg}`);
    }
  }

  return opts;
}

function slugify(value) {
  return value
    .replace(/\.[^.]+$/, '')
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

function loadScoreHistory() {
  if (!existsSync(SCORE_HISTORY_FILE)) {
    stderr('No score history found. Run persona-rescore.mjs first.');
    process.exit(1);
  }

  try {
    const history = JSON.parse(readFileSync(SCORE_HISTORY_FILE, 'utf-8'));
    if (!Array.isArray(history)) {
      throw new Error('score-history.json must contain an array');
    }
    return history;
  } catch (err) {
    stderr(`Could not read score history: ${err.message}`);
    process.exit(1);
  }
}

function normalizeHistoryEntry(entry, index) {
  if (!entry || typeof entry !== 'object') return null;
  if (typeof entry.slug !== 'string') return null;

  const score = Number(entry.score);
  if (!Number.isFinite(score)) return null;

  return {
    slug: slugify(entry.slug),
    date: typeof entry.date === 'string' ? entry.date : '',
    score,
    index,
  };
}

function groupHistory(history) {
  const grouped = new Map();

  for (let i = 0; i < history.length; i++) {
    const entry = normalizeHistoryEntry(history[i], i);
    if (!entry) continue;
    if (!grouped.has(entry.slug)) grouped.set(entry.slug, []);
    grouped.get(entry.slug).push(entry);
  }

  for (const entries of grouped.values()) {
    entries.sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;
      return a.index - b.index;
    });
  }

  return grouped;
}

function latestBySlug(history) {
  const grouped = groupHistory(history);
  const latest = new Map();

  for (const [slug, entries] of grouped.entries()) {
    latest.set(slug, entries[entries.length - 1]);
  }

  return latest;
}

function dryRunBaselines(history) {
  const grouped = groupHistory(history);
  const baselines = new Map();
  const newest = new Map();

  for (const [slug, entries] of grouped.entries()) {
    newest.set(slug, entries[entries.length - 1]);
    if (entries.length >= 2) {
      baselines.set(slug, entries[entries.length - 2]);
    }
  }

  return { baselines, newest };
}

function discoverPersonaFiles() {
  if (!existsSync(COMPLETED_DIR)) {
    stderr('Chef Flow Personas/Completed/ does not exist.');
    process.exit(1);
  }

  const personas = [];

  for (const type of TYPES) {
    const typeDir = join(COMPLETED_DIR, type);
    if (!existsSync(typeDir)) continue;
    scanPersonaDir(typeDir, personas);
  }

  personas.sort((a, b) => a.slug.localeCompare(b.slug));
  return personas;
}

function scanPersonaDir(dir, personas) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch (err) {
    stderr(`[warn] Could not read ${relative(ROOT, dir)}: ${err.message}`);
    return;
  }

  for (const entry of entries) {
    const fullPath = join(dir, entry);
    let stats;
    try {
      stats = statSync(fullPath);
    } catch (err) {
      stderr(`[warn] Could not stat ${relative(ROOT, fullPath)}: ${err.message}`);
      continue;
    }

    if (stats.isDirectory()) {
      scanPersonaDir(fullPath, personas);
      continue;
    }

    if (!stats.isFile()) continue;
    const ext = extname(entry).toLowerCase();
    if (ext !== '.txt' && ext !== '.md') continue;

    personas.push({
      slug: slugify(entry),
      file: fullPath,
    });
  }
}

function runRescore(personas, opts) {
  for (const persona of personas) {
    stderr(`[rescore] ${persona.slug}`);
    try {
      execSync(
        `node devtools/persona-rescore.mjs --slug ${quoteShellArg(persona.slug)} --model ${quoteShellArg(opts.model)}`,
        {
          encoding: 'utf-8',
          timeout: 180000,
          cwd: ROOT,
        }
      );
    } catch (err) {
      const message = err.stderr ? err.stderr.toString().trim() : err.message;
      stderr(`[rescore] Failed for ${persona.slug}: ${message}`);
    }
  }
}

function quoteShellArg(value) {
  if (process.platform === 'win32') {
    return `"${String(value).replace(/"/g, '\\"')}"`;
  }
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

function comparePersonas(personas, baselines, newest, threshold) {
  return personas.map((persona) => {
    const previous = baselines.get(persona.slug) || null;
    const current = newest.get(persona.slug) || null;

    if (!previous && current) {
      return {
        slug: persona.slug,
        previous_score: null,
        new_score: current.score,
        delta: null,
        status: 'new',
      };
    }

    if (!current) {
      return {
        slug: persona.slug,
        previous_score: previous ? previous.score : null,
        new_score: null,
        delta: null,
        status: 'missing',
      };
    }

    const delta = current.score - previous.score;
    let status = 'stable';
    if (delta < -threshold) status = 'regressed';
    else if (delta > 0) status = 'improved';

    return {
      slug: persona.slug,
      previous_score: previous.score,
      new_score: current.score,
      delta,
      status,
    };
  });
}

function summarize(results) {
  const summary = {
    total: results.length,
    improved: 0,
    stable: 0,
    regressed: 0,
    new_baseline: 0,
  };

  for (const result of results) {
    if (result.status === 'improved') summary.improved++;
    else if (result.status === 'regressed') summary.regressed++;
    else if (result.status === 'new') summary.new_baseline++;
    else summary.stable++;
  }

  return summary;
}

function formatDelta(delta) {
  if (delta === null) return '';
  return delta >= 0 ? `+${delta}` : String(delta);
}

function formatResults(results, summary, opts, generatedAt) {
  const date = generatedAt.toISOString().slice(0, 10);
  const longestSlug = Math.max(4, ...results.map((result) => result.slug.length));
  const lines = [
    '=== Persona Regression Guard ===',
    `Model: ${opts.model} | Threshold: ${opts.threshold} | Date: ${date}`,
    '',
    'Results:',
  ];

  for (const result of results) {
    const slug = `${result.slug}:`.padEnd(longestSlug + 6, ' ');

    if (result.status === 'new') {
      lines.push(`  ${slug}(no baseline)  [NEW - score: ${result.new_score}]`);
      continue;
    }

    if (result.status === 'missing') {
      lines.push(`  ${slug}(no score)  [MISSING]`);
      continue;
    }

    const status = result.status === 'regressed' ? 'REGRESSION' : 'OK';
    lines.push(
      `  ${slug}${String(result.previous_score).padStart(3, ' ')} -> ${String(result.new_score).padEnd(3, ' ')} (${formatDelta(result.delta)})  [${status}]`
    );
  }

  const regressed = results
    .filter((result) => result.status === 'regressed')
    .map((result) => result.slug);

  lines.push('');
  lines.push('Summary:');
  lines.push(`  Rescored: ${summary.total}`);
  lines.push(`  Improved: ${summary.improved}`);
  lines.push(`  Stable:   ${summary.stable}`);
  lines.push(`  Regressed: ${summary.regressed}${regressed.length ? ` (${regressed.join(', ')})` : ''}`);
  lines.push(`  New:       ${summary.new_baseline}`);

  if (regressed.length > 0) {
    lines.push('');
    lines.push(`REGRESSION DETECTED in ${regressed.length} persona(s). Review before shipping.`);
  }

  return lines.join('\n');
}

function writeReport(results, summary, opts, generatedAt) {
  if (!existsSync(REPORT_DIR)) mkdirSync(REPORT_DIR, { recursive: true });

  const regressedPersonas = results
    .filter((result) => result.status === 'regressed')
    .map((result) => result.slug);

  const report = {
    generated_at: generatedAt.toISOString(),
    model: opts.model,
    threshold: opts.threshold,
    results,
    summary,
    regressed_personas: regressedPersonas,
  };

  const reportPath = join(REPORT_DIR, `${generatedAt.toISOString().slice(0, 10)}.json`);
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf-8');
  stderr(`[report] Wrote ${relative(ROOT, reportPath)}`);
}

function loadLatestReceipt() {
  if (!existsSync(BUILD_RECEIPTS_DIR)) return null;
  let files;
  try {
    files = readdirSync(BUILD_RECEIPTS_DIR).filter(f => f.endsWith('.json')).sort().reverse();
  } catch {
    return null;
  }
  if (files.length === 0) return null;
  try {
    return JSON.parse(readFileSync(join(BUILD_RECEIPTS_DIR, files[0]), 'utf-8'));
  } catch {
    return null;
  }
}

function extractCategoriesFromReceipt(receipt) {
  const categories = new Set();
  for (const gap of (receipt.gaps_likely_addressed || [])) {
    if (gap.category) categories.add(gap.category);
  }
  for (const gap of (receipt.gaps_possibly_addressed || [])) {
    if (gap.category) categories.add(gap.category);
  }
  return categories;
}

function findLatestReport(slug) {
  if (!existsSync(STRESS_TEST_DIR)) return null;
  let files;
  try {
    files = readdirSync(STRESS_TEST_DIR);
  } catch {
    return null;
  }

  const matching = files
    .filter(f => {
      const match = /^persona-(.+)-(\d{4}-\d{2}-\d{2})\.md$/i.exec(f);
      if (!match) return false;
      return match[1] === slug || match[1].includes(slug) || slug.includes(match[1]);
    })
    .sort()
    .reverse();

  if (matching.length === 0) return null;
  try {
    return readFileSync(join(STRESS_TEST_DIR, matching[0]), 'utf-8');
  } catch {
    return null;
  }
}

function extractPersonaCategories(reportText) {
  const categories = new Set();
  const lower = reportText.toLowerCase();
  for (const [catId, keywords] of Object.entries(GAP_CATEGORY_KEYWORDS)) {
    for (const kw of keywords) {
      if (lower.includes(kw)) {
        categories.add(catId);
        break;
      }
    }
  }
  return categories;
}

function filterBySmartMode(personas, opts) {
  const receipt = loadLatestReceipt();
  if (!receipt) {
    stderr('[smart] No build receipt found. Rescoring all personas.');
    return personas;
  }

  const changedCategories = extractCategoriesFromReceipt(receipt);
  if (changedCategories.size === 0) {
    stderr('[smart] Build receipt has no gap categories. Rescoring all personas.');
    return personas;
  }

  stderr(`[smart] Build receipt categories: ${[...changedCategories].join(', ')}`);

  const filtered = [];
  for (const persona of personas) {
    const reportText = findLatestReport(persona.slug);
    if (!reportText) {
      stderr(`[smart] ${persona.slug}: no report found, including`);
      filtered.push(persona);
      continue;
    }

    const personaCats = extractPersonaCategories(reportText);
    const overlap = [...personaCats].filter(c => changedCategories.has(c));

    if (overlap.length > 0) {
      stderr(`[smart] ${persona.slug}: overlap on ${overlap.join(', ')}, including`);
      filtered.push(persona);
    } else {
      stderr(`[smart] ${persona.slug}: no overlap, SKIPPING`);
    }
  }

  stderr(`[smart] Rescoring ${filtered.length}/${personas.length} personas`);
  return filtered;
}

function main() {
  let opts;
  try {
    opts = parseArgs(process.argv);
  } catch (err) {
    stderr(err.message);
    process.exit(1);
  }

  const initialHistory = loadScoreHistory();
  let personas = discoverPersonaFiles();

  if (opts.slug) {
    personas = personas.filter((persona) => persona.slug === opts.slug);
  }

  if (personas.length === 0) {
    stderr(opts.slug ? `No persona files found for slug "${opts.slug}".` : 'No persona files found.');
    process.exit(1);
  }

  let baselines;
  let newest;

  if (opts.dryRun) {
    stderr('[dry-run] Skipping rescore; comparing existing score history.');
    if (opts.smart) filterBySmartMode(personas, opts);
    ({ baselines, newest } = dryRunBaselines(initialHistory));
  } else {
    baselines = latestBySlug(initialHistory);
    const toRescore = opts.smart ? filterBySmartMode(personas, opts) : personas;
    runRescore(toRescore, opts);
    newest = latestBySlug(loadScoreHistory());
  }

  const results = comparePersonas(personas, baselines, newest, opts.threshold);
  const summary = summarize(results);
  const generatedAt = new Date();
  const report = formatResults(results, summary, opts, generatedAt);

  writeReport(results, summary, opts, generatedAt);
  process.stdout.write(`${report}\n`);
  process.exit(summary.regressed > 0 ? 1 : 0);
}

main();
