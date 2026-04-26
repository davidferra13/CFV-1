#!/usr/bin/env node

/**
 * Persona Validator
 *
 * Validates persona files against the quality standard (docs/specs/persona-quality-standard.md).
 * Returns pass/fail with score and reasons. Also importable as a module.
 *
 * Usage:
 *   node devtools/persona-validator.mjs "Chef Flow Personas/Uncompleted/Chef/someone.txt"
 *   node devtools/persona-validator.mjs --all
 *   node devtools/persona-validator.mjs --json "path/to/persona.txt"
 */

import { readFileSync, readdirSync, existsSync, mkdirSync, renameSync, appendFileSync } from 'fs';
import { resolve, basename, dirname, join, extname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '..');

// --- Section detection ---

function detectIdentityHeader(content) {
  // Line matching **Chef Profile: or **Client Profile: etc.
  return /\*\*(?:Chef|Client|Guest|Vendor|Staff|Partner|Public)\s+Profile:/i.test(content);
}

function detectBusinessReality(content) {
  // Section with concrete numbers near business terms
  const businessTerms = /\b\d+[\s,]*(?:clients?|events?|locations?|employees?|guests?|seats?|retainers?|dinners?|drops?|restaurants?|outlets?|staff|people|assistants?|cooks?)\b/gi;
  const moneyPattern = /\$[\d,]+/g;
  const businessMatches = content.match(businessTerms) || [];
  const moneyMatches = content.match(moneyPattern) || [];
  return businessMatches.length + moneyMatches.length;
}

function detectPrimaryFailure(content) {
  // Section with "failure" or "problem" in heading
  return /^#{1,4}\s+.*(?:failure|problem)/im.test(content);
}

function countStructuralIssues(content) {
  // Count sub-sections after primary failure: headings with structural/issue/gap/chaos/missing/volatility/risk
  // More broadly: count h3/h4 headings that aren't the identity header, primary failure, psychological model, or pass/fail
  const headings = content.match(/^#{2,4}\s+.+$/gm) || [];
  const skipPatterns = [
    /profile:/i,
    /primary\s+failure/i,
    /psychological\s+model/i,
    /pass\s*[\/&]\s*fail/i,
    /the\s+real\s+test/i,
    /business\s+reality/i,
    /summary/i,
    /score/i,
  ];

  let count = 0;
  let pastPrimaryFailure = false;

  for (const h of headings) {
    if (/primary\s+failure/i.test(h)) {
      pastPrimaryFailure = true;
      continue;
    }
    if (/psychological\s+model/i.test(h) || /pass\s*[\/&]\s*fail/i.test(h) || /the\s+real\s+test/i.test(h)) {
      continue;
    }
    if (pastPrimaryFailure && !skipPatterns.some(p => p.test(h))) {
      count++;
    }
  }

  // If we didn't find a clear primary failure heading, count all issue-like headings
  if (!pastPrimaryFailure) {
    for (const h of headings) {
      if (/(?:issue|gap|chaos|missing|volatility|risk|problem|failure|broken)/i.test(h)) {
        count++;
      }
    }
  }

  return count;
}

function detectPsychologicalModel(content) {
  return /^#{1,4}\s+.*(?:psychological|how\s+(?:they|I)\s+think|decision|mindset|psychology)/im.test(content);
}

function countPassFailConditions(content) {
  // Look for numbered conditions in pass/fail or "real test" section
  // Match patterns like "#### 1.", "1.", "- The system must"
  const pfSection = content.match(/(?:pass\s*[\/&]\s*fail|the\s+real\s+test)[\s\S]*$/im);
  if (!pfSection) return 0;

  const section = pfSection[0];
  // Count numbered sub-headings (#### 1. Title)
  const numberedHeadings = section.match(/^#{1,5}\s*\d+[\.\)]/gm) || [];
  // Count "The system must" or "must:" patterns
  const mustPatterns = section.match(/(?:must|should|support|handle|allow|manage|track|ensure|build)\s*[:\n]/gim) || [];
  // Count bullet items that look like conditions
  const bulletConditions = section.match(/^[\s]*[-*]\s+.{10,}/gm) || [];

  return Math.max(numberedHeadings.length, mustPatterns.length, bulletConditions.length);
}

// --- Specificity check ---

function countBusinessNumbers(content) {
  // Digits near business terms, or dollar amounts
  const moneyPattern = /\$[\d,]+/g;
  const numberNearTerm = /\b(\d+)\s*(?:[-–]?\s*\d+\s*)?(?:clients?|events?|locations?|employees?|guests?|seats?|retainers?|dinners?|drops?|restaurants?|outlets?|staff|people|assistants?|cooks?|miles?|days?|weeks?|hours?|months?|years?|menus?|recipes?|orders?|deliveries?|classes?|students?|courses?)/gi;
  const money = content.match(moneyPattern) || [];
  const terms = content.match(numberNearTerm) || [];
  // Deduplicate
  return new Set([...money, ...terms].map(m => m.trim().toLowerCase())).size;
}

// --- Contradiction scan (heuristic, best-effort) ---

function scanContradictions(content) {
  const flags = [];
  const lower = content.toLowerCase();

  const contradictions = [
    { a: /\bsolo\b/i, b: /\bteam\s+management\b/i, msg: '"solo" + "team management" contradiction' },
    { a: /\bno\s+clients?\b/i, b: /\b\d+\s+clients?\b/i, msg: '"no clients" + specific client count contradiction' },
    { a: /\bno\s+employees?\b/i, b: /\b\d+\s+employees?\b/i, msg: '"no employees" + employee count contradiction' },
    { a: /\bgluten[\s-]*free\s+specialist\b/i, b: /\bgluten\s+recipes?\b/i, msg: 'gluten-free specialist + gluten recipe contradiction' },
    { a: /\btech[\s-]*averse\b/i, b: /\bAPI\s+integrations?\b/i, msg: 'tech-averse + API integrations contradiction' },
  ];

  for (const c of contradictions) {
    if (c.a.test(content) && c.b.test(content)) {
      flags.push(c.msg);
    }
  }

  return flags;
}

// --- Duplication check ---

function collectExistingNames() {
  const names = [];
  const dirs = [
    join(ROOT, 'Chef Flow Personas', 'Completed'),
    join(ROOT, 'Chef Flow Personas', 'Failed'),
  ];

  for (const base of dirs) {
    if (!existsSync(base)) continue;
    for (const typeDir of readdirSync(base)) {
      const typePath = join(base, typeDir);
      try {
        const entries = readdirSync(typePath);
        for (const f of entries) {
          const ext = extname(f).toLowerCase();
          if (ext !== '.txt' && ext !== '.md') continue;
          names.push(f.replace(/\.[^.]+$/, ''));
        }
      } catch { /* skip non-dirs */ }
    }
  }

  // Also check gap reports
  const stressDir = join(ROOT, 'docs', 'stress-tests');
  if (existsSync(stressDir)) {
    for (const f of readdirSync(stressDir)) {
      const match = f.match(/^persona-(.+)-\d{4}-\d{2}-\d{2}\.md$/);
      if (match) names.push(match[1]);
    }
  }

  return names;
}

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

function normalize(name) {
  return name.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '-').trim();
}

function checkDuplicates(personaName) {
  const flags = [];
  const existingNames = collectExistingNames();
  const norm = normalize(personaName);

  for (const existing of existingNames) {
    const existNorm = normalize(existing);
    if (existNorm === norm || levenshtein(existNorm, norm) <= 3) {
      flags.push(`Possible duplicate: existing persona '${existing}'`);
    }
  }

  return flags;
}

// --- Extract persona name and type from content ---

function extractName(content) {
  // Try identity header first
  const headerMatch = content.match(/\*\*(?:Chef|Client|Guest|Vendor|Staff|Partner|Public)\s+Profile:\s*"?([^"*\n]+)"?\s*/i);
  if (headerMatch) return headerMatch[1].replace(/\s*[-—].*/,'').trim();

  // Fall back to first heading
  const headingMatch = content.match(/^#{1,3}\s+(.+)$/m);
  if (headingMatch) {
    const h = headingMatch[1].replace(/\*\*/g, '').trim();
    if (h.length < 60) return h;
  }

  return 'Unknown';
}

function extractType(content) {
  const match = content.match(/\*\*(Chef|Client|Guest|Vendor|Staff|Partner|Public)\s+Profile:/i);
  return match ? match[1] : 'Unknown';
}

// --- Core validation ---

export function validatePersonaContent(text, opts = {}) {
  const name = opts.name || extractName(text);
  const type = opts.type || extractType(text);
  const wordCount = text.split(/\s+/).filter(w => w.length > 0).length;

  // Section checks
  const hasIdentity = detectIdentityHeader(text);
  const businessNumbers = detectBusinessReality(text);
  const hasBusinessReality = businessNumbers >= 1;
  const hasPrimaryFailure = detectPrimaryFailure(text);
  const structuralCount = countStructuralIssues(text);
  const hasPsychModel = detectPsychologicalModel(text);
  const passFailCount = countPassFailConditions(text);

  const sectionsFound = [];
  const sectionsMissing = [];

  if (hasIdentity) sectionsFound.push('identity'); else sectionsMissing.push('identity');
  if (hasBusinessReality) sectionsFound.push('business_reality'); else sectionsMissing.push('business_reality');
  if (hasPrimaryFailure) sectionsFound.push('primary_failure'); else sectionsMissing.push('primary_failure');
  if (structuralCount >= 3) sectionsFound.push('structural_issues'); else sectionsMissing.push('structural_issues');
  if (hasPsychModel) sectionsFound.push('psychological_model'); else sectionsMissing.push('psychological_model');
  if (passFailCount >= 5) sectionsFound.push('pass_fail'); else sectionsMissing.push('pass_fail');

  // Specificity
  const numbersFound = countBusinessNumbers(text);

  // Flags
  const flags = [];
  flags.push(...scanContradictions(text));
  flags.push(...checkDuplicates(name));

  // Rejection reasons
  const rejectionReasons = [];
  if (sectionsMissing.length > 0) {
    rejectionReasons.push(`Missing sections: ${sectionsMissing.join(', ')}`);
  }
  if (wordCount < 500) {
    rejectionReasons.push(`Word count too low: ${wordCount} (minimum 500)`);
  }

  // Score: 100 base, deductions
  let score = 100;
  score -= sectionsMissing.length * 20; // -20 per missing section (from the 6 required)
  // But structural_issues and pass_fail are already in sections, so the -20 covers those
  // Additional deductions for specificity
  if (numbersFound < 3) score -= 10;
  if (structuralCount < 3 && !sectionsMissing.includes('structural_issues')) {
    // Already deducted via missing section
  }
  if (passFailCount < 5 && !sectionsMissing.includes('pass_fail')) {
    // Already deducted via missing section
  }
  // Word count penalty (not in score formula but causes rejection)
  if (wordCount < 500) score -= 15;
  // Flag penalties
  score -= flags.length * 5;
  score = Math.max(0, Math.min(100, score));

  // Valid: score >= 40 AND no missing required sections that cause hard reject
  // Spec: valid = false if score < 40 OR any required section missing
  // "required section missing" means identity, business_reality, primary_failure are hard rejects
  // structural_issues, psychological_model, pass_fail missing reduce score by 20 each
  const hardRequired = ['identity', 'business_reality', 'primary_failure'];
  const hardMissing = hardRequired.filter(s => sectionsMissing.includes(s));
  const valid = score >= 40 && hardMissing.length === 0;

  return {
    file: opts.file || null,
    valid,
    score,
    name,
    type,
    word_count: wordCount,
    sections_found: sectionsFound,
    sections_missing: sectionsMissing,
    numbers_found: numbersFound,
    structural_issues_count: structuralCount,
    pass_fail_conditions_count: passFailCount,
    flags,
    rejection_reasons: rejectionReasons,
  };
}

export function validatePersona(filePath) {
  const absPath = resolve(filePath);
  if (!existsSync(absPath)) {
    return {
      file: filePath,
      valid: false,
      score: 0,
      name: 'Unknown',
      type: 'Unknown',
      word_count: 0,
      sections_found: [],
      sections_missing: ['identity', 'business_reality', 'primary_failure', 'structural_issues', 'psychological_model', 'pass_fail'],
      numbers_found: 0,
      structural_issues_count: 0,
      pass_fail_conditions_count: 0,
      flags: [],
      rejection_reasons: ['File not found'],
    };
  }

  const content = readFileSync(absPath, 'utf-8');
  return validatePersonaContent(content, { file: filePath });
}

// --- Rejection handling ---

function handleRejection(filePath, result) {
  const absPath = resolve(filePath);
  const type = result.type !== 'Unknown' ? result.type : 'Unknown';
  const failedDir = join(ROOT, 'Chef Flow Personas', 'Failed', type);
  mkdirSync(failedDir, { recursive: true });

  // Append rejection reasons to the file
  const reasons = result.rejection_reasons.join('\n');
  const comment = `\n\n---\n<!-- VALIDATION FAILED (score: ${result.score})\n${reasons}\nFlags: ${result.flags.join('; ') || 'none'}\nValidated: ${new Date().toISOString()}\n-->\n`;
  appendFileSync(absPath, comment, 'utf-8');

  // Move to Failed/
  const destPath = join(failedDir, basename(absPath));
  try {
    renameSync(absPath, destPath);
    return destPath;
  } catch (err) {
    console.error(`[validator] Warning: could not move to Failed/: ${err.message}`);
    return null;
  }
}

// --- CLI ---

function printHuman(result) {
  const status = result.valid ? '\x1b[32mPASS\x1b[0m' : '\x1b[31mFAIL\x1b[0m';
  console.log(`${status}  ${result.name} (${result.type}) - Score: ${result.score}/100`);
  console.log(`  Words: ${result.word_count} | Numbers: ${result.numbers_found} | Structural Issues: ${result.structural_issues_count} | Pass/Fail Conditions: ${result.pass_fail_conditions_count}`);
  if (result.sections_found.length > 0) {
    console.log(`  Sections: ${result.sections_found.join(', ')}`);
  }
  if (result.sections_missing.length > 0) {
    console.log(`  Missing: ${result.sections_missing.join(', ')}`);
  }
  if (result.flags.length > 0) {
    console.log(`  Flags: ${result.flags.join('; ')}`);
  }
  if (result.rejection_reasons.length > 0) {
    console.log(`  Rejection: ${result.rejection_reasons.join('; ')}`);
  }
}

function collectAllPending() {
  const dirs = [
    'Chef Flow Personas/Uncompleted/Chef/',
    'Chef Flow Personas/Uncompleted/Client/',
    'Chef Flow Personas/Uncompleted/Guest/',
    'Chef Flow Personas/Uncompleted/Vendor/',
    'Chef Flow Personas/Uncompleted/Staff/',
    'Chef Flow Personas/Uncompleted/Partner/',
    'Chef Flow Personas/Uncompleted/Public/',
  ];

  const files = [];
  for (const relDir of dirs) {
    const absDir = join(ROOT, relDir);
    if (!existsSync(absDir)) continue;
    try {
      for (const f of readdirSync(absDir)) {
        const ext = extname(f).toLowerCase();
        if (ext === '.txt' || ext === '.md') {
          files.push(join(absDir, f));
        }
      }
    } catch { /* skip */ }
  }
  return files;
}

function main() {
  const args = process.argv.slice(2);
  let jsonMode = false;
  let allMode = false;
  let targetFile = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--json') jsonMode = true;
    else if (args[i] === '--all') allMode = true;
    else if (!args[i].startsWith('--')) targetFile = args[i];
  }

  if (!allMode && !targetFile) {
    console.log('Usage: node devtools/persona-validator.mjs <persona-file>');
    console.log('       node devtools/persona-validator.mjs --all');
    console.log('       node devtools/persona-validator.mjs --json <persona-file>');
    process.exit(1);
  }

  const files = allMode ? collectAllPending() : [resolve(targetFile)];

  if (files.length === 0) {
    console.log('[validator] No persona files found.');
    process.exit(0);
  }

  const results = [];
  let passCount = 0;
  let failCount = 0;

  for (const f of files) {
    const result = validatePersona(f);
    results.push(result);

    if (result.valid) {
      passCount++;
    } else {
      failCount++;
      // Only move to Failed/ if running --all (batch mode)
      if (allMode) {
        handleRejection(f, result);
      }
    }

    if (!jsonMode) {
      printHuman(result);
    }
  }

  if (jsonMode) {
    console.log(JSON.stringify(results.length === 1 ? results[0] : results, null, 2));
  }

  if (allMode && !jsonMode) {
    console.log(`\n${passCount} passed, ${failCount} failed out of ${files.length} persona(s).`);
  }

  // Exit code: 0 if all valid, 1 if any invalid
  process.exit(failCount > 0 ? 1 : 0);
}

// Run CLI only when executed directly
const isMain = process.argv[1] && resolve(process.argv[1]) === __filename;
if (isMain) {
  main();
}
