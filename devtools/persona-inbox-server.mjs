#!/usr/bin/env node
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  statSync,
  unlinkSync,
  watch,
  writeFileSync,
} from "node:fs";
import { basename, dirname, extname, join, relative } from "node:path";
import { randomUUID } from "node:crypto";
import { validatePersonaContent } from './persona-validator.mjs'

const ROOT = process.cwd();
const SYSTEM_DIR = join(ROOT, "system");
const PERSONA_ROOT = join(ROOT, "Chef Flow Personas", "Uncompleted");
const INBOX_STATE_FILE = join(SYSTEM_DIR, "persona-inbox-state.json");
const TYPES = ["Chef", "Client", "Guest", "Vendor", "Staff", "Partner", "Public"];
const INPUT_TYPES = ["persona", "idea", "bug", "feature", "note", "critique"];
const INTAKE_DIR = join(SYSTEM_DIR, "intake");
const BUILD_QUEUE_DIR = join(SYSTEM_DIR, "build-queue");
const DEFAULT_PORT = 3977;
const DEFAULT_HOST = "127.0.0.1";
const authToken = String(process.env.PERSONA_INBOX_TOKEN || "").trim();
const MAX_BODY_BYTES = 1024 * 1024 * 10;
const RUNTIME_EVENT_FILE = join(SYSTEM_DIR, "runtime-events.ndjson");
const RUNTIME_EVENT_LIMIT = 250;
const CAPTURE_DIR = join(SYSTEM_DIR, "captures");
const CAPTURE_MAX_BODY = 50 * 1024 * 1024; // 50MB
const OLLAMA_URL = process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434";
const EXPAND_MODEL = process.env.EXPAND_MODEL || "gemma4:e4b";
const UPTIME_FILE = join(SYSTEM_DIR, "persona-inbox-uptime.json");

let pipelineRunning = false;
let pipelineQueued = false;
let queuedPipelineLimit = 0;
let queuedPipelineIds = [];
let lastPipelineStatus = "Idle";
let lastPipelineLines = [];
let pipelineStartedAt = null;
let pipelineChildPid = null;
let runtimeFileOffset = 0;
let runtimeFileWatcher = null;
const MAX_SSE_CLIENTS = 50;
const runtimeClients = new Set();
const runtimeEvents = [];
const runtimeEventIds = new Set();

// --- Child Process Registry (track all spawned children) ---
// Map<pid, { name, startedAt, pid }>
const activeChildren = new Map();

function trackChild(child, name) {
  if (!child || !child.pid) return child;
  activeChildren.set(child.pid, { name, startedAt: Date.now(), pid: child.pid });
  child.on("exit", (code) => {
    activeChildren.delete(child.pid);
    if (code !== 0 && code !== null) {
      console.error(`[child-tracker] ${name} (pid ${child.pid}) exited with code ${code}`);
      emitRuntimeEvent("error", "3977.child-tracker", {
        action: "child_exit_nonzero",
        name,
        pid: child.pid,
        code,
      }, { workflow: "child-tracker" });
    }
  });
  child.on("error", (err) => {
    activeChildren.delete(child.pid);
    console.error(`[child-tracker] ${name} spawn error: ${err.message}`);
    emitRuntimeEvent("error", "3977.child-tracker", {
      action: "child_spawn_error",
      name,
      message: err.message,
    }, { workflow: "child-tracker" });
  });
  return child;
}

// --- Uptime Metrics (persisted across restarts) ---

const serverBootTime = Date.now();

function recordStartup() {
  try {
    mkdirSync(SYSTEM_DIR, { recursive: true });
    const metrics = readJsonFile(UPTIME_FILE, { sessions: [], total_uptime_s: 0, restarts: 0 });
    metrics.restarts++;
    metrics.current_session = { started: new Date().toISOString(), pid: process.pid };
    // Keep last 50 sessions
    if (metrics.sessions.length > 50) metrics.sessions = metrics.sessions.slice(-50);
    writeJsonFile(UPTIME_FILE, metrics);
  } catch (err) {
    console.error("[uptime] Failed to record startup:", err.message);
  }
}

function recordShutdown() {
  try {
    const metrics = readJsonFile(UPTIME_FILE, { sessions: [], total_uptime_s: 0, restarts: 0 });
    const uptimeSec = Math.round((Date.now() - serverBootTime) / 1000);
    metrics.total_uptime_s = (metrics.total_uptime_s || 0) + uptimeSec;
    metrics.sessions.push({
      started: new Date(serverBootTime).toISOString(),
      ended: new Date().toISOString(),
      uptime_s: uptimeSec,
      pid: process.pid,
    });
    if (metrics.sessions.length > 50) metrics.sessions = metrics.sessions.slice(-50);
    delete metrics.current_session;
    writeJsonFile(UPTIME_FILE, metrics);
  } catch (err) {
    console.error("[uptime] Failed to record shutdown:", err.message);
  }
}

// --- Circuit Breaker for Ollama ---
const CIRCUIT_BREAKER = {
  failures: 0,
  threshold: 3,         // Open circuit after 3 consecutive failures
  cooldownMs: 5 * 60 * 1000,  // 5 min cooldown before retry
  lastFailure: 0,
  state: "closed",      // closed (normal), open (blocking), half-open (testing)
};

function circuitBreakerCheck() {
  const cb = CIRCUIT_BREAKER;
  if (cb.state === "closed") return true;
  if (cb.state === "open") {
    const elapsed = Date.now() - cb.lastFailure;
    if (elapsed >= cb.cooldownMs) {
      cb.state = "half-open";
      console.log("[circuit-breaker] Cooldown elapsed, switching to half-open");
      return true; // Allow one test request
    }
    return false; // Still cooling down
  }
  // half-open: allow through
  return true;
}

function circuitBreakerSuccess() {
  const cb = CIRCUIT_BREAKER;
  if (cb.state === "half-open") {
    console.log("[circuit-breaker] Half-open test succeeded, closing circuit");
  }
  cb.failures = 0;
  cb.state = "closed";
}

function circuitBreakerFailure() {
  const cb = CIRCUIT_BREAKER;
  cb.failures++;
  cb.lastFailure = Date.now();
  if (cb.failures >= cb.threshold) {
    cb.state = "open";
    console.error(`[circuit-breaker] ${cb.failures} consecutive Ollama failures, circuit OPEN for ${cb.cooldownMs / 1000}s`);
    emitRuntimeEvent("error", "3977.circuit-breaker", {
      action: "circuit_open",
      failures: cb.failures,
      cooldown_ms: cb.cooldownMs,
    }, { workflow: "circuit-breaker" });
  }
}

// --- Universal Input Classification ---

const INPUT_KEYWORDS = {
  bug: [
    /\bbug\b/i, /\bbroken\b/i, /\bcrash/i, /\berror\b/i, /\bfail/i,
    /\b500\b/, /\b404\b/, /\bnot working\b/i, /\bdoesn'?t work\b/i,
    /\bregression\b/i, /\bfix\b/i, /\bissue\b/i,
  ],
  feature: [
    /\bfeature\b/i, /\badd\b/i, /\bimplement\b/i, /\bbuild\b/i,
    /\bshould\s+(?:be able|support|have|allow)\b/i, /\bnew\s+(?:page|button|form|modal)\b/i,
    /\bwant\b/i, /\bwish\b/i, /\bneed\b/i,
  ],
  idea: [
    /\bwhat if\b/i, /\bmaybe\b/i, /\bcould\b/i, /\bidea\b/i,
    /\bthought\b/i, /\bconcept\b/i, /\bexplore\b/i, /\bbrainstorm\b/i,
  ],
  critique: [
    /\bslow\b/i, /\bugly\b/i, /\bconfusing\b/i, /\bbad\s+ux\b/i,
    /\bhard to\b/i, /\bunusable\b/i, /\bfrustrat/i, /\bannoy/i,
    /\bworse\b/i, /\bpoor\b/i, /\bclunky\b/i,
  ],
  note: [
    /\bnote\b/i, /\breminder\b/i, /\bfyi\b/i, /\bfollowup\b/i,
    /\bfor later\b/i, /\bdon'?t forget\b/i, /\bjot\b/i,
  ],
};

function classifyInputType(content) {
  const text = String(content || "").trim();
  if (!text) return "note";

  // Check for persona markers first
  if (/\*\*(?:Chef|Client|Guest|Vendor|Staff|Partner|Public)\s+Profile:/i.test(text)) return "persona";
  if (/^---\s*persona/im.test(text)) return "persona";

  const scores = {};
  for (const [type, patterns] of Object.entries(INPUT_KEYWORDS)) {
    scores[type] = 0;
    for (const pattern of patterns) {
      const matches = text.match(pattern);
      if (matches) scores[type] += matches.length;
    }
  }

  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const best = sorted[0];
  const runnerUp = sorted[1];
  // Require minimum score of 2 OR a clear margin over runner-up
  if (best && best[1] >= 2) return best[0];
  if (best && best[1] > 0 && (!runnerUp || best[1] > runnerUp[1])) return best[0];
  return "note";
}

function ensureIntakeDirs() {
  for (const type of INPUT_TYPES) {
    mkdirSync(join(INTAKE_DIR, type), { recursive: true });
  }
  mkdirSync(join(INTAKE_DIR, "processed"), { recursive: true });
  for (const type of INPUT_TYPES) {
    mkdirSync(join(INTAKE_DIR, "processed", type), { recursive: true });
  }
}

function writeIntakeItem(content, inputType, title) {
  ensureIntakeDirs();
  const slug = slugify(title || content.slice(0, 50), 48) || "item";
  const dir = join(INTAKE_DIR, inputType);
  let path = join(dir, `${slug}.md`);
  let counter = 2;
  while (existsSync(path)) {
    path = join(dir, `${slug}-${counter}.md`);
    counter++;
  }
  const frontmatter = [
    "---",
    `type: ${inputType}`,
    `title: "${(title || slug).replace(/"/g, '\\"')}"`,
    `submitted: ${new Date().toISOString()}`,
    "status: pending",
    "source: web-dashboard",
    "---",
    "",
    content.trim(),
    "",
  ].join("\n");
  writeFileSync(path, frontmatter, "utf8");
  emitRuntimeEvent("state:update", "3977.intake", {
    action: "intake_item_written",
    inputType,
    title: title || slug,
    path: relativePath(path),
  }, { workflow: "intake" });
  return { path, relativePath: relativePath(path), slug, inputType, title: title || slug };
}

function readUniversalIntake() {
  ensureIntakeDirs();
  const results = [];
  for (const inputType of INPUT_TYPES) {
    const dir = join(INTAKE_DIR, inputType);
    if (!existsSync(dir)) continue;
    try {
      for (const file of readdirSync(dir).filter(f => /\.(md|txt)$/i.test(f))) {
        const fullPath = join(dir, file);
        const content = readFileSync(fullPath, "utf8");
        const titleMatch = content.match(/^title:\s*"?([^"\n]+)"?/m);
        const statusMatch = content.match(/^status:\s*(\w+)/m);
        const submittedMatch = content.match(/^submitted:\s*(.+)/m);
        const title = titleMatch ? titleMatch[1].trim() : basename(file, extname(file));
        const status = statusMatch ? statusMatch[1] : "pending";
        const submitted = submittedMatch ? submittedMatch[1].trim() : "";
        // Extract body (after frontmatter)
        const bodyMatch = content.match(/^---[\s\S]*?---\s*([\s\S]*)$/);
        const body = bodyMatch ? bodyMatch[1].trim() : content.trim();
        const words = body.split(/\s+/).filter(Boolean).length;
        // Check if processed version exists
        const processedPath = join(INTAKE_DIR, "processed", inputType, file);
        const processed = existsSync(processedPath);
        results.push({
          file,
          title,
          inputType,
          status: processed ? "processed" : status,
          submitted,
          words,
          path: relativePath(fullPath),
          excerpt: body.replace(/\s+/g, " ").slice(0, 200),
          processed,
        });
      }
    } catch {}
  }
  return results.sort((a, b) => String(b.submitted).localeCompare(String(a.submitted)));
}

let expandMetrics = { calls: 0, total_ms: 0, failures: 0 };

async function expandIntakeItem(filePath, inputType) {
  if (inputType === "note" || inputType === "persona") return;
  if (!circuitBreakerCheck()) {
    console.log(`[intake-expand] Circuit breaker OPEN, skipping expansion for ${basename(filePath)}`);
    emitRuntimeEvent("warn", "3977.intake-expand", {
      action: "skipped_circuit_open",
      file: basename(filePath),
    }, { workflow: "intake" });
    return;
  }
  try {
    const content = readFileSync(filePath, "utf8");
    const bodyMatch = content.match(/^---[\s\S]*?---\s*([\s\S]*)$/);
    const body = bodyMatch ? bodyMatch[1].trim() : content.trim();
    if (!body || body.length < 10) return;

    const prompts = {
      idea: `You are a product analyst for ChefFlow, a chef operations platform. Expand this raw idea into a structured mini-spec with: Problem Statement, Proposed Solution, Affected Surfaces, Complexity Estimate (S/M/L), and Open Questions. Be concise.\n\nIdea:\n${body}`,
      bug: `You are a QA analyst for ChefFlow, a chef operations platform. Analyze this bug report and produce: Steps to Reproduce, Expected vs Actual, Likely Root Cause, Severity (P0-P3), and Affected Components.\n\nBug report:\n${body}`,
      feature: `You are a product manager for ChefFlow, a chef operations platform. Expand this feature request into: User Story, Acceptance Criteria (3-5 items), Dependencies, Complexity Estimate (S/M/L), and Priority Rationale.\n\nFeature request:\n${body}`,
      critique: `You are a UX analyst for ChefFlow, a chef operations platform. Analyze this critique and produce: Current Pain Point, Impact on Users, Suggested Improvements (2-3), and Priority.\n\nCritique:\n${body}`,
    };

    const prompt = prompts[inputType];
    if (!prompt) return;

    const expandStart = Date.now();
    const response = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: EXPAND_MODEL, prompt, stream: false }),
      signal: AbortSignal.timeout(120000),
    });

    if (!response.ok) {
      expandMetrics.failures++;
      console.error(`[intake-expand] Ollama returned ${response.status}`);
      circuitBreakerFailure();
      emitRuntimeEvent("error", "3977.intake-expand", {
        action: "ollama_error",
        status: response.status,
        file: basename(filePath),
      }, { workflow: "intake" });
      return;
    }

    const expandDuration = Date.now() - expandStart;
    expandMetrics.calls++;
    expandMetrics.total_ms += expandDuration;

    circuitBreakerSuccess();
    const result = await response.json();
    const expanded = result.response || "";
    if (!expanded.trim()) return;

    const processedDir = join(INTAKE_DIR, "processed", inputType);
    mkdirSync(processedDir, { recursive: true });
    const outPath = join(processedDir, basename(filePath));
    const output = [
      "---",
      `type: ${inputType}`,
      `source: ${relativePath(filePath)}`,
      `expanded: ${new Date().toISOString()}`,
      `model: ${EXPAND_MODEL}`,
      "---",
      "",
      expanded.trim(),
      "",
    ].join("\n");
    writeFileSync(outPath, output, "utf8");

    emitRuntimeEvent("state:update", "3977.intake-expand", {
      action: "intake_expanded",
      inputType,
      source: relativePath(filePath),
      output: relativePath(outPath),
    }, { workflow: "intake" });
    broadcastRuntimeSnapshot();
  } catch (err) {
    circuitBreakerFailure();
    console.error(`[intake-expand] ${err.message}`);
    emitRuntimeEvent("error", "3977.intake-expand", {
      message: err.message,
      file: filePath,
    }, { workflow: "intake" });
  }
}

// ── Capture System (permanent storage for anything) ──

function ensureCaptureDir() {
  mkdirSync(CAPTURE_DIR, { recursive: true });
}

function slugTimestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function saveCaptureEntry({ content, contentType, tags, title, source, meta }) {
  ensureCaptureDir();
  const id = randomUUID();
  const ts = new Date().toISOString();
  const filename = `${slugTimestamp()}_${id.slice(0, 8)}.json`;

  const entry = {
    id,
    timestamp: ts,
    title: title || null,
    source: source || null,
    contentType: contentType || "text/plain",
    tags: tags || [],
    content,
    meta: meta || {},
  };

  writeFileSync(join(CAPTURE_DIR, filename), JSON.stringify(entry, null, 2));
  emitRuntimeEvent("state:update", "3977.capture", {
    action: "capture_saved",
    id,
    title: title || "(untitled)",
    tags: tags || [],
  }, { workflow: "capture" });
  return entry;
}

function readCaptureEntries({ limit = 100, offset = 0, search = "", tag = "" } = {}) {
  ensureCaptureDir();
  const files = readdirSync(CAPTURE_DIR)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .reverse();

  const entries = [];
  for (const f of files) {
    try {
      const raw = readFileSync(join(CAPTURE_DIR, f), "utf-8");
      const entry = JSON.parse(raw);
      entry._file = f;
      entries.push(entry);
    } catch {}
  }

  let filtered = entries;
  if (tag) {
    filtered = filtered.filter(
      (e) => e.tags && e.tags.some((t) => t.toLowerCase() === tag.toLowerCase())
    );
  }
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter((e) => JSON.stringify(e).toLowerCase().includes(q));
  }

  return { total: filtered.length, entries: filtered.slice(offset, offset + limit) };
}

function getCaptureEntry(id) {
  ensureCaptureDir();
  for (const f of readdirSync(CAPTURE_DIR).filter((f) => f.endsWith(".json"))) {
    try {
      const raw = readFileSync(join(CAPTURE_DIR, f), "utf-8");
      const entry = JSON.parse(raw);
      if (entry.id === id || f.includes(id)) return entry;
    } catch {}
  }
  return null;
}

function getCaptureTags() {
  const { entries } = readCaptureEntries({ limit: 99999 });
  const tagMap = {};
  for (const e of entries) {
    for (const t of e.tags || []) {
      tagMap[t] = (tagMap[t] || 0) + 1;
    }
  }
  return tagMap;
}

function readBuildQueueItems() {
  if (!existsSync(BUILD_QUEUE_DIR)) return [];
  const items = [];
  try {
    for (const file of readdirSync(BUILD_QUEUE_DIR).filter(f => /\.(md|json)$/i.test(f))) {
      const fullPath = join(BUILD_QUEUE_DIR, file);
      const content = readFileSync(fullPath, "utf8");
      if (file.endsWith(".json")) {
        try {
          const data = JSON.parse(content);
          items.push({
            file,
            title: data.title || data.name || file,
            priority: data.priority || "medium",
            status: data.status || "pending",
            source: data.source || "",
            path: relativePath(fullPath),
          });
        } catch {}
      } else {
        const titleMatch = content.match(/^#\s+(.+)$/m);
        const priorityMatch = content.match(/^\*\*Priority:\*\*\s*(\w+)/m);
        const statusMatch = content.match(/^\*\*Status:\*\*\s*(\w+)/m);
        items.push({
          file,
          title: titleMatch ? titleMatch[1].trim() : basename(file, extname(file)),
          priority: priorityMatch ? priorityMatch[1].toLowerCase() : "medium",
          status: statusMatch ? statusMatch[1].toLowerCase() : "pending",
          path: relativePath(fullPath),
        });
      }
    }
  } catch {}
  // Sort: high > medium > low
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  return items.sort((a, b) => (priorityOrder[a.priority] ?? 1) - (priorityOrder[b.priority] ?? 1));
}

// --- Scheduled Automation ---

let scheduledPipelineInterval = null;
let scheduledSynthesisInterval = null;

function startScheduledPipeline() {
  if (scheduledPipelineInterval) return;
  // Run pipeline every 30 minutes if unprocessed files exist
  scheduledPipelineInterval = setInterval(() => {
    if (pipelineRunning) return;
    if (!circuitBreakerCheck()) {
      console.log("[scheduler] Circuit breaker OPEN, skipping scheduled pipeline");
      return;
    }
    const counts = countDiskQueues();
    const ids = pendingEntryIds(["saved", "queued", "failed"]);
    if (counts.uncompleted === 0 && ids.length === 0) return;
    emitRuntimeEvent("state:update", "3977.scheduler", {
      action: "scheduled_pipeline_start",
      uncompleted: counts.uncompleted,
      pendingEntries: ids.length,
    }, { workflow: "scheduler" });
    runPipeline(Math.max(ids.length, 1), ids);
  }, 30 * 60 * 1000);
}

function startScheduledSynthesis() {
  if (scheduledSynthesisInterval) return;
  // Check every 6 hours if synthesis should run
  scheduledSynthesisInterval = setInterval(() => {
    if (pipelineRunning) return;
    const pipelineState = readJsonFile(
      join(SYSTEM_DIR, "persona-pipeline-state.json"),
      { processed: [], last_synthesis: null }
    );
    const lastSynthesis = pipelineState.last_synthesis ? new Date(pipelineState.last_synthesis) : null;
    const processed = pipelineState.processed || [];
    const recentCount = lastSynthesis
      ? processed.filter(p => new Date(p.completed_at || p.analyzed_at) > lastSynthesis).length
      : processed.length;
    if (recentCount < 2) return;
    emitRuntimeEvent("state:update", "3977.scheduler", {
      action: "scheduled_synthesis_start",
      newReportsSinceLastSynthesis: recentCount,
    }, { workflow: "scheduler" });
    // Spawn synthesis
    trackChild(spawn(process.execPath, ["devtools/persona-batch-synthesizer.mjs"], {
      cwd: ROOT, detached: false, stdio: "ignore", windowsHide: true,
    }), "batch-synthesizer");
  }, 6 * 60 * 60 * 1000);
}

// --- Auto-Generation from Saturation Gaps ---

let autoGenInterval = null;
const AUTO_GEN_STATE_FILE = join(SYSTEM_DIR, "persona-auto-generation.json");
const AUTO_GEN_HOURLY_LIMIT = 8;
const AUTO_GEN_DAILY_LIMIT = 30;

function readAutoGenState() {
  return readJsonFile(AUTO_GEN_STATE_FILE, { generated: [], last_check: null });
}

function writeAutoGenState(state) {
  writeJsonFile(AUTO_GEN_STATE_FILE, state);
}

function startAutoGeneration() {
  if (autoGenInterval) return;
  // Check every 2 hours
  autoGenInterval = setInterval(() => {
    if (pipelineRunning) return;

    const saturation = readJsonFile(join(ROOT, "system", "persona-batch-synthesis", "saturation.json"), null);
    const validation = readJsonFile(join(ROOT, "system", "persona-batch-synthesis", "validation.json"), null);

    // Need at least saturation data to know where to aim
    const hasNeverSeen = saturation?.categories_never_seen?.length > 0;
    const hasMissingGaps = validation?.gaps?.some(g => g.status === "MISSING");
    if (!hasNeverSeen && !hasMissingGaps) return;

    const genState = readAutoGenState();
    const now = Date.now();
    const hourAgo = now - 3600000;
    const dayAgo = now - 86400000;
    const recentHour = (genState.generated || []).filter(g => new Date(g.at).getTime() > hourAgo).length;
    const recentDay = (genState.generated || []).filter(g => new Date(g.at).getTime() > dayAgo).length;

    if (recentHour >= AUTO_GEN_HOURLY_LIMIT || recentDay >= AUTO_GEN_DAILY_LIMIT) return;

    // Smart targeting: prioritize HIGH severity MISSING gaps by category
    let target = null;
    let targetSource = "saturation";
    if (validation?.gaps) {
      const missingByCategory = {};
      for (const gap of validation.gaps) {
        if (gap.status !== "MISSING") continue;
        const cat = gap.category;
        if (!missingByCategory[cat]) missingByCategory[cat] = { count: 0, highCount: 0 };
        missingByCategory[cat].count++;
        if (gap.severity === "HIGH") missingByCategory[cat].highCount++;
      }
      // Sort: most HIGH-severity missing first, then by total missing
      const ranked = Object.entries(missingByCategory)
        .sort((a, b) => (b[1].highCount - a[1].highCount) || (b[1].count - a[1].count));
      // Skip categories we recently generated for
      const recentCategories = new Set(
        (genState.generated || [])
          .filter(g => new Date(g.at).getTime() > dayAgo)
          .map(g => g.category)
      );
      const best = ranked.find(([cat]) => !recentCategories.has(cat));
      if (best) {
        target = best[0];
        targetSource = `validation (${best[1].highCount} HIGH, ${best[1].count} total missing)`;
      }
    }
    // Fallback to never-seen categories
    if (!target && hasNeverSeen) {
      target = saturation.categories_never_seen[0];
      targetSource = "saturation (never seen)";
    }
    if (!target) return;

    const underrepresented = saturation?.underrepresented_types || [];
    const targetType = underrepresented.length > 0 ? underrepresented[0] : "Chef";

    console.log(`[auto-gen] Targeting: ${target} via ${targetSource} (type: ${targetType})`);
    emitRuntimeEvent("state:update", "3977.auto-gen", {
      action: "auto_generate_start",
      targetCategory: target,
      targetSource,
      targetType,
      hourlyCount: recentHour,
      dailyCount: recentDay,
    }, { workflow: "auto-gen" });

    const child = trackChild(spawn(process.execPath, [
      "devtools/persona-generator.mjs",
      "--type", targetType,
      "--count", "2",
      "--focus", target,
    ], {
      cwd: ROOT, detached: false, stdio: "ignore", windowsHide: true,
    }), `auto-gen:${target}`);

    child.on("exit", (code) => {
      const state = readAutoGenState();
      state.generated.push({ category: target, type: targetType, at: new Date().toISOString(), success: code === 0 });
      // Trim old entries
      state.generated = state.generated.filter(g => new Date(g.at).getTime() > now - 7 * 86400000);
      state.last_check = new Date().toISOString();
      writeAutoGenState(state);

      if (code === 0) {
        emitRuntimeEvent("state:update", "3977.auto-gen", {
          action: "auto_generate_complete",
          targetCategory: target,
          targetType,
        }, { workflow: "auto-gen" });
      }
      broadcastRuntimeSnapshot();
    });
  }, 45 * 60 * 1000); // Check every 45 min (was 2hr)
}

// --- Pipeline Watchdog ---

let watchdogInterval = null;
const PIPELINE_STALL_MS = 10 * 60 * 1000; // 10 min = stalled

function killStalledPipeline() {
  if (pipelineChildPid) {
    console.error(`[watchdog] Killing stalled pipeline child (pid ${pipelineChildPid})`);
    try { process.kill(pipelineChildPid, "SIGTERM"); } catch {}
    // Force kill after 5s if still alive
    const pid = pipelineChildPid;
    setTimeout(() => {
      try { process.kill(pid, 0); process.kill(pid, "SIGKILL"); } catch {}
    }, 5000);
  }
  pipelineRunning = false;
  pipelineStartedAt = null;
  pipelineChildPid = null;
  lastPipelineStatus = "Pipeline killed by watchdog (stall)";
}

function startWatchdog() {
  if (watchdogInterval) return;
  watchdogInterval = setInterval(() => {
    // Self-heal: orphaned lock when pipeline is NOT running
    if (!pipelineRunning) {
      const lockFile = join(SYSTEM_DIR, ".pipeline.lock");
      if (existsSync(lockFile)) {
        try {
          const lockData = JSON.parse(readFileSync(lockFile, "utf8"));
          const lockPid = lockData.pid;
          let ownerAlive = false;
          if (lockPid && lockPid !== 0 && lockPid !== process.pid) {
            try { process.kill(lockPid, 0); ownerAlive = true; } catch {}
          }
          if (!ownerAlive) {
            unlinkSync(lockFile);
            console.log(`[watchdog] Self-healed orphaned lock (pid ${lockPid} dead, pipeline not running)`);
            emitRuntimeEvent("state:update", "3977.watchdog", {
              action: "orphaned_lock_self_healed",
              stale_pid: lockPid,
            }, { workflow: "watchdog" });
          }
        } catch {}
      }
      return;
    }
    if (!pipelineStartedAt) return;
    const elapsed = Date.now() - pipelineStartedAt;
    if (elapsed > PIPELINE_STALL_MS) {
      emitRuntimeEvent("error", "3977.watchdog", {
        action: "pipeline_stall_detected",
        elapsed_ms: elapsed,
        elapsed_readable: Math.round(elapsed / 60000) + "m",
        lastStatus: lastPipelineStatus,
        childPid: pipelineChildPid,
      }, { workflow: "watchdog" });
      console.error(`[watchdog] Pipeline stalled for ${Math.round(elapsed / 60000)}m. Last status: ${lastPipelineStatus}`);

      // Kill the stalled child
      killStalledPipeline();

      // Check if lock file is stale
      const lockFile = join(SYSTEM_DIR, ".pipeline.lock");
      if (existsSync(lockFile)) {
        try {
          const data = JSON.parse(readFileSync(lockFile, "utf8"));
          const lockAge = Date.now() - (data.acquired || 0);
          if (lockAge > PIPELINE_STALL_MS) {
            console.error(`[watchdog] Stale lock detected (${Math.round(lockAge / 60000)}m), removing`);
            try { writeFileSync(lockFile, '{"pid":0,"acquired":0}', "utf8"); } catch {}
          }
        } catch {}
      }
    }
  }, 60000); // Check every minute
}

// --- Auto-Retry Failed Personas ---
let autoRetryInterval = null;
const AUTO_RETRY_INTERVAL_MS = 4 * 60 * 60 * 1000; // Every 4 hours
const AUTO_RETRY_MAX_ATTEMPTS = 2;
const RECOVERABLE_ERRORS = [
  /file not found/i,
  /word count too low/i,
  /missing sections/i,
  /parse.*path/i,
  /could not parse/i,
];

function startAutoRetry() {
  if (autoRetryInterval) return;
  autoRetryInterval = setInterval(() => {
    if (pipelineRunning) return;
    if (!circuitBreakerCheck()) return;

    const stateFile = join(SYSTEM_DIR, "persona-pipeline-state.json");
    const state = readJsonFile(stateFile, { failed: [] });
    if (!state.failed || state.failed.length === 0) return;

    // Filter to recoverable failures that haven't been retried too many times
    const recoverable = state.failed.filter(entry => {
      const errMsg = entry.error || entry.last_error || "";
      const isRecoverable = RECOVERABLE_ERRORS.some(r => r.test(errMsg));
      const retryCount = entry.retry_count || 0;
      return isRecoverable && retryCount < AUTO_RETRY_MAX_ATTEMPTS;
    });

    if (recoverable.length === 0) return;

    console.log(`[auto-retry] ${recoverable.length} recoverable failed personas, triggering retry pipeline...`);
    emitRuntimeEvent("state:update", "3977.auto-retry", {
      action: "auto_retry_triggered",
      count: recoverable.length,
      slugs: recoverable.map(e => e.slug || "unknown").slice(0, 10),
    }, { workflow: "auto-retry" });

    // Mark retry count
    for (const entry of recoverable) {
      entry.retry_count = (entry.retry_count || 0) + 1;
    }
    writeJsonFile(stateFile, state);

    // Trigger pipeline with --retry-failed
    trackChild(spawn(process.execPath, [
      "devtools/persona-orchestrator.mjs",
      "--once",
      "--retry-failed",
      "--max", String(Math.min(recoverable.length, 5)),
    ], {
      cwd: ROOT, detached: false, stdio: "ignore", windowsHide: true,
    }), "auto-retry");
  }, AUTO_RETRY_INTERVAL_MS);
}

// --- Overnight Auto-Scheduler ---
let overnightInterval = null;
let lastOvernightDate = null;
const OVERNIGHT_HOUR = 2; // 2 AM local time
const OVERNIGHT_GEN_COUNT = 15;

function startOvernightScheduler() {
  if (overnightInterval) return;
  // Check every 30 min if it's overnight time
  overnightInterval = setInterval(async () => {
    const now = new Date();
    const hour = now.getHours();
    const dateStr = now.toISOString().slice(0, 10);

    // Only run once per night, at the target hour
    if (hour !== OVERNIGHT_HOUR) return;
    if (lastOvernightDate === dateStr) return;
    if (pipelineRunning) return;

    // Check Ollama is alive before committing
    let ollamaOk = false;
    try {
      const resp = await fetch(`${OLLAMA_URL}/api/tags`, { signal: AbortSignal.timeout(5000) });
      ollamaOk = resp.ok;
    } catch {}
    if (!ollamaOk) {
      console.log("[overnight] Skipped: Ollama unreachable");
      return;
    }

    lastOvernightDate = dateStr;
    console.log(`[overnight] Starting full overnight cycle (${OVERNIGHT_GEN_COUNT} personas)`);
    emitRuntimeEvent("state:update", "3977.overnight", {
      action: "overnight_start",
      date: dateStr,
      generateCount: OVERNIGHT_GEN_COUNT,
    }, { workflow: "overnight" });

    const child = trackChild(spawn(process.execPath, [
      "devtools/persona-orchestrator.mjs",
      "--overnight",
      "--generate-count", String(OVERNIGHT_GEN_COUNT),
    ], {
      cwd: ROOT, detached: false, stdio: "ignore", windowsHide: true,
    }), `overnight:${dateStr}`);

    child.on("exit", (code) => {
      const status = code === 0 ? "completed" : `failed (exit ${code})`;
      console.log(`[overnight] Cycle ${status}`);
      emitRuntimeEvent("state:update", "3977.overnight", {
        action: "overnight_complete",
        date: dateStr,
        code,
        status,
      }, { workflow: "overnight" });
      broadcastRuntimeSnapshot();
    });
  }, 30 * 60 * 1000);
}

// --- Codebase Drift Detection ---
let driftInterval = null;
const DRIFT_CHECK_INTERVAL_MS = 12 * 60 * 60 * 1000; // Every 12 hours
const DRIFT_FILE = join(SYSTEM_DIR, "persona-drift-report.json");

function quickCodeGrep(term, maxResults = 3) {
  // Fast recursive grep through app/, lib/, components/
  const results = [];
  function walk(dir) {
    if (results.length >= maxResults) return;
    let entries;
    try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      if (results.length >= maxResults) return;
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (["node_modules", ".next", ".git", "graphify-out"].includes(entry.name)) continue;
        walk(full);
      } else if (/\.(ts|tsx)$/.test(entry.name)) {
        try {
          const content = readFileSync(full, "utf8");
          if (content.includes(term) || (term.includes(".") && content.match(new RegExp(term.replace(/\./g, "[._\\-]?"), "i")))) {
            results.push(relative(ROOT, full).replace(/\\/g, "/"));
          }
        } catch {}
      }
    }
  }
  for (const d of ["app", "lib", "components"]) {
    const absDir = join(ROOT, d);
    if (existsSync(absDir)) walk(absDir);
  }
  return results;
}

function runDriftDetection() {
  const validationPath = join(ROOT, "system", "persona-batch-synthesis", "validation.json");
  const validation = readJsonFile(validationPath, null);
  if (!validation?.gaps) return;

  const drifts = [];
  for (const gap of validation.gaps) {
    const hints = gap.evidence || [];
    const grepTerms = [];

    // Extract original grep terms from evidence
    for (const h of hints) {
      if (h.type === "grep_match" && h.term) grepTerms.push(h.term);
    }

    // For MISSING gaps: check if code was added since validation
    if (gap.status === "MISSING" && grepTerms.length > 0) {
      let found = 0;
      for (const term of grepTerms.slice(0, 2)) {
        if (quickCodeGrep(term, 1).length > 0) found++;
      }
      if (found > 0) {
        drifts.push({ title: gap.title, category: gap.category, was: "MISSING", now: "LIKELY_BUILT", evidence: `${found}/${grepTerms.length} terms now found` });
      }
    }

    // For BUILT gaps: check if code was removed
    if (gap.status === "BUILT") {
      const builtFiles = hints.filter(h => h.type === "file_exists").map(h => h.path);
      const missing = builtFiles.filter(f => !existsSync(join(ROOT, f)));
      if (missing.length > 0 && missing.length === builtFiles.length) {
        drifts.push({ title: gap.title, category: gap.category, was: "BUILT", now: "LIKELY_REMOVED", evidence: `all ${missing.length} files gone` });
      }
    }
  }

  const report = {
    checked_at: new Date().toISOString(),
    total_gaps_checked: validation.gaps.length,
    drifts_detected: drifts.length,
    drifts,
  };

  writeJsonFile(DRIFT_FILE, report);

  if (drifts.length > 0) {
    console.log(`[drift] Detected ${drifts.length} drifts:`);
    for (const d of drifts) console.log(`  [${d.was}->${d.now}] ${d.title}`);
    emitRuntimeEvent("state:update", "3977.drift", {
      action: "drift_detected",
      count: drifts.length,
      drifts: drifts.slice(0, 10),
    }, { workflow: "drift" });
  }

  return report;
}

function startDriftDetection() {
  if (driftInterval) return;
  // Run once at startup (non-blocking), then on interval
  setTimeout(() => runDriftDetection(), 30000);
  driftInterval = setInterval(() => runDriftDetection(), DRIFT_CHECK_INTERVAL_MS);
}

// --- Auto-Archive Stale Plans (every 24hr) ---
let autoArchiveInterval = null;
const AUTO_ARCHIVE_INTERVAL_MS = 24 * 60 * 60 * 1000;

function runAutoArchive() {
  try {
    const plansDir = join(ROOT, "system", "persona-build-plans");
    const archiveDir = join(ROOT, "system", "persona-build-plans-archive");
    if (!existsSync(plansDir)) return;

    let archivedCount = 0;
    const slugDirs = readdirSync(plansDir).filter(d => {
      try { return statSync(join(plansDir, d)).isDirectory(); } catch { return false; }
    });

    for (const slug of slugDirs) {
      const slugDir = join(plansDir, slug);
      const tasks = readdirSync(slugDir).filter(f => f.endsWith(".md"));
      for (const taskFile of tasks) {
        const taskPath = join(slugDir, taskFile);
        try {
          const content = readFileSync(taskPath, "utf8");
          // Check file refs
          const fileRefs = [...content.matchAll(/`([a-zA-Z][\w/.-]+\.(?:ts|tsx|js|jsx|mjs|css|sql))`/g)];
          let checkedFiles = 0, missingFiles = 0;
          for (const match of fileRefs) {
            if (match[1].includes('{') || match[1].startsWith('http')) continue;
            checkedFiles++;
            if (!existsSync(join(ROOT, match[1]))) missingFiles++;
          }
          // Archive if ALL file refs are invalid
          if (checkedFiles > 0 && missingFiles === checkedFiles) {
            mkdirSync(join(archiveDir, slug), { recursive: true });
            const header = "<!-- AUTO-ARCHIVED: all " + missingFiles + " file refs invalid. " + new Date().toISOString() + " -->\n\n";
            writeFileSync(join(archiveDir, slug, taskFile), header + content, "utf8");
            unlinkSync(taskPath);
            archivedCount++;
          }
        } catch {}
      }
      // Clean empty slug dirs
      try { if (readdirSync(slugDir).length === 0) { unlinkSync(slugDir); } } catch {}
    }

    if (archivedCount > 0) {
      console.log(`[auto-archive] Archived ${archivedCount} stale plans`);
      emitRuntimeEvent("state:update", "3977.auto-archive", {
        action: "auto_archive_complete",
        archived: archivedCount,
      }, { workflow: "auto-archive" });
    }
  } catch (err) {
    console.error("[auto-archive] Error:", err.message);
  }
}

function startAutoArchive() {
  if (autoArchiveInterval) return;
  // Run 2 minutes after startup, then daily
  setTimeout(() => runAutoArchive(), 2 * 60 * 1000);
  autoArchiveInterval = setInterval(() => runAutoArchive(), AUTO_ARCHIVE_INTERVAL_MS);
}

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

function cleanDisplayName(raw) {
  return String(raw || "Persona")
    .replace(/\*+/g, "")
    .replace(/^[\s"'`\u201c\u201d\u2018\u2019]+|[\s"'`\u201c\u201d\u2018\u2019]+$/g, "")
    .replace(/\s*[\u2014\u2013]\s*.*$/, "")
    .replace(/\s*\(.*$/, "")
    .trim() || "Persona";
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
    const name = cleanDisplayName(inferName(entry.content, entry.name));
    const trimmed = entry.content.trim();
    const warnings = [];
    if (trimmed.length < 50)
      warnings.push("Under 50 characters; pipeline will skip very thin entries.");
    if (name === "Persona") warnings.push("Name was not detected.");

    // Run validation for drift detection
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

function readJsonFile(path, fallback) {
  if (!existsSync(path)) return fallback;
  try {
    return JSON.parse(readFileSync(path, "utf8").replace(/^\uFEFF/, ""));
  } catch {
    return fallback;
  }
}

function writeJsonFile(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  const data = `${JSON.stringify(value, null, 2)}\n`;
  const tmp = path + ".tmp";
  writeFileSync(tmp, data, "utf8");
  renameSync(tmp, path);
}

function readRuntimeEvents(limit = RUNTIME_EVENT_LIMIT) {
  if (!existsSync(RUNTIME_EVENT_FILE)) return [];
  try {
    const lines = readFileSync(RUNTIME_EVENT_FILE, "utf8")
      .split(/\r?\n/)
      .filter(Boolean)
      .slice(-limit);
    return lines.map((line) => JSON.parse(line)).filter(Boolean);
  } catch (err) {
    return [
      {
        id: randomUUID(),
        timestamp: new Date().toISOString(),
        type: "error",
        source: "3977.runtime-store",
        scope: { workflow: "runtime-events" },
        payload: { message: err.message || String(err) },
      },
    ];
  }
}

function pushRuntimeEvent(event) {
  if (event?.id && runtimeEventIds.has(event.id)) return;
  if (event?.id) runtimeEventIds.add(event.id);
  runtimeEvents.push(event);
  while (runtimeEvents.length > RUNTIME_EVENT_LIMIT) {
    const removed = runtimeEvents.shift();
    if (removed?.id) runtimeEventIds.delete(removed.id);
  }

  const frame = `event: runtime\ndata: ${JSON.stringify(event)}\n\n`;
  for (const client of runtimeClients) {
    client.write(frame);
  }
}

const NDJSON_MAX_LINES = 1000;
const NDJSON_PRUNE_INTERVAL = 100;
let ndjsonWriteCount = 0;

function pruneNdjsonFile() {
  try {
    const content = readFileSync(RUNTIME_EVENT_FILE, "utf8");
    const lines = content.split("\n").filter(Boolean);
    if (lines.length > NDJSON_MAX_LINES) {
      const trimmed = lines.slice(-NDJSON_MAX_LINES);
      const tmp = RUNTIME_EVENT_FILE + ".tmp";
      writeFileSync(tmp, trimmed.join("\n") + "\n", "utf8");
      renameSync(tmp, RUNTIME_EVENT_FILE);
      console.log(`[ndjson] Pruned ${lines.length - NDJSON_MAX_LINES} old events (kept ${NDJSON_MAX_LINES})`);
    }
  } catch {}
}

function emitRuntimeEvent(type, source, payload = {}, scope = {}) {
  const event = {
    id: randomUUID(),
    timestamp: new Date().toISOString(),
    type,
    source,
    scope,
    payload,
  };

  mkdirSync(SYSTEM_DIR, { recursive: true });
  appendFileSync(RUNTIME_EVENT_FILE, `${JSON.stringify(event)}\n`, "utf8");
  pushRuntimeEvent(event);

  ndjsonWriteCount++;
  if (ndjsonWriteCount >= NDJSON_PRUNE_INTERVAL) {
    ndjsonWriteCount = 0;
    pruneNdjsonFile();
  }

  return event;
}

function snapshotState() {
  const state = reconcileInboxState();
  return {
    entries: state.entries.slice().sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))),
    counts: countDiskQueues(),
    pipeline: {
      running: pipelineRunning,
      queued: pipelineQueued,
      pipeline: lastPipelineStatus,
      lines: lastPipelineLines,
      startedAt: pipelineStartedAt,
    },
    runtime: {
      events: runtimeEvents.length ? runtimeEvents : readRuntimeEvents(),
      eventLog: relativePath(RUNTIME_EVENT_FILE),
    },
  };
}

function buildSnapshotPayload() {
  return {
    state: snapshotState(),
    synthesis: readSynthesisData() || { error: "No synthesis data" },
    personas: readPersonaReports(),
    buildTasks: readBuildTaskFiles(),
    scoreHistory: readScoreHistory(),
    sources: readSourceFiles(),
    vault: readVaultRecords(),
    intake: readIntakeFiles(),
    universalIntake: readUniversalIntake(),
    buildQueue: readBuildQueueItems(),
  };
}

function sendRuntimeSnapshot(res) {
  const payload = buildSnapshotPayload();
  res.write(`event: snapshot\ndata: ${JSON.stringify(payload)}\n\n`);
}

function broadcastRuntimeSnapshot() {
  const frame = `event: snapshot\ndata: ${JSON.stringify(buildSnapshotPayload())}\n\n`;
  for (const client of runtimeClients) {
    client.write(frame);
  }
}

function readRuntimeFileFromOffset() {
  if (!existsSync(RUNTIME_EVENT_FILE)) return;
  const stats = statSync(RUNTIME_EVENT_FILE);
  if (stats.size < runtimeFileOffset) runtimeFileOffset = 0;
  if (stats.size === runtimeFileOffset) return;

  const start = runtimeFileOffset;
  const end = stats.size;
  runtimeFileOffset = end;

  const stream = readFileSync(RUNTIME_EVENT_FILE).subarray(start, end).toString("utf8");
  for (const line of stream.split(/\r?\n/).filter(Boolean)) {
    try {
      pushRuntimeEvent(JSON.parse(line));
    } catch (err) {
      pushRuntimeEvent({
        id: randomUUID(),
        timestamp: new Date().toISOString(),
        type: "error",
        source: "3977.runtime-store",
        scope: { workflow: "runtime-events" },
        payload: { message: err.message || String(err), line },
      });
    }
  }
}

function startRuntimeFileWatcher() {
  mkdirSync(SYSTEM_DIR, { recursive: true });
  runtimeEvents.splice(0, runtimeEvents.length);
  runtimeEventIds.clear();
  for (const event of readRuntimeEvents()) pushRuntimeEvent(event);
  runtimeFileOffset = existsSync(RUNTIME_EVENT_FILE) ? statSync(RUNTIME_EVENT_FILE).size : 0;
  if (runtimeFileWatcher) return;

  runtimeFileWatcher = watch(SYSTEM_DIR, (eventType, filename) => {
    if (filename !== "runtime-events.ndjson") return;
    if (eventType !== "change" && eventType !== "rename") return;
    try {
      readRuntimeFileFromOffset();
    } catch (err) {
      pushRuntimeEvent({
        id: randomUUID(),
        timestamp: new Date().toISOString(),
        type: "error",
        source: "3977.runtime-store",
        scope: { workflow: "runtime-events" },
        payload: { message: err.message || String(err) },
      });
    }
  });
}

function openRuntimeEventStream(req, res) {
  if (runtimeClients.size >= MAX_SSE_CLIENTS) {
    res.writeHead(503, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Too many SSE clients", max: MAX_SSE_CLIENTS }));
    return;
  }
  res.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-store, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  runtimeClients.add(res);
  sendRuntimeSnapshot(res);

  const heartbeat = setInterval(() => {
    res.write(`event: heartbeat\ndata: ${JSON.stringify({ timestamp: new Date().toISOString() })}\n\n`);
  }, 15000);

  req.on("close", () => {
    clearInterval(heartbeat);
    runtimeClients.delete(res);
  });
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
  const name = cleanDisplayName(inferName(entry.content, entry.name));
  const { dir, path } = uniquePath(type, name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(path, `${entry.content.trim()}\n`, "utf8");

  const stem = basename(path, extname(path));
  const created = {
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
  emitRuntimeEvent("state:update", "3977.persona-import", {
    action: "persona_file_written",
    type,
    name,
    path: created.relativePath,
    chars: created.chars,
  }, { workflow: "persona-import" });
  broadcastRuntimeSnapshot();
  return created;
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
  emitRuntimeEvent("state:update", "3977.persona-inbox", {
    action: "entries_updated",
    ids,
    patch,
  }, { workflow: "persona-inbox" });
  broadcastRuntimeSnapshot();
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

function readScoreHistory() {
  return readJsonFile(join(ROOT, "system", "persona-batch-synthesis", "score-history.json"), []);
}

function readSourceFiles() {
  const pipelineState = readJsonFile(
    join(SYSTEM_DIR, 'persona-pipeline-state.json'),
    { processed: [], failed: [] }
  );
  const processedMap = new Map();
  for (const p of pipelineState.processed) processedMap.set(p.source_file, p);
  for (const f of pipelineState.failed) processedMap.set(f.source_file, { ...f, _failed: true });

  const sources = [];
  const bases = [
    { dir: join(ROOT, "Chef Flow Personas", "Completed"), status: "completed" },
    { dir: join(ROOT, "Chef Flow Personas", "Uncompleted"), status: "pending" },
  ];
  for (const { dir: baseDir, status: defaultStatus } of bases) {
    if (!existsSync(baseDir)) continue;
    try {
      for (const type of readdirSync(baseDir)) {
        const typeDir = join(baseDir, type);
        try {
          for (const file of readdirSync(typeDir).filter(f => /\.(txt|md)$/i.test(f))) {
            const fullPath = join(typeDir, file);
            const relPath = relativePath(fullPath);
            const content = readFileSync(fullPath, "utf8");
            const words = content.split(/\s+/).filter(Boolean).length;
            const nameMatch = content.match(/\*\*(?:Chef|Client|Guest|Vendor|Staff|Partner|Public)\s*Profile:\s*["\u201c]?([^"\u201d\n-]+)/i);
            const name = nameMatch ? stripQuotes(nameMatch[1]) : basename(file, extname(file)).replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
            const pipeInfo = processedMap.get(relPath);
            let status = defaultStatus;
            if (pipeInfo?._failed) status = "failed";
            else if (pipeInfo) status = "completed";
            sources.push({ file, name, type, words, status, path: relPath, preview: content.slice(0, 200).replace(/\s+/g, ' ') });
          }
        } catch {}
      }
    } catch {}
  }
  return sources;
}

function readVaultRecords() {
  const indexPath = join(SYSTEM_DIR, "persona-vault", "index.json");
  return readJsonFile(indexPath, []);
}

function readIntakeFiles() {
  const results = [];
  for (const type of TYPES) {
    const dir = join(PERSONA_ROOT, type);
    if (!existsSync(dir)) continue;
    try {
      for (const file of readdirSync(dir).filter(f => /\.(txt|md)$/i.test(f))) {
        const fullPath = join(dir, file);
        const content = readFileSync(fullPath, "utf8");
        const words = content.split(/\s+/).filter(Boolean).length;
        const nameMatch = content.match(/\*\*(?:Chef|Client|Guest|Vendor|Staff|Partner|Public)\s*Profile:\s*["\u201c]?([^"\u201d\n-]+)/i);
        const name = nameMatch ? stripQuotes(nameMatch[1]) : basename(file, extname(file)).replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        results.push({ file, name, type, words, path: relativePath(fullPath) });
      }
    } catch {}
  }
  return results;
}

function findPersonaSourceFile(slug) {
  const bases = [
    join(ROOT, "Chef Flow Personas", "Completed"),
    join(ROOT, "Chef Flow Personas", "Uncompleted"),
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

function appendPipelineLine(chunk, stream = "stdout") {
  const text = chunk.toString();
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length > 0) {
    lastPipelineStatus = lines.at(-1) || lastPipelineStatus;
    lastPipelineLines = [...lastPipelineLines, ...lines].slice(-20);
    for (const line of lines) {
      emitRuntimeEvent("tool:result", "3977.persona-pipeline", {
        stream,
        line,
      }, { workflow: "persona-pipeline" });
    }
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
    emitRuntimeEvent("state:update", "3977.persona-pipeline", {
      action: "pipeline_queued",
      requestedLimit,
      ids,
      queuedPipelineLimit,
      queuedPipelineIds,
    }, { workflow: "persona-pipeline" });
    broadcastRuntimeSnapshot();
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

  emitRuntimeEvent("agent:spawn", "3977.persona-pipeline", {
    command: process.execPath,
    args,
    cwd: ROOT,
    requestedLimit,
    ids,
  }, { workflow: "persona-pipeline" });
  broadcastRuntimeSnapshot();

  const child = spawn(process.execPath, args, {
    cwd: ROOT,
    detached: false,
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
  pipelineChildPid = child.pid || null;

  child.stdout.on("data", (chunk) => {
    process.stdout.write(appendPipelineLine(chunk, "stdout"));
  });

  child.stderr.on("data", (chunk) => {
    process.stderr.write(appendPipelineLine(chunk, "stderr"));
  });

  child.on("exit", (code) => {
    pipelineRunning = false;
    pipelineStartedAt = null;
    pipelineChildPid = null;
    lastPipelineStatus = code === 0 ? "Pipeline cycle completed" : `Pipeline exited ${code}`;
    lastPipelineLines = [...lastPipelineLines, lastPipelineStatus].slice(-20);
    reconcileInboxState();
    emitRuntimeEvent("agent:complete", "3977.persona-pipeline", {
      code,
      status: lastPipelineStatus,
      ids,
    }, { workflow: "persona-pipeline" });
    broadcastRuntimeSnapshot();

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
    emitRuntimeEvent("error", "3977.persona-pipeline", {
      message: err.message,
      stack: err.stack,
      ids,
    }, { workflow: "persona-pipeline" });
    broadcastRuntimeSnapshot();
  });

  return lastPipelineStatus;
}

function pendingEntryIds(statuses = ["saved", "queued", "failed", "spec_queued"]) {
  const state = reconcileInboxState();
  return state.entries.filter((entry) => statuses.includes(entry.status)).map((entry) => entry.id);
}

function readBody(req, res) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > MAX_BODY_BYTES) {
        const err = new Error("Request too large");
        err.statusCode = 413;
        if (res && !res.headersSent) {
          sendJson(res, 413, { error: "Payload too large", max_bytes: MAX_BODY_BYTES });
        }
        req.destroy();
        reject(err);
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

  // Allow login page through without auth
  const reqPath = requestPath(req);
  if (reqPath === "/login") return true;

  res.writeHead(302, { Location: "/login", "Cache-Control": "no-store" });
  res.end();
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
  <title>ChefFlow Hub</title>
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
    .runtime-layout { display: grid; grid-template-columns: minmax(0, 0.95fr) minmax(360px, 1.05fr); gap: 12px; align-items: start; }
    .runtime-graph { display: grid; gap: 8px; }
    .runtime-node { border: 1px solid #d4cec2; border-left: 4px solid #6b7280; border-radius: 8px; background: #fffdf8; padding: 10px; }
    .runtime-node.active { border-left-color: #2563eb; }
    .runtime-node.error { border-left-color: #dc2626; }
    .runtime-node.complete { border-left-color: #059669; }
    .runtime-node-title { display: flex; justify-content: space-between; gap: 8px; align-items: center; font-size: 13px; }
    .runtime-node-chain { display: flex; gap: 6px; align-items: center; margin-top: 8px; color: #6b7280; font-size: 11px; flex-wrap: wrap; }
    .runtime-arrow { color: #9ca3af; }
    .runtime-feed { max-height: 520px; overflow-y: auto; display: grid; gap: 8px; }
    .runtime-event { border: 1px solid #d4cec2; border-radius: 8px; background: #fffdf8; padding: 10px; }
    .runtime-event-head { display: flex; justify-content: space-between; gap: 8px; align-items: center; margin-bottom: 6px; }
    .runtime-type { font: 11px ui-monospace, SFMono-Regular, Consolas, monospace; border-radius: 999px; padding: 2px 7px; background: #eef2ff; color: #3730a3; }
    .runtime-type.error { background: #fee2e2; color: #991b1b; }
    .runtime-type.retry { background: #fef3c7; color: #92400e; }
    .runtime-type.model { background: #dbeafe; color: #1e40af; }
    .runtime-type.tool { background: #dcfce7; color: #166534; }
    .runtime-payload { max-height: 180px; overflow: auto; border-radius: 6px; background: rgba(31, 41, 51, 0.06); padding: 8px; }
    .indicator { display: inline-block; width: 10px; height: 10px; border-radius: 999px; background: #6b7280; margin-right: 6px; vertical-align: middle; }
    .indicator.pulse { animation: pulse-glow 1.5s ease-in-out infinite; background: #3b82f6; }
    .stats-row { display: grid; grid-template-columns: repeat(5, 1fr); gap: 14px; margin-bottom: 14px; }
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
    .btn-sm { font-size: 11px; padding: 2px 8px; border: 1px solid #d1c9b8; border-radius: 4px; background: transparent; cursor: pointer; height: auto; color: #1f2933; }
    .btn-sm.active { background: #1f2933; color: #fff; border-color: #1f2933; }
    .btn-sm:hover { background: #e8e0d0; }
    .delta-up { color: #22863a; font-size: 12px; margin-left: 4px; }
    .delta-down { color: #cb2431; font-size: 12px; margin-left: 4px; }
    .reanalyze-btn { font-size: 10px; padding: 2px 6px; border: 1px solid #d1c9b8; border-radius: 3px; background: transparent; cursor: pointer; margin-left: 8px; height: auto; color: #1f2933; }
    .reanalyze-btn:hover { background: #e8e0d0; }
    .task-done-btn { font-size: 12px; cursor: pointer; padding: 2px 6px; border: 1px solid #d1c9b8; border-radius: 3px; background: transparent; margin-right: 8px; height: auto; color: #1f2933; }
    .task-done-btn:hover { background: #d4edda; }
    .top-stats { display: grid; grid-template-columns: repeat(5, 1fr); gap: 14px; margin-bottom: 14px; }
    .top-stat { text-align: center; padding: 16px 10px; border: 1px solid #d4cec2; border-radius: 10px; background: rgba(255, 253, 248, 0.78); }
    .top-stat .stat-value { font-size: 36px; font-weight: 700; line-height: 1; }
    .top-stat .stat-label { font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 6px; }
    .top-stat:nth-child(1) .stat-value { color: #7c3aed; }
    .top-stat:nth-child(2) .stat-value { color: #ea580c; }
    .top-stat:nth-child(3) .stat-value { color: #16a34a; }
    .top-stat:nth-child(4) .stat-value { color: #2563eb; }
    .top-stat:nth-child(5) .stat-value { color: #2563eb; }
    .section-nav a.active { background: #1f2933; color: #fff; }
    .nav-badge { display: inline-flex; align-items: center; justify-content: center; min-width: 16px; height: 16px; border-radius: 999px; background: #e5e7eb; color: #374151; font-size: 10px; font-weight: 600; padding: 0 4px; margin-left: 3px; }
    .section-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
    .section-head h2 { margin: 0; display: flex; align-items: center; gap: 8px; }
    .count-pill { display: inline-flex; align-items: center; height: 22px; border-radius: 999px; padding: 0 8px; font-size: 12px; background: #e0f2fe; color: #0369a1; font-weight: 500; }
    .count-pill.green { background: #d1fae5; color: #065f46; }
    .count-pill.orange { background: #fef3c7; color: #92400e; }
    .filter-bar { display: flex; gap: 6px; align-items: center; }
    .filter-bar select { height: 28px; font-size: 12px; }
    .filter-bar input { height: 28px; font-size: 12px; padding: 0 8px; }
    .source-card { border: 1px solid #d4cec2; border-radius: 8px; background: #fffdf8; padding: 12px; }
    .source-head { display: flex; justify-content: space-between; align-items: flex-start; }
    .source-meta { font-size: 12px; color: #6b7280; }
    .source-preview { font-size: 12px; color: #9ca3af; margin-top: 6px; line-height: 1.4; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; }
    .toggle-switch { position: relative; width: 40px; height: 22px; display: inline-block; }
    .toggle-switch input { opacity: 0; width: 0; height: 0; }
    .toggle-slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background: #d1d5db; border-radius: 22px; transition: 0.2s; }
    .toggle-slider::before { content: ''; position: absolute; width: 16px; height: 16px; border-radius: 50%; background: #fff; left: 3px; top: 3px; transition: 0.2s; }
    .toggle-switch input:checked + .toggle-slider { background: #1f2933; }
    .toggle-switch input:checked + .toggle-slider::before { transform: translateX(18px); }
    .type-btn { display: inline-flex; align-items: center; height: 28px; padding: 0 12px; border-radius: 999px; font-size: 12px; font-weight: 500; cursor: pointer; border: 1px solid transparent; }
    .type-btn.Chef { background: #fef3c7; color: #92400e; }
    .type-btn.Client { background: #dbeafe; color: #1e40af; }
    .type-btn.Guest { background: #d1fae5; color: #065f46; }
    .type-btn.Vendor { background: #fce7f3; color: #9d174d; }
    .type-btn.Staff { background: #e0e7ff; color: #3730a3; }
    .type-btn.Partner { background: #fef9c3; color: #854d0e; }
    .type-btn.Public { background: #f3f4f6; color: #374151; }
    .prompt-box { border: 2px solid #dc2626; border-radius: 8px; background: #fffdf8; padding: 16px; margin-top: 12px; }
    .prompt-box h3 { color: #dc2626; margin: 0 0 4px; font-size: 15px; }
    .prompt-box .sub { margin: 0 0 10px; }
    .prompt-gen-bar { display: flex; gap: 8px; align-items: center; margin-top: 10px; }
    .prompt-gen-bar select { height: 32px; font-size: 12px; }
    .prompt-gen-bar button { height: 32px; font-size: 12px; background: #dc2626; border-color: #dc2626; }
    .prompt-template { display: flex; justify-content: space-between; align-items: center; border: 1px solid #d4cec2; border-radius: 8px; padding: 10px 14px; margin-top: 8px; cursor: pointer; }
    .prompt-template:hover { border-color: #9ca3af; }
    .prompt-template .label { color: #dc2626; font-size: 14px; font-weight: 500; }
    .prompt-template .copy-btn { height: 26px; font-size: 11px; padding: 0 10px; background: #dc2626; border-color: #dc2626; }
    .dot-indicator { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 6px; }
    .dot-indicator.green { background: #10b981; }
    .dot-indicator.orange { background: #f59e0b; }
    .dot-indicator.red { background: #ef4444; }
    .status-dot { display: inline-flex; align-items: center; gap: 4px; font-size: 13px; }
    .input-type-badge { display: inline-flex; align-items: center; height: 20px; padding: 0 8px; border-radius: 999px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.3px; }
    .input-type-badge.persona { background: #dbeafe; color: #1e40af; }
    .input-type-badge.idea { background: #fef3c7; color: #92400e; }
    .input-type-badge.bug { background: #fee2e2; color: #991b1b; }
    .input-type-badge.feature { background: #d1fae5; color: #065f46; }
    .input-type-badge.note { background: #f3f4f6; color: #374151; }
    .input-type-badge.critique { background: #fce7f3; color: #9d174d; }
    .bq-item { display: flex; gap: 10px; align-items: center; padding: 10px; border: 1px solid #d4cec2; border-radius: 8px; background: #fffdf8; }
    .bq-item + .bq-item { margin-top: 8px; }
    .bq-priority { font-size: 10px; font-weight: 700; text-transform: uppercase; padding: 2px 6px; border-radius: 4px; }
    .bq-priority.high { background: #fee2e2; color: #991b1b; }
    .bq-priority.medium { background: #fef3c7; color: #92400e; }
    .bq-priority.low { background: #d1fae5; color: #065f46; }
    /* --- Dead Letter Queue --- */
    .dl-item { display: flex; gap: 10px; align-items: flex-start; padding: 10px; border: 1px solid #fca5a5; border-radius: 8px; background: #fef2f2; }
    .dl-item + .dl-item { margin-top: 8px; }
    .dl-error { font-size: 11px; color: #991b1b; font-family: ui-monospace, SFMono-Regular, Consolas, monospace; white-space: pre-wrap; word-break: break-all; max-height: 80px; overflow-y: auto; margin-top: 4px; }
    .dl-age { font-size: 11px; color: #9ca3af; white-space: nowrap; }
    .dl-retry-btn { font-size: 11px; padding: 2px 8px; height: auto; background: #fef3c7; color: #92400e; border: 1px solid #fcd34d; border-radius: 4px; cursor: pointer; white-space: nowrap; }
    .dl-retry-btn:hover { background: #fde68a; }
    .count-pill.red { background: #fee2e2; color: #991b1b; }
    /* --- Health Grid --- */
    .health-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 10px; }
    .health-card { padding: 12px; border: 1px solid #d4cec2; border-radius: 8px; background: #fffdf8; text-align: center; }
    .health-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #9ca3af; margin-bottom: 4px; }
    .health-value { font-size: 20px; font-weight: 700; color: #1f2933; }
    .health-value.green { color: #059669; }
    .health-value.orange { color: #d97706; }
    .health-value.red { color: #dc2626; }
    .login-page { display: flex; align-items: center; justify-content: center; min-height: 100vh; }
    .login-box { max-width: 360px; width: 100%; padding: 32px; border: 1px solid #d4cec2; border-radius: 12px; background: rgba(255, 253, 248, 0.78); }
    .login-box h1 { font-size: 24px; margin: 0 0 8px; }
    .login-box input { width: 100%; box-sizing: border-box; margin: 12px 0; }
    .login-box button { width: 100%; }
    .conn-banner { padding: 8px 14px; border-radius: 6px; font-size: 12px; text-align: center; margin-bottom: 12px; display: none; }
    .conn-banner.error { display: block; background: #fee2e2; color: #991b1b; border: 1px solid #fca5a5; }
    .conn-banner.reconnecting { display: block; background: #fef3c7; color: #92400e; border: 1px solid #fcd34d; }
    /* --- Global Search --- */
    .search-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.45); z-index: 200; display: none; align-items: flex-start; justify-content: center; padding-top: 12vh; }
    .search-overlay.open { display: flex; }
    .search-box { width: 100%; max-width: 580px; background: #fffdf8; border: 1px solid #b8b2a7; border-radius: 12px; box-shadow: 0 16px 48px rgba(0,0,0,0.18); overflow: hidden; }
    .search-input { width: 100%; border: none; outline: none; padding: 16px 18px; font: 16px/1.4 Inter, ui-sans-serif, system-ui, sans-serif; background: transparent; color: #1f2933; box-sizing: border-box; }
    .search-results { max-height: 420px; overflow-y: auto; border-top: 1px solid #e5e7eb; }
    .search-result { display: flex; gap: 10px; align-items: center; padding: 10px 18px; cursor: pointer; transition: background 0.1s; }
    .search-result:hover, .search-result.active { background: rgba(31,41,51,0.06); }
    .search-result-section { font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #9ca3af; min-width: 60px; }
    .search-result-title { font-size: 14px; color: #1f2933; }
    .search-result-excerpt { font-size: 12px; color: #6b7280; margin-top: 2px; }
    .search-hint { padding: 10px 18px; color: #9ca3af; font-size: 12px; text-align: center; }
    .search-kbd { display: inline-flex; align-items: center; gap: 2px; height: 20px; padding: 0 5px; border: 1px solid #d1d5db; border-radius: 4px; font: 11px ui-monospace, SFMono-Regular, Consolas, monospace; color: #6b7280; background: #f9fafb; margin-left: 6px; }
    /* --- Toast --- */
    .toast-container { position: fixed; bottom: 20px; right: 20px; z-index: 300; display: flex; flex-direction: column-reverse; gap: 8px; pointer-events: none; }
    .toast { padding: 10px 16px; border-radius: 8px; font-size: 13px; background: #1f2933; color: #fff; box-shadow: 0 4px 12px rgba(0,0,0,0.15); pointer-events: auto; animation: toastIn 0.25s ease, toastOut 0.3s ease 3.5s forwards; max-width: 380px; }
    .toast.error { background: #dc2626; }
    .toast.success { background: #059669; }
    @keyframes toastIn { from { opacity: 0; transform: translateY(8px) scale(0.96); } to { opacity: 1; transform: none; } }
    @keyframes toastOut { from { opacity: 1; } to { opacity: 0; transform: translateY(-4px); } }
    /* --- Sparkline --- */
    .sparkline { display: inline-block; vertical-align: middle; margin-left: 6px; }
    .sparkline polyline { fill: none; stroke-width: 1.5; stroke-linecap: round; stroke-linejoin: round; }
    /* --- Card Expand Affordance --- */
    .persona-card { cursor: pointer; transition: border-color 0.15s, box-shadow 0.15s; }
    .persona-card:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
    .card-chevron { display: inline-block; transition: transform 0.2s ease; color: #9ca3af; font-size: 16px; margin-left: 8px; }
    .persona-card.open .card-chevron { transform: rotate(90deg); }
    .card-detail { transition: max-height 0.25s ease, opacity 0.2s ease, padding 0.2s ease; max-height: 0; opacity: 0; overflow: hidden; padding-top: 0; margin-top: 0; border-top: none; }
    .persona-card.open .card-detail { display: block; max-height: 600px; opacity: 1; padding-top: 10px; margin-top: 10px; border-top: 1px solid #e5e7eb; }
    /* --- Skeleton Loading --- */
    @keyframes shimmer { 0% { background-position: -400px 0; } 100% { background-position: 400px 0; } }
    .skeleton { background: linear-gradient(90deg, #eee 25%, #ddd 37%, #eee 63%); background-size: 800px 100%; animation: shimmer 1.5s infinite linear; border-radius: 6px; min-height: 40px; }
    /* --- Fade-in Animation --- */
    @keyframes fadeSlideIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
    .gallery > *, .history-item, .bq-item, .runtime-event, .task-row, .source-card { animation: fadeSlideIn 0.2s ease both; }
    /* --- Bar Chart Transition --- */
    .bar-fill { transition: height 0.4s ease; }
    /* --- Pipeline Progress --- */
    .pipeline-progress { height: 4px; background: #e5e7eb; border-radius: 2px; margin-top: 8px; overflow: hidden; display: none; }
    .pipeline-progress.active { display: block; }
    .pipeline-progress-fill { height: 100%; background: #3b82f6; border-radius: 2px; transition: width 0.5s ease; width: 0; }
    /* --- Drag-drop --- */
    .drop-zone { border: 2px dashed transparent; border-radius: 8px; transition: border-color 0.2s, background 0.2s; }
    .drop-zone.drag-over { border-color: #3b82f6; background: rgba(59,130,246,0.05); }
    /* --- Bulk Select --- */
    .bulk-check { width: 16px; height: 16px; accent-color: #1f2933; cursor: pointer; flex-shrink: 0; }
    .bulk-bar { display: none; gap: 8px; align-items: center; padding: 8px 12px; background: #eef2ff; border-radius: 6px; margin-bottom: 8px; font-size: 13px; }
    .bulk-bar.visible { display: flex; }
    @media (max-width: 920px) { .layout { grid-template-columns: 1fr; } .two-col { grid-template-columns: 1fr; } .stats-row { grid-template-columns: 1fr; } .top-stats { grid-template-columns: repeat(2, 1fr); } }
    @media (max-width: 920px) { .runtime-layout { grid-template-columns: 1fr; } }
    html { scroll-behavior: smooth; scroll-padding-top: 52px; }
    .section-nav { display: flex; gap: 4px; position: sticky; top: 0; z-index: 50; background: #f6f4ee; padding: 10px 0; border-bottom: 1px solid #d4cec2; margin: 0 0 4px; }
    .section-nav a { padding: 5px 12px; border-radius: 6px; font-size: 12px; font-weight: 500; color: #6b7280; text-decoration: none; white-space: nowrap; }
    .section-nav a:hover { background: rgba(31, 41, 51, 0.08); color: #1f2933; }
    .del-btn { background: none; border: none; color: #9ca3af; cursor: pointer; font-size: 14px; padding: 0 4px; height: auto; line-height: 1; border-radius: 4px; }
    .del-btn:hover { color: #ef4444; background: rgba(239, 68, 68, 0.08); }
    .time-ago { font-size: 11px; color: #9ca3af; }
    html.dark-mode {
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
      .runtime-node, .runtime-event { background: #1f2429; border-color: #59616b; }
      .runtime-payload { background: rgba(244, 241, 232, 0.08); color: #d1d5db; }
      .indicator.pulse { background: #60a5fa; }
      .section-nav { background: #121416; border-bottom-color: #59616b; }
      .section-nav a { color: #9ca3af; }
      .section-nav a:hover { background: rgba(244, 241, 232, 0.08); color: #f4f1e8; }
      .btn-sm { border-color: #59616b; color: #f4f1e8; }
      .btn-sm.active { background: #f4f1e8; color: #121416; border-color: #f4f1e8; }
      .btn-sm:hover { background: rgba(244, 241, 232, 0.12); }
      .reanalyze-btn { border-color: #59616b; color: #f4f1e8; }
      .reanalyze-btn:hover { background: rgba(244, 241, 232, 0.12); }
      .task-done-btn { border-color: #59616b; color: #f4f1e8; }
      .task-done-btn:hover { background: rgba(16, 185, 129, 0.2); }
      .delta-up { color: #10b981; }
      .delta-down { color: #ef4444; }
      .top-stat { background: #1f2429; border-color: #59616b; }
      .count-pill { background: #1e3a5f; color: #93c5fd; }
      .count-pill.green { background: #064e3b; color: #a7f3d0; }
      .count-pill.orange { background: #78350f; color: #fde68a; }
      .source-card { background: #1f2429; border-color: #59616b; }
      .source-preview { color: #6b7280; }
      .prompt-box { background: #1f2429; border-color: #b91c1c; }
      .prompt-template { background: #1f2429; border-color: #59616b; }
      .prompt-template:hover { border-color: #9ca3af; }
      .toggle-slider { background: #4b5563; }
      .nav-badge { background: #374151; color: #d1d5db; }
      .input-type-badge.persona { background: #1e3a5f; color: #93c5fd; }
      .input-type-badge.idea { background: #78350f; color: #fde68a; }
      .input-type-badge.bug { background: #7f1d1d; color: #fecaca; }
      .input-type-badge.feature { background: #064e3b; color: #a7f3d0; }
      .input-type-badge.note { background: #374151; color: #d1d5db; }
      .input-type-badge.critique { background: #831843; color: #fbcfe8; }
      .bq-item { background: #1f2429; border-color: #59616b; }
      .dl-item { background: #2a1215; border-color: #7f1d1d; }
      .dl-error { color: #fca5a5; }
      .dl-retry-btn { background: #422006; color: #fcd34d; border-color: #854d0e; }
      .health-card { background: #1f2429; border-color: #59616b; }
      .health-label { color: #9ca3af; }
      .health-value { color: #e5e7eb; }
      .login-box { background: #1f2429; border-color: #59616b; }
      .conn-banner.error { background: #7f1d1d; color: #fecaca; border-color: #991b1b; }
      .conn-banner.reconnecting { background: #78350f; color: #fde68a; border-color: #92400e; }
      .search-box { background: #1f2429; border-color: #59616b; }
      .search-input { color: #f4f1e8; }
      .search-results { border-top-color: #374151; }
      .search-result:hover, .search-result.active { background: rgba(244,241,232,0.06); }
      .search-result-title { color: #f4f1e8; }
      .search-hint { color: #6b7280; }
      .search-kbd { background: #374151; border-color: #59616b; color: #9ca3af; }
      .toast { background: #f4f1e8; color: #121416; }
      .skeleton { background: linear-gradient(90deg, #374151 25%, #4b5563 37%, #374151 63%); background-size: 800px 100%; }
      .pipeline-progress { background: #374151; }
      .drop-zone.drag-over { border-color: #60a5fa; background: rgba(96,165,250,0.08); }
      .bulk-bar { background: #1e3a5f; color: #93c5fd; }
    }
  </style>
</head>
<body>
  <main>
    <div class="top">
      <div>
        <h1>ChefFlow Hub</h1>
        <p class="sub">Universal intake, analysis, and build planning</p>
      </div>
      <div style="display:flex;align-items:center;gap:12px">
        <button id="searchBtn" class="secondary" style="height:32px;font-size:12px;display:flex;align-items:center;gap:4px" onclick="openSearch()">Search <span class="search-kbd">Ctrl+K</span></button>
        <span id="statusIndicator" class="status-dot"><span class="dot-indicator orange"></span><span id="netText">Checking</span></span>
        <label class="toggle-switch"><input type="checkbox" id="darkToggle"><span class="toggle-slider"></span></label>
      </div>
    </div>

    <div id="topStats" class="top-stats">
      <div class="top-stat panel"><div class="stat-value" id="statPersonas">--</div><div class="stat-label">Personas</div></div>
      <div class="top-stat panel"><div class="stat-value" id="statAvgScore">--</div><div class="stat-label">Avg Score</div></div>
      <div class="top-stat panel"><div class="stat-value" id="statBuildQueue">--</div><div class="stat-label">Build Queue</div></div>
      <div class="top-stat panel"><div class="stat-value" id="statHealthScore">--</div><div class="stat-label">Health Score</div></div>
      <div class="top-stat panel"><div class="stat-value" id="statPipeline">--</div><div class="stat-label">Pipeline</div></div>
    </div>

    <div id="connBanner" class="conn-banner"></div>
    <div id="toastContainer" class="toast-container"></div>
    <div id="searchOverlay" class="search-overlay" onclick="if(event.target===this)closeSearch()">
      <div class="search-box">
        <input id="searchInput" class="search-input" type="text" placeholder="Search everything..." autocomplete="off">
        <div id="searchResults" class="search-results"><div class="search-hint">Type to search across all sections</div></div>
      </div>
    </div>

    <nav class="section-nav" id="sectionNav">
      <a href="#pipelineSection">Pipeline</a>
      <a href="#runtimeSection">Runtime<span class="nav-badge" id="navRuntime">0</span></a>
      <a href="#importSection">Import</a>
      <a href="#universalIntakeSection">Inbox<span class="nav-badge" id="navUniversalIntake">0</span></a>
      <a href="#intakeSection">Persona Intake<span class="nav-badge" id="navIntake">0</span></a>
      <a href="#sourcesSection">Sources</a>
      <a href="#findingsSection">Findings</a>
      <a href="#vaultSection">Vault</a>
      <a href="#personasSection">Personas<span class="nav-badge" id="navPersonas">0</span></a>
      <a href="#buildSection">Persona Tasks</a>
      <a href="#buildQueueSection">Build Queue<span class="nav-badge" id="navBuildQueue">0</span></a>
      <a href="#deadLetterSection">Dead Letter<span class="nav-badge" id="navDeadLetter">0</span></a>
      <a href="#metricsSection">Health</a>
      <a href="#intelligenceSection">Intel</a>
      <a href="#historySection">Queue</a>
      <a href="#promptsSection">Prompts</a>
      <a href="#submissionsSection">Submissions<span class="nav-badge" id="navSubmissions">0</span></a>
    </nav>

    <section id="pipelineSection" class="panel pipeline-monitor">
      <div class="pipeline-head">
        <h2><span id="pipelineDot" class="indicator"></span>Pipeline<span id="pipelineTimer" class="muted" style="margin-left:8px"></span></h2>
        <div style="display:flex;gap:6px">
          <button id="runPipeline" style="height:28px;font-size:12px">Run Pipeline</button>
          <button id="toggleLog" class="secondary" style="height:28px;font-size:12px">Expand</button>
        </div>
      </div>
      <div id="pipelineProgress" class="pipeline-progress"><div id="pipelineProgressFill" class="pipeline-progress-fill"></div></div>
      <div id="pipelineLog" class="pipeline-log collapsed"><pre id="log">Idle</pre></div>
    </section>

    <section id="runtimeSection" class="panel section">
      <div class="section-head">
        <h2>Runtime Spine <span class="count-pill green" id="runtimeCount">0 events</span></h2>
        <div class="filter-bar">
          <select id="runtimeTypeFilter" style="height:28px;font-size:12px">
            <option value="">All event types</option>
            <option value="model">Model</option>
            <option value="tool">Tool</option>
            <option value="state:update">State</option>
            <option value="agent">Agent</option>
            <option value="error">Errors</option>
            <option value="retry">Retries</option>
          </select>
        </div>
      </div>
      <div class="runtime-layout">
        <div>
          <h2>Execution Graph</h2>
          <div id="runtimeGraph" class="runtime-graph"><div class="empty">Waiting for live runtime events.</div></div>
        </div>
        <div>
          <h2>Live Feed</h2>
          <div id="runtimeFeed" class="runtime-feed"><div class="empty">Connecting to SSE.</div></div>
        </div>
      </div>
    </section>

    <div id="importSection" class="layout section">
      <section>
        <div class="bar">
          <label>What is this?
            <select id="inputType">
              <option value="auto">Auto-detect</option>
              <option value="persona">Persona</option>
              <option value="idea">Idea</option>
              <option value="bug">Bug</option>
              <option value="feature">Feature</option>
              <option value="note">Note</option>
              <option value="critique">Critique</option>
            </select>
          </label>
          <label>Persona type <select id="type">${typeOptions}</select></label>
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
        <textarea id="text" class="drop-zone" spellcheck="false" placeholder="Paste anything: personas, ideas, bugs, features, notes, critiques... (or drag files here)"></textarea>
        <p class="sub">Personas: use <code>--- persona: Chef: Name ---</code> markers or <code>Client: Name</code> headings. Everything else auto-classifies.</p>
      </section>
      <aside class="panel">
        <h2>Preview</h2>
        <div id="preview" class="preview-list"><div class="empty">Preview a paste before importing.</div></div>
      </aside>
    </div>

    <section id="universalIntakeSection" class="panel section">
      <div class="section-head">
        <h2>Universal Inbox <span class="count-pill" id="universalIntakeCount">0</span></h2>
        <div class="filter-bar">
          <select id="uIntakeTypeFilter" style="height:28px;font-size:12px">
            <option value="">All types</option>
            <option value="idea">Ideas</option>
            <option value="bug">Bugs</option>
            <option value="feature">Features</option>
            <option value="note">Notes</option>
            <option value="critique">Critiques</option>
            <option value="persona">Personas</option>
          </select>
          <select id="uIntakeStatusFilter" style="height:28px;font-size:12px">
            <option value="">All</option>
            <option value="pending">Pending</option>
            <option value="processed">Processed</option>
          </select>
        </div>
      </div>
      <div id="universalIntakeList"><div class="empty">No intake items. Submit ideas, bugs, features, or notes via Import above.</div></div>
    </section>

    <section id="intakeSection" class="panel section">
      <div class="section-head">
        <h2>Intake <span class="count-pill" id="intakeCount">0 total, 0 pending</span></h2>
        <div class="filter-bar">
          <select id="intakeTypeFilter" style="height:28px;font-size:12px">
            <option value="">All types</option>
            ${typeOptions}
          </select>
          <select id="intakeStatusFilter" style="height:28px;font-size:12px">
            <option value="queue">Queue</option>
            <option value="all">All</option>
          </select>
        </div>
      </div>
      <div id="intakeList"><div class="empty">No intake files.</div></div>
    </section>

    <section id="findingsSection" class="panel section">
      <h2>Findings</h2>
      <div id="findings"><div class="empty">No synthesis data yet. Run the pipeline to generate findings.</div></div>
    </section>

    <section id="sourcesSection" class="panel section">
      <div class="section-head">
        <h2>Sources <span class="count-pill" id="sourcesCount">0</span></h2>
        <div class="filter-bar">
          <select id="sourcesStatusFilter" style="height:28px;font-size:12px">
            <option value="">All statuses</option>
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
          </select>
        </div>
      </div>
      <div id="sourcesList" class="gallery"><div class="empty">No source files found.</div></div>
    </section>

    <section id="vaultSection" class="panel section">
      <div class="section-head">
        <h2>Vault <span class="count-pill orange" id="vaultCount">0 records</span></h2>
        <div class="filter-bar">
          <select id="vaultAuthorFilter" style="height:28px;font-size:12px">
            <option value="">All authors</option>
          </select>
          <input id="vaultSearch" type="text" placeholder="Search..." style="width:120px">
        </div>
      </div>
      <div id="vaultList"><div class="empty">No vault records.</div></div>
    </section>

    <section id="personasSection" class="panel section">
      <div class="preview-head">
        <h2>Personas</h2>
        <div class="bar" style="margin:0">
          <select id="personaSort" style="height:28px;font-size:12px">
            <option value="score-asc">Score (low first)</option>
            <option value="score-desc">Score (high first)</option>
            <option value="name">Name A-Z</option>
          </select>
        </div>
      </div>
      <div id="personas"><div class="empty">No persona reports found.</div></div>
    </section>

    <section id="buildSection" class="panel section">
      <div class="preview-head">
        <h2>Persona Build Tasks <span id="buildCount" class="muted" style="font-weight:400"></span></h2>
        <div style="display:flex;gap:4px;align-items:center">
          <span class="muted" style="font-size:11px;margin-right:4px">Filter:</span>
          <button class="btn-sm active" data-filter="ALL">All</button>
          <button class="btn-sm" data-filter="HIGH">HIGH</button>
          <button class="btn-sm" data-filter="MEDIUM">MEDIUM</button>
          <button class="btn-sm" data-filter="LOW">LOW</button>
        </div>
      </div>
      <div id="buildQueue"><div class="empty">No build tasks found.</div></div>
    </section>

    <section id="buildQueueSection" class="panel section">
      <div class="section-head">
        <h2>Build Queue <span class="count-pill orange" id="buildQueueCount">0</span></h2>
        <div class="filter-bar">
          <select id="bqPriorityFilter" style="height:28px;font-size:12px">
            <option value="">All priorities</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>
      <div id="buildQueueList"><div class="empty">No build queue items. Items appear from system/build-queue/.</div></div>
    </section>

    <section id="deadLetterSection" class="panel section">
      <div class="section-head">
        <h2>Dead Letter Queue <span class="count-pill red" id="deadLetterCount">0</span></h2>
        <button id="retryAllDeadLetter" class="secondary" style="height:28px;font-size:12px">Retry All</button>
      </div>
      <div id="deadLetterList"><div class="empty">No failed items. Pipeline errors land here for retry.</div></div>
    </section>

    <section id="metricsSection" class="panel section">
      <div class="section-head">
        <h2>Pipeline Health</h2>
        <button id="refreshHealth" class="secondary" style="height:28px;font-size:12px">Refresh</button>
      </div>
      <div id="healthGrid" class="health-grid">
        <div class="health-card">
          <div class="health-label">Status</div>
          <div class="health-value" id="healthStatus">--</div>
        </div>
        <div class="health-card">
          <div class="health-label">Uptime</div>
          <div class="health-value" id="healthUptime">--</div>
        </div>
        <div class="health-card">
          <div class="health-label">Ollama</div>
          <div class="health-value" id="healthOllama">--</div>
        </div>
        <div class="health-card">
          <div class="health-label">Processed</div>
          <div class="health-value" id="healthProcessed">--</div>
        </div>
        <div class="health-card">
          <div class="health-label">Failed</div>
          <div class="health-value" id="healthFailed">--</div>
        </div>
        <div class="health-card">
          <div class="health-label">Planner Success</div>
          <div class="health-value" id="healthPlannerRate">--</div>
        </div>
        <div class="health-card">
          <div class="health-label">Avg Analyzer</div>
          <div class="health-value" id="healthAvgAnalyzer">--</div>
        </div>
        <div class="health-card">
          <div class="health-label">Avg Planner</div>
          <div class="health-value" id="healthAvgPlanner">--</div>
        </div>
        <div class="health-card">
          <div class="health-label">Circuit Breaker</div>
          <div class="health-value" id="healthCircuitBreaker">--</div>
        </div>
      </div>
    </section>

    <section id="intelligenceSection" class="panel section">
      <div class="section-head">
        <h2>Intelligence Dashboard</h2>
        <button id="refreshIntel" class="secondary" style="height:28px;font-size:12px">Refresh</button>
      </div>

      <!-- Health Score Gauge -->
      <div class="two-col" style="margin-top:10px">
        <div class="panel" style="text-align:center;padding:18px">
          <div style="font-size:11px;color:#6b7280;margin-bottom:4px">HEALTH SCORE</div>
          <div id="intelScore" class="stat-value" style="font-size:48px">--</div>
          <div id="intelGrade" style="font-size:14px;font-weight:600;margin-top:2px">--</div>
          <div class="meter" style="margin-top:10px"><div id="intelScoreMeter" class="meter-fill" style="width:0%"></div></div>
          <div id="intelRecommendations" style="text-align:left;font-size:12px;color:#6b7280;margin-top:8px"></div>
        </div>
        <div class="panel" style="padding:18px">
          <div style="font-size:11px;color:#6b7280;margin-bottom:8px">PIPELINE FUNNEL</div>
          <div id="intelFunnel"></div>
          <div id="intelConversion" style="font-size:12px;color:#6b7280;margin-top:6px"></div>
        </div>
      </div>

      <!-- Coverage Heatmap -->
      <div class="panel" style="margin-bottom:14px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <div style="font-size:11px;color:#6b7280">CATEGORY COVERAGE</div>
          <div id="intelCoverageOverall" style="font-size:12px;font-weight:600"></div>
        </div>
        <table class="cat-table" id="intelCoverageTable">
          <thead><tr><th>Category</th><th>Health</th><th>Built</th><th>Partial</th><th>Missing</th><th>HIGH</th></tr></thead>
          <tbody id="intelCoverageBody"><tr><td colspan="6" class="empty">Loading...</td></tr></tbody>
        </table>
      </div>

      <!-- Stale Plans + Plan Priority -->
      <div class="two-col">
        <div class="panel" style="padding:14px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
            <div style="font-size:11px;color:#6b7280">STALE PLANS <span id="intelStaleCount" class="count-pill red">0</span></div>
            <button id="archiveStaleBtn" class="secondary" style="height:24px;font-size:11px">Archive All</button>
          </div>
          <div id="intelStaleList"><div class="empty">Loading...</div></div>
        </div>
        <div class="panel" style="padding:14px">
          <div style="font-size:11px;color:#6b7280;margin-bottom:8px">TOP PLANS (by priority)</div>
          <div id="intelPlanPriority"><div class="empty">Loading...</div></div>
        </div>
      </div>
    </section>

    <section id="historySection" class="panel section">
      <div class="preview-head">
        <h2>Import Queue</h2>
        <div class="bar" style="margin:0">
          <button id="sendQueued">Send queued</button>
          <button id="retryFailed" class="secondary">Retry failed</button>
          <button id="clearCompleted" class="secondary">Clear done</button>
          <button id="refresh" class="secondary">Resync</button>
        </div>
      </div>
      <div id="status" class="status"></div>
      <div id="history" class="history-list"></div>
    </section>
    <section id="promptsSection" class="panel section">
      <div class="section-head">
        <h2>Prompt Library</h2>
      </div>
      <p class="sub" style="margin-top:0">Generate personas directly with ChatGPT, or copy prompts manually. Type auto-detects on import.</p>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px">
        ${TYPES.map(t => '<button class="type-btn '+t+'" data-prompt-type="'+t+'">'+t+'</button>').join('')}
      </div>
      <div class="prompt-box" id="promptBox">
        <h3 id="promptBoxTitle">Generate Chef Persona with ChatGPT</h3>
        <p class="sub">Type your notes below. What kind of chef persona do you want? Be specific or leave blank for random.</p>
        <textarea id="promptNotes" style="min-height:100px" placeholder="e.g. Make them a farm-to-table chef in Vermont who hates technology..."></textarea>
        <div class="prompt-gen-bar">
          <select id="promptModel">
            <option value="gpt-4o-mini">GPT-4o Mini</option>
            <option value="gpt-4o">GPT-4o</option>
          </select>
          <select id="promptTier">
            <option value="premium">Premium prompt</option>
            <option value="standard">Standard prompt</option>
          </select>
          <button id="generatePrompt">Generate</button>
          <span id="promptStatus" class="dot-indicator green" style="margin-left:auto"></span>
        </div>
      </div>
      <div id="promptTemplates">
        <div class="prompt-template"><span class="label">Chef - Premium AI (Fictional)</span><button class="copy-btn" data-tpl="premium-fictional">Copy</button></div>
        <div class="prompt-template"><span class="label">Chef - Local Model (Real Person)</span><button class="copy-btn" data-tpl="local-real">Copy</button></div>
      </div>
    </section>

    <section id="submissionsSection" class="panel section">
      <div class="section-head">
        <h2>Submissions <span class="count-pill" id="submissionsCount">0</span></h2>
        <div class="filter-bar">
          <button id="newSubmission" style="height:28px;font-size:12px;background:#16a34a;border-color:#16a34a">+ New</button>
          <select id="submTypeFilter" style="height:28px;font-size:12px">
            <option value="">All types</option>
            ${typeOptions}
          </select>
          <select id="submStatusFilter" style="height:28px;font-size:12px">
            <option value="">All statuses</option>
            <option value="saved">Saved</option>
            <option value="queued">Queued</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
          </select>
        </div>
      </div>
      <div id="submissionsList"><div class="empty">No submissions yet.</div></div>
    </section>
  </main>

  <script>
    const TYPES = ${typesJson};
    const $ = id => document.getElementById(id);
    const inputTypeEl = $('inputType');
    const text = $('text'), statusEl = $('status'), type = $('type'), mode = $('mode');
    const previewEl = $('preview'), historyEl = $('history'), logEl = $('log');
    const netText = $('netText');
    const findingsEl = $('findings'), personasEl = $('personas'), buildQueueEl = $('buildQueue');
    const pipelineSection = $('pipelineSection'), pipelineLog = $('pipelineLog');
    const pipelineDot = $('pipelineDot'), pipelineTimer = $('pipelineTimer');
    const runtimeGraphEl = $('runtimeGraph'), runtimeFeedEl = $('runtimeFeed');
    const runtimeCountEl = $('runtimeCount'), runtimeTypeFilter = $('runtimeTypeFilter');
    const toggleLogBtn = $('toggleLog');
    let currentPreview = [], previewText = '', wasRunning = false, logUserToggled = false;
    let scoreHistoryData = [], allTaskData = [], taskCompletedCount = 0, currentTaskFilter = 'ALL';
    let runtimeEventSource = null, runtimeEvents = [], prevRunning = false;
    const buildCountEl = $('buildCount');

    function setNetwork() {
      updateStatusIndicator(navigator.onLine);
    }

    function esc(v) {
      return String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
    }

    function cleanName(raw) {
      return String(raw || 'Persona').replace(/[*]+/g, '').replace(/^[\\s"'\`\\u201c\\u201d\\u2018\\u2019]+|[\\s"'\`\\u201c\\u201d\\u2018\\u2019]+$/g, '').replace(/\\s*[\\u2014\\u2013]\\s*.*$/, '').replace(/\\s*\\(.*$/, '').trim() || 'Persona';
    }

    function timeAgo(iso) {
      if (!iso) return '';
      const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
      if (s < 60) return s + 's ago';
      if (s < 3600) return Math.floor(s/60) + 'm ago';
      if (s < 86400) return Math.floor(s/3600) + 'h ago';
      return Math.floor(s/86400) + 'd ago';
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
        const driftBadge = entry.isHardDrift
          ? '<span style="background:#c33;color:#fff;padding:2px 6px;border-radius:4px;font-size:11px;font-weight:bold">DRIFT ' +
            Math.round((entry.driftRatio || 0) * 100) +
            '%</span>'
          : entry.driftRatio > 0.4
            ? '<span style="background:#c90;color:#fff;padding:2px 6px;border-radius:4px;font-size:11px;font-weight:bold">DRIFT ' +
              Math.round((entry.driftRatio || 0) * 100) +
              '%</span>'
            : '';
        const scoreBadge =
          entry.validationScore > 0
            ? '<span style="background:' +
              (entry.validationScore >= 60 ? '#3a3' : entry.validationScore >= 40 ? '#c90' : '#c33') +
              ';color:#fff;padding:2px 6px;border-radius:4px;font-size:11px">' +
              entry.validationScore +
              '/100</span>'
            : '';
        const warns = entry.warnings?.length ? '<div class="warn">' + entry.warnings.map(esc).join('<br>') + '</div>' : '';
        return '<div class="preview-item" data-index="' + i + '"><div class="preview-head"><strong>#' + (i+1) + ' ' + esc(entry.name) + '</strong><span class="muted">' + esc(entry.chars + ' chars') + ' ' + driftBadge + ' ' + scoreBadge + '</span></div><div class="preview-controls"><select data-field="type">' + opts + '</select><input data-field="name" value="' + esc(entry.name) + '"></div><div class="muted" style="margin-top:8px">' + esc(entry.excerpt) + '</div>' + warns + '</div>';
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

    /* --- Runtime Spine --- */
    function runtimeClass(type) {
      if (type.startsWith('model:')) return 'model';
      if (type.startsWith('tool:')) return 'tool';
      if (type === 'error') return 'error';
      if (type === 'retry') return 'retry';
      return '';
    }

    function runtimeMatchesFilter(event) {
      const filter = runtimeTypeFilter?.value || '';
      if (!filter) return true;
      if (filter === 'model') return event.type.startsWith('model:');
      if (filter === 'tool') return event.type.startsWith('tool:');
      if (filter === 'agent') return event.type.startsWith('agent:');
      return event.type === filter;
    }

    function prettyPayload(payload) {
      try { return JSON.stringify(payload || {}, null, 2); }
      catch { return String(payload || ''); }
    }

    function renderRuntime() {
      const filtered = runtimeEvents.filter(runtimeMatchesFilter).slice(-120).reverse();
      runtimeCountEl.textContent = runtimeEvents.length + ' events';
      $('navRuntime').textContent = runtimeEvents.length;
      if (!filtered.length) {
        runtimeFeedEl.innerHTML = '<div class="empty">No matching runtime events.</div>';
      } else {
        runtimeFeedEl.innerHTML = filtered.map(event => {
          const typeClass = runtimeClass(event.type);
          return '<div class="runtime-event">' +
            '<div class="runtime-event-head"><span class="runtime-type '+typeClass+'">'+esc(event.type)+'</span><span class="muted">'+esc(new Date(event.timestamp).toLocaleTimeString())+'</span></div>' +
            '<div class="muted">'+esc(event.source)+' | '+esc(event.scope?.workflow || event.scope?.request || event.scope?.event || 'global')+'</div>' +
            '<pre class="runtime-payload">'+esc(prettyPayload(event.payload))+'</pre>' +
          '</div>';
        }).join('');
      }

      const workflows = new Map();
      for (const event of runtimeEvents.slice(-250)) {
        const key = event.scope?.workflow || event.scope?.request || event.scope?.event || event.source || 'global';
        if (!workflows.has(key)) workflows.set(key, []);
        workflows.get(key).push(event);
      }
      const nodes = [...workflows.entries()].slice(-12).reverse();
      if (!nodes.length) {
        runtimeGraphEl.innerHTML = '<div class="empty">Waiting for live runtime events.</div>';
        return;
      }
      runtimeGraphEl.innerHTML = nodes.map(([workflow, events]) => {
        const last = events.at(-1);
        const hasError = events.some(e => e.type === 'error');
        const active = events.some(e => ['model:start','tool:call','agent:spawn','retry'].includes(e.type)) && !events.some(e => ['model:end','agent:complete','error'].includes(e.type));
        const cls = hasError ? 'error' : active ? 'active' : 'complete';
        const chain = events.slice(-7).map(e => '<span>'+esc(e.type)+'</span>').join('<span class="runtime-arrow">></span>');
        return '<div class="runtime-node '+cls+'">' +
          '<div class="runtime-node-title"><strong>'+esc(workflow)+'</strong><span class="muted">'+events.length+' events</span></div>' +
          '<div class="muted">'+esc(last?.source || '')+' | '+esc(last ? new Date(last.timestamp).toLocaleTimeString() : '')+'</div>' +
          '<div class="runtime-node-chain">'+chain+'</div>' +
        '</div>';
      }).join('');
    }

    if (runtimeTypeFilter) runtimeTypeFilter.onchange = renderRuntime;

    function ingestRuntimeEvent(event) {
      if (!event || !event.id) return;
      if (runtimeEvents.some(existing => existing.id === event.id)) return;
      runtimeEvents.push(event);
      if (runtimeEvents.length > 500) runtimeEvents = runtimeEvents.slice(-500);
      renderRuntime();
    }

    function applySnapshot(payload) {
      const stateRes = payload.state || {};
      scoreHistoryData = payload.scoreHistory || [];
      const counts = stateRes.counts || {};
      const summary = (stateRes.pipeline?.pipeline||'Idle') + ' | files: '+(counts.uncompleted||0)+' | tasks: '+(counts.buildTasks||0);
      statusEl.textContent = summary;
      updatePipeline(stateRes.pipeline);
      renderHistory(stateRes.entries || []);
      renderFindings(payload.synthesis, Boolean(payload.synthesis?.error && payload.synthesis.error !== 'No synthesis data'));
      renderPersonas(payload.personas || [], false);
      renderBuildTasks(payload.buildTasks || { tasks: [], completedCount: 0 }, false);
      renderSources(payload.sources || [], false);
      renderVault(payload.vault || [], false);
      renderIntake(payload.intake || [], false);
      renderUniversalIntake(payload.universalIntake || []);
      renderBuildQueue(payload.buildQueue || []);
      renderSubmissions(stateRes.entries || []);
      runtimeEvents = stateRes.runtime?.events || runtimeEvents;
      renderRuntime();
      hideConnBanner();

      const pList = payload.personas || [];
      const scores = pList.map(p => p.score).filter(s => typeof s === 'number');
      const avgScore = scores.length ? Math.round(scores.reduce((a,b) => a+b, 0) / scores.length) : 0;
      const tasks = payload.buildTasks?.tasks || [];
      updateTopStats({
        personaCount: pList.length,
        avgScore,
        buildTasks: tasks.length,
        sourceCount: (payload.sources||[]).length,
        pipelineStatus: stateRes.pipeline?.running ? 'Running' : 'Idle',
      });

      const nowRunning = stateRes.pipeline?.running || false;
      if (prevRunning && !nowRunning && document.hidden) flashTitle('Pipeline done!');
      prevRunning = nowRunning;
    }

    function connectRuntimeStream() {
      if (runtimeEventSource) runtimeEventSource.close();
      runtimeEventSource = new EventSource('/events');
      runtimeEventSource.addEventListener('open', () => updateStatusIndicator(true));
      runtimeEventSource.addEventListener('snapshot', event => {
        updateStatusIndicator(true);
        applySnapshot(JSON.parse(event.data));
      });
      runtimeEventSource.addEventListener('runtime', event => {
        updateStatusIndicator(true);
        ingestRuntimeEvent(JSON.parse(event.data));
      });
      runtimeEventSource.onerror = () => {
        updateStatusIndicator(false);
        connErrorCount++;
        if (connErrorCount >= 3) {
          showConnBanner('error', 'Connection lost. Auto-reconnecting...');
        } else {
          showConnBanner('reconnecting', 'Reconnecting to server...');
        }
      };
    }

    /* --- Findings Dashboard --- */
    function renderFindings(data, loadError) {
      if (loadError) { findingsEl.innerHTML = '<div class="empty warn">Failed to load synthesis data. Check server logs.</div>'; return; }
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
        (rows ? '<div class="muted" style="margin-bottom:4px">Priority Categories</div><div style="overflow-x:auto;-webkit-overflow-scrolling:touch"><table class="cat-table"><thead><tr><th>#</th><th>Category</th><th>Personas</th><th>Severity</th><th>Score</th></tr></thead><tbody>'+rows+'</tbody></table></div>' : '');
    }

    /* --- Persona Gallery --- */
    let lastPersonaList = [];
    function sortPersonas(list, sortKey) {
      const sorted = [...list];
      if (sortKey === 'score-desc') sorted.sort((a,b) => (b.score??0) - (a.score??0));
      else if (sortKey === 'name') sorted.sort((a,b) => cleanName(a.name).localeCompare(cleanName(b.name)));
      else sorted.sort((a,b) => (a.score??0) - (b.score??0));
      return sorted;
    }
    function renderPersonas(list, loadError) {
      if (loadError) { personasEl.innerHTML = '<div class="empty warn">Failed to load persona data. Check server logs.</div>'; return; }
      if (list) lastPersonaList = list;
      const sortKey = ($('personaSort')||{}).value || 'score-asc';
      const sorted = sortPersonas(lastPersonaList, sortKey);
      if (!sorted.length) { personasEl.innerHTML = '<div class="empty">No persona reports found.</div>'; return; }
      const historyBySlug = {};
      if (scoreHistoryData.length) {
        for (const entry of scoreHistoryData) {
          if (!historyBySlug[entry.slug]) historyBySlug[entry.slug] = [];
          historyBySlug[entry.slug].push(entry);
        }
      }
      personasEl.innerHTML = '<div class="gallery">' + sorted.map(p => {
        const sc = scoreClass(p.score ?? 0);
        const gaps = (p.gaps||[]).slice(0,5).map(g =>
          '<div style="padding:4px 0;font-size:12px"><span class="status-badge '+sevClass(g.severity)+'" style="font-size:10px">'+g.severity+'</span> '+esc(g.title)+'</div>'
        ).join('');
        const filePath = p.file ? '<div class="muted" style="margin-top:6px;font-size:11px">docs/stress-tests/'+esc(p.file)+'</div>' : '';
        let deltaHtml = '';
        const hist = historyBySlug[p.slug];
        if (hist && hist.length >= 2) {
          const scores = hist.map(h => h.score).filter(s => typeof s === 'number');
          if (scores.length >= 2) {
            const delta = scores[scores.length-1] - scores[scores.length-2];
            if (delta > 0) deltaHtml = '<span class="delta-up">+' + delta + '</span>';
            else if (delta < 0) deltaHtml = '<span class="delta-down">' + delta + '</span>';
          }
        }
        const reanalyzeBtn = p.slug ? '<button class="reanalyze-btn" onclick="event.stopPropagation();reanalyzePersona(\\\''+esc(p.slug)+'\\\',\\\''+esc(p.name)+'\\\')">Re-analyze</button>' : '';
        return '<div class="persona-card" onclick="this.classList.toggle(\\\'open\\\')">' +
          '<div class="card-head"><div><strong>'+esc(cleanName(p.name))+'</strong>'+reanalyzeBtn+'<div class="muted">'+esc(p.type)+(p.date?' &middot; '+esc(p.date):'')+'</div></div>' +
          '<div style="text-align:right"><span class="score '+sc+'" style="font-size:20px">'+(p.score??'?')+'</span>'+deltaHtml+'</div></div>' +
          '<div class="card-detail">'+(p.summary?'<div style="font-size:12px;margin-bottom:8px;color:#4b5563">'+esc(p.summary)+'</div>':'')+(gaps||'<div class="muted">No gaps.</div>')+filePath+'</div></div>';
      }).join('') + '</div>';
    }

    /* --- Build Queue --- */
    function renderBuildTasks(data, loadError) {
      if (loadError) { buildQueueEl.innerHTML = '<div class="empty warn">Failed to load build tasks. Check server logs.</div>'; buildCountEl.textContent = ''; return; }
      const tasks = Array.isArray(data) ? data : (data?.tasks || []);
      const completed = Array.isArray(data) ? 0 : (data?.completedCount || 0);
      if (tasks.length) allTaskData = tasks;
      taskCompletedCount = completed;
      const filtered = currentTaskFilter === 'ALL' ? allTaskData : allTaskData.filter(t => t.severity === currentTaskFilter);
      buildCountEl.textContent = '(' + allTaskData.length + ' pending' + (taskCompletedCount ? ', ' + taskCompletedCount + ' done' : '') + ')';
      if (!filtered.length) { buildQueueEl.innerHTML = '<div class="empty">' + (allTaskData.length ? 'No ' + currentTaskFilter + ' tasks.' : 'No build tasks found.') + '</div>'; return; }
      buildQueueEl.innerHTML = filtered.map(t =>
        '<div class="task-row">' +
        '<button class="task-done-btn" onclick="completeTask(\\\''+esc(t.path)+'\\\')" title="Mark done">&#10003;</button>' +
        '<div style="flex:1"><strong style="font-size:13px">'+esc(t.title)+'</strong><div class="muted">'+esc(t.persona)+'</div></div>' +
        '<span class="status-badge '+sevClass(t.severity)+'">'+t.severity+'</span></div>'
      ).join('');
    }

    /* --- Import Queue --- */
    function renderHistory(entries) {
      if (!entries.length) { historyEl.innerHTML = '<div class="empty">No imported entries yet.</div>'; return; }
      historyEl.innerHTML = entries.slice(0, 80).map(entry => {
        const err = entry.last_error ? '<div class="warn">'+esc(entry.last_error)+'</div>' : '';
        const ago = entry.created_at ? '<span class="time-ago">'+timeAgo(entry.created_at)+'</span>' : '';
        return '<div class="history-item"><div class="history-head"><strong>'+esc(cleanName(entry.name))+'</strong>' +
          '<div style="display:flex;gap:6px;align-items:center">'+ago+
          '<span class="status-badge status-'+esc(entry.status)+'">'+statusLabel(entry.status)+'</span>' +
          '<button class="del-btn" onclick="deleteEntry(\\\''+entry.id+'\\\')" title="Delete">&times;</button>' +
          '</div></div>' +
          '<div class="muted">'+esc(entry.type)+' | '+esc(entry.relativePath||entry.codexSlug||'')+'</div>' +
          '<div class="muted">'+esc(entry.preview||'')+'</div>'+err+'</div>';
      }).join('');
    }

    /* --- Intake --- */
    let allIntakeData = [];
    const intakeListEl = $('intakeList'), intakeCountEl = $('intakeCount');
    function renderIntake(data, loadError) {
      if (loadError) { intakeListEl.innerHTML = '<div class="empty warn">Failed to load intake.</div>'; return; }
      if (data) allIntakeData = data;
      const typeF = ($('intakeTypeFilter')||{}).value || '';
      const filtered = typeF ? allIntakeData.filter(i => i.type === typeF) : allIntakeData;
      intakeCountEl.textContent = allIntakeData.length + ' total, ' + allIntakeData.length + ' pending';
      $('navIntake').textContent = allIntakeData.length;
      if (!filtered.length) { intakeListEl.innerHTML = '<div class="empty">No intake files.</div>'; return; }
      intakeListEl.innerHTML = '<div class="gallery">' + filtered.map(i =>
        '<div class="source-card"><div class="source-head"><div><strong>'+esc(i.name)+'</strong><div class="source-meta">'+esc(i.type)+' | '+i.words+' words</div></div></div>' +
        '<div class="source-preview">'+esc(i.preview || '')+'</div></div>'
      ).join('') + '</div>';
    }
    if ($('intakeTypeFilter')) $('intakeTypeFilter').onchange = () => renderIntake();

    /* --- Sources --- */
    let allSourceData = [];
    const sourcesListEl = $('sourcesList'), sourcesCountEl = $('sourcesCount');
    function renderSources(data, loadError) {
      if (loadError) { sourcesListEl.innerHTML = '<div class="empty warn">Failed to load sources.</div>'; return; }
      if (data) allSourceData = data;
      const statusF = ($('sourcesStatusFilter')||{}).value || '';
      const filtered = statusF ? allSourceData.filter(s => s.status === statusF) : allSourceData;
      const completed = allSourceData.filter(s => s.status === 'completed').length;
      sourcesCountEl.textContent = allSourceData.length + (completed ? ' (' + completed + ' completed)' : '');
      if (!filtered.length) { sourcesListEl.innerHTML = '<div class="empty">No source files found.</div>'; return; }
      sourcesListEl.innerHTML = '<div class="gallery">' + filtered.map(s => {
        const badgeClass = s.status === 'completed' ? 'status-completed' : s.status === 'failed' ? 'status-failed' : 'status-queued';
        return '<div class="source-card"><div class="source-head"><div><strong>'+esc(s.name)+'</strong>' +
          '<div class="source-meta">'+esc(s.type)+' | '+s.words+' words</div></div>' +
          '<span class="status-badge '+badgeClass+'">'+esc(s.status)+'</span></div>' +
          '<div class="source-preview">'+esc(s.preview || '')+'</div></div>';
      }).join('') + '</div>';
    }
    if ($('sourcesStatusFilter')) $('sourcesStatusFilter').onchange = () => renderSources();

    /* --- Vault --- */
    let allVaultData = [];
    const vaultListEl = $('vaultList'), vaultCountEl = $('vaultCount');
    function renderVault(data, loadError) {
      if (loadError) { vaultListEl.innerHTML = '<div class="empty warn">Failed to load vault.</div>'; return; }
      if (data) allVaultData = data;
      const authorF = ($('vaultAuthorFilter')||{}).value || '';
      const searchF = ($('vaultSearch')||{}).value.toLowerCase() || '';
      let filtered = allVaultData;
      if (authorF) filtered = filtered.filter(v => (v.author?.name||'') === authorF);
      if (searchF) filtered = filtered.filter(v => (v.persona_name||'').toLowerCase().includes(searchF));
      vaultCountEl.textContent = allVaultData.length + ' records';
      // Populate author dropdown
      const authorSelect = $('vaultAuthorFilter');
      if (authorSelect && authorSelect.options.length <= 1 && allVaultData.length) {
        const authors = [...new Set(allVaultData.map(v => v.author?.name).filter(Boolean))];
        for (const a of authors) { const o = document.createElement('option'); o.value = a; o.textContent = a; authorSelect.appendChild(o); }
      }
      if (!filtered.length) { vaultListEl.innerHTML = '<div class="empty">No vault records.</div>'; return; }
      vaultListEl.innerHTML = '<div class="gallery">' + filtered.map(v =>
        '<div class="source-card"><div class="source-head"><div><strong>'+esc(v.persona_name||'Unknown')+'</strong>' +
        '<div class="source-meta">'+esc(v.persona_type||'')+' | '+esc(v.chars||0)+' chars | '+esc(v.author?.name||'unknown')+'</div></div></div>' +
        '<div class="muted" style="margin-top:4px;font-size:11px">'+esc(v.source_file||'')+'</div></div>'
      ).join('') + '</div>';
    }
    if ($('vaultAuthorFilter')) $('vaultAuthorFilter').onchange = () => renderVault();
    if ($('vaultSearch')) $('vaultSearch').oninput = () => renderVault();

    /* --- Submissions --- */
    let allSubmissionData = [];
    const submissionsListEl = $('submissionsList'), submissionsCountEl = $('submissionsCount');
    function renderSubmissions(entries) {
      if (entries) allSubmissionData = entries;
      const typeF = ($('submTypeFilter')||{}).value || '';
      const statusF = ($('submStatusFilter')||{}).value || '';
      let filtered = allSubmissionData;
      if (typeF) filtered = filtered.filter(e => e.type === typeF);
      if (statusF) filtered = filtered.filter(e => e.status === statusF);
      submissionsCountEl.textContent = allSubmissionData.length;
      $('navSubmissions').textContent = allSubmissionData.length;
      if (!filtered.length) { submissionsListEl.innerHTML = '<div class="empty">No submissions yet.</div>'; return; }
      submissionsListEl.innerHTML = filtered.slice(0, 80).map(entry => {
        const err = entry.last_error ? '<div class="warn">'+esc(entry.last_error)+'</div>' : '';
        const ago = entry.created_at ? '<span class="time-ago">'+timeAgo(entry.created_at)+'</span>' : '';
        return '<div class="history-item"><div class="history-head"><strong>'+esc(cleanName(entry.name))+'</strong>' +
          '<div style="display:flex;gap:6px;align-items:center">'+ago+
          '<span class="status-badge status-'+esc(entry.status)+'">'+statusLabel(entry.status)+'</span>' +
          '<button class="del-btn" onclick="deleteEntry(\\\''+entry.id+'\\\')" title="Delete">&times;</button>' +
          '</div></div>' +
          '<div class="muted">'+esc(entry.type)+' | '+esc(entry.relativePath||entry.codexSlug||'')+'</div>'+err+'</div>';
      }).join('');
    }
    if ($('submTypeFilter')) $('submTypeFilter').onchange = () => renderSubmissions();
    if ($('submStatusFilter')) $('submStatusFilter').onchange = () => renderSubmissions();

    /* --- Universal Intake --- */
    let allUniversalIntakeData = [];
    const uIntakeListEl = $('universalIntakeList'), uIntakeCountEl = $('universalIntakeCount');
    function renderUniversalIntake(data) {
      if (data) allUniversalIntakeData = data;
      const typeF = ($('uIntakeTypeFilter')||{}).value || '';
      const statusF = ($('uIntakeStatusFilter')||{}).value || '';
      let filtered = allUniversalIntakeData;
      if (typeF) filtered = filtered.filter(i => i.inputType === typeF);
      if (statusF) filtered = filtered.filter(i => i.status === statusF);
      uIntakeCountEl.textContent = allUniversalIntakeData.length;
      $('navUniversalIntake').textContent = allUniversalIntakeData.length;
      if (!filtered.length) { uIntakeListEl.innerHTML = '<div class="empty">No intake items matching filters.</div>'; return; }
      uIntakeListEl.innerHTML = '<div class="gallery">' + filtered.map(i => {
        const processedBadge = i.processed ? '<span class="status-badge status-completed">Expanded</span>' : '<span class="status-badge status-queued">Pending</span>';
        return '<div class="source-card"><div class="source-head"><div><strong>'+esc(i.title)+'</strong>' +
          '<div class="source-meta"><span class="input-type-badge '+esc(i.inputType)+'">'+esc(i.inputType)+'</span> '+i.words+' words'+(i.submitted ? ' | '+timeAgo(i.submitted) : '')+'</div></div>' +
          processedBadge + '</div>' +
          '<div class="source-preview">'+esc(i.excerpt || '')+'</div></div>';
      }).join('') + '</div>';
    }
    if ($('uIntakeTypeFilter')) $('uIntakeTypeFilter').onchange = () => renderUniversalIntake();
    if ($('uIntakeStatusFilter')) $('uIntakeStatusFilter').onchange = () => renderUniversalIntake();

    /* --- Build Queue (from system/build-queue/) --- */
    let allBuildQueueData = [];
    const bqListEl = $('buildQueueList'), bqCountEl = $('buildQueueCount');
    function renderBuildQueue(data) {
      if (data) allBuildQueueData = data;
      const priorityF = ($('bqPriorityFilter')||{}).value || '';
      let filtered = allBuildQueueData;
      if (priorityF) filtered = filtered.filter(i => i.priority === priorityF);
      bqCountEl.textContent = allBuildQueueData.length;
      $('navBuildQueue').textContent = allBuildQueueData.length;
      if (!filtered.length) { bqListEl.innerHTML = '<div class="empty">'+(allBuildQueueData.length ? 'No '+priorityF+' priority items.' : 'No build queue items.')+'</div>'; return; }
      bqListEl.innerHTML = filtered.map(i =>
        '<div class="bq-item"><span class="bq-priority '+esc(i.priority)+'">'+esc(i.priority)+'</span>' +
        '<div style="flex:1"><strong style="font-size:13px">'+esc(i.title)+'</strong>' +
        '<div class="muted">'+esc(i.path || i.file)+'</div></div>' +
        '<span class="status-badge status-'+esc(i.status || 'pending')+'">'+esc(i.status || 'pending')+'</span></div>'
      ).join('');
    }
    if ($('bqPriorityFilter')) $('bqPriorityFilter').onchange = () => renderBuildQueue();

    /* --- Dead Letter Queue --- */
    let allDeadLetterData = [];
    const dlListEl = $('deadLetterList'), dlCountEl = $('deadLetterCount');
    function renderDeadLetter(data) {
      if (data) allDeadLetterData = data.items || data || [];
      dlCountEl.textContent = allDeadLetterData.length;
      $('navDeadLetter').textContent = allDeadLetterData.length;
      if (!allDeadLetterData.length) { dlListEl.innerHTML = '<div class="empty">No failed items. Pipeline errors land here for retry.</div>'; return; }
      dlListEl.innerHTML = allDeadLetterData.map((item, idx) => {
        const src = esc(item.source_file || 'unknown');
        const errText = esc((item.error || '').slice(0, 300));
        const age = item.age_hours != null ? item.age_hours.toFixed(1) + 'h ago' : '';
        return '<div class="dl-item">' +
          '<div style="flex:1"><strong style="font-size:13px">' + src.split(/[\\\\/]/).pop() + '</strong>' +
          '<div class="muted">' + src + '</div>' +
          '<div class="dl-error">' + errText + '</div></div>' +
          '<div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">' +
          '<span class="dl-age">' + age + '</span>' +
          '<button class="dl-retry-btn" onclick="retryDeadLetter(' + idx + ')">Retry</button></div></div>';
      }).join('');
    }
    async function retryDeadLetter(idx) {
      try {
        const item = allDeadLetterData[idx];
        if (!item) return;
        const res = await postJson('/api/dead-letter/retry', { source_file: item.source_file });
        showToast('Retrying: ' + (item.source_file || '').split(/[\\\\/]/).pop(), 'success');
        await refreshState();
      } catch (e) { showToast('Retry failed: ' + e.message, 'error'); }
    }
    $('retryAllDeadLetter').onclick = async () => {
      if (!allDeadLetterData.length) return;
      if (!confirm('Retry all ' + allDeadLetterData.length + ' dead-letter items?')) return;
      try {
        await postJson('/api/dead-letter/retry-all', {});
        showToast('Retrying all dead-letter items', 'success');
        await refreshState();
      } catch (e) { showToast('Retry-all failed: ' + e.message, 'error'); }
    };

    /* --- Pipeline Health --- */
    function renderHealth(healthData, metricsData) {
      if (!healthData) return;
      const s = healthData.status || '--';
      const sEl = $('healthStatus');
      sEl.textContent = s;
      sEl.className = 'health-value ' + (s === 'ok' ? 'green' : s === 'degraded' ? 'orange' : 'red');
      const upSec = healthData.uptime_s || 0;
      const h = Math.floor(upSec / 3600), m = Math.floor((upSec % 3600) / 60);
      $('healthUptime').textContent = h > 0 ? h + 'h ' + m + 'm' : m + 'm';
      const oEl = $('healthOllama');
      const oStatus = healthData.ollama || '--';
      oEl.textContent = oStatus;
      oEl.className = 'health-value ' + (oStatus === 'ok' ? 'green' : 'orange');
      const pipe = healthData.pipeline || {};
      $('healthProcessed').textContent = pipe.processed ?? '--';
      const fEl = $('healthFailed');
      fEl.textContent = pipe.failed ?? '--';
      fEl.className = 'health-value ' + ((pipe.failed || 0) > 0 ? 'red' : 'green');
      if (metricsData) {
        $('healthPlannerRate').textContent = (metricsData.planner_success_rate_pct ?? '--') + '%';
        const avgA = metricsData.avg_analyzer_ms || 0;
        $('healthAvgAnalyzer').textContent = avgA > 0 ? (avgA / 1000).toFixed(1) + 's' : '--';
        const avgP = metricsData.avg_planner_ms || 0;
        $('healthAvgPlanner').textContent = avgP > 0 ? (avgP / 1000).toFixed(1) + 's' : '--';
      }
      const cb = healthData.circuit_breaker;
      if (cb) {
        const cbEl = $('healthCircuitBreaker');
        cbEl.textContent = cb.state + (cb.state === 'open' ? ' (' + cb.cooldown_remaining_s + 's)' : '');
        cbEl.className = 'health-value ' + (cb.state === 'closed' ? 'green' : cb.state === 'open' ? 'red' : 'orange');
      }
    }
    $('refreshHealth').onclick = async () => {
      try {
        const [h, m] = await Promise.all([
          fetch('/healthz').then(r => r.json()),
          fetch('/api/metrics').then(r => r.json()),
        ]);
        renderHealth(h, m);
        showToast('Health refreshed', 'success');
      } catch (e) { showToast('Health fetch failed', 'error'); }
    };

    /* --- Connection Banner --- */
    const connBanner = $('connBanner');
    let connErrorCount = 0;
    function showConnBanner(type, msg) {
      connBanner.className = 'conn-banner ' + type;
      connBanner.textContent = msg;
    }
    function hideConnBanner() {
      connBanner.className = 'conn-banner';
      connBanner.textContent = '';
      connErrorCount = 0;
    }

    /* --- Top Stats --- */
    function updateTopStats(data) {
      const personas = data.personaCount || 0;
      const avgScore = data.avgScore || 0;
      const buildQueue = data.buildTasks || 0;
      const pipelineStatus = data.pipelineStatus || 'Idle';
      $('statPersonas').textContent = personas;
      $('statAvgScore').textContent = avgScore;
      $('statBuildQueue').textContent = buildQueue;
      $('statPipeline').textContent = pipelineStatus;
      $('navPersonas').textContent = personas;
      // Fetch health score for top stat
      fetch('/api/health-score').then(r => r.json()).then(hs => {
        const el = $('statHealthScore');
        el.textContent = hs.score + ' ' + hs.grade;
        el.className = 'stat-value ' + (hs.score < 40 ? 'score-red' : hs.score < 70 ? 'score-yellow' : 'score-green');
      }).catch(() => {});
    }

    /* --- Status Indicator --- */
    function updateStatusIndicator(ok) {
      const dot = $('statusIndicator').querySelector('.dot-indicator');
      if (ok) { dot.className = 'dot-indicator green'; $('netText').textContent = 'Online'; }
      else { dot.className = 'dot-indicator orange'; $('netText').textContent = 'Error'; }
    }

    /* --- Dark Mode Toggle --- */
    const darkToggle = $('darkToggle');
    if (darkToggle) {
      const saved = localStorage.getItem('persona-dark-mode');
      if (saved === 'true' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        darkToggle.checked = true;
        document.documentElement.classList.add('dark-mode');
      }
      darkToggle.onchange = () => {
        document.documentElement.classList.toggle('dark-mode', darkToggle.checked);
        localStorage.setItem('persona-dark-mode', darkToggle.checked);
      };
    }

    /* --- Prompt Library --- */
    let currentPromptType = 'Chef';
    document.querySelectorAll('[data-prompt-type]').forEach(btn => {
      btn.onclick = () => {
        currentPromptType = btn.dataset.promptType;
        $('promptBoxTitle').textContent = 'Generate ' + currentPromptType + ' Persona with ChatGPT';
      };
    });
    if ($('newSubmission')) $('newSubmission').onclick = () => { document.querySelector('[href="#importSection"]').click(); text.focus(); };

    /* --- Nav Active Tracking --- */
    const navLinks = document.querySelectorAll('.section-nav a');
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          navLinks.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + entry.target.id));
        }
      }
    }, { rootMargin: '-60px 0px -70% 0px', threshold: 0 });
    document.querySelectorAll('section[id]').forEach(s => observer.observe(s));

    /* --- State Refresh --- */
    async function refreshState(options = {}) {
      let stateRes, synthData, personaList, taskData, historyData, sourceData, vaultData, intakeData, uIntakeData, bqData, dlData, healthData, metricsData;
      let synthErr = false, personaErr = false, taskErr = false, sourceErr = false, vaultErr = false, intakeErr = false;
      try {
        [stateRes, synthData, personaList, taskData, historyData, sourceData, vaultData, intakeData, uIntakeData, bqData] = await Promise.all([
          fetch('/state').then(r => r.json()),
          fetch('/api/synthesis').then(r => r.json()).catch(() => { synthErr = true; return null; }),
          fetch('/api/personas').then(r => r.json()).catch(() => { personaErr = true; return []; }),
          fetch('/api/build-tasks').then(r => r.json()).catch(() => { taskErr = true; return { tasks: [], completedCount: 0 }; }),
          fetch('/api/score-history').then(r => r.json()).catch(() => []),
          fetch('/api/sources').then(r => r.json()).catch(() => { sourceErr = true; return []; }),
          fetch('/api/vault').then(r => r.json()).catch(() => { vaultErr = true; return []; }),
          fetch('/api/intake').then(r => r.json()).catch(() => { intakeErr = true; return []; }),
          fetch('/api/universal-intake').then(r => r.json()).catch(() => []),
          fetch('/api/build-queue').then(r => r.json()).catch(() => []),
          fetch('/api/dead-letter').then(r => r.json()).catch(() => ({ items: [] })),
          fetch('/healthz').then(r => r.json()).catch(() => null),
          fetch('/api/metrics').then(r => r.json()).catch(() => null),
        ]);
      } catch (err) {
        statusEl.textContent = 'Connection error: ' + err.message;
        updateStatusIndicator(false);
        showConnBanner('error', 'Failed to fetch state: ' + err.message);
        return;
      }
      updateStatusIndicator(true);
      hideConnBanner();
      scoreHistoryData = historyData || [];
      const counts = stateRes.counts || {};
      const summary = (stateRes.pipeline?.pipeline||'Idle') + ' | files: '+(counts.uncompleted||0)+' | tasks: '+(counts.buildTasks||0);
      if (!options.preserveStatus) statusEl.textContent = summary;
      updatePipeline(stateRes.pipeline);
      renderHistory(stateRes.entries || []);
      renderFindings(synthData, synthErr);
      renderPersonas(personaList, personaErr);
      renderBuildTasks(taskData, taskErr);
      renderSources(sourceData, sourceErr);
      renderVault(vaultData, vaultErr);
      renderIntake(intakeData, intakeErr);
      renderUniversalIntake(uIntakeData || []);
      renderBuildQueue(bqData || []);
      renderDeadLetter(dlData || { items: [] });
      renderHealth(healthData, metricsData);
      renderSubmissions(stateRes.entries || []);

      // Update top stats
      const pList = personaErr ? [] : (personaList || []);
      const scores = pList.map(p => p.score).filter(s => typeof s === 'number');
      const avgScore = scores.length ? Math.round(scores.reduce((a,b) => a+b, 0) / scores.length) : 0;
      const tasks = Array.isArray(taskData) ? taskData : (taskData?.tasks || []);
      updateTopStats({
        personaCount: pList.length,
        avgScore,
        buildTasks: tasks.length,
        sourceCount: sourceErr ? 0 : (sourceData||[]).length,
        pipelineStatus: stateRes.pipeline?.running ? 'Running' : 'Idle',
      });

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
        const selectedInputType = inputTypeEl.value;
        const detectedType = selectedInputType === 'auto' ? null : selectedInputType;
        if (detectedType && detectedType !== 'persona') {
          // Route to universal intake
          const result = await postJson('/api/intake-submit', {
            content: text.value,
            inputType: detectedType,
            title: text.value.split('\\n')[0].slice(0, 80).replace(/^#+\\s*/, ''),
          });
          text.value = ''; currentPreview = []; renderPreview();
          const refreshed = await refreshState({ preserveStatus: true });
          statusEl.textContent = 'Saved ' + result.inputType + ': ' + esc(result.title) + (result.expanding ? ' (AI expanding...)' : '');
        } else {
          let entries = currentPreview;
          if (!entries.length || previewText !== text.value) entries = await buildPreview();
          const result = await postJson('/import', { text: text.value, defaultType: type.value, mode: mode.value, entries });
          text.value = ''; currentPreview = []; renderPreview();
          const refreshed = await refreshState({ preserveStatus: true });
          statusEl.textContent = 'Imported ' + result.created.length + ' file(s). ' + result.pipeline + '. ' + (refreshed?.summary || '');
        }
      } catch(e) { statusEl.textContent = e.message; }
    };
    $('clear').onclick = () => { text.value = ''; currentPreview = []; previewText = ''; renderPreview(); text.focus(); };
    $('sendQueued').onclick = async () => { try { const r = await postJson('/send-queued', {}); statusEl.textContent = r.pipeline; await refreshState(); } catch(e) { statusEl.textContent = e.message; } };
    $('retryFailed').onclick = async () => { try { const r = await postJson('/retry-failed', {}); statusEl.textContent = r.pipeline; await refreshState(); } catch(e) { statusEl.textContent = e.message; } };
    $('refresh').onclick = refreshState;
    $('clearCompleted').onclick = async () => { try { const r = await postJson('/clear-completed', {}); statusEl.textContent = 'Cleared '+r.removed+' completed entries'; await refreshState(); } catch(e) { statusEl.textContent = e.message; } };
    if ($('personaSort')) $('personaSort').onchange = () => renderPersonas();

    /* --- Run Pipeline --- */
    $('runPipeline').onclick = async () => {
      try {
        const r = await postJson('/run-pipeline', {});
        statusEl.textContent = r.pipeline || 'Pipeline started';
        await refreshState();
      } catch(e) { statusEl.textContent = e.message; }
    };

    /* --- Severity Filter --- */
    document.querySelectorAll('[data-filter]').forEach(btn => {
      btn.onclick = () => {
        currentTaskFilter = btn.dataset.filter;
        document.querySelectorAll('[data-filter]').forEach(b => b.classList.toggle('active', b === btn));
        renderBuildTasks(null);
      };
    });

    /* --- Re-analyze Persona --- */
    window.reanalyzePersona = async (slug, name) => {
      try {
        await postJson('/api/reanalyze', { slug });
        statusEl.textContent = 'Re-analysis queued for ' + name;
      } catch(e) { statusEl.textContent = e.message; }
    };

    /* --- Complete Build Task --- */
    window.completeTask = async (path) => {
      try {
        await postJson('/api/complete-task', { path });
        await refreshState();
      } catch(e) { statusEl.textContent = e.message; }
    };

    /* --- Delete Entry --- */
    window.deleteEntry = async (id) => {
      try { await postJson('/delete-entry', { id }); await refreshState(); }
      catch(e) { statusEl.textContent = e.message; }
    };

    /* --- Title Flash on Pipeline Complete --- */
    let titleFlashInterval = null;
    const originalTitle = document.title;
    function flashTitle(msg) {
      if (titleFlashInterval) clearInterval(titleFlashInterval);
      let on = true;
      titleFlashInterval = setInterval(() => {
        document.title = on ? msg : originalTitle;
        on = !on;
      }, 800);
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden && titleFlashInterval) {
          clearInterval(titleFlashInterval);
          titleFlashInterval = null;
          document.title = originalTitle;
        }
      }, { once: true });
      setTimeout(() => { if (titleFlashInterval) { clearInterval(titleFlashInterval); titleFlashInterval = null; document.title = originalTitle; } }, 30000);
    }

    window.addEventListener('online', setNetwork);
    window.addEventListener('offline', setNetwork);
    setNetwork();
    connectRuntimeStream();

    /* ========== TOAST SYSTEM ========== */
    function toast(msg, type = '') {
      const el = document.createElement('div');
      el.className = 'toast' + (type ? ' ' + type : '');
      el.textContent = msg;
      $('toastContainer').appendChild(el);
      setTimeout(() => el.remove(), 4000);
    }

    /* ========== GLOBAL SEARCH (Ctrl+K) ========== */
    const searchOverlay = $('searchOverlay');
    const searchInput = $('searchInput');
    const searchResultsEl = $('searchResults');
    let searchActiveIndex = -1;

    function openSearch() {
      searchOverlay.classList.add('open');
      searchInput.value = '';
      searchInput.focus();
      searchActiveIndex = -1;
      searchResultsEl.innerHTML = '<div class="search-hint">Type to search across all sections</div>';
    }
    function closeSearch() {
      searchOverlay.classList.remove('open');
    }

    function searchAll(query) {
      if (!query || query.length < 2) {
        searchResultsEl.innerHTML = '<div class="search-hint">Type at least 2 characters</div>';
        return;
      }
      const q = query.toLowerCase();
      const results = [];

      // Search personas
      for (const p of lastPersonaList || []) {
        const name = String(p.name || '');
        const summary = String(p.summary || '');
        if (name.toLowerCase().includes(q) || summary.toLowerCase().includes(q)) {
          results.push({ section: 'Persona', title: name, excerpt: summary.slice(0, 120), anchor: 'personasSection' });
        }
      }
      // Search build tasks
      for (const t of allTaskData || []) {
        if (String(t.title || '').toLowerCase().includes(q) || String(t.persona || '').toLowerCase().includes(q)) {
          results.push({ section: 'Build Task', title: t.title, excerpt: t.persona, anchor: 'buildSection' });
        }
      }
      // Search build queue
      for (const i of allBuildQueueData || []) {
        if (String(i.title || '').toLowerCase().includes(q)) {
          results.push({ section: 'Build Queue', title: i.title, excerpt: i.path || '', anchor: 'buildQueueSection' });
        }
      }
      // Search dead letter
      for (const i of allDeadLetterData || []) {
        const src = String(i.source_file || '').toLowerCase();
        const err = String(i.error || '').toLowerCase();
        if (src.includes(q) || err.includes(q)) {
          results.push({ section: 'Dead Letter', title: (i.source_file || '').split(/[\\/]/).pop(), excerpt: (i.error || '').slice(0, 120), anchor: 'deadLetterSection' });
        }
      }
      // Search universal intake
      for (const i of allUniversalIntakeData || []) {
        if (String(i.title || '').toLowerCase().includes(q) || String(i.excerpt || '').toLowerCase().includes(q)) {
          results.push({ section: i.inputType, title: i.title, excerpt: (i.excerpt || '').slice(0, 120), anchor: 'universalIntakeSection' });
        }
      }
      // Search sources
      for (const s of allSourceData || []) {
        if (String(s.name || '').toLowerCase().includes(q) || String(s.preview || '').toLowerCase().includes(q)) {
          results.push({ section: 'Source', title: s.name, excerpt: (s.preview || '').slice(0, 120), anchor: 'sourcesSection' });
        }
      }
      // Search vault
      for (const v of allVaultData || []) {
        if (String(v.persona_name || '').toLowerCase().includes(q)) {
          results.push({ section: 'Vault', title: v.persona_name, excerpt: v.source_file || '', anchor: 'vaultSection' });
        }
      }
      // Search submissions
      for (const e of allSubmissionData || []) {
        if (String(e.name || '').toLowerCase().includes(q) || String(e.preview || '').toLowerCase().includes(q)) {
          results.push({ section: 'Submission', title: e.name, excerpt: (e.preview || '').slice(0, 120), anchor: 'submissionsSection' });
        }
      }

      searchActiveIndex = -1;
      if (!results.length) {
        searchResultsEl.innerHTML = '<div class="search-hint">No results for "' + esc(query) + '"</div>';
        return;
      }
      searchResultsEl.innerHTML = results.slice(0, 20).map((r, i) =>
        '<div class="search-result" data-anchor="' + r.anchor + '" data-index="' + i + '">' +
        '<span class="search-result-section">' + esc(r.section) + '</span>' +
        '<div><div class="search-result-title">' + esc(r.title) + '</div>' +
        (r.excerpt ? '<div class="search-result-excerpt">' + esc(r.excerpt) + '</div>' : '') +
        '</div></div>'
      ).join('');
    }

    searchInput.addEventListener('input', () => searchAll(searchInput.value));
    searchResultsEl.addEventListener('click', (e) => {
      const result = e.target.closest('.search-result');
      if (!result) return;
      closeSearch();
      const anchor = result.dataset.anchor;
      if (anchor) document.getElementById(anchor)?.scrollIntoView({ behavior: 'smooth' });
    });
    searchInput.addEventListener('keydown', (e) => {
      const items = searchResultsEl.querySelectorAll('.search-result');
      if (e.key === 'ArrowDown') { e.preventDefault(); searchActiveIndex = Math.min(searchActiveIndex + 1, items.length - 1); items.forEach((el, i) => el.classList.toggle('active', i === searchActiveIndex)); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); searchActiveIndex = Math.max(searchActiveIndex - 1, 0); items.forEach((el, i) => el.classList.toggle('active', i === searchActiveIndex)); }
      else if (e.key === 'Enter' && searchActiveIndex >= 0 && items[searchActiveIndex]) { items[searchActiveIndex].click(); }
      else if (e.key === 'Escape') { closeSearch(); }
    });

    /* ========== KEYBOARD SHORTCUTS ========== */
    document.addEventListener('keydown', (e) => {
      // Ignore when typing in inputs
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
      if (searchOverlay.classList.contains('open')) return;

      if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); openSearch(); return; }
      if (e.key === 'r' && !e.ctrlKey && !e.metaKey) { e.preventDefault(); $('runPipeline').click(); toast('Pipeline triggered', 'success'); }
      if (e.key === 's' && !e.ctrlKey && !e.metaKey) { e.preventDefault(); $('sendQueued').click(); }
      if (e.key === 'n' && !e.ctrlKey && !e.metaKey) { e.preventDefault(); text.focus(); text.scrollIntoView({ behavior: 'smooth' }); }
      if (e.key === '/' && !e.ctrlKey && !e.metaKey) { e.preventDefault(); openSearch(); }
    });
    // Ctrl+K from anywhere including inputs
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); openSearch(); }
    });

    /* ========== INTELLIGENCE DASHBOARD ========== */
    async function refreshIntelligence() {
      try {
        const [healthScore, coverage, funnel, stalePlans, planPriority] = await Promise.all([
          fetch('/api/health-score').then(r => r.json()).catch(() => null),
          fetch('/api/coverage').then(r => r.json()).catch(() => null),
          fetch('/api/pipeline-funnel').then(r => r.json()).catch(() => null),
          fetch('/api/stale-plans').then(r => r.json()).catch(() => null),
          fetch('/api/plan-priority').then(r => r.json()).catch(() => null),
        ]);

        // Health Score Gauge
        if (healthScore) {
          const scoreEl = $('intelScore');
          scoreEl.textContent = healthScore.score;
          scoreEl.className = 'stat-value ' + (healthScore.score < 40 ? 'score-red' : healthScore.score < 70 ? 'score-yellow' : 'score-green');
          $('intelGrade').textContent = 'Grade ' + healthScore.grade;
          $('intelGrade').className = healthScore.score < 40 ? 'score-red' : healthScore.score < 70 ? 'score-yellow' : 'score-green';
          $('intelScoreMeter').style.width = healthScore.score + '%';
          $('intelScoreMeter').style.background = healthScore.score < 40 ? '#dc2626' : healthScore.score < 70 ? '#d97706' : '#059669';
          const recEl = $('intelRecommendations');
          recEl.innerHTML = (healthScore.recommendations || []).map(r => '<div style="margin-top:3px">- ' + esc(r) + '</div>').join('');
        }

        // Pipeline Funnel
        if (funnel && funnel.stages) {
          const maxCount = Math.max(...funnel.stages.map(s => s.count || 0), 1);
          $('intelFunnel').innerHTML = funnel.stages.map(s => {
            const pct = Math.max(((s.count || 0) / maxCount) * 100, 4);
            const notes = s.dropped ? s.dropped + ' dropped' : s.rejected ? s.rejected + ' rejected' : s.plans_produced ? s.plans_produced + ' plans' : '';
            return '<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">' +
              '<div style="width:70px;font-size:11px;text-align:right;color:#6b7280">' + esc(s.name) + '</div>' +
              '<div style="flex:1;height:16px;background:#e5e7eb;border-radius:3px;overflow:hidden">' +
              '<div style="height:100%;width:' + pct + '%;background:#374151;border-radius:3px;transition:width 0.3s"></div></div>' +
              '<div style="width:24px;font-size:12px;font-weight:600">' + (s.count || 0) + '</div>' +
              (notes ? '<div style="font-size:10px;color:#9ca3af">' + esc(notes) + '</div>' : '') +
              '</div>';
          }).join('');
          if (funnel.conversion) {
            $('intelConversion').textContent = 'End-to-end: ' + funnel.conversion.end_to_end + '%';
          }
        }

        // Coverage Heatmap
        if (coverage && coverage.categories) {
          $('intelCoverageOverall').textContent = (coverage.summary?.overall_coverage_pct || 0) + '% overall (' +
            (coverage.summary?.green || 0) + ' green, ' + (coverage.summary?.yellow || 0) + ' yellow, ' + (coverage.summary?.red || 0) + ' red)';
          const healthDot = h => h === 'green' ? '#059669' : h === 'yellow' ? '#d97706' : '#dc2626';
          $('intelCoverageBody').innerHTML = coverage.categories
            .sort((a, b) => a.coverage_pct - b.coverage_pct)
            .map(c => '<tr>' +
              '<td style="font-size:12px">' + esc(c.category) + '</td>' +
              '<td><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:' + healthDot(c.health) + '"></span> ' +
                '<span style="font-size:11px">' + c.coverage_pct + '%</span></td>' +
              '<td style="font-size:12px;color:#059669">' + c.built + '</td>' +
              '<td style="font-size:12px;color:#d97706">' + c.partial + '</td>' +
              '<td style="font-size:12px;color:#dc2626">' + c.missing + '</td>' +
              '<td style="font-size:12px"><span class="status-badge sev-high">' + c.high_severity + '</span></td>' +
            '</tr>').join('');
        }

        // Stale Plans
        if (stalePlans) {
          $('intelStaleCount').textContent = stalePlans.stale_count || 0;
          if (stalePlans.stale?.length) {
            $('intelStaleList').innerHTML = stalePlans.stale.map(s =>
              '<div style="font-size:12px;padding:4px 0;border-bottom:1px solid #e5e7eb">' +
              '<span style="font-weight:600">' + esc(s.slug || '') + '</span> task-' + (s.task || '?') +
              '<div style="font-size:11px;color:#6b7280">' + (s.reasons || []).join(', ') + '</div></div>'
            ).join('');
          } else {
            $('intelStaleList').innerHTML = '<div class="empty">No stale plans. All plans have valid references.</div>';
          }
        }

        // Plan Priority
        if (planPriority && planPriority.plans?.length) {
          $('intelPlanPriority').innerHTML = planPriority.plans.slice(0, 8).map(p => {
            const scoreColor = p.score >= 60 ? '#059669' : p.score >= 40 ? '#d97706' : '#dc2626';
            return '<div style="display:flex;align-items:center;gap:8px;padding:4px 0;border-bottom:1px solid #e5e7eb;font-size:12px">' +
              '<span style="font-weight:700;color:' + scoreColor + ';min-width:28px">' + p.score + '</span>' +
              '<span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="' + esc(p.title || '') + '">' + esc((p.title || '').slice(0, 50)) + '</span>' +
              '<span style="color:#6b7280;font-size:11px">' + esc(p.slug || '') + '</span>' +
              '<button class="btn-sm" onclick="copyPlanForClaude(\\\'' + esc(p.slug || '') + '\\\',' + (p.task || 0) + ')" title="Copy as Claude prompt">Copy</button>' +
              '</div>';
          }).join('');
        }
      } catch (e) {
        console.error('[intel] refresh failed:', e);
      }
    }

    // Claude-ready plan export
    window.copyPlanForClaude = async (slug, taskNum) => {
      try {
        const tasks = await fetch('/api/build-tasks').then(r => r.json());
        const allTasks = tasks.tasks || tasks || [];
        const task = allTasks.find(t => (t.slug === slug || t.persona === slug) && (t.task_number === taskNum || t.path?.includes('task-' + taskNum)));
        if (!task) { toast('Plan not found', 'error'); return; }
        const planPath = task.path || ('system/persona-build-plans/' + slug + '/task-' + taskNum + '.md');
        // Fetch plan content via a simple endpoint
        const resp = await fetch('/api/plan-content?path=' + encodeURIComponent(planPath));
        if (!resp.ok) { toast('Could not load plan file', 'error'); return; }
        const planText = await resp.text();
        const prompt = 'You are implementing a build task for ChefFlow. Follow the plan exactly. Do not modify files not listed. Run tsc when done.\\n\\n' + planText;
        await navigator.clipboard.writeText(prompt);
        toast('Plan copied as Claude prompt', 'success');
      } catch (e) { toast('Copy failed: ' + e.message, 'error'); }
    };

    $('refreshIntel').onclick = refreshIntelligence;
    $('archiveStaleBtn').onclick = async () => {
      try {
        const r = await postJson('/api/archive-stale', {});
        toast('Archived ' + (r.archived || 0) + ' stale plans', 'success');
        await refreshIntelligence();
      } catch (e) { toast('Archive failed: ' + e.message, 'error'); }
    };

    // Load intelligence data on page load and every 5 minutes
    refreshIntelligence();
    setInterval(refreshIntelligence, 5 * 60 * 1000);

    /* ========== SPARKLINES ========== */
    function renderSparkline(scores, width = 48, height = 18) {
      if (!scores || scores.length < 2) return '';
      const min = Math.min(...scores), max = Math.max(...scores);
      const range = max - min || 1;
      const points = scores.map((s, i) => {
        const x = (i / (scores.length - 1)) * width;
        const y = height - ((s - min) / range) * (height - 2) - 1;
        return x.toFixed(1) + ',' + y.toFixed(1);
      }).join(' ');
      const last = scores[scores.length - 1];
      const color = last < 40 ? '#dc2626' : last < 70 ? '#d97706' : '#059669';
      return '<svg class="sparkline" width="' + width + '" height="' + height + '" viewBox="0 0 ' + width + ' ' + height + '"><polyline points="' + points + '" style="stroke:' + color + '"/></svg>';
    }

    /* ========== PERSONA CARD CHEVRON + SPARKLINE ========== */
    // Patch renderPersonas to include chevron and sparkline
    const _origRenderPersonas = renderPersonas;
    renderPersonas = function(list, loadError) {
      _origRenderPersonas(list, loadError);
      // Post-process: inject chevrons and sparklines
      if (!lastPersonaList.length) return;
      const historyBySlug = {};
      if (scoreHistoryData.length) {
        for (const entry of scoreHistoryData) {
          if (!historyBySlug[entry.slug]) historyBySlug[entry.slug] = [];
          historyBySlug[entry.slug].push(entry);
        }
      }
      personasEl.querySelectorAll('.persona-card').forEach((card, i) => {
        // Add chevron to card-head
        const head = card.querySelector('.card-head');
        if (head && !head.querySelector('.card-chevron')) {
          const chevron = document.createElement('span');
          chevron.className = 'card-chevron';
          chevron.innerHTML = '&#9654;';
          head.querySelector('div:first-child')?.appendChild(chevron);
        }
        // Add sparkline
        const sortKey = ($('personaSort')||{}).value || 'score-asc';
        const sorted = sortPersonas(lastPersonaList, sortKey);
        const p = sorted[i];
        if (p) {
          const hist = historyBySlug[p.slug];
          if (hist && hist.length >= 2) {
            const scores = hist.map(h => h.score).filter(s => typeof s === 'number');
            if (scores.length >= 2) {
              const scoreDiv = head?.querySelector('div[style*="text-align"]');
              if (scoreDiv && !scoreDiv.querySelector('.sparkline')) {
                scoreDiv.insertAdjacentHTML('beforeend', renderSparkline(scores));
              }
            }
          }
        }
      });
    };

    /* ========== DESTRUCTIVE ACTION CONFIRMATIONS ========== */
    const _origDeleteEntry = window.deleteEntry;
    window.deleteEntry = async (id) => {
      if (!confirm('Delete this entry? This cannot be undone.')) return;
      try { await postJson('/delete-entry', { id }); toast('Entry deleted'); await refreshState(); }
      catch(e) { toast(e.message, 'error'); }
    };

    const _origClearCompleted = $('clearCompleted').onclick;
    $('clearCompleted').onclick = async () => {
      if (!confirm('Remove all completed entries?')) return;
      try { const r = await postJson('/clear-completed', {}); toast('Cleared ' + r.removed + ' entries', 'success'); await refreshState(); }
      catch(e) { toast(e.message, 'error'); }
    };

    const _origCompleteTask = window.completeTask;
    window.completeTask = async (path) => {
      if (!confirm('Mark this task as done?')) return;
      try { await postJson('/api/complete-task', { path }); toast('Task completed', 'success'); await refreshState(); }
      catch(e) { toast(e.message, 'error'); }
    };

    /* ========== PIPELINE PROGRESS INDICATOR ========== */
    const pipelineProgressEl = $('pipelineProgress');
    const pipelineProgressFill = $('pipelineProgressFill');
    const _origUpdatePipeline = updatePipeline;
    updatePipeline = function(pl) {
      _origUpdatePipeline(pl);
      const running = pl?.running || false;
      pipelineProgressEl.classList.toggle('active', running);
      if (running) {
        // Parse progress from log lines (look for "N of M" or "N/M" patterns)
        const lines = pl?.lines || [];
        let pct = 0;
        for (const line of lines) {
          const match = line.match(/(\\d+)\\s*(?:of|\\/)\\s*(\\d+)/);
          if (match) {
            const current = parseInt(match[1]), total = parseInt(match[2]);
            if (total > 0) pct = Math.min(100, Math.round((current / total) * 100));
          }
        }
        // If no progress pattern found, use elapsed time as rough estimate (assume 2min cycle)
        if (pct === 0 && pl?.startedAt) {
          const elapsed = (Date.now() - pl.startedAt) / 1000;
          pct = Math.min(90, Math.round((elapsed / 120) * 100));
        }
        pipelineProgressFill.style.width = pct + '%';
      } else {
        pipelineProgressFill.style.width = '0%';
      }
    };

    /* ========== DRAG-AND-DROP FILE IMPORT ========== */
    const textArea = text;
    textArea.addEventListener('dragover', (e) => { e.preventDefault(); textArea.classList.add('drag-over'); });
    textArea.addEventListener('dragleave', () => { textArea.classList.remove('drag-over'); });
    textArea.addEventListener('drop', async (e) => {
      e.preventDefault();
      textArea.classList.remove('drag-over');
      const files = e.dataTransfer?.files;
      if (!files || !files.length) return;
      const contents = [];
      for (const file of files) {
        if (file.size > 5 * 1024 * 1024) { toast('File too large: ' + file.name, 'error'); continue; }
        if (!/\\.(txt|md|text|csv)$/i.test(file.name)) { toast('Unsupported file type: ' + file.name, 'error'); continue; }
        try {
          const text = await file.text();
          contents.push('--- persona: ' + file.name.replace(/\\.[^.]+$/, '') + ' ---\\n' + text);
        } catch { toast('Failed to read: ' + file.name, 'error'); }
      }
      if (contents.length) {
        textArea.value = contents.join('\\n\\n');
        toast(contents.length + ' file(s) loaded', 'success');
        try { await buildPreview(); } catch {}
      }
    });

    /* ========== BULK OPERATIONS (Submissions) ========== */
    let bulkSelected = new Set();
    const _origRenderSubmissions = renderSubmissions;
    renderSubmissions = function(entries) {
      _origRenderSubmissions(entries);
      bulkSelected.clear();
      updateBulkBar();
      // Inject checkboxes
      submissionsListEl.querySelectorAll('.history-item').forEach(item => {
        const delBtn = item.querySelector('.del-btn');
        if (!delBtn || item.querySelector('.bulk-check')) return;
        const id = delBtn.getAttribute('onclick')?.match(/deleteEntry\\('([^']+)'/)?.[1];
        if (!id) return;
        const cb = document.createElement('input');
        cb.type = 'checkbox'; cb.className = 'bulk-check'; cb.dataset.entryId = id;
        cb.onchange = () => { cb.checked ? bulkSelected.add(id) : bulkSelected.delete(id); updateBulkBar(); };
        item.querySelector('.history-head')?.prepend(cb);
      });
    };

    function updateBulkBar() {
      let bar = $('bulkBar');
      if (!bar) {
        bar = document.createElement('div');
        bar.id = 'bulkBar'; bar.className = 'bulk-bar';
        bar.innerHTML = '<span id="bulkCount">0 selected</span><button class="secondary" style="height:28px;font-size:12px" onclick="bulkDeleteSelected()">Delete Selected</button><button class="secondary" style="height:28px;font-size:12px" onclick="bulkClearSelection()">Clear</button>';
        submissionsListEl.parentElement.insertBefore(bar, submissionsListEl);
      }
      bar.classList.toggle('visible', bulkSelected.size > 0);
      const countEl = bar.querySelector('#bulkCount');
      if (countEl) countEl.textContent = bulkSelected.size + ' selected';
    }

    window.bulkDeleteSelected = async () => {
      if (!bulkSelected.size) return;
      if (!confirm('Delete ' + bulkSelected.size + ' entries?')) return;
      for (const id of bulkSelected) {
        try { await postJson('/delete-entry', { id }); } catch {}
      }
      toast('Deleted ' + bulkSelected.size + ' entries', 'success');
      bulkSelected.clear();
      await refreshState();
    };
    window.bulkClearSelection = () => {
      bulkSelected.clear();
      submissionsListEl.querySelectorAll('.bulk-check').forEach(cb => cb.checked = false);
      updateBulkBar();
    };

    /* ========== BROWSER NOTIFICATIONS ========== */
    let notificationsPermission = Notification?.permission || 'default';
    if (notificationsPermission === 'default' && typeof Notification !== 'undefined') {
      Notification.requestPermission().then(p => notificationsPermission = p);
    }

    function notifyPipelineComplete(status) {
      if (notificationsPermission !== 'granted') return;
      try {
        new Notification('ChefFlow Hub', {
          body: 'Pipeline ' + status,
          icon: '/favicon.ico',
          tag: 'pipeline-complete',
        });
      } catch {}
    }

    // Hook into pipeline state changes for notification
    let _prevPipelineRunning = false;
    const _origUpdatePipeline2 = updatePipeline;
    updatePipeline = function(pl) {
      _origUpdatePipeline2(pl);
      const running = pl?.running || false;
      if (_prevPipelineRunning && !running) {
        const status = pl?.pipeline || 'completed';
        notifyPipelineComplete(status);
        toast('Pipeline ' + status, status.includes('fail') ? 'error' : 'success');
      }
      _prevPipelineRunning = running;
    };

    /* ========== OFFLINE CACHE ========== */
    const CACHE_KEY = 'chefflow-hub-snapshot';
    function cacheSnapshot(payload) {
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ timestamp: Date.now(), data: payload }));
      } catch {}
    }
    const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours
    function loadCachedSnapshot() {
      try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (parsed?.timestamp && (Date.now() - parsed.timestamp) > CACHE_MAX_AGE_MS) {
          localStorage.removeItem(CACHE_KEY);
          return null;
        }
        return parsed;
      } catch { return null; }
    }

    // Patch applySnapshot to cache
    const _origApplySnapshot = applySnapshot;
    applySnapshot = function(payload) {
      _origApplySnapshot(payload);
      cacheSnapshot(payload);
    };

    // On load, show cached data immediately if SSE hasn't connected yet
    const cached = loadCachedSnapshot();
    if (cached?.data) {
      const age = Date.now() - (cached.timestamp || 0);
      const ageStr = age < 60000 ? Math.round(age/1000) + 's' : age < 3600000 ? Math.round(age/60000) + 'm' : Math.round(age/3600000) + 'h';
      showConnBanner('reconnecting', 'Showing cached data from ' + ageStr + ' ago. Connecting...');
      try { _origApplySnapshot(cached.data); } catch {}
    }

    /* ========== SKELETON LOADING ========== */
    function showSkeletons() {
      const targets = ['personas', 'buildQueue', 'buildQueueList', 'findings', 'sourcesList', 'vaultList', 'intakeList', 'universalIntakeList'];
      for (const id of targets) {
        const el = $(id);
        if (el && el.querySelector('.empty')) {
          el.innerHTML = '<div class="skeleton" style="height:60px;margin-bottom:8px"></div><div class="skeleton" style="height:60px;margin-bottom:8px"></div><div class="skeleton" style="height:60px"></div>';
        }
      }
    }
    if (!cached?.data) showSkeletons();

    /* ========== AUTO-DETECT INPUT TYPE AS YOU TYPE ========== */
    let classifyDebounce = null;
    text.addEventListener('input', () => {
      if (inputTypeEl.value !== 'auto') return;
      clearTimeout(classifyDebounce);
      classifyDebounce = setTimeout(async () => {
        if (text.value.length < 20) return;
        try {
          const r = await postJson('/api/classify', { content: text.value });
          if (r.inputType && inputTypeEl.value === 'auto') {
            // Show detected type as a hint
            const hint = text.parentElement.querySelector('.auto-detect-hint');
            if (hint) hint.textContent = 'Detected: ' + r.inputType;
            else {
              const span = document.createElement('span');
              span.className = 'auto-detect-hint input-type-badge ' + r.inputType;
              span.style.cssText = 'margin-left:8px';
              span.textContent = 'Detected: ' + r.inputType;
              inputTypeEl.parentElement.appendChild(span);
            }
          }
        } catch {}
      }, 500);
    });

  </script>
</body>
</html>`;
}

async function checkOllamaFromServer() {
  try {
    const response = await fetch(`${OLLAMA_URL}/api/tags`, { signal: AbortSignal.timeout(5000) });
    return response.ok;
  } catch {
    return false;
  }
}

function loginPage() {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>ChefFlow Hub - Login</title>
  <style>
    :root { color-scheme: light dark; font-family: Inter, ui-sans-serif, system-ui, sans-serif; }
    body { margin: 0; background: #f6f4ee; color: #1f2933; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
    .login-box { max-width: 360px; width: 100%; padding: 32px; border: 1px solid #d4cec2; border-radius: 12px; background: rgba(255, 253, 248, 0.78); }
    .login-box h1 { font-size: 24px; margin: 0 0 8px; }
    .login-box p { color: #6b7280; font-size: 14px; margin: 0 0 16px; }
    .login-box input { width: 100%; box-sizing: border-box; height: 42px; border: 1px solid #b8b2a7; border-radius: 6px; padding: 0 12px; font: inherit; margin: 0 0 12px; }
    .login-box button { width: 100%; height: 42px; border: none; border-radius: 6px; background: #1f2933; color: white; font: inherit; cursor: pointer; }
    .login-box button:hover { background: #374151; }
    .error { color: #dc2626; font-size: 13px; margin-top: 8px; display: none; }
    @media (prefers-color-scheme: dark) {
      body { background: #121416; color: #f4f1e8; }
      .login-box { background: #1f2429; border-color: #59616b; }
      .login-box input { background: #121416; color: #f4f1e8; border-color: #59616b; }
      .login-box button { background: #f4f1e8; color: #121416; }
    }
  </style>
</head>
<body>
  <div class="login-box">
    <h1>ChefFlow Hub</h1>
    <p>Enter your access token to continue.</p>
    <form id="loginForm">
      <input type="password" id="token" placeholder="Access token" autocomplete="off" autofocus>
      <button type="submit">Sign In</button>
      <div class="error" id="loginError">Invalid token. Try again.</div>
    </form>
  </div>
  <script>
    document.getElementById('loginForm').onsubmit = async (e) => {
      e.preventDefault();
      const token = document.getElementById('token').value;
      const res = await fetch('/', { headers: { 'Authorization': 'Bearer ' + token } });
      if (res.ok) {
        document.cookie = 'persona_inbox_token=' + encodeURIComponent(token) + '; path=/; max-age=604800; samesite=lax';
        window.location.href = '/';
      } else {
        document.getElementById('loginError').style.display = 'block';
      }
    };
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

// --- Request Metrics ---
const requestMetrics = {
  total: 0,
  by_status: {},   // { "200": N, "404": N, ... }
  by_route: {},    // { "GET /state": N, ... }
  errors: 0,
  latency_sum_ms: 0,
  latency_max_ms: 0,
  started: new Date().toISOString(),
};

function recordRequestMetric(method, path, statusCode, durationMs) {
  requestMetrics.total++;
  requestMetrics.by_status[statusCode] = (requestMetrics.by_status[statusCode] || 0) + 1;
  const route = `${method} ${path}`;
  requestMetrics.by_route[route] = (requestMetrics.by_route[route] || 0) + 1;
  if (statusCode >= 400 && statusCode !== 503) requestMetrics.errors++;
  requestMetrics.latency_sum_ms += durationMs;
  if (durationMs > requestMetrics.latency_max_ms) requestMetrics.latency_max_ms = durationMs;
}

const server = createServer(async (req, res) => {
  const reqStart = Date.now();
  const origEnd = res.end.bind(res);
  let ended = false;
  res.end = function (...args) {
    if (!ended) {
      ended = true;
      const dur = Date.now() - reqStart;
      try {
        const p = new URL(req.url || "/", "http://localhost").pathname;
        recordRequestMetric(req.method, p, res.statusCode, dur);
      } catch {}
    }
    return origEnd(...args);
  };

  try {
    const url = new URL(req.url || "/", `http://${req.headers.host || "127.0.0.1"}`);
    if (!requireAuth(req, res, url)) {
      return;
    }

    const path = url.pathname;

    if (req.method === "GET" && path === "/events") {
      openRuntimeEventStream(req, res);
      return;
    }

    emitRuntimeEvent("tool:call", "3977.http", {
      method: req.method,
      path,
      query: Object.fromEntries(url.searchParams.entries()),
    }, { workflow: "3977-http" });

    if (req.method === "GET" && path === "/") {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
      res.end(page());
      return;
    }

    if (req.method === "GET" && path === "/state") {
      sendJson(res, 200, snapshotState());
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
      const bt = readBuildTaskFiles();
      sendJson(res, 200, { tasks: bt.tasks, completedCount: bt.completedCount });
      return;
    }

    if (req.method === "POST" && path === "/delete-entry") {
      const body = await readBody(req);
      const payload = JSON.parse(body || "{}");
      const id = String(payload.id || "");
      if (!id) { sendJson(res, 400, { error: "Missing id" }); return; }
      const state = readInboxState();
      const before = state.entries.length;
      state.entries = state.entries.filter((e) => e.id !== id);
      if (state.entries.length === before) { sendJson(res, 404, { error: "Entry not found" }); return; }
      saveInboxState(state);
      sendJson(res, 200, { deleted: id });
      return;
    }

    if (req.method === "POST" && path === "/clear-completed") {
      const state = readInboxState();
      const before = state.entries.length;
      state.entries = state.entries.filter((e) => !["completed", "submitted"].includes(e.status));
      saveInboxState(state);
      sendJson(res, 200, { removed: before - state.entries.length });
      return;
    }

    if (req.method === "POST" && path === "/api/reanalyze") {
      const body = await readBody(req);
      const payload = JSON.parse(body || "{}");
      const slug = String(payload.slug || "").trim();
      if (!slug) { sendJson(res, 400, { error: "Missing slug" }); return; }
      const sourceFile = findPersonaSourceFile(slug);
      if (!sourceFile) { sendJson(res, 404, { error: "Persona source file not found for " + slug }); return; }
      trackChild(spawn(process.execPath, ["devtools/persona-analyzer.mjs", sourceFile], {
        cwd: ROOT, detached: false, stdio: "ignore", windowsHide: true,
      }), `reanalyze:${slug}`);
      sendJson(res, 200, { status: "queued", slug });
      return;
    }

    if (req.method === "POST" && path === "/api/complete-task") {
      const body = await readBody(req);
      const payload = JSON.parse(body || "{}");
      const taskPath = String(payload.path || "");
      if (!taskPath.startsWith("system/persona-build-plans/") || !taskPath.endsWith(".md")) {
        sendJson(res, 400, { error: "Invalid task path" }); return;
      }
      const fullPath = join(ROOT, taskPath);
      if (!existsSync(fullPath)) { sendJson(res, 404, { error: "Task file not found" }); return; }
      const completedDir = join(dirname(fullPath), "completed");
      mkdirSync(completedDir, { recursive: true });
      renameSync(fullPath, join(completedDir, basename(fullPath)));

      // Check if all tasks for this slug are now completed
      const slugDir = dirname(fullPath);
      const slug = basename(slugDir);
      const remainingTasks = readdirSync(slugDir).filter(f => f.startsWith("task-") && f.endsWith(".md"));
      let rescoreQueued = false;
      if (remainingTasks.length === 0) {
        // All plans built for this persona. Queue re-analysis to measure score improvement.
        const pipeState = readJsonFile(join(SYSTEM_DIR, "persona-pipeline-state.json"), { processed: [] });
        const entry = (pipeState.processed || []).find(p => p.slug === slug);
        if (entry?.source_file) {
          const sourceFile = join(ROOT, entry.source_file);
          if (existsSync(sourceFile)) {
            console.log(`[re-score] All tasks complete for ${slug}, queuing re-analysis`);
            trackChild(spawn(process.execPath, ["devtools/persona-analyzer.mjs", sourceFile], {
              cwd: ROOT, detached: false, stdio: "ignore", windowsHide: true,
            }), `re-score:${slug}`);
            rescoreQueued = true;
            emitRuntimeEvent("state:update", "3977.re-score", {
              action: "rescore_queued",
              slug,
              reason: "all_tasks_completed",
            }, { workflow: "re-score" });
          }
        }
      }

      sendJson(res, 200, { status: "completed", path: taskPath, remaining: remainingTasks.length, rescoreQueued });
      return;
    }

    if (req.method === "POST" && path === "/run-pipeline") {
      if (pipelineRunning) {
        sendJson(res, 200, { pipeline: "Pipeline already running" });
        return;
      }
      const ids = pendingEntryIds(["saved", "queued", "failed", "spec_queued"]);
      const pipeline = runPipeline(Math.max(ids.length, 1), ids);
      sendJson(res, 200, { pipeline });
      return;
    }

    if (req.method === "GET" && path === "/api/score-history") {
      sendJson(res, 200, readScoreHistory());
      return;
    }

    if (req.method === "GET" && path === "/api/score-trend") {
      // Per-persona score over time with deltas
      const history = readScoreHistory();
      const bySlug = {};
      for (const entry of history) {
        if (!bySlug[entry.slug]) bySlug[entry.slug] = [];
        bySlug[entry.slug].push({ date: entry.date, score: entry.score });
      }
      const trends = Object.entries(bySlug).map(([slug, scores]) => {
        scores.sort((a, b) => a.date.localeCompare(b.date));
        const first = scores[0].score;
        const latest = scores[scores.length - 1].score;
        return {
          slug,
          scores,
          delta: latest - first,
          direction: latest > first ? "improving" : latest < first ? "regressing" : "stable",
          latest: latest,
        };
      }).sort((a, b) => b.delta - a.delta);
      sendJson(res, 200, { trends, summary: {
        improving: trends.filter(t => t.direction === "improving").length,
        regressing: trends.filter(t => t.direction === "regressing").length,
        stable: trends.filter(t => t.direction === "stable").length,
        avg_delta: trends.length > 0 ? +(trends.reduce((s, t) => s + t.delta, 0) / trends.length).toFixed(1) : 0,
      }});
      return;
    }

    if (req.method === "GET" && path === "/api/sources") {
      sendJson(res, 200, readSourceFiles());
      return;
    }

    if (req.method === "GET" && path === "/api/vault") {
      sendJson(res, 200, readVaultRecords());
      return;
    }

    if (req.method === "GET" && path === "/api/intake") {
      sendJson(res, 200, readIntakeFiles());
      return;
    }

    if (req.method === "GET" && path === "/api/universal-intake") {
      sendJson(res, 200, readUniversalIntake());
      return;
    }

    if (req.method === "GET" && path === "/api/build-queue") {
      sendJson(res, 200, readBuildQueueItems());
      return;
    }

    if (req.method === "POST" && path === "/api/intake-submit") {
      const body = await readBody(req);
      const payload = JSON.parse(body || "{}");
      const content = String(payload.content || "").trim();
      if (!content) {
        sendJson(res, 400, { error: "Content is required" });
        return;
      }
      const inputType = INPUT_TYPES.includes(payload.inputType)
        ? payload.inputType
        : classifyInputType(content);
      const title = String(payload.title || content.split("\n")[0].slice(0, 80)).trim();

      if (inputType === "persona") {
        // Redirect to persona import flow
        const entries = splitBulk(content, "Chef");
        const created = entries.map((entry) => writePersona(entry, "Chef"));
        const state = readInboxState();
        state.entries = [...created, ...state.entries];
        saveInboxState(state);
        sendJson(res, 200, { created, inputType: "persona", title, pipeline: "Saved as persona" });
        return;
      }

      const item = writeIntakeItem(content, inputType, title);
      // Fire-and-forget AI expansion
      let expanding = false;
      if (inputType !== "note") {
        expanding = true;
        expandIntakeItem(item.path, inputType).catch((err) => {
          emitRuntimeEvent("error", "3977.intake-expand", {
            action: "expand_failed_silently",
            file: basename(item.path),
            error: err?.message || String(err),
          }, { workflow: "intake" });
        });
      }
      broadcastRuntimeSnapshot();
      sendJson(res, 200, { ...item, expanding });
      return;
    }

    if (req.method === "POST" && path === "/api/classify") {
      const body = await readBody(req);
      const payload = JSON.parse(body || "{}");
      const content = String(payload.content || "").trim();
      sendJson(res, 200, { inputType: classifyInputType(content) });
      return;
    }

    if (req.method === "GET" && path === "/login") {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
      res.end(loginPage());
      return;
    }

    if (req.method === "GET" && path === "/healthz") {
      // Health check - no auth required for monitoring
      const ollamaOk = await checkOllamaFromServer();
      const lockFile = join(SYSTEM_DIR, ".pipeline.lock");
      let pipelineLocked = false;
      if (existsSync(lockFile)) {
        try {
          const lockData = JSON.parse(readFileSync(lockFile, "utf8"));
          const lockAge = Date.now() - (lockData.acquired || 0);
          if (lockData.pid === 0 || lockAge > 15 * 60 * 1000) {
            // Stale lock, clean it up
            try { unlinkSync(lockFile); } catch {}
          } else {
            pipelineLocked = true;
          }
        } catch { /* corrupt lock, ignore */ }
      }
      const state = readJsonFile(join(SYSTEM_DIR, "persona-pipeline-state.json"), {});
      const failedCount = (state.failed || []).length;
      const processedCount = (state.processed || []).length;
      const buildData = readBuildTaskFiles();
      const rejectedDir = join(ROOT, "system", "persona-build-plans-rejected");
      let rejectedCount = 0;
      try { if (existsSync(rejectedDir)) rejectedCount = readdirSync(rejectedDir).filter(f => f.endsWith(".md")).length; } catch {}
      const health = {
        status: ollamaOk ? "healthy" : "degraded",
        uptime_s: Math.round(process.uptime()),
        ollama: ollamaOk ? "connected" : "unreachable",
        pipeline: {
          running: pipelineRunning,
          locked: pipelineLocked,
          processed: processedCount,
          failed: failedCount,
          last_cycle: state.last_cycle || null,
        },
        build_plans: {
          pending: buildData.tasks.length,
          completed: buildData.completedCount,
          rejected: rejectedCount,
          completion_pct: (buildData.tasks.length + buildData.completedCount) > 0
            ? Math.round((buildData.completedCount / (buildData.tasks.length + buildData.completedCount)) * 100)
            : 0,
        },
        metrics: state.metrics || null,
        circuit_breaker: {
          state: CIRCUIT_BREAKER.state,
          failures: CIRCUIT_BREAKER.failures,
          cooldown_remaining_s: CIRCUIT_BREAKER.state === "open" ? Math.max(0, Math.round((CIRCUIT_BREAKER.cooldownMs - (Date.now() - CIRCUIT_BREAKER.lastFailure)) / 1000)) : 0,
        },
        lifetime: (() => {
          const m = readJsonFile(UPTIME_FILE, {});
          return { total_uptime_s: m.total_uptime_s || 0, restarts: m.restarts || 0, active_children: activeChildren.size };
        })(),
        sse_clients: runtimeClients.size,
        requests: {
          total: requestMetrics.total,
          errors: requestMetrics.errors,
          latency_avg_ms: requestMetrics.total > 0 ? Math.round(requestMetrics.latency_sum_ms / requestMetrics.total) : 0,
          latency_max_ms: requestMetrics.latency_max_ms,
        },
        timestamp: new Date().toISOString(),
      };
      sendJson(res, ollamaOk ? 200 : 503, health);
      return;
    }

    if (req.method === "GET" && path === "/api/metrics") {
      const state = readJsonFile(join(SYSTEM_DIR, "persona-pipeline-state.json"), {});
      const metrics = state.metrics || {};
      const processed = state.processed || [];
      const failed = state.failed || [];

      // Compute additional stats
      const avgAnalyzerMs = processed.length > 0 && metrics.total_analyzer_time_ms
        ? Math.round(metrics.total_analyzer_time_ms / processed.length) : 0;
      const avgPlannerMs = processed.length > 0 && metrics.total_planner_time_ms
        ? Math.round(metrics.total_planner_time_ms / processed.length) : 0;
      const plannerSuccessRate = processed.length > 0
        ? Math.round((processed.filter(p => p.planned_at).length / processed.length) * 100) : 0;
      const failedByType = {};
      for (const f of failed) {
        const t = f.error_type || "unknown";
        failedByType[t] = (failedByType[t] || 0) + 1;
      }

      sendJson(res, 200, {
        ...metrics,
        total_processed: processed.length,
        total_failed: failed.length,
        avg_analyzer_ms: avgAnalyzerMs,
        avg_planner_ms: avgPlannerMs,
        planner_success_rate_pct: plannerSuccessRate,
        failed_by_type: failedByType,
        last_cycle: state.last_cycle || null,
        expand: {
          calls: expandMetrics.calls,
          avg_ms: expandMetrics.calls > 0 ? Math.round(expandMetrics.total_ms / expandMetrics.calls) : 0,
          failures: expandMetrics.failures,
        },
      });
      return;
    }

    if (req.method === "GET" && path === "/api/dead-letter") {
      const state = readJsonFile(join(SYSTEM_DIR, "persona-pipeline-state.json"), {});
      const failed = (state.failed || []).map(f => ({
        ...f,
        age_hours: f.failed_at ? Math.round((Date.now() - new Date(f.failed_at).getTime()) / 3600000) : null,
      }));
      sendJson(res, 200, { items: failed, count: failed.length });
      return;
    }

    if (req.method === "POST" && path === "/api/dead-letter/retry") {
      const body = await readBody(req);
      const payload = JSON.parse(body || "{}");
      const sourceFile = String(payload.source_file || "").trim();
      if (!sourceFile) { sendJson(res, 400, { error: "Missing source_file" }); return; }

      const state = readJsonFile(join(SYSTEM_DIR, "persona-pipeline-state.json"), { failed: [] });
      const idx = state.failed.findIndex(f => f.source_file === sourceFile);
      if (idx === -1) { sendJson(res, 404, { error: "Item not in dead-letter queue" }); return; }

      const item = state.failed[idx];
      const retryCount = (item.retry_count || 0) + 1;
      const MAX_RETRIES = 3;
      const PERMANENT_ERRORS = ["validation", "missing_sections", "low_word_count", "invalid_format"];
      const isPermanent = PERMANENT_ERRORS.some(e => String(item.error || "").toLowerCase().includes(e));

      if (isPermanent) {
        sendJson(res, 422, { error: "Permanent failure, manual fix required", reason: item.error, source_file: sourceFile });
        return;
      }
      if (retryCount > MAX_RETRIES) {
        sendJson(res, 429, { error: `Max retries (${MAX_RETRIES}) exceeded`, retry_count: retryCount - 1, source_file: sourceFile });
        return;
      }

      // Move back to Uncompleted if in Failed
      const failedPath = join(ROOT, "Chef Flow Personas", "Failed", basename(dirname(sourceFile)), basename(sourceFile));
      const uncompletedPath = join(ROOT, sourceFile);
      if (existsSync(failedPath) && !existsSync(uncompletedPath)) {
        mkdirSync(dirname(uncompletedPath), { recursive: true });
        try { renameSync(failedPath, uncompletedPath); } catch {}
      }

      // Remove from failed list, record retry count
      state.failed.splice(idx, 1);
      // Store retry count so next failure preserves it
      if (!state._retry_counts) state._retry_counts = {};
      state._retry_counts[sourceFile] = retryCount;
      writeJsonFile(join(SYSTEM_DIR, "persona-pipeline-state.json"), state);

      emitRuntimeEvent("state:update", "3977.dead-letter", {
        action: "retry_queued",
        sourceFile,
        retry_count: retryCount,
      }, { workflow: "dead-letter" });
      broadcastRuntimeSnapshot();
      sendJson(res, 200, { status: "queued_for_retry", source_file: sourceFile, retry_count: retryCount });
      return;
    }

    if (req.method === "POST" && path === "/api/dead-letter/retry-all") {
      const state = readJsonFile(join(SYSTEM_DIR, "persona-pipeline-state.json"), { failed: [] });
      const PERMANENT_ERRORS = ["validation", "missing_sections", "low_word_count", "invalid_format"];
      const MAX_RETRIES = 3;
      const retryable = [];
      const skipped = [];

      for (const f of state.failed) {
        const isPermanent = PERMANENT_ERRORS.some(e => String(f.error || "").toLowerCase().includes(e));
        const retryCount = ((state._retry_counts || {})[f.source_file] || 0) + 1;
        if (isPermanent || retryCount > MAX_RETRIES) {
          skipped.push({ source_file: f.source_file, reason: isPermanent ? "permanent_failure" : "max_retries_exceeded" });
          continue;
        }
        retryable.push(f);
        if (!state._retry_counts) state._retry_counts = {};
        state._retry_counts[f.source_file] = retryCount;
      }

      for (const f of retryable) {
        const failedPath = join(ROOT, "Chef Flow Personas", "Failed", basename(dirname(f.source_file)), basename(f.source_file));
        const uncompletedPath = join(ROOT, f.source_file);
        if (existsSync(failedPath) && !existsSync(uncompletedPath)) {
          mkdirSync(dirname(uncompletedPath), { recursive: true });
          try { renameSync(failedPath, uncompletedPath); } catch {}
        }
      }
      // Keep only non-retryable items in failed
      state.failed = state.failed.filter(f => !retryable.some(r => r.source_file === f.source_file));
      writeJsonFile(join(SYSTEM_DIR, "persona-pipeline-state.json"), state);
      broadcastRuntimeSnapshot();
      sendJson(res, 200, { retried: retryable.length, skipped });
      return;
    }

    // ── Capture routes ──

    if (req.method === "POST" && path === "/api/capture") {
      const body = await readBody(req);
      const ct = (req.headers["content-type"] || "").toLowerCase();
      let content, contentType, tags, title, source, meta;

      if (ct.includes("application/json")) {
        try {
          const parsed = JSON.parse(body);
          if (parsed && typeof parsed === "object" && parsed.content !== undefined) {
            content = typeof parsed.content === "string" ? parsed.content : JSON.stringify(parsed.content);
            tags = Array.isArray(parsed.tags) ? parsed.tags : [];
            title = parsed.title || null;
            source = parsed.source || null;
            meta = parsed.meta || {};
            contentType = typeof parsed.content === "string" ? "text/plain" : "application/json";
          } else {
            content = JSON.stringify(parsed, null, 2);
            contentType = "application/json";
            tags = []; title = null; source = null; meta = {};
          }
        } catch {
          content = body;
          contentType = "text/plain";
          tags = []; title = null; source = null; meta = {};
        }
      } else {
        content = body;
        contentType = ct || "text/plain";
        tags = []; title = null; source = null; meta = {};
      }

      const qTags = url.searchParams.get("tags");
      const qTitle = url.searchParams.get("title");
      const qSource = url.searchParams.get("source");
      if (qTags) tags = [...tags, ...qTags.split(",").map((t) => t.trim()).filter(Boolean)];
      if (qTitle) title = qTitle;
      if (qSource) source = qSource;

      const entry = saveCaptureEntry({ content, contentType, tags, title, source, meta });
      sendJson(res, 201, { ok: true, id: entry.id, timestamp: entry.timestamp });
      return;
    }

    if (req.method === "GET" && path === "/api/captures") {
      const limit = parseInt(url.searchParams.get("limit") || "100", 10);
      const offset = parseInt(url.searchParams.get("offset") || "0", 10);
      const search = url.searchParams.get("search") || "";
      const tag = url.searchParams.get("tag") || "";
      sendJson(res, 200, readCaptureEntries({ limit, offset, search, tag }));
      return;
    }

    if (req.method === "GET" && path.startsWith("/api/capture/")) {
      const id = path.slice("/api/capture/".length);
      const entry = getCaptureEntry(id);
      if (entry) { sendJson(res, 200, entry); return; }
      sendJson(res, 404, { error: "not found" });
      return;
    }

    if (req.method === "GET" && path === "/api/stale-plans") {
      // Identify stale plans: old, low file ref accuracy, or related to drifted gaps
      const buildData = readBuildTaskFiles();
      const drift = readJsonFile(DRIFT_FILE, { drifts: [] });
      const driftedTitles = new Set((drift.drifts || []).map(d => d.title.toLowerCase()));
      const now = Date.now();
      const STALE_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

      const stale = [];
      for (const task of buildData.tasks) {
        const fullPath = join(ROOT, task.path);
        let age = 0;
        try { age = now - statSync(fullPath).mtimeMs; } catch {}

        const content = (() => { try { return readFileSync(fullPath, "utf8"); } catch { return ""; } })();
        const fileRefs = [...content.matchAll(/`([a-zA-Z][\w/.-]+\.(?:ts|tsx|js|jsx|mjs|css|sql))`/g)].map(m => m[1]);
        const validRefs = fileRefs.filter(r => !r.includes("{") && existsSync(join(ROOT, r)));
        const refAccuracy = fileRefs.length > 0 ? validRefs.length / fileRefs.length : 1;

        const reasons = [];
        if (age > STALE_AGE_MS) reasons.push(`${Math.round(age / 86400000)}d old`);
        if (fileRefs.length > 0 && refAccuracy === 0) reasons.push("all file refs invalid");
        else if (refAccuracy < 0.5 && fileRefs.length > 1) reasons.push(`${Math.round(refAccuracy*100)}% ref accuracy`);
        if (driftedTitles.has(task.title.toLowerCase())) reasons.push("related gap has drifted");

        if (reasons.length > 0) {
          stale.push({ ...task, reasons, age_days: Math.round(age / 86400000), ref_accuracy: Math.round(refAccuracy * 100) });
        }
      }

      sendJson(res, 200, {
        stale: stale.sort((a, b) => b.reasons.length - a.reasons.length),
        total_plans: buildData.tasks.length,
        stale_count: stale.length,
        stale_pct: buildData.tasks.length > 0 ? Math.round((stale.length / buildData.tasks.length) * 100) : 0,
      });
      return;
    }

    if (req.method === "POST" && path === "/api/archive-stale") {
      // Move stale plans to an archive directory
      const body = await readBody(req);
      const payload = JSON.parse(body || "{}");
      const paths = payload.paths || [];
      if (!Array.isArray(paths) || paths.length === 0) {
        sendJson(res, 400, { error: "Provide paths array" }); return;
      }

      const archiveDir = join(ROOT, "system", "persona-build-plans-archived");
      mkdirSync(archiveDir, { recursive: true });
      let archived = 0;
      for (const p of paths) {
        if (!p.startsWith("system/persona-build-plans/") || !p.endsWith(".md")) continue;
        const full = join(ROOT, p);
        if (!existsSync(full)) continue;
        const dest = join(archiveDir, basename(dirname(full)) + "-" + basename(full));
        try { renameSync(full, dest); archived++; } catch {}
      }

      emitRuntimeEvent("state:update", "3977.archive", {
        action: "plans_archived",
        count: archived,
      }, { workflow: "archive" });

      sendJson(res, 200, { archived, total_requested: paths.length });
      return;
    }

    if (req.method === "GET" && path === "/api/health-score") {
      // Composite 0-100 pipeline health score
      const ollamaOk = await checkOllamaFromServer();
      const pipeState = readJsonFile(join(SYSTEM_DIR, "persona-pipeline-state.json"), { processed: [], failed: [] });
      const buildData = readBuildTaskFiles();
      const validation = readJsonFile(join(ROOT, "system", "persona-batch-synthesis", "validation.json"), { gaps: [] });
      const uptimeData = readJsonFile(UPTIME_FILE, {});
      const drift = readJsonFile(DRIFT_FILE, { drifts: [] });
      const scoreHistory = readScoreHistory();

      let score = 0;
      const breakdown = {};

      // Server uptime (0-15): running = 15
      breakdown.server = 15;
      score += 15;

      // Ollama (0-15): connected = 15, unreachable = 0
      breakdown.ollama = ollamaOk ? 15 : 0;
      score += breakdown.ollama;

      // Conversion rate (0-20): % of generated that made it to planned
      const processed = (pipeState.processed || []).length;
      const totalGen = processed + (pipeState.failed || []).length;
      const convRate = totalGen > 0 ? processed / totalGen : 0;
      breakdown.conversion = Math.round(convRate * 20);
      score += breakdown.conversion;

      // Plan quality (0-20): ratio of valid file refs in plans
      const plans = buildData.tasks;
      let totalRefs = 0, validRefs = 0;
      for (const task of plans.slice(0, 20)) {
        try {
          const content = readFileSync(join(ROOT, task.path), "utf8");
          const refs = [...content.matchAll(/`([a-zA-Z][\w/.-]+\.(?:ts|tsx|js|jsx))`/g)].map(m => m[1]);
          totalRefs += refs.length;
          validRefs += refs.filter(r => !r.includes("{") && existsSync(join(ROOT, r))).length;
        } catch {}
      }
      const refQuality = totalRefs > 0 ? validRefs / totalRefs : 0.5;
      breakdown.plan_quality = Math.round(refQuality * 20);
      score += breakdown.plan_quality;

      // Score trends (0-15): avg delta > 0 = good
      const deltas = [];
      const bySlug = {};
      for (const e of scoreHistory) {
        if (!bySlug[e.slug]) bySlug[e.slug] = [];
        bySlug[e.slug].push(e.score);
      }
      for (const scores of Object.values(bySlug)) {
        if (scores.length >= 2) deltas.push(scores[scores.length - 1] - scores[0]);
      }
      const avgDelta = deltas.length > 0 ? deltas.reduce((s, d) => s + d, 0) / deltas.length : 0;
      breakdown.score_trend = Math.max(0, Math.min(15, Math.round(7.5 + avgDelta / 4)));
      score += breakdown.score_trend;

      // Coverage breadth (0-15): % of categories with some coverage
      const cats = new Set();
      const coveredCats = new Set();
      for (const gap of (validation.gaps || [])) {
        cats.add(gap.category);
        if (gap.status !== "MISSING") coveredCats.add(gap.category);
      }
      const breadth = cats.size > 0 ? coveredCats.size / cats.size : 0;
      breakdown.coverage = Math.round(breadth * 15);
      score += breakdown.coverage;

      // Drift penalty: -2 per drift detected
      const driftPenalty = Math.min(10, (drift.drifts || []).length * 2);
      breakdown.drift_penalty = -driftPenalty;
      score -= driftPenalty;

      score = Math.max(0, Math.min(100, score));

      sendJson(res, 200, {
        score,
        grade: score >= 80 ? "A" : score >= 60 ? "B" : score >= 40 ? "C" : score >= 20 ? "D" : "F",
        breakdown,
        recommendations: [
          ...(breakdown.ollama === 0 ? ["Start Ollama to enable pipeline processing"] : []),
          ...(breakdown.plan_quality < 10 ? ["Plan file refs are mostly invalid - run drift detection"] : []),
          ...(breakdown.conversion < 10 ? ["Low conversion rate - check failed personas"] : []),
          ...(driftPenalty > 0 ? [`${(drift.drifts || []).length} codebase drifts detected - re-validate gaps`] : []),
        ],
      });
      return;
    }

    if (req.method === "GET" && path === "/api/drift") {
      const report = readJsonFile(DRIFT_FILE, null);
      if (!report) {
        // Run on-demand if no report exists
        sendJson(res, 200, runDriftDetection() || { drifts: [], message: "No validation data" });
      } else {
        sendJson(res, 200, report);
      }
      return;
    }

    if (req.method === "GET" && path === "/api/coverage") {
      // Category coverage heatmap: coverage %, gap counts, build status per category
      const validation = readJsonFile(join(ROOT, "system", "persona-batch-synthesis", "validation.json"), { gaps: [] });
      const categories = {};
      for (const gap of (validation.gaps || [])) {
        const cat = gap.category;
        if (!categories[cat]) categories[cat] = { built: 0, partial: 0, missing: 0, total: 0, high: 0, personas: new Set() };
        categories[cat][gap.status.toLowerCase()]++;
        categories[cat].total++;
        if (gap.severity === "HIGH") categories[cat].high++;
        if (gap.from) categories[cat].personas.add(gap.from);
      }

      const heatmap = Object.entries(categories)
        .map(([cat, c]) => ({
          category: cat,
          coverage_pct: Math.round(((c.built + c.partial * 0.5) / c.total) * 100),
          built: c.built,
          partial: c.partial,
          missing: c.missing,
          total: c.total,
          high_severity: c.high,
          personas: c.personas.size,
          health: c.missing === 0 ? "green" : c.missing <= c.built ? "yellow" : "red",
        }))
        .sort((a, b) => a.coverage_pct - b.coverage_pct);

      const overall = heatmap.length > 0
        ? Math.round(heatmap.reduce((s, c) => s + c.coverage_pct, 0) / heatmap.length)
        : 0;

      sendJson(res, 200, {
        categories: heatmap,
        summary: {
          total_categories: heatmap.length,
          green: heatmap.filter(c => c.health === "green").length,
          yellow: heatmap.filter(c => c.health === "yellow").length,
          red: heatmap.filter(c => c.health === "red").length,
          overall_coverage_pct: overall,
        },
      });
      return;
    }

    if (req.method === "GET" && path === "/api/plan-priority") {
      // Score and rank all pending build plans by impact
      const buildData = readBuildTaskFiles();
      const validation = readJsonFile(join(ROOT, "system", "persona-batch-synthesis", "validation.json"), { gaps: [] });

      // Build category severity map
      const catSeverity = {};
      for (const gap of (validation.gaps || [])) {
        if (gap.status === "MISSING") {
          catSeverity[gap.category] = (catSeverity[gap.category] || 0) + (gap.severity === "HIGH" ? 3 : gap.severity === "MEDIUM" ? 2 : 1);
        }
      }

      const scored = buildData.tasks.map(task => {
        let score = 0;
        // Severity weight
        if (task.severity === "HIGH") score += 30;
        else if (task.severity === "MEDIUM") score += 20;
        else score += 10;

        // File reference accuracy
        const content = (() => { try { return readFileSync(join(ROOT, task.path), "utf8"); } catch { return ""; } })();
        const fileRefs = [...content.matchAll(/`([a-zA-Z][\w/.-]+\.(?:ts|tsx|js|jsx|mjs|css|sql))`/g)].map(m => m[1]);
        const validRefs = fileRefs.filter(r => !r.includes("{") && existsSync(join(ROOT, r)));
        const refAccuracy = fileRefs.length > 0 ? validRefs.length / fileRefs.length : 0.5;
        score += Math.round(refAccuracy * 25);

        // Category gap severity (more missing in this category = higher priority)
        const catMatch = content.match(/category[:\s]+(\S+)/i);
        const cat = catMatch ? catMatch[1].toLowerCase().replace(/[^a-z-]/g, "") : null;
        if (cat && catSeverity[cat]) score += Math.min(catSeverity[cat] * 3, 20);

        // Penalize plans with zero valid file refs
        if (fileRefs.length > 0 && validRefs.length === 0) score -= 15;

        return {
          ...task,
          score: Math.max(0, Math.min(100, score)),
          ref_accuracy: +(refAccuracy * 100).toFixed(0),
          file_refs: fileRefs.length,
          valid_refs: validRefs.length,
        };
      }).sort((a, b) => b.score - a.score);

      sendJson(res, 200, {
        plans: scored,
        summary: {
          total: scored.length,
          high_priority: scored.filter(p => p.score >= 50).length,
          low_quality: scored.filter(p => p.ref_accuracy === 0 && p.file_refs > 0).length,
          avg_score: scored.length > 0 ? +(scored.reduce((s, p) => s + p.score, 0) / scored.length).toFixed(1) : 0,
        },
      });
      return;
    }

    if (req.method === "GET" && path === "/api/gap-dedup") {
      // Find duplicate/overlapping gaps across personas
      const validation = readJsonFile(join(ROOT, "system", "persona-batch-synthesis", "validation.json"), { gaps: [] });
      const gaps = validation.gaps || [];

      // Normalize titles for fuzzy matching
      function normalizeTitle(t) {
        return String(t).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
      }

      // Group by normalized title
      const groups = {};
      for (const gap of gaps) {
        const key = normalizeTitle(gap.title);
        if (!groups[key]) groups[key] = { title: gap.title, key, gaps: [] };
        groups[key].gaps.push({ from: gap.from, category: gap.category, severity: gap.severity, status: gap.status });
      }

      // Find groups with 2+ entries (actual duplicates)
      const duplicates = Object.values(groups)
        .filter(g => g.gaps.length > 1)
        .sort((a, b) => b.gaps.length - a.gaps.length);

      // Also find near-duplicates via word overlap (Jaccard similarity)
      const titles = Object.keys(groups);
      const nearDupes = [];
      for (let i = 0; i < titles.length; i++) {
        const wordsA = new Set(titles[i].split(" ").filter(w => w.length > 2));
        for (let j = i + 1; j < titles.length; j++) {
          const wordsB = new Set(titles[j].split(" ").filter(w => w.length > 2));
          const intersection = [...wordsA].filter(w => wordsB.has(w)).length;
          const union = new Set([...wordsA, ...wordsB]).size;
          const similarity = union > 0 ? intersection / union : 0;
          if (similarity >= 0.5 && intersection >= 2) {
            nearDupes.push({
              a: groups[titles[i]].title,
              b: groups[titles[j]].title,
              similarity: +similarity.toFixed(2),
              shared_words: [...wordsA].filter(w => wordsB.has(w)),
            });
          }
        }
      }

      sendJson(res, 200, {
        exact_duplicates: duplicates,
        near_duplicates: nearDupes.sort((a, b) => b.similarity - a.similarity).slice(0, 20),
        total_gaps: gaps.length,
        unique_gaps: Object.keys(groups).length,
        duplicate_ratio: gaps.length > 0 ? +((1 - Object.keys(groups).length / gaps.length) * 100).toFixed(1) : 0,
      });
      return;
    }

    if (req.method === "GET" && path === "/api/pipeline-funnel") {
      // Full pipeline funnel: generated → validated → analyzed → planned → quality-gated → completed
      const pipeState = readJsonFile(join(SYSTEM_DIR, "persona-pipeline-state.json"), { processed: [], failed: [] });
      const buildData = readBuildTaskFiles();
      const rejectedDir = join(ROOT, "system", "persona-build-plans-rejected");
      let rejectedCount = 0;
      try { if (existsSync(rejectedDir)) rejectedCount = readdirSync(rejectedDir).filter(f => f.endsWith(".md")).length; } catch {}

      // Count persona source files
      const completedDir = join(ROOT, "Chef Flow Personas", "Completed");
      const failedDir = join(ROOT, "Chef Flow Personas", "Failed");
      const uncompletedDir = join(ROOT, "Chef Flow Personas", "Uncompleted");
      let totalGenerated = 0;
      for (const dir of [completedDir, failedDir, uncompletedDir]) {
        try {
          if (existsSync(dir)) {
            for (const sub of readdirSync(dir)) {
              const subDir = join(dir, sub);
              try { if (statSync(subDir).isDirectory()) totalGenerated += readdirSync(subDir).filter(f => f.endsWith(".md") || f.endsWith(".txt")).length; } catch {}
            }
          }
        } catch {}
      }

      const validated = (pipeState.processed || []).length;
      const failedValidation = (pipeState.failed || []).length;
      const analyzed = validated; // all processed have been analyzed
      const planned = (pipeState.processed || []).filter(p => p.planned_at).length;
      const totalPlans = buildData.tasks.length + buildData.completedCount + rejectedCount;
      const qualityPassed = buildData.tasks.length + buildData.completedCount;

      const funnel = {
        stages: [
          { name: "generated", count: totalGenerated },
          { name: "validated", count: validated, dropped: failedValidation },
          { name: "analyzed", count: analyzed },
          { name: "planned", count: planned, plans_produced: totalPlans },
          { name: "quality_gated", count: qualityPassed, rejected: rejectedCount },
          { name: "completed", count: buildData.completedCount },
        ],
        conversion: {
          generated_to_validated: totalGenerated > 0 ? +((validated / totalGenerated) * 100).toFixed(1) : 0,
          validated_to_planned: validated > 0 ? +((planned / validated) * 100).toFixed(1) : 0,
          planned_to_quality: totalPlans > 0 ? +((qualityPassed / totalPlans) * 100).toFixed(1) : 0,
          quality_to_completed: qualityPassed > 0 ? +((buildData.completedCount / qualityPassed) * 100).toFixed(1) : 0,
          end_to_end: totalGenerated > 0 ? +((buildData.completedCount / totalGenerated) * 100).toFixed(1) : 0,
        },
      };
      sendJson(res, 200, funnel);
      return;
    }

    if (req.method === "GET" && path === "/api/capture-tags") {
      sendJson(res, 200, { tags: getCaptureTags() });
      return;
    }

    if (req.method === "GET" && path === "/api/request-metrics") {
      const avg = requestMetrics.total > 0 ? Math.round(requestMetrics.latency_sum_ms / requestMetrics.total) : 0;
      sendJson(res, 200, {
        ...requestMetrics,
        latency_avg_ms: avg,
        error_rate: requestMetrics.total > 0 ? +(requestMetrics.errors / requestMetrics.total).toFixed(4) : 0,
      });
      return;
    }

    if (req.method === "GET" && path === "/api/plan-content") {
      const planPath = url.searchParams.get("path");
      if (!planPath) { sendJson(res, 400, { error: "Missing path parameter" }); return; }
      // Security: only allow reading from system/persona-build-plans/
      const allowedDir = join(ROOT, "system", "persona-build-plans");
      const resolved = join(ROOT, planPath);
      if (!resolved.replace(/\\/g, "/").startsWith(allowedDir.replace(/\\/g, "/")) || !existsSync(resolved)) {
        sendJson(res, 404, { error: "Plan not found" }); return;
      }
      try {
        const content = readFileSync(resolved, "utf8");
        res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
        res.end(content);
      } catch { sendJson(res, 500, { error: "Failed to read plan" }); }
      return;
    }

    sendJson(res, 404, { error: "Not found" });
  } catch (err) {
    sendJson(res, 500, { error: err.message || "Import failed" });
  }
});

const LISTEN_MAX_RETRIES = 5;
const LISTEN_RETRY_DELAY_MS = 3000;
let listenAttempt = 0;

server.on("error", (err) => {
  if (err.code === "EADDRINUSE" && listenAttempt < LISTEN_MAX_RETRIES) {
    listenAttempt++;
    console.warn(`[startup] Port ${port} in use, retry ${listenAttempt}/${LISTEN_MAX_RETRIES} in ${LISTEN_RETRY_DELAY_MS / 1000}s...`);
    setTimeout(() => server.listen(port, host), LISTEN_RETRY_DELAY_MS);
  } else {
    console.error(`[startup] Fatal: ${err.message}`);
    process.exit(1);
  }
});

server.listen(port, host, () => {
  mkdirSync(SYSTEM_DIR, { recursive: true });
  ensureIntakeDirs();
  ensureCaptureDir();
  startRuntimeFileWatcher();
  startScheduledPipeline();
  startScheduledSynthesis();
  startWatchdog();
  startAutoGeneration();
  startAutoRetry();
  startOvernightScheduler();
  startDriftDetection();
  startAutoArchive();
  emitRuntimeEvent("state:update", "3977.server", {
    action: "server_listening",
    host,
    port,
    runtimeEventFile: relativePath(RUNTIME_EVENT_FILE),
  }, { workflow: "3977-runtime" });
  const displayHost = host === "0.0.0.0" ? "127.0.0.1" : host;
  console.log(`[persona-inbox] http://${displayHost}:${port}`);
  if (authToken) {
    console.log("[persona-inbox] token auth enabled");
  }
  recordStartup();
  // Clean orphaned pipeline lock from prior crash
  const bootLockFile = join(SYSTEM_DIR, ".pipeline.lock");
  if (existsSync(bootLockFile)) {
    try {
      const lockData = JSON.parse(readFileSync(bootLockFile, "utf8"));
      const lockPid = lockData.pid;
      let ownerAlive = false;
      if (lockPid && lockPid !== 0) {
        try { process.kill(lockPid, 0); ownerAlive = true; } catch {}
      }
      if (!ownerAlive) {
        unlinkSync(bootLockFile);
        console.log(`[boot] Removed orphaned pipeline lock (pid ${lockPid} is dead)`);
        emitRuntimeEvent("state:update", "3977.boot", {
          action: "orphaned_lock_removed",
          stale_pid: lockPid,
        }, { workflow: "boot" });
      }
    } catch {}
  }
});

// --- Graceful Shutdown ---
function gracefulShutdown(signal) {
  console.log(`[shutdown] ${signal} received, cleaning up...`);
  recordShutdown();
  // Clear scheduled intervals
  if (scheduledPipelineInterval) clearInterval(scheduledPipelineInterval);
  if (scheduledSynthesisInterval) clearInterval(scheduledSynthesisInterval);
  if (watchdogInterval) clearInterval(watchdogInterval);
  if (autoGenInterval) clearInterval(autoGenInterval);
  if (autoRetryInterval) clearInterval(autoRetryInterval);
  if (overnightInterval) clearInterval(overnightInterval);
  if (driftInterval) clearInterval(driftInterval);
  if (autoArchiveInterval) clearInterval(autoArchiveInterval);
  // Close SSE clients
  for (const client of runtimeClients) {
    try { client.end(); } catch {}
  }
  runtimeClients.clear();
  // Close file watcher
  if (runtimeFileWatcher) {
    try { runtimeFileWatcher.close(); } catch {}
  }
  // Remove stale lock if we own it
  const lockFile = join(SYSTEM_DIR, ".pipeline.lock");
  if (existsSync(lockFile)) {
    try {
      const data = JSON.parse(readFileSync(lockFile, "utf8"));
      if (data.pid === process.pid) unlinkSync(lockFile);
    } catch {}
  }
  // Emit shutdown event
  emitRuntimeEvent("state:update", "3977.server", {
    action: "graceful_shutdown",
    signal,
    uptime_s: Math.round(process.uptime()),
  }, { workflow: "3977-runtime" });
  // Close HTTP server
  server.close(() => {
    console.log("[shutdown] Server closed cleanly");
    process.exit(0);
  });
  // Force exit after 5s if server won't close
  setTimeout(() => {
    console.error("[shutdown] Forced exit after 5s timeout");
    process.exit(1);
  }, 5000);
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

process.on("unhandledRejection", (reason, promise) => {
  console.error("[crash-guard] Unhandled rejection:", reason);
  emitRuntimeEvent("error", "3977.crash-guard", {
    action: "unhandled_rejection",
    message: String(reason),
    stack: reason?.stack || null,
  }, { workflow: "crash-guard" });
});

process.on("uncaughtException", (err, origin) => {
  console.error(`[crash-guard] Uncaught exception (${origin}):`, err);
  emitRuntimeEvent("error", "3977.crash-guard", {
    action: "uncaught_exception",
    origin,
    message: err.message,
    stack: err.stack,
  }, { workflow: "crash-guard" });
  // Let PM2 restart us cleanly
  gracefulShutdown("uncaughtException");
});
