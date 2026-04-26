#!/usr/bin/env node
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { basename, extname, join, relative } from "node:path";
import { randomUUID } from "node:crypto";

const ROOT = process.cwd();
const SYSTEM_DIR = join(ROOT, "system");
const PERSONA_ROOT = join(ROOT, "Chef Flow Personas", "Uncompleted");
const INBOX_STATE_FILE = join(SYSTEM_DIR, "persona-inbox-state.json");
const TYPES = ["Chef", "Client", "Guest", "Vendor", "Staff", "Partner", "Public"];
const DEFAULT_PORT = 3977;
const DEFAULT_HOST = "127.0.0.1";
const authToken = String(process.env.PERSONA_INBOX_TOKEN || "").trim();
const MAX_BODY_BYTES = 1024 * 1024 * 10;

let pipelineRunning = false;
let pipelineQueued = false;
let queuedPipelineLimit = 0;
let queuedPipelineIds = [];
let lastPipelineStatus = "Idle";
let lastPipelineLines = [];
let pipelineStartedAt = null;

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function slugify(value, max = 64) {
  return normalize(value).replace(/\s+/g, "-").slice(0, max) || "persona";
}

function titleCase(value) {
  return String(value || "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function stripQuotes(value) {
  return String(value || "")
    .replace(/^[\s"'`\u201c\u201d\u2018\u2019]+|[\s"'`\u201c\u201d\u2018\u2019]+$/g, "")
    .trim();
}

function inferType(value, fallback = "Chef") {
  const type = titleCase(value || fallback);
  return TYPES.includes(type) ? type : "Chef";
}

function inferName(text, fallback) {
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

function splitBulk(text, defaultType) {
  const body = String(text || "").trim();
  if (!body) return [];
  return (
    splitMarkerBulk(body, defaultType) ||
    splitHeadingBulk(body, defaultType) ||
    [{ type: defaultType, name: null, content: body }]
  );
}

function previewEntries(text, defaultType) {
  return splitBulk(text, defaultType).map((entry, index) => {
    const type = inferType(entry.type, defaultType);
    const name = inferName(entry.content, entry.name);
    const warnings = [];
    if (entry.content.trim().length < 50) warnings.push("Under 50 characters; pipeline will skip very thin entries.");
    if (name === "Persona") warnings.push("Name was not detected.");
    return {
      index,
      type,
      name,
      content: entry.content.trim(),
      chars: entry.content.trim().length,
      warnings,
      excerpt: entry.content.trim().replace(/\s+/g, " ").slice(0, 180),
    };
  });
}

function readJsonFile(path, fallback) {
  if (!existsSync(path)) return fallback;
  try {
    return JSON.parse(readFileSync(path, "utf8").replace(/^\uFEFF/, ""));
  } catch {
    return fallback;
  }
}

function writeJsonFile(path, value) {
  mkdirSync(SYSTEM_DIR, { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function readInboxState() {
  const state = readJsonFile(INBOX_STATE_FILE, { entries: [] });
  if (!Array.isArray(state.entries)) state.entries = [];
  return state;
}

function saveInboxState(state) {
  state.updated_at = new Date().toISOString();
  writeJsonFile(INBOX_STATE_FILE, state);
}

function relativePath(path) {
  return relative(ROOT, path).replace(/\\/g, "/");
}

function uniquePath(type, name) {
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

function writePersona(entry, defaultType) {
  const type = inferType(entry.type, defaultType);
  const name = inferName(entry.content, entry.name);
  const { dir, path } = uniquePath(type, name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(path, `${entry.content.trim()}\n`, "utf8");

  const stem = basename(path, extname(path));
  return {
    id: randomUUID(),
    type,
    name,
    path,
    relativePath: relativePath(path),
    codexSlug: slugify(stem, 48),
    chars: entry.content.trim().length,
    preview: entry.content.trim().replace(/\s+/g, " ").slice(0, 180),
    status: "saved",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

function updateEntries(ids, patch) {
  if (!ids.length) return;
  const state = readInboxState();
  const idSet = new Set(ids);
  const updatedAt = new Date().toISOString();
  state.entries = state.entries.map((entry) =>
    idSet.has(entry.id) ? { ...entry, ...patch, updated_at: updatedAt } : entry,
  );
  saveInboxState(state);
}

function reconcileInboxState() {
  const state = readInboxState();
  // Read v2 pipeline state to check what has been processed
  const pipelineState = readJsonFile(
    join(SYSTEM_DIR, 'persona-pipeline-state.json'),
    { processed: [], failed: [] }
  );
  const processedSlugs = new Set(pipelineState.processed.map(p => p.slug));
  const failedFiles = new Set(pipelineState.failed.map(f => f.source_file));
  let changed = false;

  state.entries = state.entries.map((entry) => {
    const next = { ...entry };

    // Check if orchestrator has processed this persona
    if (processedSlugs.has(next.codexSlug) && !['completed'].includes(next.status)) {
      next.status = 'completed';
      next.last_error = null;
      changed = true;
    } else if (failedFiles.has(next.relativePath) && next.status !== 'failed') {
      next.status = 'failed';
      next.last_error = 'Pipeline analysis failed';
      changed = true;
    } else if (next.status === 'submitting' && !pipelineRunning) {
      next.status = 'queued';
      changed = true;
    }

    if (changed) next.updated_at = new Date().toISOString();
    return next;
  });

  if (changed) saveInboxState(state);
  return readInboxState();
}

function countDiskQueues() {
  let uncompleted = 0;
  for (const type of TYPES) {
    const dir = join(PERSONA_ROOT, type);
    if (!existsSync(dir)) continue;
    try {
      uncompleted += readdirSync(dir).filter((file) => /\.(txt|md)$/i.test(file)).length;
    } catch {}
  }

  // Count v2 build plan tasks instead of Codex specs
  let buildTasks = 0;
  const plansDir = join(ROOT, 'system', 'persona-build-plans');
  if (existsSync(plansDir)) {
    try {
      for (const slug of readdirSync(plansDir)) {
        const slugDir = join(plansDir, slug);
        try {
          buildTasks += readdirSync(slugDir).filter(f => f.startsWith('task-') && f.endsWith('.md')).length;
        } catch {}
      }
    } catch {}
  }

  return { uncompleted, buildTasks };
}

function readSynthesisData() {
  return readJsonFile(join(ROOT, "system", "persona-batch-synthesis", "saturation.json"), null);
}

function readPersonaReports() {
  const dir = join(ROOT, "docs", "stress-tests");
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.startsWith("persona-") && f.endsWith(".md"))
    .map((file) => {
      try {
        const content = readFileSync(join(dir, file), "utf8").replace(/\r\n/g, "\n");
        // Handle both formats: "Test: Name" and "Test — Name"
        const nameMatch = content.match(/^# Persona Stress Test[\s:\u2014\u2013-]+(.+)$/m);
        let name = nameMatch ? nameMatch[1].trim() : file;
        // If name looks like a slug (all lowercase with hyphens), humanize it
        if (name === name.toLowerCase() && name.includes("-")) {
          name = name.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
        }
        // Match "**Type:** Chef" or "## Type: Chef"
        const pType = (content.match(/^\*\*Type:\*\*\s*(.+)$/m) || content.match(/^## Type:\s*(.+)$/m) || [])[1] || "Chef";
        const date = (content.match(/^\*\*Date:\*\*\s*(.+)$/m) || [])[1] || "";
        // Format A: "## Score: 68/100"  Format B: "**68 / 100**"
        const scoreA = content.match(/## Score:\s*(\d+)\s*\/\s*100/);
        const scoreB = content.match(/\*\*(\d+)\s*\/\s*100\*\*/);
        const score = scoreA ? Number(scoreA[1]) : scoreB ? Number(scoreB[1]) : null;
        const summaryMatch = content.match(/## Summary\n([\s\S]*?)(?=\n## )/) || content.match(/## 1\) Persona Summary\n\n([\s\S]*?)(?=\n## )/);
        const summary = summaryMatch ? summaryMatch[1].trim().slice(0, 200) : "";
        const gaps = [];
        // Format A: "### Gap 1: Title\n**Severity:** HIGH"
        const gapReA = /### Gap (\d+):\s*(.+)\n\*\*Severity:\*\*\s*(\w+)\*{0,2}\n([\s\S]*?)(?=### Gap|\n## |$)/g;
        let m;
        while ((m = gapReA.exec(content)) !== null) {
          gaps.push({ number: Number(m[1]), title: m[2].trim(), severity: m[3].trim(), description: m[4].trim().slice(0, 200) });
        }
        // Format B: numbered list "1. **Title** ..." under "## Top 5 Gaps"
        if (gaps.length === 0) {
          const gapSection = content.match(/## (?:3\) )?Top 5 Gaps\n\n([\s\S]*?)(?=\n## )/);
          if (gapSection) {
            const gapReB = /(\d+)\.\s+\*\*(.+?)\*\*[^]*?(?=\n\d+\.\s+\*\*|$)/g;
            while ((m = gapReB.exec(gapSection[1])) !== null) {
              const desc = m[0].replace(/^\d+\.\s+\*\*.+?\*\*\s*/, "").trim();
              gaps.push({ number: Number(m[1]), title: m[2].trim(), severity: "HIGH", description: desc.slice(0, 200) });
            }
          }
        }
        const slug = file.replace(/^persona-/, "").replace(/-\d{4}-\d{2}-\d{2}\.md$/, "");
        return { slug, file, name, type: pType, date, score, summary, gaps };
      } catch {
        return null;
      }
    })
    .filter(Boolean)
    .sort((a, b) => (a.score ?? 0) - (b.score ?? 0));
}

function readBuildTaskFiles() {
  const dir = join(ROOT, "system", "persona-build-plans");
  if (!existsSync(dir)) return [];
  const tasks = [];
  try {
    for (const slug of readdirSync(dir)) {
      const slugDir = join(dir, slug);
      try {
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
  return tasks;
}

function appendPipelineLine(chunk) {
  const text = chunk.toString();
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length > 0) {
    lastPipelineStatus = lines.at(-1) || lastPipelineStatus;
    lastPipelineLines = [...lastPipelineLines, ...lines].slice(-20);
  }
  return text;
}

function runPipeline(limit, ids = []) {
  const requestedLimit = Math.max(1, Number(limit || 1));
  if (pipelineRunning) {
    pipelineQueued = true;
    queuedPipelineLimit += requestedLimit;
    queuedPipelineIds = [...new Set([...queuedPipelineIds, ...ids])];
    lastPipelineStatus = "Queued behind active pipeline run";
    return lastPipelineStatus;
  }

  pipelineRunning = true;
  pipelineStartedAt = Date.now();
  pipelineQueued = false;
  queuedPipelineLimit = 0;
  queuedPipelineIds = [];
  lastPipelineStatus = "Running local analysis pipeline";
  lastPipelineLines = [lastPipelineStatus];
  updateEntries(ids, { status: "submitting", last_error: null });

  const args = [
    "devtools/persona-orchestrator.mjs",
    "--once",
    "--max",
    String(requestedLimit),
  ];

  const child = spawn(process.execPath, args, {
    cwd: ROOT,
    detached: false,
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });

  child.stdout.on("data", (chunk) => {
    process.stdout.write(appendPipelineLine(chunk));
  });

  child.stderr.on("data", (chunk) => {
    process.stderr.write(appendPipelineLine(chunk));
  });

  child.on("exit", (code) => {
    pipelineRunning = false;
    pipelineStartedAt = null;
    lastPipelineStatus = code === 0 ? "Pipeline cycle completed" : `Pipeline exited ${code}`;
    lastPipelineLines = [...lastPipelineLines, lastPipelineStatus].slice(-20);
    reconcileInboxState();

    if (code !== 0 && ids.length) {
      updateEntries(ids, { status: "failed", last_error: lastPipelineStatus });
    }

    if (pipelineQueued) {
      const nextLimit = Math.max(1, queuedPipelineLimit || 1);
      const nextIds = queuedPipelineIds;
      pipelineQueued = false;
      queuedPipelineLimit = 0;
      queuedPipelineIds = [];
      runPipeline(nextLimit, nextIds);
    }
  });

  child.on("error", (err) => {
    pipelineRunning = false;
    pipelineStartedAt = null;
    lastPipelineStatus = `Pipeline failed: ${err.message}`;
    lastPipelineLines = [...lastPipelineLines, lastPipelineStatus].slice(-20);
    updateEntries(ids, { status: "failed", last_error: lastPipelineStatus });
  });

  return lastPipelineStatus;
}

function pendingEntryIds(statuses = ["saved", "queued", "failed", "spec_queued"]) {
  const state = reconcileInboxState();
  return state.entries.filter((entry) => statuses.includes(entry.status)).map((entry) => entry.id);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > MAX_BODY_BYTES) {
        reject(new Error("Request too large"));
        req.destroy();
      }
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function sendJson(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(data));
}

function getCookie(req, name) {
  const cookie = String(req.headers.cookie || "");
  for (const part of cookie.split(";")) {
    const [rawKey, ...rawValue] = part.trim().split("=");
    if (rawKey === name) return decodeURIComponent(rawValue.join("="));
  }
  return "";
}

function suppliedToken(req, url) {
  const header = String(req.headers.authorization || "");
  if (header.toLowerCase().startsWith("bearer ")) {
    return header.slice(7).trim();
  }

  return url.searchParams.get("token") || getCookie(req, "persona_inbox_token");
}

function isLoopbackRequest(req, url) {
  const host = String(url.hostname || "").toLowerCase();
  const remote = String(req.socket?.remoteAddress || "").toLowerCase();
  return (
    host === "127.0.0.1" ||
    host === "localhost" ||
    host === "::1" ||
    remote === "127.0.0.1" ||
    remote === "::1" ||
    remote === "::ffff:127.0.0.1"
  );
}

function requireAuth(req, res, url) {
  if (!authToken) return true;
  if (isLoopbackRequest(req, url)) return true;

  if (suppliedToken(req, url) === authToken) {
    res.setHeader(
      "Set-Cookie",
      `persona_inbox_token=${encodeURIComponent(authToken)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800`,
    );
    return true;
  }

  res.writeHead(401, {
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end("Unauthorized. Open the inbox with the tokenized URL from the public launcher.");
  return false;
}

function requestPath(req) {
  return new URL(req.url || "/", "http://127.0.0.1").pathname;
}

function page() {
  const typeOptions = TYPES.map((type) => `<option value="${type}">${type}</option>`).join("");
  const typesJson = JSON.stringify(TYPES);
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Persona Pipeline</title>
  <style>
    :root { color-scheme: light dark; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    body { margin: 0; background: #f6f4ee; color: #1f2933; }
    main { max-width: 1180px; margin: 0 auto; padding: 28px 20px 44px; }
    h1 { margin: 0; font-size: 28px; line-height: 1.1; }
    h2 { margin: 0 0 10px; font-size: 16px; }
    button, select, input { height: 38px; border: 1px solid #b8b2a7; border-radius: 6px; background: #fffaf0; color: #1f2933; padding: 0 10px; font: inherit; }
    button { cursor: pointer; background: #1f2933; color: white; border-color: #1f2933; }
    button.secondary { background: #fffaf0; color: #1f2933; }
    button:disabled { opacity: 0.55; cursor: not-allowed; }
    textarea { width: 100%; min-height: 220px; box-sizing: border-box; resize: vertical; border: 1px solid #b8b2a7; border-radius: 8px; background: #fffdf8; color: #111827; padding: 14px; font: 14px/1.45 ui-monospace, SFMono-Regular, Consolas, monospace; }
    .top { display: flex; justify-content: space-between; gap: 14px; align-items: flex-start; margin-bottom: 16px; }
    .sub { margin: 6px 0 0; color: #4b5563; font-size: 14px; line-height: 1.45; }
    .bar { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin: 0 0 14px; }
    .layout { display: grid; grid-template-columns: minmax(0, 1.15fr) minmax(360px, 0.85fr); gap: 18px; align-items: start; }
    .panel { border: 1px solid #d4cec2; background: rgba(255, 253, 248, 0.78); border-radius: 8px; padding: 14px; }
    .status { min-height: 24px; font-size: 14px; color: #374151; }
    .pill { display: inline-flex; align-items: center; gap: 6px; height: 24px; border: 1px solid #c7c0b4; border-radius: 999px; padding: 0 9px; font-size: 12px; background: #fffdf8; }
    .dot { width: 8px; height: 8px; border-radius: 999px; background: #10b981; }
    .dot.offline { background: #b45309; }
    .preview-list, .history-list { display: grid; gap: 8px; }
    .preview-item, .history-item { border: 1px solid #d4cec2; border-radius: 8px; background: #fffdf8; padding: 10px; }
    .preview-head, .history-head { display: flex; gap: 8px; align-items: center; justify-content: space-between; }
    .preview-controls { display: grid; grid-template-columns: 120px minmax(0, 1fr); gap: 8px; margin-top: 8px; }
    .preview-controls input { width: 100%; box-sizing: border-box; }
    .muted { color: #6b7280; font-size: 12px; }
    .warn { color: #92400e; font-size: 12px; margin-top: 6px; }
    .status-badge { border-radius: 999px; padding: 3px 8px; font-size: 12px; background: #e5e7eb; color: #1f2937; white-space: nowrap; }
    .status-submitted, .status-completed { background: #d1fae5; color: #065f46; }
    .status-failed { background: #fee2e2; color: #991b1b; }
    .status-submitting { background: #dbeafe; color: #1e40af; }
    .status-spec_queued, .status-queued, .status-saved { background: #fef3c7; color: #92400e; }
    code { background: rgba(31, 41, 51, 0.08); padding: 1px 4px; border-radius: 4px; }
    pre { margin: 0; white-space: pre-wrap; font: 12px/1.45 ui-monospace, SFMono-Regular, Consolas, monospace; color: #374151; }
    .empty { color: #6b7280; font-size: 13px; padding: 10px 0; }
    .section { margin-top: 18px; }
    @keyframes pulse-glow { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
    .pipeline-monitor { transition: border-color 0.3s; }
    .pipeline-monitor.active { border-color: #3b82f6; }
    .pipeline-head { display: flex; justify-content: space-between; align-items: center; }
    .pipeline-log { max-height: 280px; overflow-y: auto; margin-top: 10px; transition: max-height 0.3s ease, margin 0.3s ease, opacity 0.3s ease; }
    .pipeline-log.collapsed { max-height: 0; overflow: hidden; margin-top: 0; opacity: 0; }
    .indicator { display: inline-block; width: 10px; height: 10px; border-radius: 999px; background: #6b7280; margin-right: 6px; vertical-align: middle; }
    .indicator.pulse { animation: pulse-glow 1.5s ease-in-out infinite; background: #3b82f6; }
    .stats-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-bottom: 14px; }
    .stat-card { text-align: center; padding: 14px 10px; }
    .stat-value { font-size: 32px; font-weight: 700; line-height: 1; }
    .stat-label { font-size: 12px; color: #6b7280; margin-top: 4px; }
    .score { font-weight: 700; }
    .score-red { color: #dc2626; }
    .score-yellow { color: #d97706; }
    .score-green { color: #059669; }
    .sev-high { background: #fee2e2; color: #991b1b; }
    .sev-medium { background: #fef3c7; color: #92400e; }
    .sev-low { background: #d1fae5; color: #065f46; }
    .bar-chart { display: flex; gap: 4px; align-items: flex-end; height: 48px; }
    .bar-col { display: flex; flex-direction: column; align-items: center; gap: 2px; flex: 1; }
    .bar-fill { width: 100%; border-radius: 3px 3px 0 0; background: #374151; min-height: 2px; }
    .bar-label { font-size: 10px; color: #6b7280; white-space: nowrap; }
    .meter { height: 10px; background: #e5e7eb; border-radius: 5px; overflow: hidden; }
    .meter-fill { height: 100%; background: #059669; border-radius: 5px; }
    .cat-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .cat-table th { text-align: left; padding: 6px 8px; border-bottom: 2px solid #d4cec2; font-weight: 600; font-size: 12px; color: #6b7280; }
    .cat-table td { padding: 6px 8px; border-bottom: 1px solid #e5e7eb; }
    .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px; }
    .gallery { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 12px; }
    .persona-card { border: 1px solid #d4cec2; border-radius: 8px; background: #fffdf8; padding: 12px; cursor: pointer; }
    .persona-card:hover { border-color: #9ca3af; }
    .card-head { display: flex; justify-content: space-between; align-items: center; }
    .card-detail { display: none; margin-top: 10px; padding-top: 10px; border-top: 1px solid #e5e7eb; }
    .persona-card.open .card-detail { display: block; }
    .task-row { display: flex; gap: 10px; align-items: center; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
    .task-row:last-child { border-bottom: none; }
    @media (max-width: 920px) { .layout { grid-template-columns: 1fr; } .two-col { grid-template-columns: 1fr; } .stats-row { grid-template-columns: 1fr; } }
    @media (prefers-color-scheme: dark) {
      body { background: #121416; color: #f4f1e8; }
      button.secondary, select, input, textarea, .panel, .preview-item, .history-item, .pill { background: #1f2429; color: #f4f1e8; border-color: #59616b; }
      button { background: #f4f1e8; color: #121416; border-color: #f4f1e8; }
      .sub, .status, .muted, pre, .empty, .stat-label, .bar-label { color: #c6c0b7; }
      code { background: rgba(244, 241, 232, 0.12); }
      .status-badge { background: #374151; color: #f9fafb; }
      .score-red { color: #ef4444; }
      .score-yellow { color: #f59e0b; }
      .score-green { color: #10b981; }
      .sev-high { background: #7f1d1d; color: #fecaca; }
      .sev-medium { background: #78350f; color: #fde68a; }
      .sev-low { background: #064e3b; color: #a7f3d0; }
      .meter { background: #374151; }
      .bar-fill { background: #9ca3af; }
      .cat-table th { border-bottom-color: #59616b; color: #9ca3af; }
      .cat-table td { border-bottom-color: #374151; }
      .persona-card { background: #1f2429; border-color: #59616b; }
      .persona-card:hover { border-color: #9ca3af; }
      .card-detail { border-top-color: #374151; }
      .task-row { border-bottom-color: #374151; }
      .pipeline-monitor.active { border-color: #60a5fa; }
      .indicator.pulse { background: #60a5fa; }
    }
  </style>
</head>
<body>
  <main>
    <div class="top">
      <div>
        <h1>Persona Pipeline</h1>
        <p class="sub">Analyze personas against the codebase. Track findings, scores, and build priorities.</p>
      </div>
      <span class="pill"><span id="netDot" class="dot"></span><span id="netText">Checking</span></span>
    </div>

    <section id="pipelineSection" class="panel pipeline-monitor">
      <div class="pipeline-head">
        <h2><span id="pipelineDot" class="indicator"></span>Pipeline<span id="pipelineTimer" class="muted" style="margin-left:8px"></span></h2>
        <button id="toggleLog" class="secondary" style="height:28px;font-size:12px">Expand</button>
      </div>
      <div id="pipelineLog" class="pipeline-log collapsed"><pre id="log">Idle</pre></div>
    </section>

    <div class="layout section">
      <section>
        <div class="bar">
          <label>Default type <select id="type">${typeOptions}</select></label>
          <label>Import mode
            <select id="mode">
              <option value="save-only">Save only</option>
              <option value="save-send">Save and analyze</option>
            </select>
          </label>
          <button id="paste" class="secondary">Paste Clipboard</button>
          <button id="previewBtn" class="secondary">Preview</button>
          <button id="importBtn">Import</button>
          <button id="clear" class="secondary">Clear</button>
        </div>
        <textarea id="text" spellcheck="false" placeholder="Paste personas here..."></textarea>
        <p class="sub">Bulk markers: <code>--- persona: Chef: Name ---</code>. Simple headings also work: <code>Client: Name</code>.</p>
      </section>
      <aside class="panel">
        <h2>Preview</h2>
        <div id="preview" class="preview-list"><div class="empty">Preview a paste before importing.</div></div>
      </aside>
    </div>

    <section class="panel section">
      <h2>Findings</h2>
      <div id="findings"><div class="empty">No synthesis data yet. Run the pipeline to generate findings.</div></div>
    </section>

    <section class="panel section">
      <h2>Personas</h2>
      <div id="personas"><div class="empty">No persona reports found.</div></div>
    </section>

    <section class="panel section">
      <h2>Build Queue</h2>
      <div id="buildQueue"><div class="empty">No build tasks found.</div></div>
    </section>

    <section class="panel section">
      <div class="preview-head">
        <h2>Import Queue</h2>
        <div class="bar" style="margin:0">
          <button id="sendQueued">Send queued</button>
          <button id="retryFailed" class="secondary">Retry failed</button>
          <button id="refresh" class="secondary">Refresh</button>
        </div>
      </div>
      <div id="status" class="status"></div>
      <div id="history" class="history-list"></div>
    </section>
  </main>

  <script>
    const TYPES = ${typesJson};
    const $ = id => document.getElementById(id);
    const text = $('text'), statusEl = $('status'), type = $('type'), mode = $('mode');
    const previewEl = $('preview'), historyEl = $('history'), logEl = $('log');
    const netDot = $('netDot'), netText = $('netText');
    const findingsEl = $('findings'), personasEl = $('personas'), buildQueueEl = $('buildQueue');
    const pipelineSection = $('pipelineSection'), pipelineLog = $('pipelineLog');
    const pipelineDot = $('pipelineDot'), pipelineTimer = $('pipelineTimer');
    const toggleLogBtn = $('toggleLog');
    let currentPreview = [], previewText = '', wasRunning = false, logUserToggled = false;

    function setNetwork() {
      const online = navigator.onLine;
      netDot.classList.toggle('offline', !online);
      netText.textContent = online ? 'Online' : 'Offline';
    }

    function esc(v) {
      return String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
    }

    function statusLabel(v) {
      return ({ saved:'Saved', queued:'Queued', submitting:'Submitting', spec_queued:'Analyzed', submitted:'Completed', completed:'Completed', failed:'Failed' })[v] || v || '?';
    }

    function scoreClass(s) { return s < 40 ? 'score-red' : s < 70 ? 'score-yellow' : 'score-green'; }
    function sevClass(s) { return s === 'HIGH' ? 'sev-high' : s === 'MEDIUM' ? 'sev-medium' : 'sev-low'; }
    function catLabel(s) { return s.replace(/-/g, ' ').replace(/\\b\\w/g, c => c.toUpperCase()); }

    async function postJson(url, body = {}) {
      const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Request failed');
      return d;
    }

    async function buildPreview() {
      previewText = text.value;
      const result = await postJson('/preview', { text: text.value, defaultType: type.value });
      currentPreview = result.entries;
      renderPreview();
      return result.entries;
    }

    function renderPreview() {
      if (!currentPreview.length) { previewEl.innerHTML = '<div class="empty">No entries found.</div>'; return; }
      previewEl.innerHTML = currentPreview.map((entry, i) => {
        const opts = TYPES.map(t => '<option value="' + t + '"' + (t === entry.type ? ' selected' : '') + '>' + t + '</option>').join('');
        const warns = entry.warnings?.length ? '<div class="warn">' + entry.warnings.map(esc).join('<br>') + '</div>' : '';
        return '<div class="preview-item" data-index="' + i + '"><div class="preview-head"><strong>#' + (i+1) + ' ' + esc(entry.name) + '</strong><span class="muted">' + entry.chars + ' chars</span></div><div class="preview-controls"><select data-field="type">' + opts + '</select><input data-field="name" value="' + esc(entry.name) + '"></div><div class="muted" style="margin-top:8px">' + esc(entry.excerpt) + '</div>' + warns + '</div>';
      }).join('');
    }

    previewEl.addEventListener('input', e => {
      const item = e.target.closest('.preview-item');
      if (!item) return;
      const i = Number(item.dataset.index), f = e.target.dataset.field;
      if (currentPreview[i] && f) currentPreview[i][f] = e.target.value;
    });
    previewEl.addEventListener('change', e => {
      const item = e.target.closest('.preview-item');
      if (!item) return;
      const i = Number(item.dataset.index), f = e.target.dataset.field;
      if (currentPreview[i] && f) currentPreview[i][f] = e.target.value;
    });

    /* --- Pipeline Monitor --- */
    function updatePipeline(pl) {
      const running = pl?.running || false;
      const lines = pl?.lines || [];
      pipelineSection.classList.toggle('active', running);
      pipelineDot.classList.toggle('pulse', running);
      logEl.textContent = lines.length ? lines.join('\\n') : 'Idle';
      if (running && !wasRunning && !logUserToggled) { pipelineLog.classList.remove('collapsed'); toggleLogBtn.textContent = 'Collapse'; }
      else if (!running && wasRunning && !logUserToggled) { pipelineLog.classList.add('collapsed'); toggleLogBtn.textContent = 'Expand'; }
      wasRunning = running;
      if (running && pl?.startedAt) {
        const s = Math.floor((Date.now() - pl.startedAt) / 1000);
        pipelineTimer.textContent = s >= 60 ? Math.floor(s/60) + 'm ' + (s%60) + 's' : s + 's';
      } else { pipelineTimer.textContent = ''; }
      if (running) pipelineLog.scrollTop = pipelineLog.scrollHeight;
    }
    toggleLogBtn.onclick = () => { logUserToggled = true; const c = pipelineLog.classList.toggle('collapsed'); toggleLogBtn.textContent = c ? 'Expand' : 'Collapse'; };

    /* --- Findings Dashboard --- */
    function renderFindings(data) {
      if (!data || data.error) { findingsEl.innerHTML = '<div class="empty">No synthesis data yet. Run the pipeline to generate findings.</div>'; return; }
      const avg = data.average_score || 0, total = data.total_personas || 0;
      const sat = data.saturation || {}, disc = sat.categories_discovered || 0, catTotal = sat.categories_total || 20;
      const zeroNew = sat.consecutive_zero_new || 0, isSat = sat.saturated || false;
      const dist = data.score_distribution || {};
      const ranking = (data.priority_ranking || []).filter(p => p.count > 0);
      const distKeys = ['0-20','21-40','41-60','61-80','81-100'];
      const maxD = Math.max(1, ...distKeys.map(k => dist[k] || 0));
      const bars = distKeys.map(k => {
        const v = dist[k]||0;
        return '<div class="bar-col"><div class="bar-fill" style="height:'+((v/maxD)*100)+'%"></div><div class="bar-label">'+v+'</div><div class="bar-label">'+k+'</div></div>';
      }).join('');
      const satPct = Math.round((disc/catTotal)*100);
      const never = (sat.categories_never_seen||[]).map(c => c.replace(/-/g,' ')).join(', ');
      const rows = ranking.map((cat,i) =>
        '<tr><td>'+(i+1)+'</td><td>'+esc(catLabel(cat.category))+'</td><td>'+cat.count+'</td>' +
        '<td><span class="status-badge '+sevClass(cat.avg_severity)+'">'+cat.avg_severity+'</span></td>' +
        '<td>'+cat.priority_score+'</td></tr>'
      ).join('');
      findingsEl.innerHTML =
        '<div class="stats-row">' +
          '<div class="stat-card panel"><div class="stat-value '+scoreClass(avg)+'">'+avg+'</div><div class="stat-label">Avg Score / 100</div></div>' +
          '<div class="stat-card panel"><div class="stat-value">'+total+'</div><div class="stat-label">Personas Analyzed</div></div>' +
          '<div class="stat-card panel"><div class="stat-value">'+disc+'<span style="font-size:16px;font-weight:400;opacity:0.5">/'+catTotal+'</span></div><div class="stat-label">Categories Discovered</div></div>' +
        '</div>' +
        '<div class="two-col">' +
          '<div><div class="muted" style="margin-bottom:6px">Score Distribution</div><div class="bar-chart">'+bars+'</div></div>' +
          '<div><div class="muted" style="margin-bottom:6px">Saturation '+disc+'/'+catTotal+' ('+satPct+'%)</div>' +
            '<div class="meter"><div class="meter-fill" style="width:'+satPct+'%"></div></div>' +
            (never ? '<div class="muted" style="margin-top:6px;font-size:11px">Undiscovered: '+esc(never)+'</div>' : '') +
            '<div class="muted" style="margin-top:4px;font-size:11px">Consecutive zero-new: '+zeroNew+(isSat?' (saturated)':'')+'</div>' +
          '</div>' +
        '</div>' +
        (rows ? '<div class="muted" style="margin-bottom:4px">Priority Categories</div><table class="cat-table"><thead><tr><th>#</th><th>Category</th><th>Personas</th><th>Severity</th><th>Score</th></tr></thead><tbody>'+rows+'</tbody></table>' : '');
    }

    /* --- Persona Gallery --- */
    function renderPersonas(list) {
      if (!list || !list.length) { personasEl.innerHTML = '<div class="empty">No persona reports found.</div>'; return; }
      personasEl.innerHTML = '<div class="gallery">' + list.map(p => {
        const sc = scoreClass(p.score ?? 0);
        const gaps = (p.gaps||[]).slice(0,5).map(g =>
          '<div style="padding:4px 0;font-size:12px"><span class="status-badge '+sevClass(g.severity)+'" style="font-size:10px">'+g.severity+'</span> '+esc(g.title)+'</div>'
        ).join('');
        return '<div class="persona-card" onclick="this.classList.toggle(\\\'open\\\')">' +
          '<div class="card-head"><div><strong>'+esc(p.name)+'</strong><div class="muted">'+esc(p.type)+(p.date?' &middot; '+esc(p.date):'')+'</div></div>' +
          '<span class="score '+sc+'" style="font-size:20px">'+(p.score??'?')+'</span></div>' +
          '<div class="card-detail">'+(p.summary?'<div style="font-size:12px;margin-bottom:8px;color:#4b5563">'+esc(p.summary)+'</div>':'')+(gaps||'<div class="muted">No gaps.</div>')+'</div></div>';
      }).join('') + '</div>';
    }

    /* --- Build Queue --- */
    function renderBuildTasks(tasks) {
      if (!tasks || !tasks.length) { buildQueueEl.innerHTML = '<div class="empty">No build tasks found.</div>'; return; }
      buildQueueEl.innerHTML = tasks.map(t =>
        '<div class="task-row"><div style="flex:1"><strong style="font-size:13px">'+esc(t.title)+'</strong><div class="muted">'+esc(t.persona)+'</div></div>' +
        '<span class="status-badge '+sevClass(t.severity)+'">'+t.severity+'</span></div>'
      ).join('');
    }

    /* --- Import Queue --- */
    function renderHistory(entries) {
      if (!entries.length) { historyEl.innerHTML = '<div class="empty">No imported entries yet.</div>'; return; }
      historyEl.innerHTML = entries.slice(0, 80).map(entry => {
        const err = entry.last_error ? '<div class="warn">'+esc(entry.last_error)+'</div>' : '';
        return '<div class="history-item"><div class="history-head"><strong>'+esc(entry.name)+'</strong>' +
          '<span class="status-badge status-'+esc(entry.status)+'">'+statusLabel(entry.status)+'</span></div>' +
          '<div class="muted">'+esc(entry.type)+' | '+esc(entry.relativePath||entry.codexSlug||'')+'</div>' +
          '<div class="muted">'+esc(entry.preview||'')+'</div>'+err+'</div>';
      }).join('');
    }

    /* --- State Refresh --- */
    async function refreshState(options = {}) {
      const [stateRes, synthData, personaList, taskList] = await Promise.all([
        fetch('/state').then(r => r.json()),
        fetch('/api/synthesis').then(r => r.json()).catch(() => null),
        fetch('/api/personas').then(r => r.json()).catch(() => []),
        fetch('/api/build-tasks').then(r => r.json()).catch(() => []),
      ]);
      const counts = stateRes.counts || {};
      const summary = (stateRes.pipeline?.pipeline||'Idle') + ' | files: '+(counts.uncompleted||0)+' | tasks: '+(counts.buildTasks||0);
      if (!options.preserveStatus) statusEl.textContent = summary;
      updatePipeline(stateRes.pipeline);
      renderHistory(stateRes.entries || []);
      renderFindings(synthData);
      renderPersonas(personaList);
      renderBuildTasks(taskList);
      return { result: stateRes, summary };
    }

    /* --- Event Handlers --- */
    $('paste').onclick = async () => {
      try { text.value = await navigator.clipboard.readText(); statusEl.textContent = 'Clipboard pasted.'; await buildPreview(); }
      catch { statusEl.textContent = 'Browser blocked clipboard. Use Ctrl+V.'; }
    };
    $('previewBtn').onclick = async () => { try { await buildPreview(); } catch(e) { statusEl.textContent = e.message; } };
    $('importBtn').onclick = async () => {
      try {
        let entries = currentPreview;
        if (!entries.length || previewText !== text.value) entries = await buildPreview();
        const result = await postJson('/import', { text: text.value, defaultType: type.value, mode: mode.value, entries });
        text.value = ''; currentPreview = []; renderPreview();
        const refreshed = await refreshState({ preserveStatus: true });
        statusEl.textContent = 'Imported ' + result.created.length + ' file(s). ' + result.pipeline + '. ' + refreshed.summary;
      } catch(e) { statusEl.textContent = e.message; }
    };
    $('clear').onclick = () => { text.value = ''; currentPreview = []; previewText = ''; renderPreview(); text.focus(); };
    $('sendQueued').onclick = async () => { try { const r = await postJson('/send-queued', {}); statusEl.textContent = r.pipeline; await refreshState(); } catch(e) { statusEl.textContent = e.message; } };
    $('retryFailed').onclick = async () => { try { const r = await postJson('/retry-failed', {}); statusEl.textContent = r.pipeline; await refreshState(); } catch(e) { statusEl.textContent = e.message; } };
    $('refresh').onclick = refreshState;
    window.addEventListener('online', setNetwork);
    window.addEventListener('offline', setNetwork);
    setNetwork();
    refreshState();
    setInterval(refreshState, 3500);
  </script>
</body>
</html>`;
}

function parseArgs(argv) {
  const index = argv.indexOf("--port");
  const hostIndex = argv.indexOf("--host");

  return {
    port: index >= 0 ? Math.max(1024, Number(argv[index + 1] || DEFAULT_PORT)) : DEFAULT_PORT,
    host: hostIndex >= 0 ? String(argv[hostIndex + 1] || DEFAULT_HOST) : String(process.env.HOST || DEFAULT_HOST),
  };
}

const { port, host } = parseArgs(process.argv.slice(2));

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host || "127.0.0.1"}`);
    if (!requireAuth(req, res, url)) {
      return;
    }

    const path = url.pathname;

    if (req.method === "GET" && path === "/") {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
      res.end(page());
      return;
    }

    if (req.method === "GET" && path === "/state") {
      const state = reconcileInboxState();
      sendJson(res, 200, {
        entries: state.entries.slice().sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))),
        counts: countDiskQueues(),
        pipeline: {
          running: pipelineRunning,
          queued: pipelineQueued,
          pipeline: lastPipelineStatus,
          lines: lastPipelineLines,
          startedAt: pipelineStartedAt,
        },
      });
      return;
    }

    if (req.method === "POST" && path === "/preview") {
      const body = await readBody(req);
      const payload = JSON.parse(body || "{}");
      const text = String(payload.text || "").trim();
      const defaultType = inferType(payload.defaultType, "Chef");
      sendJson(res, 200, { entries: previewEntries(text, defaultType) });
      return;
    }

    if (req.method === "POST" && path === "/import") {
      const body = await readBody(req);
      const payload = JSON.parse(body || "{}");
      const defaultType = inferType(payload.defaultType, "Chef");
      const mode = payload.mode === "save-only" ? "save-only" : "save-send";
      const rawEntries = Array.isArray(payload.entries) && payload.entries.length
        ? payload.entries
        : splitBulk(String(payload.text || ""), defaultType);

      const entries = rawEntries
        .map((entry) => ({
          type: inferType(entry.type, defaultType),
          name: stripQuotes(entry.name || ""),
          content: String(entry.content || "").trim(),
        }))
        .filter((entry) => entry.content.length > 0);

      if (entries.length === 0) {
        sendJson(res, 400, { error: "Paste at least one persona first." });
        return;
      }

      const created = entries.map((entry) => writePersona(entry, defaultType));
      const state = readInboxState();
      state.entries = [...created, ...state.entries];
      saveInboxState(state);

      let pipeline = "Saved locally";
      if (mode === "save-send") {
        const ids = created.map((entry) => entry.id);
        updateEntries(ids, { status: "queued" });
        pipeline = runPipeline(created.length, ids);
      }

      sendJson(res, 200, { created, pipeline });
      return;
    }

    if (req.method === "POST" && path === "/send-queued") {
      const ids = pendingEntryIds(["saved", "queued", "failed", "spec_queued"]);
      const counts = countDiskQueues();
      const pending = ids.length + counts.buildTasks;
      if (pending === 0) {
        lastPipelineStatus = "Nothing queued";
        lastPipelineLines = [lastPipelineStatus];
        sendJson(res, 200, { pipeline: lastPipelineStatus, count: 0 });
        return;
      }
      const pipeline = runPipeline(pending, ids);
      sendJson(res, 200, { pipeline, count: ids.length });
      return;
    }

    if (req.method === "POST" && path === "/retry-failed") {
      const ids = pendingEntryIds(["failed", "spec_queued"]);
      const counts = countDiskQueues();
      const pending = ids.length + counts.buildTasks;
      if (pending === 0) {
        lastPipelineStatus = "Nothing queued";
        lastPipelineLines = [lastPipelineStatus];
        sendJson(res, 200, { pipeline: lastPipelineStatus, count: 0 });
        return;
      }
      const pipeline = runPipeline(pending, ids);
      sendJson(res, 200, { pipeline, count: ids.length });
      return;
    }

    if (req.method === "GET" && path === "/status") {
      sendJson(res, 200, {
        running: pipelineRunning,
        queued: pipelineQueued,
        pipeline: lastPipelineStatus,
        lines: lastPipelineLines,
      });
      return;
    }

    if (req.method === "GET" && path === "/api/synthesis") {
      sendJson(res, 200, readSynthesisData() || { error: "No synthesis data" });
      return;
    }

    if (req.method === "GET" && path === "/api/personas") {
      sendJson(res, 200, readPersonaReports());
      return;
    }

    if (req.method === "GET" && path === "/api/build-tasks") {
      sendJson(res, 200, readBuildTaskFiles());
      return;
    }

    sendJson(res, 404, { error: "Not found" });
  } catch (err) {
    sendJson(res, 500, { error: err.message || "Import failed" });
  }
});

server.listen(port, host, () => {
  mkdirSync(SYSTEM_DIR, { recursive: true });
  const displayHost = host === "0.0.0.0" ? "127.0.0.1" : host;
  console.log(`[persona-inbox] http://${displayHost}:${port}`);
  if (authToken) {
    console.log("[persona-inbox] token auth enabled");
  }
});
