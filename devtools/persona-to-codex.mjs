#!/usr/bin/env node
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from "node:fs";
import { join, basename, extname } from "node:path";

const ROOT = process.cwd();
const QUEUE_DIR = join(ROOT, "system", "codex-queue");
const PERSONA_ROOT = join(ROOT, "Chef Flow Personas");
const UNCOMPLETED = join(PERSONA_ROOT, "Uncompleted");
const COMPLETED = join(PERSONA_ROOT, "Completed");

const TYPES = ["Chef", "Client", "Guest", "Vendor", "Staff", "Partner", "Public"];
const TAG = "[persona-to-codex]";

function normalize(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function slugify(value) {
  return normalize(value).replace(/\s+/g, "-").slice(0, 48) || "persona-task";
}

function titleCase(str) {
  return str.replace(/\b\w/g, (c) => c.toUpperCase());
}

function parseArgs(argv) {
  const options = { limit: Infinity, dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--limit") options.limit = Math.max(1, Number(argv[i + 1] ?? "3"));
    if (argv[i] === "--dry-run") options.dryRun = true;
  }
  return options;
}

function collectPersonaFiles() {
  const files = [];
  for (const type of TYPES) {
    const dir = join(UNCOMPLETED, type);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
      continue;
    }
    let entries;
    try { entries = readdirSync(dir); } catch { continue; }
    const matched = entries
      .filter((f) => /\.(txt|md)$/i.test(f))
      .sort();
    for (const filename of matched) {
      files.push({ type, filename, path: join(dir, filename) });
    }
  }
  return files;
}

function extractName(filename) {
  const stem = basename(filename, extname(filename));
  return titleCase(stem.replace(/[-_]/g, " ").trim());
}

function generateSpec(personaName, type, slug, content, date) {
  return `# Codex Task: Persona Stress Test - ${personaName}

## Objective

Evaluate ChefFlow's fitness for the following persona, then make ONLY the safe improvements identified.

## The Persona

${content}

## Persona Type: ${type}

## Instructions

### Step 1: Evaluate (READ ONLY - do not change any files yet)

Read these files to understand what ChefFlow currently offers:

- \`docs/product-blueprint.md\` (feature list and status)
- \`docs/app-complete-audit.md\` (every UI element that exists)
- \`docs/service-lifecycle-blueprint.md\` (the engagement model)
- \`lib/billing/feature-classification.ts\` (free vs paid features)

Based on the persona description, identify:

1. Which ChefFlow features this persona would use
2. Which features are missing or partially built for this persona
3. Which gaps are QUICK WINS (< 20 lines changed, existing files only)

### Step 2: Write the Report

Create file: \`docs/stress-tests/persona-${slug}-${date}.md\`

The report MUST follow this exact structure:

# Persona Stress Test: ${personaName}

## Generated: ${date}

## Type: ${type}

## Persona Summary

[2-3 sentence summary of who this person is and what they need]

## Capability Fit (rate each as SUPPORTED / PARTIAL / MISSING)

[List each relevant ChefFlow feature area and rate it]

## Top 5 Gaps

[The 5 most important things ChefFlow cannot do for this persona]
[For each: what's missing, which file would need to change, effort estimate]

## Quick Wins Found

[Changes under 20 lines that would improve the experience]
[For each: exact file, what to change, why]

## Score: X/100

[Workflow Coverage, Data Model Fit, UX Alignment, Financial Accuracy]
[Weighted final score with 1-sentence justification]

## Verdict

[2 sentences: would this persona succeed on ChefFlow today?]

### Step 3: Apply ONLY Quick Wins (if any)

Rules for code changes:
- ONLY changes under 20 lines in a SINGLE EXISTING file
- NEVER create new files (except the report)
- NEVER modify database schemas or migrations
- NEVER modify auth, layout, or routing
- NEVER modify lib/billing/ or payment code
- ONLY modify: UI text, default values, empty states, labels, placeholder text, tooltips
- If unsure whether a change is safe: DO NOT MAKE IT. Document it in the report instead.

### Step 4: Update the Registry

Append one row to the table in \`docs/stress-tests/REGISTRY.md\` under "## Persona Registry":

| # | Label | Type | Date | Score | Method | Report | Key Finding |
|---|-------|------|------|-------|--------|--------|-------------|
| {next_number} | ${personaName} | ${type} | ${date} | {score}/100 | Codex autonomous | \`docs/stress-tests/persona-${slug}-${date}.md\` | {one sentence} |

## Scope

Only modify files within:
- docs/stress-tests/ (reports and registry)
- app/(chef)/ (UI text/labels only, no logic)
- app/(client)/ (UI text/labels only, no logic)
- app/(public)/ (UI text/labels only, no logic)
- components/ (UI text/labels only, no logic)

Do NOT modify:
- database/ (no migrations, no schema changes)
- lib/auth/ (no auth changes)
- lib/billing/ (no payment changes)
- lib/db/ (no database logic)
- lib/ai/ (no AI changes)
- app/(chef)/layout.tsx (no layout gates)
- Any server action file (no business logic)
- devtools/ (no self-modification)
- .claude/ (no skill/agent changes)

## Branch
codex/persona-${slug}

## Guardrails
These rules are mandatory. Violating any of them makes the task a failure.

- All monetary amounts in integer cents, never floats
- Every database query must be tenant-scoped
- No em dashes anywhere
- "OpenClaw" must never appear in UI text
- No @ts-nocheck in any new file
- No DROP TABLE, DROP COLUMN, DELETE, or TRUNCATE
- Wrap side effects in try/catch
- Use only existing component variants: Button (primary/secondary/danger/ghost), Badge (default/success/warning/error/info)
- AI must never generate recipes
- No forced onboarding gates

## Acceptance Criteria
- [ ] Report exists at \`docs/stress-tests/persona-${slug}-${date}.md\`
- [ ] Report follows the exact structure above
- [ ] Registry row added to \`docs/stress-tests/REGISTRY.md\`
- [ ] \`npx tsc --noEmit --skipLibCheck\` exits 0
- [ ] No files modified outside scope directories
- [ ] No code changes over 20 lines in any single file
- [ ] No new files created (except the report)

## Context
Stack: Next.js 14, PostgreSQL (Drizzle ORM via postgres.js), Auth.js v5, Tailwind CSS, TypeScript.
Server actions with 'use server' for business logic. SSE for realtime. Local filesystem for storage.
ChefFlow is an operating system for food service professionals (primarily solo private chefs).
`;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const files = collectPersonaFiles();

  if (files.length === 0) {
    console.log(`${TAG} 0 files found. Nothing to do.`);
    return;
  }

  const toProcess = files.slice(0, options.limit);
  console.log(`${TAG} ${toProcess.length} file(s) found`);

  if (!options.dryRun) {
    mkdirSync(QUEUE_DIR, { recursive: true });
  }

  const date = new Date().toISOString().slice(0, 10);
  let generated = 0;

  for (const { type, filename, path: filePath } of toProcess) {
    const stem = basename(filename, extname(filename));
    const slug = slugify(stem);
    const personaName = extractName(filename);
    const outFile = join(QUEUE_DIR, `persona-${slug}.md`);

    // Read content
    let content;
    try { content = readFileSync(filePath, "utf8"); } catch (err) {
      console.log(`${TAG} Error reading ${filename}: ${err.message}`);
      continue;
    }

    // Skip empty
    if (!content.trim()) {
      console.log(`${TAG} Skipped (empty): ${filename}`);
      continue;
    }

    // Skip too thin
    if (content.trim().length < 50) {
      console.log(`${TAG} Skipped (under 50 chars): ${filename}`);
      continue;
    }

    // Check duplicate
    if (existsSync(outFile)) {
      console.log(`${TAG} Skipped (already queued): persona-${slug}.md`);
      continue;
    }

    if (options.dryRun) {
      console.log(`${TAG} Would generate: system/codex-queue/persona-${slug}.md (${type})`);
      continue;
    }

    // Generate and write spec
    const spec = generateSpec(personaName, type, slug, content, date);
    writeFileSync(outFile, spec, "utf8");

    // Move source file to Completed/{Type}/
    const completedDir = join(COMPLETED, type);
    mkdirSync(completedDir, { recursive: true });
    const destPath = join(completedDir, filename);
    copyFileSync(filePath, destPath);
    unlinkSync(filePath);

    console.log(`${TAG} Generated: system/codex-queue/persona-${slug}.md (${type})`);
    generated++;
  }

  if (options.dryRun) {
    console.log(`${TAG} Dry run complete. ${toProcess.length} item(s) would be processed.`);
  } else {
    console.log(`${TAG} Done. ${generated} spec(s) queued in system/codex-queue/`);
  }
}

main();
