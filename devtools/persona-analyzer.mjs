#!/usr/bin/env node

/**
 * Persona Analyzer (v2 Pipeline, Stage 1)
 *
 * Evaluates a persona file against ChefFlow capabilities using a local LLM.
 * Writes a structured gap report to docs/stress-tests/.
 *
 * Usage: node devtools/persona-analyzer.mjs <persona-file> [--model gemma3:4b] [--ollama-url http://localhost:11434]
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, renameSync, appendFileSync } from 'fs';
import { resolve, basename, dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '..');

// --- CLI Parsing ---

function parseArgs(argv) {
  const args = argv.slice(2);
  let personaFile = null;
  let model = process.env.PERSONA_MODEL || 'gemma3:4b';
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

// --- Main ---

async function main() {
  const { personaFile, model, ollamaUrl } = parseArgs(process.argv);

  if (!personaFile) {
    console.log('Usage: node devtools/persona-analyzer.mjs <persona-file> [--model gemma3:4b] [--ollama-url http://localhost:11434]');
    console.log('');
    console.log('Evaluates a persona file against ChefFlow capabilities using a local LLM.');
    console.log('Writes a structured gap report to docs/stress-tests/.');
    console.log('');
    console.log('Options:');
    console.log('  --model <name>       Ollama model (default: PERSONA_MODEL env or gemma3:4b)');
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

  // Step 3: Build prompt (exact template from spec, with format enforcement)
  const date = todayISO();
  // Prefer name from filename (persona files are named after the persona); fall back to content parsing
  const filenameBase = basename(absPersonaFile).replace(/\.[^.]+$/, '');
  const nameFromFile = filenameBase.length > 1 ? filenameBase : extractNameFromContent(personaContent);

  const fullPrompt = `CRITICAL: You MUST respond using EXACTLY the markdown template below. Do not invent your own format. Fill in the {placeholders} with your evaluation. Start your response with the exact line: # Persona Stress Test:

You are evaluating a software product called ChefFlow against a user persona.

ChefFlow is an operations platform for food service professionals: private chefs, caterers, food vendors, event cooks, and related roles. It handles events, clients, recipes, menus, pricing, invoicing, contracts, scheduling, and AI-assisted communication.

=== CHEFFLOW CAPABILITIES ===
${blueprint}

=== FEATURE CLASSIFICATION ===
${features}

=== SERVICE LIFECYCLE ===
${lifecycle}

=== PAGE AND UI REGISTRY ===
${audit}

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

  // Step 4: Call Ollama (with format validation + one retry)
  const slug = makeSlug(basename(absPersonaFile));

  async function callOllama(prompt, temperature = 0.3) {
    let response;
    try {
      response = await fetch(`${ollamaUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          prompt,
          stream: true,
          options: { temperature, num_predict: 4000 }
        })
      });
    } catch (err) {
      console.error(`ERROR: Ollama not reachable at ${ollamaUrl}. Is it running?`);
      process.exit(1);
    }

    if (!response.ok) {
      console.error(`ERROR: Ollama not reachable at ${ollamaUrl}. Is it running? (HTTP ${response.status})`);
      process.exit(1);
    }

    // Stream tokens and show live progress
    let full = '';
    let tokenCount = 0;
    const decoder = new TextDecoder();
    const reader = response.body.getReader();
    let buffer = '';

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

    return full;
  }

  function validateReportFormat(content) {
    const hasScore = /## Score:\s*\d+\/100/.test(content);
    const hasGaps = /### Gap \d+:/.test(content);
    return hasScore && hasGaps;
  }

  console.log(`[analyzer] Calling Ollama (${model}) at ${ollamaUrl}...`);
  let reportContent = await callOllama(fullPrompt);

  if (!reportContent || reportContent.trim().length === 0) {
    const debugDir = resolve(ROOT, 'system', 'persona-debug');
    mkdirSync(debugDir, { recursive: true });
    const debugPath = join(debugDir, `${slug}-raw.txt`);
    writeFileSync(debugPath, 'empty response', 'utf-8');
    console.error(`ERROR: Ollama returned empty response. Raw output saved to ${debugPath}`);
    process.exit(1);
  }

  // Validate format; retry once with lower temperature if template not followed
  if (!validateReportFormat(reportContent)) {
    console.log('[analyzer] Report format invalid (missing Score or Gap headers). Retrying with temperature 0.1...');
    const retryContent = await callOllama(fullPrompt, 0.1);
    if (retryContent && validateReportFormat(retryContent)) {
      reportContent = retryContent;
      console.log('[analyzer] Retry succeeded, format valid.');
    } else {
      console.log('[analyzer] Warning: report format still non-standard after retry. Writing anyway.');
      // Save debug copy of both attempts
      const debugDir = resolve(ROOT, 'system', 'persona-debug');
      mkdirSync(debugDir, { recursive: true });
      writeFileSync(join(debugDir, `${slug}-attempt1.txt`), reportContent, 'utf-8');
      if (retryContent) writeFileSync(join(debugDir, `${slug}-attempt2.txt`), retryContent, 'utf-8');
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
