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
    .replace(/^[\s"'`""'']+|[\s"'`""'']+$/g, "")
    .trim();
}

function inferType(value, fallback = "Chef") {
  const type = titleCase(value || fallback);
  return TYPES.includes(type) ? type : "Chef";
}

function inferName(text, fallback) {
  if (fallback) return stripQuotes(fallback);

  const patterns = [
    /\*\*(?:chef|client|guest|vendor|staff|partner|public)?\s*profile:\s*[""]?([^""\n-]+)[""]?/i,
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
  <title>Persona Inbox</title>
  <style>
    :root { color-scheme: light dark; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    body { margin: 0; background: #f6f4ee; color: #1f2933; }
    main { max-width: 1180px; margin: 0 auto; padding: 28px 20px 44px; }
    h1 { margin: 0; font-size: 28px; line-height: 1.1; }
    h2 { margin: 0 0 10px; font-size: 16px; }
    button, select, input { height: 38px; border: 1px solid #b8b2a7; border-radius: 6px; background: #fffaf0; color: #1f2933; padding: 0 10px; font: inherit; }
    button { cursor: pointer; background: #1f2933; color: white; border-color: #1f2933; }
    button.secondary { background: #fffaf0; color: #1f2933; }
    button.danger { background: #7f1d1d; border-color: #7f1d1d; }
    button:disabled { opacity: 0.55; cursor: not-allowed; }
    textarea { width: 100%; min-height: 46vh; box-sizing: border-box; resize: vertical; border: 1px solid #b8b2a7; border-radius: 8px; background: #fffdf8; color: #111827; padding: 14px; font: 14px/1.45 ui-monospace, SFMono-Regular, Consolas, monospace; }
    .top { display: flex; justify-content: space-between; gap: 14px; align-items: flex-start; margin-bottom: 16px; }
    .sub { margin: 6px 0 0; color: #4b5563; font-size: 14px; line-height: 1.45; }
    .bar { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin: 0 0 14px; }
    .layout { display: grid; grid-template-columns: minmax(0, 1.15fr) minmax(360px, 0.85fr); gap: 18px; align-items: start; }
    .panel { border: 1px solid #d4cec2; background: rgba(255, 253, 248, 0.78); border-radius: 8px; padding: 14px; }
    .status { min-height: 24px; font-size: 14px; color: #374151; }
    .pill { display: inline-flex; align-items: center; gap: 6px; height: 24px; border: 1px solid #c7c0b4; border-radius: 999px; padding: 0 9px; font-size: 12px; background: #fffdf8; }
    .dot { width: 8px; height: 8px; border-radius: 999px; background: #10b981; }
    .dot.offline { background: #b45309; }
    .preview-list, .history-list, .log-list { display: grid; gap: 8px; }
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
    @media (max-width: 920px) { .layout { grid-template-columns: 1fr; } }
    @media (prefers-color-scheme: dark) {
      body { background: #121416; color: #f4f1e8; }
      button.secondary, select, input, textarea, .panel, .preview-item, .history-item, .pill { background: #1f2429; color: #f4f1e8; border-color: #59616b; }
      button { background: #f4f1e8; color: #121416; border-color: #f4f1e8; }
      .sub, .status, .muted, pre, .empty { color: #c6c0b7; }
      code { background: rgba(244, 241, 232, 0.12); }
      .status-badge { background: #374151; color: #f9fafb; }
    }
  </style>
</head>
<body>
  <main>
    <div class="top">
      <div>
        <h1>Persona Inbox</h1>
        <p class="sub">Paste one entry or a batch. Paste personas to analyze locally via Ollama. Save writes files; Send runs the analysis pipeline.</p>
      </div>
      <span class="pill"><span id="netDot" class="dot"></span><span id="netText">Checking network</span></span>
    </div>

    <div class="layout">
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

    <section class="panel" style="margin-top:18px">
      <div class="preview-head">
        <h2>Queue</h2>
        <div class="bar" style="margin:0">
          <button id="sendQueued">Send queued</button>
          <button id="retryFailed" class="secondary">Retry failed</button>
          <button id="refresh" class="secondary">Refresh</button>
          <button id="clearCompleted" class="secondary">Clear completed</button>
        </div>
      </div>
      <div id="status" class="status"></div>
      <div id="history" class="history-list"></div>
    </section>

    <section class="panel" style="margin-top:18px">
      <h2>Pipeline Log</h2>
      <pre id="log">Idle</pre>
    </section>
  </main>

  <script>
    const TYPES = ${typesJson};
    const text = document.getElementById('text');
    const statusEl = document.getElementById('status');
    const type = document.getElementById('type');
    const mode = document.getElementById('mode');
    const previewEl = document.getElementById('preview');
    const historyEl = document.getElementById('history');
    const logEl = document.getElementById('log');
    const netDot = document.getElementById('netDot');
    const netText = document.getElementById('netText');
    let currentPreview = [];
    let previewText = '';

    function setNetwork() {
      const online = navigator.onLine;
      netDot.classList.toggle('offline', !online);
      netText.textContent = online ? 'Browser online' : 'Browser offline';
    }

    function escapeHtml(value) {
      return String(value ?? '').replace(/[&<>"']/g, (ch) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
      })[ch]);
    }

    function statusLabel(value) {
      return ({
        saved: 'Saved',
        queued: 'Queued',
        submitting: 'Submitting',
        spec_queued: 'Analyzed',
        submitted: 'Completed',
        completed: 'Completed',
        failed: 'Failed',
      })[value] || value || 'Unknown';
    }

    async function postJson(url, payload = {}) {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Request failed');
      return result;
    }

    async function buildPreview() {
      previewText = text.value;
      const result = await postJson('/preview', { text: text.value, defaultType: type.value });
      currentPreview = result.entries;
      renderPreview();
      return result.entries;
    }

    function renderPreview() {
      if (!currentPreview.length) {
        previewEl.innerHTML = '<div class="empty">No entries found.</div>';
        return;
      }

      previewEl.innerHTML = currentPreview.map((entry, index) => {
        const typeOptions = TYPES.map((t) => '<option value="' + t + '"' + (t === entry.type ? ' selected' : '') + '>' + t + '</option>').join('');
        const warnings = entry.warnings?.length ? '<div class="warn">' + entry.warnings.map(escapeHtml).join('<br>') + '</div>' : '';
        return '<div class="preview-item" data-index="' + index + '">' +
          '<div class="preview-head"><strong>#' + (index + 1) + ' ' + escapeHtml(entry.name) + '</strong><span class="muted">' + entry.chars + ' chars</span></div>' +
          '<div class="preview-controls"><select data-field="type">' + typeOptions + '</select><input data-field="name" value="' + escapeHtml(entry.name) + '"></div>' +
          '<div class="muted" style="margin-top:8px">' + escapeHtml(entry.excerpt) + '</div>' +
          warnings +
        '</div>';
      }).join('');
    }

    previewEl.addEventListener('input', (event) => {
      const item = event.target.closest('.preview-item');
      if (!item) return;
      const index = Number(item.dataset.index);
      const field = event.target.dataset.field;
      if (currentPreview[index] && field) currentPreview[index][field] = event.target.value;
    });

    previewEl.addEventListener('change', (event) => {
      const item = event.target.closest('.preview-item');
      if (!item) return;
      const index = Number(item.dataset.index);
      const field = event.target.dataset.field;
      if (currentPreview[index] && field) currentPreview[index][field] = event.target.value;
    });

    async function refreshState(options = {}) {
      const response = await fetch('/state');
      const result = await response.json();
      const counts = result.counts || {};
      const summary = (result.pipeline?.pipeline || 'Idle') +
        ' | local files: ' + (counts.uncompleted || 0) +
        ' | build tasks: ' + (counts.buildTasks || 0);
      if (!options.preserveStatus) statusEl.textContent = summary;
      logEl.textContent = result.pipeline?.lines?.length ? result.pipeline.lines.join('\\n') : 'Idle';
      renderHistory(result.entries || []);
      return { result, summary };
    }

    function renderHistory(entries) {
      if (!entries.length) {
        historyEl.innerHTML = '<div class="empty">No imported entries yet.</div>';
        return;
      }

      historyEl.innerHTML = entries.slice(0, 80).map((entry) => {
        const lastError = entry.last_error ? '<div class="warn">' + escapeHtml(entry.last_error) + '</div>' : '';
        return '<div class="history-item">' +
          '<div class="history-head">' +
            '<strong>' + escapeHtml(entry.name) + '</strong>' +
            '<span class="status-badge status-' + escapeHtml(entry.status) + '">' + statusLabel(entry.status) + '</span>' +
          '</div>' +
          '<div class="muted">' + escapeHtml(entry.type) + ' | ' + escapeHtml(entry.relativePath || entry.codexSlug || '') + '</div>' +
          '<div class="muted">' + escapeHtml(entry.preview || '') + '</div>' +
          lastError +
        '</div>';
      }).join('');
    }

    document.getElementById('paste').onclick = async () => {
      try {
        text.value = await navigator.clipboard.readText();
        statusEl.textContent = 'Clipboard pasted.';
        await buildPreview();
      } catch (err) {
        statusEl.textContent = 'Browser blocked clipboard access. Paste with Ctrl+V.';
      }
    };

    document.getElementById('previewBtn').onclick = async () => {
      try {
        await buildPreview();
      } catch (err) {
        statusEl.textContent = err.message;
      }
    };

    document.getElementById('importBtn').onclick = async () => {
      try {
        let entries = currentPreview;
        if (!entries.length || previewText !== text.value) entries = await buildPreview();
        const result = await postJson('/import', {
          text: text.value,
          defaultType: type.value,
          mode: mode.value,
          entries,
        });
        text.value = '';
        currentPreview = [];
        renderPreview();
        const refreshed = await refreshState({ preserveStatus: true });
        statusEl.textContent = 'Imported ' + result.created.length + ' file(s). ' + result.pipeline + '. ' + refreshed.summary;
      } catch (err) {
        statusEl.textContent = err.message;
      }
    };

    document.getElementById('clear').onclick = () => {
      text.value = '';
      currentPreview = [];
      previewText = '';
      renderPreview();
      text.focus();
    };

    document.getElementById('sendQueued').onclick = async () => {
      try {
        const result = await postJson('/send-queued', {});
        statusEl.textContent = result.pipeline;
        await refreshState();
      } catch (err) {
        statusEl.textContent = err.message;
      }
    };

    document.getElementById('retryFailed').onclick = async () => {
      try {
        const result = await postJson('/retry-failed', {});
        statusEl.textContent = result.pipeline;
        await refreshState();
      } catch (err) {
        statusEl.textContent = err.message;
      }
    };

    document.getElementById('clearCompleted').onclick = async () => {
      try {
        await postJson('/clear-completed', {});
        await refreshState();
      } catch (err) {
        statusEl.textContent = err.message;
      }
    };

    document.getElementById('refresh').onclick = refreshState;
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

    if (req.method === "POST" && path === "/clear-completed") {
      const state = reconcileInboxState();
      state.entries = state.entries.filter((entry) => entry.status !== "completed");
      saveInboxState(state);
      sendJson(res, 200, { ok: true });
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
