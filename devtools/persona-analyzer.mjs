#!/usr/bin/env node

/**
 * Persona Analyzer (v2 Pipeline, Stage 1)
 *
 * Evaluates a persona file against ChefFlow capabilities using a local LLM.
 * Writes a structured gap report to docs/stress-tests/.
 *
 * Usage: node devtools/persona-analyzer.mjs <persona-file> [--model gemma4:e4b] [--ollama-url http://localhost:11434]
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, renameSync, appendFileSync, readdirSync } from 'fs';
import { resolve, basename, dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '..');
const OLLAMA_TIMEOUT_MS = 120000;
const MAX_RETRIES = 2;

const KNOWN_BUILT_FEATURES = [
  { patterns: ['cross.contamination', 'allergen.matrix', 'allergen.conflict'], file: 'lib/dietary/cross-contamination-check.ts', label: 'Allergen cross-contamination check' },
  { patterns: ['knowledge.dietary', 'dietary.flag', 'wikidata.*dietary'], file: 'lib/dietary/knowledge-dietary-check.ts', label: 'Knowledge dietary check' },
  { patterns: ['CompletionResult', 'evaluateCompletion', 'completion.engine'], file: 'lib/completion/engine.ts', label: 'Completion contract engine' },
  { patterns: ['ticket_type', 'purchaseTicket', 'event_ticketing'], file: 'lib/tickets/actions.ts', label: 'Ticketed events' },
  { patterns: ['event.transition', 'EventState', 'event_fsm'], file: 'lib/events/event-transitions.ts', label: 'Event FSM lifecycle' },
  { patterns: ['ledger.entry', 'createLedger', 'financial_summary'], file: 'lib/finance/ledger-actions.ts', label: 'Financial ledger' },
  { patterns: ['plate.cost', 'recipe.cost', 'food_cost'], file: 'lib/culinary/plate-cost-actions.ts', label: 'Recipe costing' },
  { patterns: ['trust.loop', 'post_event_survey', 'wellness_outcome'], file: 'lib/post-event/trust-loop-actions.ts', label: 'Post-event surveys + wellness' },
  { patterns: ['cannabis.action', 'cannabis.event', 'compliance'], file: 'lib/chef/cannabis-actions.ts', label: 'Cannabis compliance' },
  { patterns: ['staff.member', 'staff.action'], file: 'lib/staff/', label: 'Staff management' },
  { patterns: ['equipment.inventory', 'equipment.action'], file: 'lib/equipment/', label: 'Equipment inventory' },
  { patterns: ['contract.generat', 'contract.template'], file: 'lib/ai/contract-generator.ts', label: 'Contract generation' },
  { patterns: ['dinner.circle', 'circle.member'], file: 'lib/circles/', label: 'Dinner circles' },
  { patterns: ['booking.page', 'chefSlug', 'book.page'], file: 'app/book/', label: 'Booking page' },
  { patterns: ['shareToken', 'public.event'], file: 'app/(public)/e/', label: 'Public event pages' },
  { patterns: ['recipe.search', 'recipe.action'], file: 'lib/recipes/', label: 'Recipe management' },
  { patterns: ['menu.health', 'menu.action', 'addDishToMenu'], file: 'lib/menus/actions.ts', label: 'Menu management' },
];

// --- CLI Parsing ---

function parseArgs(argv) {
  const args = argv.slice(2);
  let personaFile = null;
  let model = process.env.PERSONA_ANALYZER_MODEL || process.env.PERSONA_MODEL || 'gemma4:e4b';
  let ollamaUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--model' && args[i + 1]) {
      model = args[++i];
    } else if (args[i] === '--ollama-url' && args[i + 1]) {
      ollamaUrl = args[++i];
    } else if (!args[i].startsWith('--')) {
      personaFile = args[i];
    }
  }

  return { personaFile, model, ollamaUrl };
}

// --- Helpers ---

function readTruncated(filePath, maxLines) {
  const abs = resolve(ROOT, filePath);
  if (!existsSync(abs)) return '[file not found, skipped]';
  const content = readFileSync(abs, 'utf-8');
  const lines = content.split('\n');
  return lines.slice(0, maxLines).join('\n');
}

function makeSlug(filename) {
  const name = filename.replace(/\.[^.]+$/, '');
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function sleep(ms) {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

function detectPersonaType(personaFilePath) {
  const abs = resolve(personaFilePath);
  const parts = abs.replace(/\\/g, '/').split('/');
  // Structure: .../Uncompleted/{Type}/file.txt or .../Completed/{Type}/file.txt
  if (parts.length >= 2) {
    return parts[parts.length - 2];
  }
  return 'Unknown';
}

function extractNameFromContent(content) {
  const lines = content.split('\n').filter(l => l.trim().length > 0);
  if (lines.length === 0) return 'Unknown';
  // Strip markdown headers
  const first = lines[0].replace(/^#+\s*/, '').trim();
  if (first.split(/\s+/).length <= 5 && first.length < 60) return first;
  return 'Unknown';
}

function parseScore(reportContent) {
  const match = reportContent.match(/##\s*Score:\s*(\d+)\/100/);
  return match ? match[1] : '??';
}

function parsePersonaName(reportContent) {
  const match = reportContent.match(/^#\s*Persona Stress Test:\s*(.+)$/m);
  return match ? match[1].trim() : null;
}

function parsePersonaTypeFromReport(reportContent) {
  const match = reportContent.match(/^\*\*Type:\*\*\s*(.+)$/m);
  return match ? match[1].trim() : null;
}

function makePartialReport({ name, date, personaType, reason, rawOutput }) {
  const received = rawOutput && rawOutput.trim()
    ? rawOutput.trim()
    : '[no usable response received]';
  return `# Persona Stress Test: ${name}
**Type:** ${personaType}
**Date:** ${date}
**Method:** local-ollama-v2
**Partial:** true

## Summary
The local analyzer did not complete a reliable full report. This partial report preserves the response received from Ollama so the pipeline can continue without losing the persona.

## Score: 0/100
- Workflow Coverage (0-40): 0 -- Analyzer did not complete.
- Data Model Fit (0-25): 0 -- Analyzer did not complete.
- UX Alignment (0-15): 0 -- Analyzer did not complete.
- Financial Accuracy (0-10): 0 -- Analyzer did not complete.
- Onboarding Viability (0-5): 0 -- Analyzer did not complete.
- Retention Likelihood (0-5): 0 -- Analyzer did not complete.

## Top 5 Gaps
### Gap 1: Analyzer incomplete
**Severity:** HIGH
The analyzer failed after retries: ${reason}

### Gap 2: Manual review required
**Severity:** HIGH
Review the raw partial output below before creating build tasks from this persona.

### Gap 3: Report confidence unavailable
**Severity:** MEDIUM
The model response did not provide enough structured evidence for a confident product assessment.

### Gap 4: Planner input degraded
**Severity:** MEDIUM
Planner output from this report may be generic because the analyzer response was incomplete.

### Gap 5: Retry candidate
**Severity:** LOW
This persona should be re-analyzed after Ollama is responsive.

## Quick Wins
1. Re-run the analyzer for this persona.
2. Check Ollama logs for timeout or empty response errors.
3. Confirm the analyzer model is available locally.

## Verdict
Do not use this partial report for product decisions until the persona is re-analyzed.

## Raw Partial Output
\`\`\`markdown
${received}
\`\`\``;
}

function cleanMarkdownText(value) {
  return String(value || '')
    .replace(/\*\*/g, '')
    .replace(/`/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractSection(content, headingPattern) {
  const match = headingPattern.exec(content);
  if (!match) return '';
  const rest = content.slice(match.index + match[0].length);
  const next = /^---$|^##\s+/im.exec(rest);
  return (next ? rest.slice(0, next.index) : rest).trim();
}

function extractRecommendationTitles(content) {
  const titles = [];
  const actionSection = extractSection(content, /^##\s*(?:Actionable Recommendations|Recommendations|Quick Wins)\s*$/im);
  const source = actionSection || content;
  const numberedBold = source.matchAll(/^\s*\d+\.\s+\*\*(.+?)\*\*/gm);
  for (const match of numberedBold) titles.push(cleanMarkdownText(match[1]));

  const lowScoreRows = content.matchAll(/^\|\s*\*\*(.+?)\*\*\s*\|\s*([12])\/5\s*\|(.+?)\|$/gm);
  for (const match of lowScoreRows) {
    titles.push(cleanMarkdownText(match[1]));
  }

  return [...new Set(titles)].filter(Boolean).slice(0, 5);
}

function estimateScore(content) {
  const explicit = content.match(/(?:overall|score)[^\d]{0,20}(\d{1,3})\s*\/\s*100/i);
  if (explicit) return Math.max(0, Math.min(100, Number(explicit[1])));

  const tableScores = [...content.matchAll(/\|\s*(?:\*\*)?.+?(?:\*\*)?\s*\|\s*([1-5])\/5\s*\|/g)]
    .map((match) => Number(match[1]));
  if (tableScores.length > 0) {
    const avg = tableScores.reduce((sum, n) => sum + n, 0) / tableScores.length;
    return Math.max(0, Math.min(100, Math.round(avg * 20)));
  }

  return 50;
}

function normalizeReportFormat({ name, date, personaType, rawOutput }) {
  const summarySection = extractSection(rawOutput, /^##\s*(?:Evaluation Summary|Summary)\s*$/im);
  const summary = cleanMarkdownText(summarySection).slice(0, 600)
    || 'The analyzer returned usable findings but did not follow the required markdown structure.';
  const titles = extractRecommendationTitles(rawOutput);
  const fallbackTitles = [
    'Workflow coverage gap',
    'Data model gap',
    'UX alignment gap',
    'Financial accuracy gap',
    'Operational follow through gap',
  ];
  const gaps = [...titles, ...fallbackTitles].slice(0, 5);
  const score = estimateScore(rawOutput);
  const workflow = Math.round(score * 0.4);
  const data = Math.round(score * 0.25);
  const ux = Math.round(score * 0.15);
  const financial = Math.round(score * 0.1);
  const onboarding = Math.round(score * 0.05);
  const retention = score - workflow - data - ux - financial - onboarding;

  return `# Persona Stress Test: ${name}
**Type:** ${personaType}
**Date:** ${date}
**Method:** local-ollama-v2
**Normalized:** true

## Summary
${summary}

## Score: ${score}/100
- Workflow Coverage (0-40): ${workflow} -- Normalized from non-standard analyzer output.
- Data Model Fit (0-25): ${data} -- Normalized from non-standard analyzer output.
- UX Alignment (0-15): ${ux} -- Normalized from non-standard analyzer output.
- Financial Accuracy (0-10): ${financial} -- Normalized from non-standard analyzer output.
- Onboarding Viability (0-5): ${onboarding} -- Normalized from non-standard analyzer output.
- Retention Likelihood (0-5): ${retention} -- Normalized from non-standard analyzer output.

## Top 5 Gaps
### Gap 1: ${gaps[0]}
**Severity:** HIGH
The analyzer identified this as a major product fit concern. Review the raw analyzer output below for the original wording and supporting context.

### Gap 2: ${gaps[1]}
**Severity:** HIGH
This gap affects whether ChefFlow can support the persona's full operating workflow without manual reconciliation.

### Gap 3: ${gaps[2]}
**Severity:** MEDIUM
This gap should be considered during build planning because it creates repeated operational friction.

### Gap 4: ${gaps[3]}
**Severity:** MEDIUM
This gap may reduce confidence in pricing, planning, communication, or execution for the persona.

### Gap 5: ${gaps[4]}
**Severity:** LOW
This gap is lower priority but still useful for product fit assessment.

## Quick Wins
1. Preserve the analyzer's original recommendations in the raw output section.
2. Convert the highest severity gap into a planner task.
3. Re-run analysis later if a fully templated report is required.

## Verdict
ChefFlow can use this normalized report for triage, but the raw analyzer output should be reviewed before making product decisions.

## Raw Analyzer Output
\`\`\`markdown
${rawOutput.trim()}
\`\`\``;
}

function buildExistingFeaturesContext() {
  const lines = [];
  for (const feat of KNOWN_BUILT_FEATURES) {
    const files = feat.files || [feat.file];
    const pattern = feat.pattern?.source || feat.pattern || feat.patterns?.join('|') || feat.label;
    for (const f of files.filter(Boolean)) {
      const abs = join(ROOT, f);
      if (existsSync(abs)) {
        const label = feat.label ? ` (${feat.label})` : '';
        lines.push(`- ${pattern}: implemented in ${f}${label}`);
        break;
      }
    }
  }

  return lines.length > 0
    ? `\n## Features Already Built in ChefFlow (DO NOT flag these as missing)\n${lines.join('\n')}\n`
    : '';
}

function scanDirectoryFiles(dirPath, files = []) {
  const absDir = join(ROOT, dirPath);
  if (!existsSync(absDir)) return files;

  for (const entry of readdirSync(absDir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.next' || entry.name === '.git') continue;

    const relativePath = join(dirPath, entry.name).replace(/\\/g, '/');
    if (entry.isDirectory()) {
      scanDirectoryFiles(relativePath, files);
    } else {
      files.push(relativePath);
    }
  }

  return files;
}

function buildCapabilityFileList() {
  // Dynamic feature scan: list built capability surfaces for analyzer context.
  const capDirs = ['app/(chef)', 'lib', 'components'];
  const capPatterns = ['actions.ts', 'page.tsx'];
  const capabilityFiles = [];

  for (const dir of capDirs) {
    const dirFiles = scanDirectoryFiles(dir)
      .filter((f) => {
        const name = basename(f);
        return capPatterns.includes(name) || /\.(ts|tsx)$/.test(name);
      })
      .sort();
    capabilityFiles.push(...dirFiles);
  }

  return capabilityFiles.slice(0, 200);
}

// --- Main ---

async function main() {
  const { personaFile, model, ollamaUrl } = parseArgs(process.argv);

  if (!personaFile) {
    console.log('Usage: node devtools/persona-analyzer.mjs <persona-file> [--model gemma4:e4b] [--ollama-url http://localhost:11434]');
    console.log('');
    console.log('Evaluates a persona file against ChefFlow capabilities using a local LLM.');
    console.log('Writes a structured gap report to docs/stress-tests/.');
    console.log('');
    console.log('Options:');
    console.log('  --model <name>       Ollama model (default: PERSONA_ANALYZER_MODEL or PERSONA_MODEL env or gemma4:e4b)');
    console.log('  --ollama-url <url>   Ollama base URL (default: OLLAMA_BASE_URL env or http://localhost:11434)');
    process.exit(1);
  }

  const absPersonaFile = resolve(personaFile);
  if (!existsSync(absPersonaFile)) {
    console.error(`ERROR: File not found: ${personaFile}`);
    process.exit(1);
  }

  // Step 1: Read persona file
  const personaContent = readFileSync(absPersonaFile, 'utf-8');

  // Step 2: Read reference docs (truncated to 200 lines each)
  const blueprint = readTruncated('docs/product-blueprint.md', 200);
  const audit = readTruncated('docs/app-complete-audit.md', 200);
  const features = readTruncated('lib/billing/feature-classification.ts', 200);
  const lifecycle = readTruncated('docs/service-lifecycle-blueprint.md', 200);
  const existingFeatures = buildExistingFeaturesContext();
  const capabilityFiles = buildCapabilityFileList();
  const capabilityList = capabilityFiles.length > 0
    ? capabilityFiles.map(f => `- ${f}`).join('\n')
    : '- [no capability files found]';

  // Step 3: Build prompt (exact template from spec, with format enforcement)
  const date = todayISO();
  // Prefer name from filename (persona files are named after the persona); fall back to content parsing
  const filenameBase = basename(absPersonaFile).replace(/\.[^.]+$/, '');
  const nameFromFile = filenameBase.length > 1 ? filenameBase : extractNameFromContent(personaContent);

  const fullPrompt = `CRITICAL: You MUST respond using EXACTLY the markdown template below. Do not invent your own format. Fill in the {placeholders} with your evaluation. Start your response with the exact line: # Persona Stress Test:

You are evaluating a software product called ChefFlow against a user persona.

ChefFlow is an operations platform for food service professionals: private chefs, caterers, food vendors, event cooks, and related roles. It handles events, clients, recipes, menus, pricing, invoicing, contracts, scheduling, and AI-assisted communication.

IMPORTANT: Review the 'Features Already Built' section before scoring. If a capability is listed as already built, do NOT flag it as a gap. Only flag genuinely missing capabilities.

=== CHEFFLOW CAPABILITIES ===
${blueprint}

=== FEATURE CLASSIFICATION ===
${features}

=== SERVICE LIFECYCLE ===
${lifecycle}

=== PAGE AND UI REGISTRY ===
${audit}

${existingFeatures}
## ChefFlow File Structure (partial - for reference)
${capabilityList}

=== PERSONA TO EVALUATE ===
${personaContent}

=== INSTRUCTIONS ===
Evaluate how well ChefFlow serves this persona TODAY. Be honest about gaps. Your ENTIRE response must be EXACTLY this markdown template with placeholders filled in. No preamble, no explanation outside the template:

# Persona Stress Test: ${nameFromFile}
**Type:** {Chef|Client|Guest|Vendor|Staff|Partner|Public}
**Date:** ${date}
**Method:** local-ollama-v2

## Summary
{2-3 sentences on overall fit}

## Score: {N}/100
- Workflow Coverage (0-40): {score} -- {one line reason}
- Data Model Fit (0-25): {score} -- {one line reason}
- UX Alignment (0-15): {score} -- {one line reason}
- Financial Accuracy (0-10): {score} -- {one line reason}
- Onboarding Viability (0-5): {score} -- {one line reason}
- Retention Likelihood (0-5): {score} -- {one line reason}

## Top 5 Gaps
### Gap 1: {title}
**Severity:** {HIGH|MEDIUM|LOW}
{2-3 sentences: what is missing and why this persona needs it}

### Gap 2: {title}
**Severity:** {HIGH|MEDIUM|LOW}
{2-3 sentences}

### Gap 3: {title}
**Severity:** {HIGH|MEDIUM|LOW}
{2-3 sentences}

### Gap 4: {title}
**Severity:** {HIGH|MEDIUM|LOW}
{2-3 sentences}

### Gap 5: {title}
**Severity:** {HIGH|MEDIUM|LOW}
{2-3 sentences}

## Quick Wins
1. {one-line actionable change}
2. {one-line actionable change}
3. {one-line actionable change}

## Verdict
{one sentence: should this persona use ChefFlow today, and what is the single biggest blocker?}`;

  // Step 4: Call Ollama with timeout, retry, and format validation
  const slug = makeSlug(basename(absPersonaFile));

  async function callOllama(prompt, temperature = 0.3) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), OLLAMA_TIMEOUT_MS);
    let full = '';
    let tokenCount = 0;
    let response;
    try {
      response = await fetch(`${ollamaUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          model,
          prompt,
          stream: true,
          options: { temperature, num_predict: 4000 }
        })
      });
    } catch (err) {
      clearTimeout(timeout);
      const message = err?.name === 'AbortError'
        ? `Ollama request timed out after ${Math.round(OLLAMA_TIMEOUT_MS / 1000)}s`
        : `Ollama not reachable at ${ollamaUrl}: ${err?.message || String(err)}`;
      const wrapped = new Error(message);
      wrapped.partial = full;
      throw wrapped;
    }

    if (!response.ok) {
      clearTimeout(timeout);
      const wrapped = new Error(`Ollama returned HTTP ${response.status}`);
      wrapped.partial = full;
      throw wrapped;
    }

    // Stream tokens and show live progress
    const decoder = new TextDecoder();
    const reader = response.body.getReader();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const chunk = JSON.parse(line);
            if (chunk.response) {
              full += chunk.response;
              tokenCount++;
              if (tokenCount % 50 === 0) {
                process.stderr.write(`\r[analyzer] ${tokenCount} tokens...`);
              }
            }
            if (chunk.done) {
              process.stderr.write(`\r[analyzer] ${tokenCount} tokens, done.     \n`);
            }
          } catch { /* skip malformed lines */ }
        }
      }
    } catch (err) {
      const message = err?.name === 'AbortError'
        ? `Ollama stream timed out after ${Math.round(OLLAMA_TIMEOUT_MS / 1000)}s`
        : `Ollama stream failed: ${err?.message || String(err)}`;
      const wrapped = new Error(message);
      wrapped.partial = full;
      throw wrapped;
    } finally {
      clearTimeout(timeout);
    }

    return full;
  }

  function validateReportFormat(content) {
    const hasScore = /## Score:\s*\d+\/100/.test(content);
    const hasGaps = /### Gap \d+:/.test(content);
    return hasScore && hasGaps;
  }

  async function analyzeWithRetries() {
    const attempts = MAX_RETRIES + 1;
    const debugDir = resolve(ROOT, 'system', 'persona-debug');
    let bestPartial = '';
    let lastError = null;

    for (let attempt = 1; attempt <= attempts; attempt++) {
      const temperature = attempt === 1 ? 0.3 : 0.1;
      console.log(`[analyzer] Attempt ${attempt}/${attempts}: calling Ollama (${model}) at ${ollamaUrl} with ${Math.round(OLLAMA_TIMEOUT_MS / 1000)}s timeout...`);
      try {
        const content = await callOllama(fullPrompt, temperature);
        if (content && content.trim().length > bestPartial.trim().length) {
          bestPartial = content;
        }
        if (!content || content.trim().length === 0) {
          throw new Error('Ollama returned empty response');
        }
        if (validateReportFormat(content)) {
          if (attempt > 1) console.log('[analyzer] Retry succeeded, format valid.');
          return content;
        }

        mkdirSync(debugDir, { recursive: true });
        writeFileSync(join(debugDir, `${slug}-attempt${attempt}.txt`), content, 'utf-8');
        lastError = new Error('Report format invalid, missing Score or Gap headers');
        console.log(`[analyzer] Attempt ${attempt}/${attempts} produced invalid format.`);
      } catch (err) {
        if (err?.partial && err.partial.trim().length > bestPartial.trim().length) {
          bestPartial = err.partial;
        }
        lastError = err;
        console.log(`[analyzer] Attempt ${attempt}/${attempts} failed: ${err?.message || String(err)}`);
      }

      if (attempt < attempts) {
        const delayMs = 1000 * (2 ** (attempt - 1));
        console.log(`[analyzer] Retrying in ${delayMs / 1000}s...`);
        await sleep(delayMs);
      }
    }

    mkdirSync(debugDir, { recursive: true });
    writeFileSync(join(debugDir, `${slug}-partial.txt`), bestPartial || 'empty response', 'utf-8');
    if (bestPartial.trim().length > 0) {
      console.log('[analyzer] Warning: attempts did not produce the required template. Writing normalized report from usable output.');
      return normalizeReportFormat({
        name: nameFromFile,
        date,
        personaType: detectPersonaType(absPersonaFile),
        rawOutput: bestPartial,
      });
    }

    console.log('[analyzer] Warning: all attempts failed. Writing partial report.');
    return makePartialReport({
      name: nameFromFile,
      date,
      personaType: detectPersonaType(absPersonaFile),
      reason: lastError?.message || 'unknown analyzer failure',
      rawOutput: bestPartial,
    });
  }

  let reportContent = await analyzeWithRetries();

  if (!validateReportFormat(reportContent)) {
    const debugDir = resolve(ROOT, 'system', 'persona-debug');
    mkdirSync(debugDir, { recursive: true });
    writeFileSync(join(debugDir, `${slug}-nonstandard-final.txt`), reportContent || '', 'utf-8');
    if (!reportContent || reportContent.trim().length === 0) {
      reportContent = makePartialReport({
        name: nameFromFile,
        date,
        personaType: detectPersonaType(absPersonaFile),
        reason: 'empty final analyzer output',
        rawOutput: '',
      });
    }
  }

  // Step 6 + 7: Write report
  const reportFilename = `persona-${slug}-${date}.md`;
  const reportPath = resolve(ROOT, 'docs', 'stress-tests', reportFilename);
  mkdirSync(dirname(reportPath), { recursive: true });
  writeFileSync(reportPath, reportContent.trim() + '\n', 'utf-8');
  console.log(`[analyzer] Report written: docs/stress-tests/${reportFilename}`);

  // Step 8: Append to REGISTRY.md
  const score = parseScore(reportContent);
  const nameFromReport = parsePersonaName(reportContent);
  const typeFromReport = parsePersonaTypeFromReport(reportContent);
  const displayName = nameFromReport || nameFromFile;
  const personaType = typeFromReport || detectPersonaType(absPersonaFile);

  const registryPath = resolve(ROOT, 'docs', 'stress-tests', 'REGISTRY.md');
  const registryLine = `| ${displayName} | ${personaType} | ${date} | ${score}/100 | local-ollama-v2 | [Report](${reportFilename}) |\n`;
  appendFileSync(registryPath, registryLine, 'utf-8');
  console.log('[analyzer] Registry updated.');

  // Step 9: Move persona file from Uncompleted to Completed
  const personaTypeDir = detectPersonaType(absPersonaFile);
  const completedDir = resolve(ROOT, 'Chef Flow Personas', 'Completed', personaTypeDir);
  mkdirSync(completedDir, { recursive: true });
  const destPath = join(completedDir, basename(absPersonaFile));

  // Only move if source is in Uncompleted (don't re-move already-completed files)
  const normalizedPath = absPersonaFile.replace(/\\/g, '/');
  if (normalizedPath.includes('/Uncompleted/')) {
    try {
      renameSync(absPersonaFile, destPath);
      console.log(`[analyzer] Persona moved to Completed/${personaTypeDir}/`);
    } catch (err) {
      console.log(`[analyzer] Warning: could not move persona file: ${err.message}`);
    }
  }

  // Step 10: Print report path as LAST line (orchestrator reads this)
  console.log(`docs/stress-tests/${reportFilename}`);
}

main().catch((err) => {
  console.error(`ERROR: ${err?.message || String(err)}`);
  process.exit(1);
});
