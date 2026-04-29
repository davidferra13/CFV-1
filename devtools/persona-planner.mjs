#!/usr/bin/env node
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_MODEL = process.env.PERSONA_PLANNER_MODEL || process.env.PERSONA_MODEL || "hermes3:8b";
const DEFAULT_OLLAMA_URL =
  process.env.OLLAMA_BASE_URL || "http://localhost:11434";

const STOP_WORDS = new Set([
  "the", "and", "for", "with", "no", "lack", "of", "in", "a", "an", "as",
  "to", "is", "are", "be", "by", "on", "at", "or", "not", "from", "it",
  "its", "has", "was", "but", "one", "that", "this", "does",
]);

/* ------------------------------------------------------------------ */
/*  CLI                                                               */
/* ------------------------------------------------------------------ */

function parseArgs(argv) {
  const opts = {
    reportFile: argv[2],
    model: DEFAULT_MODEL,
    ollamaUrl: DEFAULT_OLLAMA_URL,
  };
  for (let i = 3; i < argv.length; i++) {
    if (argv[i] === "--model" && argv[i + 1] && !argv[i + 1].startsWith("--")) {
      opts.model = argv[++i];
    } else if (argv[i] === "--ollama-url" && argv[i + 1] && !argv[i + 1].startsWith("--")) {
      opts.ollamaUrl = argv[++i];
    }
  }
  return opts;
}

function fail(msg) {
  console.error(msg);
  process.exit(1);
}

function toAbsolute(p) {
  return isAbsolute(p) ? p : resolve(ROOT, p);
}

function toPosix(p) {
  return String(p).replace(/\\/g, "/");
}

/* ------------------------------------------------------------------ */
/*  Gap parsing                                                       */
/* ------------------------------------------------------------------ */

/**
 * Parse Top 5 Gaps from a persona stress-test report.
 * Handles two formats:
 *   Spec format:   ### Gap 1: Title  (with **Severity:** line)
 *   Legacy format: 1. **Title**      (numbered bold items)
 */
function parseGaps(markdown) {
  // Isolate the Top 5 Gaps section
  const sectionMatch = /^## Top 5 Gaps\s*$/m.exec(markdown);
  if (!sectionMatch) return [];
  const sectionStart = sectionMatch.index + sectionMatch[0].length;
  const rest = markdown.slice(sectionStart);
  const nextHeading = /^##\s+/m.exec(rest);
  const section = nextHeading ? rest.slice(0, nextHeading.index) : rest;

  // Try spec format: ### Gap N: Title
  const specRe = /^### Gap (\d+):\s*(.+)$/gm;
  const specHits = [...section.matchAll(specRe)];
  if (specHits.length > 0) return specHits.slice(0, 5).map((m, i, arr) => {
    const number = parseInt(m[1], 10);
    const title = m[2].trim();
    const bodyStart = m.index + m[0].length;
    const bodyEnd = arr[i + 1]?.index ?? section.length;
    const body = section.slice(bodyStart, bodyEnd).trim();
    const sevMatch = body.match(/\*\*Severity:\*\*\s*(HIGH|MEDIUM|LOW)/i);
    const severity = sevMatch ? sevMatch[1].toUpperCase() : "HIGH";
    const description = sevMatch
      ? body.slice(body.indexOf(sevMatch[0]) + sevMatch[0].length).trim()
      : body;
    return { number, title, severity, description };
  });

  // Legacy format: numbered bold items
  const legacyRe = /^(\d+)\.\s*\*\*(.+?)\*\*/gm;
  const legacyHits = [...section.matchAll(legacyRe)];
  return legacyHits.slice(0, 5).map((m, i, arr) => {
    const number = parseInt(m[1], 10);
    const title = m[2].trim();
    const bodyStart = m.index + m[0].length;
    const bodyEnd = arr[i + 1]?.index ?? section.length;
    const body = section.slice(bodyStart, bodyEnd).trim();
    const sevMatch = body.match(/\*\*Severity:\*\*\s*(HIGH|MEDIUM|LOW)/i);
    let severity = "HIGH";
    if (sevMatch) {
      severity = sevMatch[1].toUpperCase();
    } else {
      const effortMatch = body.match(/Effort:\s*\*\*(.+?)\*\*/i);
      if (effortMatch) {
        const e = effortMatch[1].toLowerCase();
        if (e.includes("large")) severity = "HIGH";
        else if (e.includes("medium")) severity = "MEDIUM";
        else severity = "LOW";
      }
    }
    const description = body;
    return { number, title, severity, description };
  });
}

/* ------------------------------------------------------------------ */
/*  Slug and persona name                                             */
/* ------------------------------------------------------------------ */

/**
 * Extract persona slug from report filename.
 * "persona-kai-donovan-2026-04-25.md" -> "kai-donovan"
 */
function extractSlug(reportPath) {
  const name = basename(reportPath, ".md");
  return name
    .replace(/^persona-/, "")
    .replace(/-\d{4}-\d{2}-\d{2}$/, "") || "unknown";
}

function extractPersonaName(markdown) {
  const m = markdown.match(/^#\s*Persona Stress Test:\s*(.+)/m);
  return m ? m[1].trim() : "Unknown Persona";
}

/* ------------------------------------------------------------------ */
/*  Keyword extraction + grep                                         */
/* ------------------------------------------------------------------ */

function extractKeywords(title) {
  const words = String(title)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/[\s-]+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
  return [...new Set(words)].slice(0, 3);
}

function grepForKeyword(keyword) {
  try {
    const out = execSync(
      `grep -rl "${keyword}" app/ lib/ components/ --include="*.ts" --include="*.tsx"`,
      { encoding: "utf-8", cwd: ROOT, timeout: 15000, shell: "bash" }
    );
    return out.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  } catch {
    return [];
  }
}

function findRelevantFiles(title) {
  const keywords = extractKeywords(title);
  const all = [];
  for (const kw of keywords) all.push(...grepForKeyword(kw));
  const seen = new Set();
  const unique = [];
  for (const f of all) {
    if (!seen.has(f) && unique.length < 5) {
      seen.add(f);
      unique.push(f);
    }
  }
  return unique;
}

/* ------------------------------------------------------------------ */
/*  File reading                                                      */
/* ------------------------------------------------------------------ */

function readFirstLines(relPath, n) {
  const full = join(ROOT, relPath);
  if (!existsSync(full)) return null;
  try {
    return readFileSync(full, "utf-8").split(/\r?\n/).slice(0, n).join("\n");
  } catch {
    return null;
  }
}

function buildSourceContext(files) {
  if (files.length === 0) return "[no relevant files found via search]";
  const blocks = [];
  for (const fp of files) {
    const content = readFirstLines(fp, 80);
    if (content !== null) {
      blocks.push(`File: ${toPosix(fp)}\n\`\`\`\n${content}\n\`\`\``);
    }
  }
  return blocks.length > 0 ? blocks.join("\n\n") : "[no relevant files found via search]";
}

/* ------------------------------------------------------------------ */
/*  Planner prompt (copied exactly from spec)                         */
/* ------------------------------------------------------------------ */

function buildPrompt({ gap, personaName, sourceContext }) {
  return `You are a software architect writing a build plan for ONE specific gap in ChefFlow, a Next.js 14 + PostgreSQL application using Drizzle ORM, Auth.js v5, and Tailwind CSS.

=== THE GAP ===
Title: ${gap.title}
Severity: ${gap.severity}
Description: ${gap.description}

=== RELEVANT SOURCE FILES ===
${sourceContext}

=== INSTRUCTIONS ===
Write a focused, specific build plan for this ONE gap. The plan will be handed to a coding agent (Codex) that will execute it. Be explicit about file paths and what to change. Do NOT suggest changes to files you haven't seen.

Hard grounding rules:
- Only reference existing ChefFlow files shown in RELEVANT SOURCE FILES for Files to Modify.
- Include a Grounding Evidence section before Files to Modify.
- Every Grounding Evidence bullet must cite an existing file path from RELEVANT SOURCE FILES.
- Every Files to Modify path must also appear in Grounding Evidence.
- If no relevant existing files are shown, say the plan is not buildable from current evidence.
- Do not invent React Router, Express, generic REST endpoints, controllers, services, or backend API layers.
- Do not invent persona-specific UI labels, wording, banners, copy, or names.
- Do not propose recipe generation, recipe creation, recipe updates, or ingredient creation.
- Do not propose database schema, model, migration, table, column, or type changes unless the developer explicitly approved SQL in the source context.
- Do not drift into beta surveys, survey invites, validation questionnaires, or feedback forms.

Use EXACTLY this format:

# Build Task: ${gap.title}
**Source Persona:** ${personaName}
**Gap Number:** ${gap.number} of 5
**Severity:** ${gap.severity}

## What to Build
{2-3 sentences describing the change}

## Grounding Evidence
- \`{existing/file/path.tsx}\` -- {specific existing behavior or component observed in the provided source context}

## Files to Modify
- \`{exact/file/path.tsx}\` -- {what to change in this file}

## Files to Create (if any)
- \`{exact/file/path.tsx}\` -- {purpose of new file}

## Implementation Notes
- {key technical detail or pattern to follow}
- {edge case to handle}

## Acceptance Criteria
1. {specific, testable criterion}
2. {specific, testable criterion}
3. \`npx tsc --noEmit --skipLibCheck\` passes

## DO NOT
- Modify files not listed above
- Add new npm dependencies
- Change database schema
- Add or change migrations, models, tables, columns, or generated types
- Add React Router, Express, generic REST endpoints, controllers, services, or backend API layers
- Add persona-specific UI wording, labels, banners, names, or copy
- Generate, create, update, or edit recipes or ingredients
- Add beta surveys, survey invites, validation questionnaires, or feedback forms
- Delete existing functionality
- Use em dashes anywhere`;
}

/* ------------------------------------------------------------------ */
/*  Ollama (same pattern as analyzer)                                 */
/* ------------------------------------------------------------------ */

async function callOllama(url, model, prompt, label = '') {
  const endpoint = `${url.replace(/\/+$/, "")}/api/generate`;
  let response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        prompt,
        stream: true,
        options: { temperature: 0.3, num_predict: 4000 },
      }),
    });
  } catch {
    fail(`ERROR: Ollama not reachable at ${endpoint}. Is it running?`);
  }
  if (!response.ok) {
    fail(`ERROR: Ollama returned ${response.status} at ${endpoint}. Is it running?`);
  }

  // Stream tokens with live progress
  let full = '';
  let tokenCount = 0;
  const decoder = new TextDecoder();
  const reader = response.body.getReader();
  let buffer = '';
  const tag = label ? `[planner] ${label}` : '[planner]';

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
            process.stderr.write(`\r${tag} ${tokenCount} tokens...`);
          }
        }
        if (chunk.done) {
          process.stderr.write(`\r${tag} ${tokenCount} tokens, done.     \n`);
        }
      } catch { /* skip malformed lines */ }
    }
  }

  const output = full.trim();
  if (!output) return null;
  return output;
}

/* ------------------------------------------------------------------ */
/*  Build Plan Quality Gate                                           */
/* ------------------------------------------------------------------ */

// Out-of-scope features that Gemma hallucinates for ChefFlow
const SCOPE_BLOCKLIST = [
  /\bbeta\s+survey\b/i, /\bsurvey\s+invite/i,
  /\bconfidence\s+(level|score|display)\b/i,
  /\bmodel\s+confidence\b/i,
  /\bLMS\b/, /\blearning\s+management\b/i,
  /\bmarketplace\b/i,
  /\bcrowdsourc/i,
  /\bgamification\b/i,
  /\bleaderboard\b/i,
  /\bachievement\s+badge/i,
  /\bsocial\s+media\s+(?:feed|timeline|post(?:ing)?)\b/i,
  /\bchat\s+room\b/i,
  /\bforum\b/i,
  /\bvideo\s+call\b/i,
  /\bAI\s+generat(?:e|ing|ion)\s+recipe/i,
];

function validateBuildPlan(planText) {
  const issues = [];
  const withoutDoNot = planText.replace(/\n## DO NOT\b[\s\S]*$/i, "");

  function sectionText(name) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const match = new RegExp(`(^|\\n)## ${escaped}\\s*\\n([\\s\\S]*?)(?=\\n## |$)`, "i").exec(planText);
    return match ? match[2].trim() : "";
  }

  function refsFrom(text) {
    return [...text.matchAll(/`([a-zA-Z][\w/.-]+\.(?:ts|tsx|js|jsx|mjs|css|sql))`/g)]
      .map((match) => match[1])
      .filter((ref) => !ref.includes("{") && !ref.startsWith("http"));
  }

  // Check 1: Scope guard - reject hallucinated features
  for (const pattern of SCOPE_BLOCKLIST) {
    if (pattern.test(withoutDoNot)) {
      issues.push(`out-of-scope: matches ${pattern}`);
    }
  }

  const hallucinationPatterns = [
    /\bReact\s+Router\b/i,
    /\breact-router(?:-dom)?\b/i,
    /\bBrowserRouter\b/,
    /\bcreateBrowserRouter\b/,
    /\bExpress(?:\.js)?\b/i,
    /\bREST\s+API\b/i,
    /\bbackend\s+API\b/i,
    /\bbackend\s+(?:endpoint|route|layer)\b/i,
    /\bcreate\s+(?:a\s+)?(?:new\s+)?(?:API|backend)\s+(?:endpoint|route)\b/i,
    /\bcontrollers?\b/i,
    /\bpersona-specific\b/i,
    /\b(?:copy|label|text|wording|microcopy)\b.{0,80}\bpersona\b/i,
    /\b(?:persona|client|chef)-specific\s+(?:copy|label|text|wording|banner|message)\b/i,
    /\b(?:AI\s+)?generat(?:e|es|ed|ing|ion)\s+(?:a\s+)?recipes?\b/i,
    /\b(?:create|creates|created|creating|update|updates|updated|updating|edit|edits|edited|editing)\s+(?:a\s+)?recipes?\b/i,
    /\b(?:create|creates|created|creating|update|updates|updated|updating|edit|edits|edited|editing)\s+(?:a\s+)?ingredients?\b/i,
    /\badd\s+(?:a\s+)?ingredients?\b/i,
    /\bagent\.(?:create_recipe|update_recipe|add_ingredient)\b/i,
    /\b(?:database\s+)?migration\b/i,
    /\bdrizzle\s+schema\b/i,
    /\b(?:schema|model)\s+change\b/i,
    /\b(?:change|changes|changing)\s+(?:the\s+)?database\s+schema\b/i,
    /\b(?:create|add|alter|modify|update)\s+(?:a\s+)?(?:new\s+)?(?:table|column|model|schema)\b/i,
    /\bnew\s+(?:table|column|model|schema)\b/i,
    /\btypes\/database\.ts\b/i,
    /\bbeta\s+survey\b/i,
    /\bsurvey\s+(?:invite|invitation|response|questionnaire|form)\b/i,
    /\bfeedback\s+form\b/i,
    /\bvalidation\s+questionnaire\b/i,
  ];
  for (const pattern of hallucinationPatterns) {
    if (pattern.test(withoutDoNot)) {
      issues.push(`hallucinated scope: matches ${pattern}`);
    }
  }

  // Check 2: Grounding Evidence is required and all evidence refs must exist
  const grounding = sectionText("Grounding Evidence");
  const groundingRefs = refsFrom(grounding);
  const groundingSet = new Set(groundingRefs);
  if (!grounding) {
    issues.push("missing section: ## Grounding Evidence");
  } else if (groundingRefs.length === 0) {
    issues.push("Grounding Evidence has no file refs");
  }
  for (const ref of groundingRefs) {
    if (!existsSync(join(ROOT, ref))) {
      issues.push(`Grounding Evidence ref missing: ${ref}`);
    }
  }

  // Check 3: Files to Modify refs must exist and be grounded
  const filesToModify = sectionText("Files to Modify");
  const modifyRefs = refsFrom(filesToModify);
  if (filesToModify && modifyRefs.length === 0) {
    issues.push("Files to Modify has no file refs");
  }
  for (const ref of modifyRefs) {
    if (!existsSync(join(ROOT, ref))) {
      issues.push(`Files to Modify ref missing: ${ref}`);
    }
    if (!groundingSet.has(ref)) {
      issues.push(`Files to Modify ref not grounded: ${ref}`);
    }
  }

  // Check 4: Referenced existing-file sections should not be mostly invented
  const fileRefs = refsFrom(withoutDoNot);
  const checkedRefs = [...new Set(fileRefs)];
  const missingRefs = checkedRefs.filter((ref) => !existsSync(join(ROOT, ref)));
  if (checkedRefs.length > 0 && missingRefs.length === checkedRefs.length) {
    issues.push(`all ${missingRefs.length} referenced files are missing`);
  } else if (checkedRefs.length > 1 && missingRefs.length > checkedRefs.length / 2) {
    issues.push(`${missingRefs.length}/${checkedRefs.length} referenced files missing`);
  }

  // Check 5: Plan must have required sections
  const requiredSections = ['## What to Build', '## Grounding Evidence', '## Files to Modify', '## Acceptance Criteria'];
  for (const section of requiredSections) {
    if (!planText.includes(section)) {
      issues.push(`missing section: ${section}`);
    }
  }

  return { valid: issues.length === 0, issues };
}

/* ------------------------------------------------------------------ */
/*  Main                                                              */
/* ------------------------------------------------------------------ */

async function main() {
  const { reportFile, model, ollamaUrl } = parseArgs(process.argv);

  if (!reportFile || !existsSync(toAbsolute(reportFile))) {
    fail(`ERROR: File not found: ${reportFile || "(no path provided)"}`);
  }

  const fullPath = toAbsolute(reportFile);
  const markdown = readFileSync(fullPath, "utf-8");
  const gaps = parseGaps(markdown);

  if (gaps.length === 0) {
    fail("ERROR: No gaps found in report. Expected '### Gap N:' headers or numbered bold items under '## Top 5 Gaps'.");
  }

  const slug = extractSlug(fullPath);
  const personaName = extractPersonaName(markdown);
  const outDir = join(ROOT, "system", "persona-build-plans", slug);
  mkdirSync(outDir, { recursive: true });

  console.log(`Persona: ${personaName} (${slug})`);
  console.log(`Gaps found: ${gaps.length}`);
  console.log(`Model: ${model}`);
  console.log(`Output: system/persona-build-plans/${slug}/`);
  console.log("");

  let taskCount = 0;
  let rejectedCount = 0;

  for (const gap of gaps) {
    const files = findRelevantFiles(gap.title);
    const sourceContext = buildSourceContext(files);
    const prompt = buildPrompt({ gap, personaName, sourceContext });
    console.log(`  Gap ${gap.number}/${gaps.length}: ${gap.title}`);
    const output = await callOllama(ollamaUrl, model, prompt, `gap ${gap.number}`);

    if (!output) {
      const debugDir = join(ROOT, "system", "persona-debug");
      mkdirSync(debugDir, { recursive: true });
      const debugPath = join(debugDir, `${slug}-task-${gap.number}-raw.txt`);
      writeFileSync(debugPath, "empty response", "utf-8");
      console.error(`  WARNING: Empty Ollama response for gap ${gap.number}. Debug: ${toPosix(debugPath)}`);
      continue;
    }

    // Quality gate: validate before writing
    const gate = validateBuildPlan(output);
    if (!gate.valid) {
      const rejectDir = join(ROOT, "system", "persona-build-plans-rejected");
      mkdirSync(rejectDir, { recursive: true });
      const rejectPath = join(rejectDir, `${slug}-task-${gap.number}.md`);
      const header = `<!-- REJECTED: ${gate.issues.join('; ')} -->\n<!-- ${new Date().toISOString()} -->\n\n`;
      writeFileSync(rejectPath, header + output, "utf-8");
      rejectedCount++;
      console.log(`  REJECTED gap ${gap.number}: ${gate.issues.join('; ')}`);
      continue;
    }

    const taskPath = join(outDir, `task-${gap.number}.md`);
    writeFileSync(taskPath, output, "utf-8");
    taskCount++;
    console.log(`  Task ${gap.number}: ${gap.title} -> system/persona-build-plans/${slug}/task-${gap.number}.md`);
  }

  console.log("");
  console.log(`Created ${taskCount} build tasks in system/persona-build-plans/${slug}/`);
  if (rejectedCount > 0) {
    console.log(`Rejected ${rejectedCount} plans (quality gate). See system/persona-build-plans-rejected/`);
  }
  process.exit(0);
}

main().catch((err) => {
  fail(`ERROR: ${err?.message || String(err)}`);
});
