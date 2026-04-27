#!/usr/bin/env node
/**
 * Persona Pipeline Core Library
 *
 * Pure functions for the persona pipeline. No HTTP, no in-memory state, no UI.
 * Shared by persona-pipeline-cli.mjs and persona-inbox-server.mjs.
 *
 * Every function here reads/writes the filesystem and returns data.
 * No side effects beyond file I/O.
 */

import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, extname, join, relative, resolve } from "node:path";
import { randomUUID, createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { validatePersonaContent } from "./persona-validator.mjs";
import { vaultStore, vaultIndex, vaultGet, vaultStats } from "./persona-vault.mjs";

// Re-export vault for consumers
export { vaultStore, vaultIndex, vaultGet, vaultStats, validatePersonaContent };

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const ROOT = resolve(dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1")), "..");
export const TYPES = ["Chef", "Client", "Guest", "Vendor", "Staff", "Partner", "Public"];
export const INPUT_TYPES = ["persona", "idea", "bug", "feature", "note", "critique"];
export const SYSTEM_DIR = join(ROOT, "system");
export const PERSONA_ROOT = join(ROOT, "Chef Flow Personas", "Uncompleted");
export const INBOX_STATE_FILE = join(SYSTEM_DIR, "persona-inbox-state.json");
export const INTAKE_TYPES = ["idea", "bug", "feature", "note", "critique"];
const INTAKE_DIR_NAMES = { idea: "ideas", bug: "bugs", feature: "features", note: "notes", critique: "critiques" };
const INTAKE_ROOT = join(SYSTEM_DIR, "intake");
const INTAKE_PROCESSED_ROOT = join(INTAKE_ROOT, "processed");
const BUILD_QUEUE_DIR = join(SYSTEM_DIR, "build-queue");
const PIPELINE_STATE_FILE = join(SYSTEM_DIR, "persona-pipeline-state.json");
const SYNTHESIS_FILE = join(SYSTEM_DIR, "persona-batch-synthesis", "saturation.json");
const VALIDATION_FILE = join(SYSTEM_DIR, "persona-batch-synthesis", "validation.json");
const AUTO_GENERATION_FILE = join(SYSTEM_DIR, "persona-auto-generation.json");

// ---------------------------------------------------------------------------
// String utilities
// ---------------------------------------------------------------------------

export function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function slugify(value, max = 64) {
  return normalize(value).replace(/\s+/g, "-").slice(0, max) || "persona";
}

export function titleCase(value) {
  return String(value || "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function stripQuotes(value) {
  return String(value || "")
    .replace(/^[\s"'`\u201c\u201d\u2018\u2019]+|[\s"'`\u201c\u201d\u2018\u2019]+$/g, "")
    .trim();
}

export function cleanDisplayName(raw) {
  return String(raw || "Persona")
    .replace(/\*+/g, "")
    .replace(/^[\s"'`\u201c\u201d\u2018\u2019]+|[\s"'`\u201c\u201d\u2018\u2019]+$/g, "")
    .replace(/\s*[\u2014\u2013]\s*.*$/, "")
    .replace(/\s*\(.*$/, "")
    .trim() || "Persona";
}

export function relativePath(path) {
  return relative(ROOT, path).replace(/\\/g, "/");
}

export function toPosixPath(path) {
  return String(path || "").replace(/\\/g, "/");
}

// ---------------------------------------------------------------------------
// Type inference
// ---------------------------------------------------------------------------

export function inferType(value, fallback = "Chef") {
  const type = titleCase(value || fallback);
  return TYPES.includes(type) ? type : "Chef";
}

export function normalizeInputType(value, fallback = "auto") {
  const type = normalize(value);
  if (type === "auto" || type === "auto detect" || type === "autodetect") return "auto";
  return INPUT_TYPES.includes(type) ? type : fallback;
}

export function intakeDirName(type) {
  return INTAKE_DIR_NAMES[type] || `${type}s`;
}

export function isPersonaStructured(text) {
  const body = String(text || "");
  return (
    /\*\*(?:Chef|Client|Guest|Vendor|Staff|Partner|Public)\s*Profile:/i.test(body) ||
    /^(?:Chef|Client|Guest|Vendor|Staff|Partner|Public)\s*Profile:/im.test(body) ||
    /^---\s*persona\b/im.test(body) ||
    /###\s+Business Reality/i.test(body) ||
    /###\s+Pass\s*\/\s*Fail Conditions/i.test(body)
  );
}

export function detectInputType(text) {
  const body = ` ${normalize(text)} `;
  if (isPersonaStructured(text)) return "persona";
  if (/\b(bug|broken|crash|error|fails|failing|failed)\b/.test(body)) return "bug";
  if (/\b(add|build|feature|want|need|should)\b/.test(body)) return "feature";
  if (/\b(idea|what if|imagine|could we)\b/.test(body)) return "idea";
  if (/\b(critique|criticism|wrong|confusing|friction|awkward|bad|feedback)\b/.test(body)) return "critique";
  return "note";
}

export function inferIntakeTitle(text, fallback = "Intake") {
  const body = String(text || "").trim();
  const heading = body.match(/^#\s+(.+)$/m);
  const firstLine = heading?.[1] || body.split(/\r?\n/).find((line) => line.trim());
  const compact = String(firstLine || body || fallback).replace(/\s+/g, " ").trim();
  return cleanDisplayName(compact.split(/\s+/).slice(0, 10).join(" ")) || fallback;
}

export function inferTypeFromContent(text) {
  const match = text.match(/\*\*(?:(Chef|Client|Guest|Vendor|Staff|Partner|Public))\s*Profile:/i);
  if (match?.[1]) return titleCase(match[1]);
  const plain = text.match(/^(?:(Chef|Client|Guest|Vendor|Staff|Partner|Public))\s*Profile:/im);
  if (plain?.[1]) return titleCase(plain[1]);
  return null;
}

export function inferName(text, fallback) {
  if (fallback) return stripQuotes(fallback);
  const patterns = [
    /\*\*(?:chef|client|guest|vendor|staff|partner|public)?\s*profile:\s*["\u201c]?([^"\u201d\n-]+)["\u201d]?/i,
    /^(?:name|persona|profile):\s*(.+)$/im,
    /^#\s+(.+)$/m,
  ];
  for (const pattern of patterns) {
    const match = pattern.exec(text);
    if (match?.[1]) return stripQuotes(match[1].replace(/\s+[-:].*$/, ""));
  }
  return "Persona";
}

// ---------------------------------------------------------------------------
// Frontmatter
// ---------------------------------------------------------------------------

export function yamlValue(value) {
  return String(value ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\r?\n/g, " ");
}

export function buildFrontmatter(fields) {
  return [
    "---",
    ...Object.entries(fields)
      .filter(([, value]) => value !== undefined && value !== null && value !== "")
      .map(([key, value]) => `${key}: "${yamlValue(value)}"`),
    "---",
    "",
  ].join("\n");
}

export function parseFrontmatter(content) {
  const text = String(content || "").replace(/^\uFEFF/, "");
  const match = text.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) return { data: {}, body: text };
  const data = {};
  for (const line of match[1].split(/\r?\n/)) {
    const parts = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!parts) continue;
    const raw = parts[2].trim();
    data[parts[1]] = raw.replace(/^"|"$/g, "").replace(/\\"/g, '"').replace(/\\\\/g, "\\");
  }
  return { data, body: text.slice(match[0].length) };
}

// ---------------------------------------------------------------------------
// JSON file I/O
// ---------------------------------------------------------------------------

export function readJsonFile(path, fallback) {
  if (!existsSync(path)) return fallback;
  try {
    return JSON.parse(readFileSync(path, "utf8").replace(/^\uFEFF/, ""));
  } catch {
    return fallback;
  }
}

export function writeJsonFile(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

// ---------------------------------------------------------------------------
// Inbox state
// ---------------------------------------------------------------------------

export function readInboxState() {
  const state = readJsonFile(INBOX_STATE_FILE, { entries: [] });
  if (!Array.isArray(state.entries)) state.entries = [];
  return state;
}

export function saveInboxState(state) {
  state.updated_at = new Date().toISOString();
  writeJsonFile(INBOX_STATE_FILE, state);
}

export function updateEntries(ids, patch) {
  if (!ids.length) return;
  const state = readInboxState();
  const idSet = new Set(ids);
  const updatedAt = new Date().toISOString();
  state.entries = state.entries.map((entry) =>
    idSet.has(entry.id) ? { ...entry, ...patch, updated_at: updatedAt } : entry,
  );
  saveInboxState(state);
}

export function pendingEntryIds(statuses = ["saved", "queued", "failed", "spec_queued"]) {
  const state = readInboxState();
  return state.entries.filter((entry) => statuses.includes(entry.status)).map((entry) => entry.id);
}

// ---------------------------------------------------------------------------
// Pipeline state
// ---------------------------------------------------------------------------

export function readPipelineState() {
  return readJsonFile(PIPELINE_STATE_FILE, {
    version: 2,
    processed: [],
    failed: [],
    last_cycle: null,
    total_personas_processed: 0,
    total_build_tasks_queued: 0,
  });
}

export function savePipelineState(state) {
  writeJsonFile(PIPELINE_STATE_FILE, state);
}

// ---------------------------------------------------------------------------
// Disk counts and queue reading
// ---------------------------------------------------------------------------

export function severityRank(value) {
  const severity = String(value || "").toUpperCase();
  if (severity === "HIGH") return 3;
  if (severity === "MEDIUM") return 2;
  if (severity === "LOW") return 1;
  return 0;
}

export function countDiskQueues() {
  const personaBase = join(ROOT, "Chef Flow Personas");
  let uncompleted = 0, completed = 0, failed = 0;
  for (const type of TYPES) {
    const countFiles = (dir) => {
      if (!existsSync(dir)) return 0;
      try { return readdirSync(dir).filter((file) => /\.(txt|md)$/i.test(file)).length; } catch { return 0; }
    };
    uncompleted += countFiles(join(personaBase, "Uncompleted", type));
    completed += countFiles(join(personaBase, "Completed", type));
    failed += countFiles(join(personaBase, "Failed", type));
  }

  let buildTasks = 0;
  const plansDir = join(ROOT, "system", "persona-build-plans");
  if (existsSync(plansDir)) {
    try {
      for (const slug of readdirSync(plansDir)) {
        const slugDir = join(plansDir, slug);
        try {
          buildTasks += readdirSync(slugDir).filter(f => f.startsWith("task-") && f.endsWith(".md")).length;
        } catch {}
      }
    } catch {}
  }

  const buildQueue = existsSync(BUILD_QUEUE_DIR)
    ? readdirSync(BUILD_QUEUE_DIR).filter((file) => file.endsWith(".md")).length
    : 0;

  return { uncompleted, completed, failed, total: uncompleted + completed + failed, buildTasks, buildQueue };
}

export function slugFromFilename(file) {
  return basename(file).replace(/\.(txt|md)$/i, "")
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

export function countPersonaFilesByType() {
  const counts = Object.fromEntries(TYPES.map((type) => [type, 0]));
  const bases = ["Completed", "Uncompleted"];
  for (const status of bases) {
    for (const type of TYPES) {
      const dir = join(ROOT, "Chef Flow Personas", status, type);
      if (!existsSync(dir)) continue;
      try {
        counts[type] += readdirSync(dir).filter((file) => /\.(txt|md)$/i.test(file)).length;
      } catch {}
    }
  }
  return counts;
}

export function findUnprocessedPersonaFiles() {
  const state = readPipelineState();
  const processedSlugs = new Set((state.processed || []).map((entry) => entry.slug).filter(Boolean));
  const failedSources = new Set((state.failed || []).map((entry) => toPosixPath(entry.source_file)));
  const failedSlugs = new Set((state.failed || []).map((entry) => slugFromFilename(entry.source_file || "")).filter(Boolean));
  const files = [];

  for (const type of TYPES) {
    const dir = join(PERSONA_ROOT, type);
    if (!existsSync(dir)) continue;
    try {
      for (const file of readdirSync(dir)) {
        if (!/\.(txt|md)$/i.test(file)) continue;
        const fullPath = join(dir, file);
        const rel = relativePath(fullPath);
        const slug = slugFromFilename(file);
        if (processedSlugs.has(slug) || failedSlugs.has(slug) || failedSources.has(rel)) continue;
        files.push(fullPath);
      }
    } catch {}
  }

  return files;
}

export function findPersonaSourceFile(slug) {
  const bases = [
    join(ROOT, "Chef Flow Personas", "Completed"),
    join(ROOT, "Chef Flow Personas", "Uncompleted"),
    join(ROOT, "Chef Flow Personas", "Failed"),
    join(ROOT, "Chef Flow Personas", "Unsure"),
  ];
  for (const base of bases) {
    if (!existsSync(base)) continue;
    try {
      for (const type of readdirSync(base)) {
        const typeDir = join(base, type);
        try {
          for (const file of readdirSync(typeDir)) {
            if (file.includes(slug) && /\.(txt|md)$/i.test(file)) {
              return join(typeDir, file);
            }
          }
        } catch {}
      }
    } catch {}
  }
  return null;
}

// ---------------------------------------------------------------------------
// Synthesis data
// ---------------------------------------------------------------------------

export function readSynthesisData() {
  return readJsonFile(SYNTHESIS_FILE, null);
}

export function synthesisTimestampMs() {
  const synthesis = readJsonFile(SYNTHESIS_FILE, null);
  const generatedAt = Date.parse(synthesis?.generated_at || "");
  if (Number.isFinite(generatedAt)) return generatedAt;
  if (existsSync(SYNTHESIS_FILE)) {
    try { return statSync(SYNTHESIS_FILE).mtimeMs; } catch {}
  }
  return 0;
}

export function countNewReportsSinceLastSynthesis() {
  const state = readPipelineState();
  const lastSynthesisAt = Date.parse(state.last_synthesis_at || "") || synthesisTimestampMs();
  let count = 0;
  for (const entry of state.processed || []) {
    const reportPath = entry.report ? join(ROOT, entry.report) : null;
    let reportTime = Date.parse(entry.analyzed_at || "");
    if (reportPath && existsSync(reportPath)) {
      try { reportTime = Math.max(reportTime || 0, statSync(reportPath).mtimeMs); } catch {}
    }
    if (reportTime > lastSynthesisAt) count++;
  }
  return count;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export function validationByTitle() {
  const validation = readJsonFile(VALIDATION_FILE, null);
  const map = new Map();
  for (const gap of validation?.gaps || []) {
    if (gap.title) map.set(normalize(gap.title), gap);
  }
  return map;
}

export function validationAffectedFiles(validationGap) {
  const files = [];
  for (const evidence of validationGap?.evidence || []) {
    if (evidence.path) files.push(evidence.path);
    if (Array.isArray(evidence.files)) files.push(...evidence.files);
  }
  return [...new Set(files)].slice(0, 8);
}

export function grepFilesForPattern(pattern, dirs, maxResults = 3) {
  const results = [];
  function walk(dir) {
    if (results.length >= maxResults) return;
    let entries;
    try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      if (results.length >= maxResults) return;
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "node_modules" || entry.name === ".next" || entry.name === ".git") continue;
        walk(full);
      } else if (/\.(ts|tsx)$/.test(entry.name)) {
        try {
          const content = readFileSync(full, "utf8");
          if (pattern.test(content)) {
            results.push(relative(ROOT, full).replace(/\\/g, "/"));
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

export function runGapValidation() {
  const satPath = SYNTHESIS_FILE;
  if (!existsSync(satPath)) return { error: "No saturation.json found. Run synthesizer first." };

  let satData;
  try { satData = JSON.parse(readFileSync(satPath, "utf8")); } catch {
    return { error: "Failed to parse saturation.json" };
  }

  const results = [];
  const seenTitles = new Set();

  for (const [catId, catInfo] of Object.entries(satData.categories || {})) {
    for (const gap of catInfo.gaps || []) {
      const key = gap.title.toLowerCase();
      if (seenTitles.has(key)) continue;
      seenTitles.add(key);

      const result = { category: catId, title: gap.title, severity: gap.severity, from: gap.from, status: "MISSING", validated: null, evidence: [] };

      if (gap.search_hints?.known_built_matches?.length > 0) {
        for (const match of gap.search_hints.known_built_matches) {
          const fullPath = resolve(ROOT, match.file);
          if (existsSync(fullPath)) {
            result.status = "BUILT";
            result.evidence.push({ type: "file_exists", path: match.file, label: match.label });
          }
        }
      }

      if (result.status === "MISSING" && gap.search_hints?.grep_terms?.length > 0) {
        for (const term of gap.search_hints.grep_terms.slice(0, 4)) {
          try {
            const pattern = new RegExp(term.replace(/\./g, "[._\\-]?"), "i");
            const matches = grepFilesForPattern(pattern, ["lib", "components", "app"], 3);
            if (matches.length > 0) {
              result.status = "PARTIAL";
              result.evidence.push({ type: "grep_match", term, files: matches });
            }
          } catch {}
        }
        if (result.evidence.length >= 2) result.status = "BUILT";
      }

      results.push(result);
    }
  }

  const built = results.filter(r => r.status === "BUILT").length;
  const partial = results.filter(r => r.status === "PARTIAL").length;
  const missing = results.filter(r => r.status === "MISSING").length;

  const validation = {
    validated_at: new Date().toISOString(),
    summary: { total: results.length, built, partial, missing, false_positive_rate: results.length > 0 ? Math.round((built / results.length) * 100) : 0 },
    gaps: results,
  };
  writeFileSync(VALIDATION_FILE, JSON.stringify(validation, null, 2) + "\n", "utf8");
  return validation;
}

export function readValidation() {
  return readJsonFile(VALIDATION_FILE, null);
}

// ── Precision Tracking ────────────────────────────────────────────
const PRECISION_LOG_FILE = join(SYSTEM_DIR, "persona-batch-synthesis", "precision-log.json");

function normTitle(s) { return (s || "").toLowerCase().trim(); }

export function markGapValidated(gapTitle, isReal) {
  const validation = readJsonFile(VALIDATION_FILE, null);
  if (!validation?.gaps) return { error: "No validation.json found" };
  const normalized = normTitle(gapTitle);
  let found = false;
  for (const gap of validation.gaps) {
    if (normTitle(gap.title) === normalized) { gap.validated = isReal; found = true; break; }
  }
  if (!found) return { error: `Gap not found: ${gapTitle}` };
  const validated = validation.gaps.filter(g => g.validated === true || g.validated === false);
  const truePositives = validated.filter(g => g.validated === true).length;
  const falsePositives = validated.filter(g => g.validated === false).length;
  validation.summary.precision = {
    validated_count: validated.length, true_positives: truePositives, false_positives: falsePositives,
    precision_rate: validated.length > 0 ? Math.round((truePositives / validated.length) * 100) : null,
  };
  writeFileSync(VALIDATION_FILE, JSON.stringify(validation, null, 2) + "\n", "utf8");
  const log = readJsonFile(PRECISION_LOG_FILE, []);
  log.push({ timestamp: new Date().toISOString(), gap_title: gapTitle, is_real: isReal, cumulative_precision: validation.summary.precision.precision_rate, total_validated: validated.length });
  writeFileSync(PRECISION_LOG_FILE, JSON.stringify(log, null, 2) + "\n", "utf8");
  return { success: true, gap: gapTitle, validated: isReal, precision: validation.summary.precision };
}

export function getPrecisionReport() {
  const validation = readJsonFile(VALIDATION_FILE, null);
  if (!validation?.gaps) return { error: "No validation.json" };
  const gaps = validation.gaps;
  const validated = gaps.filter(g => g.validated === true || g.validated === false);
  const truePos = validated.filter(g => g.validated === true).length;
  const falsePos = validated.filter(g => g.validated === false).length;
  const unvalidated = gaps.filter(g => g.validated !== true && g.validated !== false).length;
  const byCategory = {};
  for (const gap of gaps) {
    const cat = gap.category || "unknown";
    if (!byCategory[cat]) byCategory[cat] = { total: 0, validated: 0, true_positives: 0, false_positives: 0 };
    byCategory[cat].total++;
    if (gap.validated === true || gap.validated === false) {
      byCategory[cat].validated++;
      if (gap.validated) byCategory[cat].true_positives++; else byCategory[cat].false_positives++;
    }
  }
  const byPersona = {};
  for (const gap of gaps) {
    const persona = gap.from || "unknown";
    if (!byPersona[persona]) byPersona[persona] = { total: 0, validated: 0, true_positives: 0, false_positives: 0 };
    byPersona[persona].total++;
    if (gap.validated === true || gap.validated === false) {
      byPersona[persona].validated++;
      if (gap.validated) byPersona[persona].true_positives++; else byPersona[persona].false_positives++;
    }
  }
  const log = readJsonFile(PRECISION_LOG_FILE, []);
  return {
    overall: { total_gaps: gaps.length, validated: validated.length, unvalidated, true_positives: truePos, false_positives: falsePos, precision_rate: validated.length > 0 ? Math.round((truePos / validated.length) * 100) : null },
    by_category: byCategory, by_persona: byPersona,
    precision_trend: log.slice(-20).map(l => ({ date: l.timestamp.slice(0, 10), precision: l.cumulative_precision })),
  };
}

export function generateGapBuildSpec(gap, index) {
  const category = gap?.category || "uncategorized";
  const title = gap?.title || "Missing Pipeline Feature";
  const severity = gap?.severity || "MEDIUM";
  const source = gap?.from || "persona pipeline";
  const slug = `gap-${slugify(category, 48)}-${index}`;
  const date = new Date().toISOString().slice(0, 10);
  const spec = `# Codex Task: Build Missing Feature - ${title}

## Source
- **Category:** ${category}
- **Severity:** ${severity}
- **Discovered by persona:** ${source}
- **Validation status:** MISSING (no codebase evidence found)

## What to Build
${title}

${gap?.description || "See gap title. Implement the minimum viable version of this capability."}

## Context
This gap was discovered by the persona pipeline stress-testing ChefFlow with simulated user "${source}".
No existing code was found for this feature during automated codebase validation.

## Guardrails
- All monetary amounts in cents (integers, never floats)
- All DB queries must be tenant-scoped (use \`tenant_id\` or \`chef_id\` from session)
- No em dashes anywhere
- No \`@ts-nocheck\`
- No new npm dependencies without justification
- Server actions need: auth gate, tenant scoping, input validation, error propagation, cache busting
- Do NOT create database migrations. If schema changes are needed, document them in a \`## Schema Changes Needed\` section but do NOT create migration files.
- Do NOT delete or modify existing functionality that is unrelated to this gap.

## Acceptance Criteria
1. The described capability exists and is reachable from the UI (if user-facing) or callable from server code (if backend-only)
2. \`npx tsc --noEmit --skipLibCheck\` passes
3. No regressions in existing functionality

## Branch
\`codex/pipeline-${slug}\`
`;
  return { slug, spec, date };
}

// ---------------------------------------------------------------------------
// Persona reports
// ---------------------------------------------------------------------------

export function parsePersonaReport(file, content, archived = false) {
  try {
    const text = content.replace(/\r\n/g, "\n");
    const nameMatch = text.match(/^# Persona Stress Test[\s:\u2014\u2013-]+(.+)$/m);
    let name = nameMatch ? nameMatch[1].trim() : file;
    if (name === name.toLowerCase() && name.includes("-")) {
      name = name.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
    }
    const pType = (text.match(/^\*\*Type:\*\*\s*(.+)$/m) || text.match(/^## Type:\s*(.+)$/m) || [])[1] || "Chef";
    const date = (text.match(/^\*\*Date:\*\*\s*(.+)$/m) || [])[1] || "";
    const scoreA = text.match(/## Score:\s*(\d+)\s*\/\s*100/);
    const scoreB = text.match(/\*\*(\d+)\s*\/\s*100\*\*/);
    const score = scoreA ? Number(scoreA[1]) : scoreB ? Number(scoreB[1]) : null;
    const summaryMatch = text.match(/## Summary\n([\s\S]*?)(?=\n## )/) || text.match(/## 1\) Persona Summary\n\n([\s\S]*?)(?=\n## )/);
    const summary = summaryMatch ? summaryMatch[1].trim().slice(0, 200) : "";
    const gaps = [];
    const gapReA = /### Gap (\d+):\s*(.+)\n\*\*Severity:\*\*\s*(\w+)\*{0,2}\n([\s\S]*?)(?=### Gap|\n## |$)/g;
    let m;
    while ((m = gapReA.exec(text)) !== null) {
      gaps.push({ number: Number(m[1]), title: m[2].trim(), severity: m[3].trim(), description: m[4].trim().slice(0, 200) });
    }
    if (gaps.length === 0) {
      const gapSection = text.match(/## (?:3\) )?Top 5 Gaps\n\n([\s\S]*?)(?=\n## )/);
      if (gapSection) {
        const gapReB = /(\d+)\.\s+\*\*(.+?)\*\*[^]*?(?=\n\d+\.\s+\*\*|$)/g;
        while ((m = gapReB.exec(gapSection[1])) !== null) {
          const desc = m[0].replace(/^\d+\.\s+\*\*.+?\*\*\s*/, "").trim();
          gaps.push({ number: Number(m[1]), title: m[2].trim(), severity: "HIGH", description: desc.slice(0, 200) });
        }
      }
    }
    const slug = file.replace(/^persona-/, "").replace(/-\d{4}-\d{2}-\d{2}(-original)?\.md$/, "");
    return { slug, file, name, type: pType, date, score, summary, gaps, archived };
  } catch {
    return null;
  }
}

export function readPersonaReports() {
  const dir = join(ROOT, "docs", "stress-tests");
  if (!existsSync(dir)) return [];
  const results = [];

  for (const file of readdirSync(dir)) {
    if (!file.startsWith("persona-") || !file.endsWith(".md")) continue;
    const content = readFileSync(join(dir, file), "utf8");
    const parsed = parsePersonaReport(file, content, false);
    if (parsed) results.push(parsed);
  }

  const archiveDir = join(dir, "archive");
  if (existsSync(archiveDir)) {
    for (const file of readdirSync(archiveDir)) {
      if (!file.startsWith("persona-") || !file.endsWith(".md")) continue;
      const content = readFileSync(join(archiveDir, file), "utf8");
      const parsed = parsePersonaReport(file, content, true);
      if (parsed) results.push(parsed);
    }
  }

  return results.sort((a, b) => (a.score ?? 0) - (b.score ?? 0));
}

export function readAllPersonaSources() {
  const personaBase = join(ROOT, "Chef Flow Personas");
  const statuses = ["Completed", "Uncompleted", "Failed", "Unsure"];
  const sources = [];
  for (const status of statuses) {
    for (const type of TYPES) {
      const dir = join(personaBase, status, type);
      if (!existsSync(dir)) continue;
      try {
        for (const file of readdirSync(dir)) {
          if (!/\.(txt|md)$/i.test(file)) continue;
          try {
            const fullPath = join(dir, file);
            const content = readFileSync(fullPath, "utf8");
            const nameMatch = content.match(/\*\*(?:Chef|Client|Guest|Vendor|Staff|Partner|Public)\s+Profile:\s*"?([^"*\n]+)"?\s*/i);
            const name = nameMatch ? nameMatch[1].replace(/\s*[-\u2014].*/,"").trim() : file.replace(/\.[^.]+$/, "");
            const wordCount = content.split(/\s+/).length;
            const slug = file.replace(/\.[^.]+$/, "").toLowerCase().replace(/\s+/g, "-");
            let rejectionReason = null;
            if (status === "Failed") {
              const rejMatch = content.match(/<!-- (?:GENERATION )?VALIDATION FAILED[^]*?-->/);
              if (rejMatch) rejectionReason = rejMatch[0].replace(/<!--|-->/g, "").trim().slice(0, 300);
            }
            sources.push({
              slug, file, name, type, status: status.toLowerCase(),
              path: `Chef Flow Personas/${status}/${type}/${file}`,
              wordCount, rejectionReason,
              preview: content.slice(0, 200).replace(/\n/g, " ").trim(),
            });
          } catch {}
        }
      } catch {}
    }
  }
  return sources;
}

export function readScoreHistory() {
  return readJsonFile(join(ROOT, "system", "persona-batch-synthesis", "score-history.json"), []);
}

// ---------------------------------------------------------------------------
// Build queue
// ---------------------------------------------------------------------------

export function ensureBuildQueueDir() {
  mkdirSync(BUILD_QUEUE_DIR, { recursive: true });
}

function buildQueueFilename(index, severity, title) {
  const priority = String(severity || "medium").toLowerCase();
  return `${String(index).padStart(3, "0")}-${priority}-${slugify(title, 64)}.md`;
}

export function stageBuildQueueFromSynthesis() {
  const synthesis = readJsonFile(SYNTHESIS_FILE, null);
  if (!synthesis?.categories) return { staged: 0, skipped: "No synthesis data" };

  ensureBuildQueueDir();
  for (const file of readdirSync(BUILD_QUEUE_DIR)) {
    if (file.endsWith(".md")) unlinkSync(join(BUILD_QUEUE_DIR, file));
  }

  const validation = validationByTitle();
  const priorityScores = new Map((synthesis.priority_ranking || []).map((entry) => [entry.category, entry.priority_score || 0]));
  const candidates = [];

  for (const [category, info] of Object.entries(synthesis.categories || {})) {
    for (const gap of info.gaps || []) {
      const validated = validation.get(normalize(gap.title));
      if (validated?.status === "BUILT") continue;
      candidates.push({
        category,
        title: gap.title || category,
        source: gap.from || (info.personas || []).join(", ") || "synthesis",
        severity: String(gap.severity || "MEDIUM").toUpperCase(),
        priorityScore: priorityScores.get(category) || 0,
        validation: validated || null,
        searchHints: gap.search_hints || {},
      });
    }
  }

  candidates.sort((a, b) =>
    (b.priorityScore - a.priorityScore) ||
    (severityRank(b.severity) - severityRank(a.severity)) ||
    a.title.localeCompare(b.title),
  );

  let index = 1;
  const seen = new Set();
  for (const gap of candidates) {
    const key = normalize(`${gap.category} ${gap.title}`);
    if (seen.has(key)) continue;
    seen.add(key);

    const status = gap.validation?.status || "MISSING";
    const confidence = status === "MISSING" ? "high" : status === "PARTIAL" ? "medium" : "needs-validation";
    const affectedFiles = validationAffectedFiles(gap.validation);
    const hints = Array.isArray(gap.searchHints.grep_terms) ? gap.searchHints.grep_terms.slice(0, 8) : [];
    const file = buildQueueFilename(index, gap.severity, gap.title);
    const content = `${buildFrontmatter({
      status: "pending",
      priority: gap.severity.toLowerCase(),
      category: gap.category,
      source: gap.source,
      confidence,
      generated: new Date().toISOString(),
    })}# ${gap.title}

## Gap
${gap.title}

## Source
${gap.source}

## Confidence
${confidence}${gap.validation ? ` (${gap.validation.status})` : " (not validated yet)"}

## Affected Files
${affectedFiles.length ? affectedFiles.map((path) => `- ${path}`).join("\n") : "- Unknown until codebase validation runs"}

## Search Hints
${hints.length ? hints.map((term) => `- ${term}`).join("\n") : "- None"}

## Suggested Approach
Confirm the current codebase state for the affected workflow, then implement the smallest ChefFlow surface that closes this gap without duplicating an existing partial feature.
`;
    writeFileSync(join(BUILD_QUEUE_DIR, file), content, "utf8");
    index++;
  }

  return { staged: index - 1 };
}

export function parseBuildQueueFile(filePath) {
  try {
    const content = readFileSync(filePath, "utf8");
    const parsed = parseFrontmatter(content);
    const title = (parsed.body.match(/^#\s+(.+)$/m) || [])[1] || basename(filePath, ".md");
    return {
      title,
      status: parsed.data.status || "pending",
      priority: parsed.data.priority || "medium",
      severity: String(parsed.data.priority || "medium").toUpperCase(),
      category: parsed.data.category || "",
      source: parsed.data.source || "",
      confidence: parsed.data.confidence || "",
      generated: parsed.data.generated || "",
      path: relativePath(filePath),
      excerpt: parsed.body.replace(/^#\s+.+$/m, "").replace(/\s+/g, " ").trim().slice(0, 220),
    };
  } catch {
    return null;
  }
}

export function readBuildQueueFiles() {
  ensureBuildQueueDir();
  const items = [];
  try {
    for (const file of readdirSync(BUILD_QUEUE_DIR).filter((name) => name.endsWith(".md")).sort()) {
      const item = parseBuildQueueFile(join(BUILD_QUEUE_DIR, file));
      if (item) items.push(item);
    }
  } catch {}
  return {
    items,
    counts: {
      total: items.length,
      pending: items.filter((item) => item.status === "pending").length,
      in_progress: items.filter((item) => item.status === "in-progress").length,
      built: items.filter((item) => item.status === "built").length,
    },
  };
}

// ---------------------------------------------------------------------------
// Build tasks (persona-build-plans)
// ---------------------------------------------------------------------------

export function readBuildTaskFiles() {
  const dir = join(ROOT, "system", "persona-build-plans");
  if (!existsSync(dir)) return { tasks: [], completedCount: 0 };
  const tasks = [];
  let completedCount = 0;
  try {
    for (const slug of readdirSync(dir)) {
      const slugDir = join(dir, slug);
      try {
        const completedDir = join(slugDir, "completed");
        if (existsSync(completedDir)) {
          completedCount += readdirSync(completedDir).filter(f => f.startsWith("task-") && f.endsWith(".md")).length;
        }
        for (const file of readdirSync(slugDir).filter((f) => f.startsWith("task-") && f.endsWith(".md"))) {
          const content = readFileSync(join(slugDir, file), "utf8");
          const title = (content.match(/^# Build Task:\s*(.+)$/m) || [])[1] || file;
          const persona = (content.match(/^\*\*Source Persona:\*\*\s*(.+)$/m) || [])[1] || slug;
          const severity = (content.match(/^\*\*Severity:\*\*\s*(\w+)$/m) || [])[1] || "MEDIUM";
          tasks.push({ slug, file, title, persona, severity, path: `system/persona-build-plans/${slug}/${file}` });
        }
      } catch {}
    }
  } catch {}
  return { tasks, completedCount };
}

// ---------------------------------------------------------------------------
// Persona writing (import)
// ---------------------------------------------------------------------------

export function uniquePath(type, name) {
  const dir = join(PERSONA_ROOT, type);
  const base = slugify(name);
  let path = join(dir, `${base}.txt`);
  let counter = 2;
  while (existsSync(path)) {
    path = join(dir, `${base}-${counter}.txt`);
    counter++;
  }
  return { dir, path };
}

export function writePersona(entry, defaultType, authorOverride) {
  const type = inferType(entry.type, defaultType);
  const name = cleanDisplayName(inferName(entry.content, entry.name));
  const { dir, path } = uniquePath(type, name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(path, `${entry.content.trim()}\n`, "utf8");

  const stem = basename(path, extname(path));
  const relPath = relativePath(path);

  const author = authorOverride || { type: "human", name: "David", tool: "web-dashboard" };
  let vaultId = null;
  let vaultHash = null;
  try {
    const vaultResult = vaultStore({
      content: entry.content,
      persona_type: type,
      persona_name: name,
      author,
      source_file: relPath,
    });
    vaultId = vaultResult.id;
    vaultHash = vaultResult.content_hash;
  } catch (err) {
    console.error("[vault] Failed to store persona:", err.message);
  }

  return {
    id: randomUUID(),
    type,
    name,
    path,
    relativePath: relPath,
    codexSlug: slugify(stem, 48),
    chars: entry.content.trim().length,
    preview: entry.content.trim().replace(/\s+/g, " ").slice(0, 180),
    status: "saved",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    vault_id: vaultId,
    vault_hash: vaultHash,
  };
}

// ---------------------------------------------------------------------------
// Intake writing
// ---------------------------------------------------------------------------

export function ensureIntakeDirs() {
  for (const type of INTAKE_TYPES) {
    mkdirSync(join(INTAKE_ROOT, intakeDirName(type)), { recursive: true });
    if (type !== "note") {
      mkdirSync(join(INTAKE_PROCESSED_ROOT, intakeDirName(type)), { recursive: true });
    }
  }
}

function uniqueIntakePath(type, title) {
  const dir = join(INTAKE_ROOT, intakeDirName(type));
  const base = slugify(title, 72) || type;
  let path = join(dir, `${base}.md`);
  let counter = 2;
  while (existsSync(path)) {
    path = join(dir, `${base}-${counter}.md`);
    counter++;
  }
  return { dir, path };
}

export function writeIntake(entry) {
  const type = normalizeInputType(entry.inputType || entry.type, "note");
  const name = inferIntakeTitle(entry.content, entry.name || titleCase(type));
  const { dir, path } = uniqueIntakePath(type, name);
  const submitted = new Date().toISOString();
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    path,
    `${buildFrontmatter({ type, submitted, status: "pending", source: "web-dashboard" })}${entry.content.trim()}\n`,
    "utf8",
  );

  return {
    id: randomUUID(),
    inputType: type,
    type,
    name,
    path,
    relativePath: relativePath(path),
    chars: entry.content.trim().length,
    preview: entry.content.trim().replace(/\s+/g, " ").slice(0, 180),
    status: "pending",
    created_at: submitted,
    updated_at: submitted,
  };
}

// ---------------------------------------------------------------------------
// Intake reading
// ---------------------------------------------------------------------------

function parseIntakeFile(filePath, type, processed = false) {
  try {
    const content = readFileSync(filePath, "utf8");
    const parsed = parseFrontmatter(content);
    const body = parsed.body.trim();
    const title = inferIntakeTitle(body, titleCase(type));
    return {
      type,
      title,
      status: parsed.data.status || (processed ? "processed" : "pending"),
      submitted: parsed.data.submitted || "",
      processed: parsed.data.processed || "",
      source: parsed.data.source || "",
      topics: parsed.data.topics || "",
      path: relativePath(filePath),
      excerpt: body.replace(/\s+/g, " ").slice(0, processed ? 320 : 220),
      processedView: processed,
    };
  } catch {
    return null;
  }
}

export function readIntakeQueue() {
  const raw = [];
  const processed = [];

  for (const type of INTAKE_TYPES) {
    const dirName = intakeDirName(type);
    const rawDir = join(INTAKE_ROOT, dirName);
    const processedDir = join(INTAKE_PROCESSED_ROOT, dirName);

    if (existsSync(rawDir)) {
      try {
        for (const file of readdirSync(rawDir).filter((name) => name.endsWith(".md"))) {
          const item = parseIntakeFile(join(rawDir, file), type, false);
          if (!item) continue;
          const matchingProcessed = join(processedDir, file);
          if (existsSync(matchingProcessed)) {
            item.status = "processed";
            item.processedPath = relativePath(matchingProcessed);
          }
          raw.push(item);
        }
      } catch {}
    }

    if (existsSync(processedDir)) {
      try {
        for (const file of readdirSync(processedDir).filter((name) => name.endsWith(".md"))) {
          const item = parseIntakeFile(join(processedDir, file), type, true);
          if (item) processed.push(item);
        }
      } catch {}
    }
  }

  const byNewest = (a, b) => String(b.submitted || b.processed).localeCompare(String(a.submitted || a.processed));
  return {
    raw: raw.sort(byNewest),
    processed: processed.sort(byNewest),
    counts: {
      raw: raw.length,
      processed: raw.filter((item) => item.status === "processed").length,
      pending: raw.filter((item) => item.status === "pending").length,
      failed: raw.filter((item) => item.status === "failed").length,
    },
  };
}

// ---------------------------------------------------------------------------
// Auto-generation state
// ---------------------------------------------------------------------------

function currentDayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function currentHourKey(date = new Date()) {
  return date.toISOString().slice(0, 13);
}

export function readAutoGenerationState() {
  const now = new Date();
  const state = readJsonFile(AUTO_GENERATION_FILE, {
    last_generated: null,
    day: currentDayKey(now),
    hour: currentHourKey(now),
    today_count: 0,
    hour_count: 0,
    history: [],
  });
  if (!Array.isArray(state.history)) state.history = [];
  if (state.day !== currentDayKey(now)) {
    state.day = currentDayKey(now);
    state.today_count = 0;
  }
  if (state.hour !== currentHourKey(now)) {
    state.hour = currentHourKey(now);
    state.hour_count = 0;
  }
  return state;
}

export function saveAutoGenerationState(state) {
  writeJsonFile(AUTO_GENERATION_FILE, state);
}

// ---------------------------------------------------------------------------
// Preview (for import)
// ---------------------------------------------------------------------------

function splitMarkerBulk(text, defaultType) {
  const marker = /^---\s*persona(?::\s*(?:(Chef|Client|Guest|Vendor|Staff|Partner|Public)\s*:)?\s*([^-]+?))?\s*---\s*$/gim;
  const matches = [...text.matchAll(marker)];
  if (matches.length === 0) return null;

  return matches
    .map((match, index) => {
      const start = match.index + match[0].length;
      const end = matches[index + 1]?.index ?? text.length;
      return {
        type: inferType(match[1], defaultType),
        name: stripQuotes(match[2] || ""),
        content: text.slice(start, end).trim(),
      };
    })
    .filter((entry) => entry.content.length > 0);
}

function splitHeadingBulk(text, defaultType) {
  const marker = /^(Chef|Client|Guest|Vendor|Staff|Partner|Public)\s*:\s*(.+?)\s*$/gim;
  const matches = [...text.matchAll(marker)];
  if (matches.length < 2 && matches[0]?.index !== 0) return null;

  return matches
    .map((match, index) => {
      const start = match.index + match[0].length;
      const end = matches[index + 1]?.index ?? text.length;
      return {
        type: inferType(match[1], defaultType),
        name: stripQuotes(match[2] || ""),
        content: text.slice(start, end).trim(),
      };
    })
    .filter((entry) => entry.content.length > 0);
}

export function splitBulk(text, defaultType) {
  const body = String(text || "").trim();
  if (!body) return [];
  return (
    splitMarkerBulk(body, defaultType) ||
    splitHeadingBulk(body, defaultType) ||
    [{ type: inferTypeFromContent(body) || defaultType, name: null, content: body }]
  );
}

export function previewEntries(text, defaultType) {
  return splitBulk(text, defaultType).map((entry, index) => {
    const type = inferType(entry.type, defaultType);
    const name = cleanDisplayName(inferName(entry.content, entry.name));
    const trimmed = entry.content.trim();
    const warnings = [];
    if (trimmed.length < 50)
      warnings.push("Under 50 characters; pipeline will skip very thin entries.");
    if (name === "Persona") warnings.push("Name was not detected.");

    let driftRatio = 0;
    let driftCategories = [];
    let validationScore = 0;
    let isHardDrift = false;
    if (trimmed.length >= 50) {
      const validation = validatePersonaContent(trimmed, { name, type });
      driftRatio = validation.drift_ratio || 0;
      driftCategories = validation.drift_categories || [];
      isHardDrift = validation.is_hard_drift || false;
      validationScore = validation.score || 0;
      if (isHardDrift) {
        warnings.push(
          `PRODUCT DRIFT: ${Math.round(driftRatio * 100)}% off-domain (${driftCategories.join(", ")}). Will be rejected by pipeline.`
        );
      } else if (driftRatio > 0.4) {
        warnings.push(
          `Drift warning: ${Math.round(driftRatio * 100)}% off-domain (${driftCategories.join(", ")}). Needs rewrite.`
        );
      }
    }

    return {
      index,
      inputType: "persona",
      type,
      name,
      content: trimmed,
      chars: trimmed.length,
      warnings,
      excerpt: trimmed.replace(/\s+/g, " ").slice(0, 180),
      driftRatio,
      driftCategories,
      isHardDrift,
      validationScore,
    };
  });
}

export function previewIntakeEntry(text, requestedType = "auto") {
  const trimmed = String(text || "").trim();
  const type = requestedType === "auto" ? detectInputType(trimmed) : normalizeInputType(requestedType, "note");
  const name = inferIntakeTitle(trimmed, titleCase(type));
  return {
    index: 0,
    inputType: type,
    type,
    name,
    content: trimmed,
    chars: trimmed.length,
    warnings: trimmed.length < 5 ? ["Very short input. Add more detail if this needs expansion."] : [],
    excerpt: trimmed.replace(/\s+/g, " ").slice(0, 180),
    driftRatio: 0,
    driftCategories: [],
    isHardDrift: false,
    validationScore: 0,
  };
}

export function previewInputEntries(text, selectedInputType, defaultType) {
  const body = String(text || "").trim();
  if (!body) return [];
  const requested = normalizeInputType(selectedInputType, "auto");
  const detected = requested === "auto" ? detectInputType(body) : requested;
  if (detected === "persona") return previewEntries(body, defaultType);
  return [previewIntakeEntry(body, detected)];
}

// ---------------------------------------------------------------------------
// Child process spawners (for CLI and server)
// ---------------------------------------------------------------------------

/**
 * Spawn the orchestrator pipeline. Returns a promise that resolves with exit code.
 * @param {object} opts
 * @param {number} [opts.max] - Max personas to process
 * @param {string} [opts.file] - Process a specific file
 * @param {function} [opts.onLine] - Called with each output line
 */
export function spawnOrchestrator(opts = {}) {
  return new Promise((resolve) => {
    const args = ["devtools/persona-orchestrator.mjs", "--once"];
    if (opts.file) {
      args.push("--file", opts.file);
    } else {
      args.push("--max", String(opts.max || 5));
    }
    const child = spawn(process.execPath, args, {
      cwd: ROOT,
      detached: false,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
    child.stdout.on("data", (chunk) => {
      const text = chunk.toString();
      process.stdout.write(text);
      opts.onLine?.(text);
    });
    child.stderr.on("data", (chunk) => {
      const text = chunk.toString();
      process.stderr.write(text);
      opts.onLine?.(text);
    });
    child.on("exit", (code) => resolve(code ?? 1));
    child.on("error", (err) => {
      console.error(`[orchestrator] failed to spawn: ${err.message}`);
      resolve(1);
    });
  });
}

/**
 * Spawn the batch synthesizer. Returns a promise that resolves with exit code.
 */
export function spawnSynthesizer(opts = {}) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, ["devtools/persona-batch-synthesizer.mjs"], {
      cwd: ROOT,
      detached: false,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
    child.stdout.on("data", (chunk) => {
      process.stdout.write(chunk);
      opts.onLine?.(chunk.toString());
    });
    child.stderr.on("data", (chunk) => {
      process.stderr.write(chunk);
      opts.onLine?.(chunk.toString());
    });
    child.on("exit", (code) => resolve(code ?? 1));
    child.on("error", (err) => {
      console.error(`[synthesizer] failed to spawn: ${err.message}`);
      resolve(1);
    });
  });
}

/**
 * Spawn the persona generator. Returns a promise that resolves with exit code.
 */
export function spawnGenerator(opts = {}) {
  return new Promise((resolve) => {
    const args = ["devtools/persona-generator.mjs", "--type", opts.type || "Chef", "--count", String(opts.count || 1)];
    if (opts.category) args.push("--category", opts.category);
    const child = spawn(process.execPath, args, {
      cwd: ROOT,
      detached: false,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
    child.stdout.on("data", (chunk) => {
      process.stdout.write(chunk);
      opts.onLine?.(chunk.toString());
    });
    child.stderr.on("data", (chunk) => {
      process.stderr.write(chunk);
      opts.onLine?.(chunk.toString());
    });
    child.on("exit", (code) => resolve(code ?? 1));
    child.on("error", (err) => {
      console.error(`[generator] failed to spawn: ${err.message}`);
      resolve(1);
    });
  });
}
