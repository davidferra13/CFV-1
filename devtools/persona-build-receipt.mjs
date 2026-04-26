#!/usr/bin/env node

import { execSync } from 'child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

function parseArgs(argv) {
  const options = {
    commits: 1,
    dryRun: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--dry-run') {
      options.dryRun = true;
      continue;
    }

    if (arg === '--commits') {
      const value = argv[index + 1];
      const commits = Number.parseInt(value, 10);

      if (!Number.isInteger(commits) || commits < 1) {
        throw new Error('--commits requires a positive integer');
      }

      options.commits = commits;
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function runGit(command) {
  return execSync(command, { encoding: 'utf-8', cwd: ROOT }).trim();
}

function readChangedFiles(commits) {
  const output = runGit(`git diff --name-only HEAD~${commits}`);
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function readStressTestGapTitles() {
  const stressTestsDir = path.join(ROOT, 'docs', 'stress-tests');

  if (!existsSync(stressTestsDir)) {
    return new Set();
  }

  const titles = new Set();
  const files = readdirSync(stressTestsDir).filter((file) => /^persona-.*\.md$/i.test(file));

  for (const file of files) {
    const fullPath = path.join(stressTestsDir, file);
    const content = readFileSync(fullPath, 'utf-8');
    const gapHeadingPattern = /^#{2,6}\s+Gap\s+\d+\s*:\s*(.+?)\s*$/gim;
    let match = gapHeadingPattern.exec(content);

    while (match) {
      titles.add(normalizeTitle(match[1]));
      match = gapHeadingPattern.exec(content);
    }
  }

  return titles;
}

function readSaturation() {
  const saturationPath = path.join(ROOT, 'system', 'persona-batch-synthesis', 'saturation.json');

  try {
    const content = readFileSync(saturationPath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    process.stderr.write(`Warning: unable to read saturation.json: ${error.message}\n`);
    return null;
  }
}

function normalizeTitle(title) {
  return String(title || '')
    .replace(/[*_`]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/:+$/g, '')
    .trim()
    .toLowerCase();
}

function escapeRegex(value) {
  return String(value).replace(/[\\^$*+?()[\]{}|]/g, '\\$&');
}

function grepTermToRegex(term) {
  const parts = String(term)
    .split('.')
    .map((part) => escapeRegex(part));
  return new RegExp(parts.join('[.\\-_/\\\\\\s]+'), 'i');
}

function flattenGaps(saturation, stressTestGapTitles) {
  if (!saturation || !saturation.categories || typeof saturation.categories !== 'object') {
    return [];
  }

  const gaps = [];

  for (const [category, categoryData] of Object.entries(saturation.categories)) {
    if (!categoryData || !Array.isArray(categoryData.gaps)) {
      continue;
    }

    for (const gap of categoryData.gaps) {
      const grepTerms = gap?.search_hints?.grep_terms;

      if (!Array.isArray(grepTerms) || grepTerms.length === 0) {
        continue;
      }

      gaps.push({
        category,
        title: gap.title || '',
        from: gap.from || '',
        grepTerms: grepTerms.filter((term) => typeof term === 'string' && term.trim()),
        appearsInStressTests: stressTestGapTitles.has(normalizeTitle(gap.title)),
      });
    }
  }

  return gaps;
}

function matchGaps(gaps, filesChanged, commitMessage) {
  const combinedText = [...filesChanged, commitMessage].join('\n');
  const likely = [];
  const possible = [];

  for (const gap of gaps) {
    const matchedTerms = [];

    for (const term of gap.grepTerms) {
      if (grepTermToRegex(term).test(combinedText)) {
        matchedTerms.push(term);
      }
    }

    if (matchedTerms.length === 0) {
      continue;
    }

    const receiptGap = {
      category: gap.category,
      gap_title: gap.title,
      from_persona: gap.from,
      matched_terms: matchedTerms,
      confidence: matchedTerms.length >= 2 ? 'high' : 'low',
    };

    if (matchedTerms.length >= 2) {
      likely.push(receiptGap);
    } else {
      possible.push(receiptGap);
    }
  }

  return {
    likely,
    possible,
  };
}

function findUnmatchedFiles(gaps, filesChanged) {
  const termRegexes = gaps.flatMap((gap) => gap.grepTerms.map((term) => grepTermToRegex(term)));

  if (termRegexes.length === 0) {
    return filesChanged;
  }

  return filesChanged.filter((file) => !termRegexes.some((regex) => regex.test(file)));
}

function createReceipt(options) {
  const filesChanged = readChangedFiles(options.commits);
  const commitMessage = runGit('git log -1 --format=%s');
  const commitHash = runGit('git rev-parse HEAD');
  const stressTestGapTitles = readStressTestGapTitles();
  const saturation = readSaturation();
  const gaps = flattenGaps(saturation, stressTestGapTitles);
  const matches = saturation
    ? matchGaps(gaps, filesChanged, commitMessage)
    : { likely: [], possible: [] };

  return {
    generated_at: new Date().toISOString(),
    commit_hash: commitHash,
    commit_message: commitMessage,
    files_changed: filesChanged,
    gaps_likely_addressed: matches.likely,
    gaps_possibly_addressed: matches.possible,
    unmatched_files: saturation ? findUnmatchedFiles(gaps, filesChanged) : filesChanged,
  };
}

function writeReceipt(receipt) {
  const shortHash = receipt.commit_hash.slice(0, 7);
  const date = new Date(receipt.generated_at).toISOString().slice(0, 10);
  const receiptsDir = path.join(ROOT, 'system', 'build-receipts');
  const receiptPath = path.join(receiptsDir, `${date}-${shortHash}.json`);

  mkdirSync(receiptsDir, { recursive: true });
  writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, 'utf-8');

  return receiptPath;
}

function main() {
  try {
    const options = parseArgs(process.argv.slice(2));
    const receipt = createReceipt(options);

    if (options.dryRun) {
      process.stdout.write(`${JSON.stringify(receipt, null, 2)}\n`);
      return;
    }

    const receiptPath = writeReceipt(receipt);
    const relativePath = path.relative(ROOT, receiptPath).split(path.sep).join('/');
    process.stdout.write(`${relativePath}\n`);
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}

main();
