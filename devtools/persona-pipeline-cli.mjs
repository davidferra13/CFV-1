#!/usr/bin/env node
/**
 * Persona Pipeline CLI
 *
 * Scriptable entry point for all persona pipeline operations.
 * No server needed. Shares filesystem state with the dashboard.
 *
 * Usage:
 *   node devtools/persona-pipeline-cli.mjs status
 *   node devtools/persona-pipeline-cli.mjs run [--max N] [--file path]
 *   node devtools/persona-pipeline-cli.mjs synthesize
 *   node devtools/persona-pipeline-cli.mjs validate
 *   node devtools/persona-pipeline-cli.mjs auto-build [--limit N] [--dry-run] [--force]
 *   node devtools/persona-pipeline-cli.mjs converge [status|start-epoch|build-batch|close-epoch|history]
 *   node devtools/persona-pipeline-cli.mjs import <file> [--type Chef]
 *   node devtools/persona-pipeline-cli.mjs queue
 *   node devtools/persona-pipeline-cli.mjs generate [--type Chef] [--count N] [--category name]
 *   node devtools/persona-pipeline-cli.mjs vault
 *   node devtools/persona-pipeline-cli.mjs sources
 *   node devtools/persona-pipeline-cli.mjs serve [--port 3977]
 */

import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { spawn, spawnSync } from "node:child_process";

import {
  ROOT,
  countDiskQueues,
  readPipelineState,
  readSynthesisData,
  readValidation,
  readPersonaReports,
  readAllPersonaSources,
  readBuildQueueFiles,
  readBuildTaskFiles,
  readScoreHistory,
  readIntakeQueue,
  readAutoGenerationState,
  findUnprocessedPersonaFiles,
  countNewReportsSinceLastSynthesis,
  synthesisTimestampMs,
  vaultStats,
  vaultIndex,
  runGapValidation,
  generateGapBuildSpec,
  stageBuildQueueFromSynthesis,
  spawnOrchestrator,
  spawnSynthesizer,
  spawnGenerator,
  writePersona,
  inferType,
  inferTypeFromContent,
  splitBulk,
  cleanDisplayName,
  inferName,
  savePipelineState,
  markGapValidated,
  getPrecisionReport,
} from "./persona-pipeline-core.mjs";

// ---------------------------------------------------------------------------
// CLI argument parsing
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const command = args[0] || "help";

function getFlag(name, defaultValue) {
  const idx = args.indexOf(`--${name}`);
  if (idx === -1) return defaultValue;
  return args[idx + 1] || defaultValue;
}

function hasFlag(name) {
  return args.includes(`--${name}`);
}

// ---------------------------------------------------------------------------
// Formatters
// ---------------------------------------------------------------------------

const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const RESET = "\x1b[0m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const RED = "\x1b[31m";
const CYAN = "\x1b[36m";

function scoreColor(score) {
  if (score == null) return DIM;
  if (score < 40) return RED;
  if (score < 70) return YELLOW;
  return GREEN;
}

function timeAgo(ms) {
  if (!ms) return "never";
  const seconds = Math.floor((Date.now() - ms) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function pad(str, len) {
  return String(str).padEnd(len);
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

async function cmdStatus() {
  const counts = countDiskQueues();
  const pipeline = readPipelineState();
  const synthesis = readSynthesisData();
  const vault = vaultStats();
  const unprocessed = findUnprocessedPersonaFiles();
  const newReports = countNewReportsSinceLastSynthesis();
  const synthAge = synthesisTimestampMs();
  const autoGen = readAutoGenerationState();
  const reports = readPersonaReports();
  const buildQueue = readBuildQueueFiles();

  console.log(`${BOLD}PERSONA PIPELINE STATUS${RESET}`);
  console.log(`${"=".repeat(50)}`);
  console.log();

  console.log(`${BOLD}Queues${RESET}`);
  console.log(`  Uncompleted:  ${YELLOW}${counts.uncompleted}${RESET}`);
  console.log(`  Completed:    ${GREEN}${counts.completed}${RESET}`);
  console.log(`  Failed:       ${RED}${counts.failed}${RESET}`);
  console.log(`  Total:        ${counts.total}`);
  console.log(`  Unprocessed:  ${unprocessed.length > 0 ? YELLOW : GREEN}${unprocessed.length}${RESET}`);
  console.log();

  console.log(`${BOLD}Pipeline${RESET}`);
  console.log(`  Processed:    ${pipeline.total_personas_processed || 0}`);
  console.log(`  Failed:       ${(pipeline.failed || []).length}`);
  console.log(`  Last cycle:   ${pipeline.last_cycle || "never"}`);
  console.log(`  Build tasks:  ${counts.buildTasks}`);
  console.log();

  console.log(`${BOLD}Synthesis${RESET}`);
  console.log(`  Last run:     ${timeAgo(synthAge)}`);
  console.log(`  New reports:  ${newReports} since last synthesis`);
  if (synthesis) {
    const cats = Object.keys(synthesis.categories || {}).length;
    const totalGaps = Object.values(synthesis.categories || {}).reduce((sum, c) => sum + (c.gaps?.length || 0), 0);
    console.log(`  Categories:   ${cats}`);
    console.log(`  Total gaps:   ${totalGaps}`);
    if (synthesis.saturation) {
      console.log(`  Saturation:   ${synthesis.saturation.level || "unknown"}`);
    }
  }
  console.log();

  console.log(`${BOLD}Build Queue${RESET}`);
  console.log(`  Total:        ${buildQueue.counts.total}`);
  console.log(`  Pending:      ${buildQueue.counts.pending}`);
  console.log(`  In progress:  ${buildQueue.counts.in_progress}`);
  console.log(`  Built:        ${buildQueue.counts.built}`);
  console.log();

  console.log(`${BOLD}Vault${RESET}`);
  console.log(`  Total:        ${vault.total}`);
  console.log(`  Human:        ${vault.human}`);
  console.log(`  AI:           ${vault.ai}`);
  console.log();

  console.log(`${BOLD}Reports${RESET} (${reports.length} total)`);
  for (const r of reports.slice(0, 8)) {
    const sc = r.score != null ? `${scoreColor(r.score)}${r.score}/100${RESET}` : `${DIM}?${RESET}`;
    console.log(`  ${pad(r.name, 32)} ${sc}  ${DIM}${r.type}${RESET}`);
  }
  if (reports.length > 8) console.log(`  ${DIM}... and ${reports.length - 8} more${RESET}`);
  console.log();

  console.log(`${BOLD}Auto-Generation${RESET}`);
  console.log(`  Today:        ${autoGen.today_count || 0}/10`);
  console.log(`  This hour:    ${autoGen.hour_count || 0}/3`);
  console.log(`  Last:         ${autoGen.last_generated || "never"}`);
}

async function cmdRun() {
  const max = Number(getFlag("max", "5"));
  const file = getFlag("file", null);

  if (file) {
    const resolved = resolve(file);
    if (!existsSync(resolved)) {
      console.error(`File not found: ${file}`);
      process.exit(1);
    }
    console.log(`Running pipeline on: ${file}`);
    const code = await spawnOrchestrator({ file: resolved });
    process.exit(code);
  }

  const unprocessed = findUnprocessedPersonaFiles();
  const count = Math.min(max, unprocessed.length || 1);
  console.log(`Running pipeline (max ${count} personas, ${unprocessed.length} unprocessed)`);
  const code = await spawnOrchestrator({ max: count });
  process.exit(code);
}

async function cmdSynthesize() {
  console.log("Running batch synthesis...");
  const code = await spawnSynthesizer();
  if (code === 0) {
    const staged = stageBuildQueueFromSynthesis();
    console.log(`Synthesis complete. Staged ${staged.staged || 0} build queue items.`);
    const state = readPipelineState();
    state.last_synthesis_at = new Date().toISOString();
    savePipelineState(state);
  }
  process.exit(code);
}

async function cmdValidate() {
  console.log("Validating gaps against codebase...");
  const result = runGapValidation();
  if (result.error) {
    console.error(result.error);
    process.exit(1);
  }

  console.log();
  console.log(`${BOLD}VALIDATION RESULTS${RESET}`);
  console.log(`${"=".repeat(40)}`);
  console.log(`  Total gaps:       ${result.summary.total}`);
  console.log(`  ${GREEN}BUILT:${RESET}           ${result.summary.built}`);
  console.log(`  ${CYAN}PARTIAL:${RESET}         ${result.summary.partial}`);
  console.log(`  ${RED}MISSING:${RESET}         ${result.summary.missing}`);
  console.log(`  False positive:   ${result.summary.false_positive_rate}%`);
  console.log();

  if (hasFlag("verbose")) {
    for (const gap of result.gaps) {
      const color = gap.status === "BUILT" ? GREEN : gap.status === "PARTIAL" ? CYAN : RED;
      console.log(`  ${color}[${gap.status}]${RESET} ${gap.title}`);
      for (const e of gap.evidence) {
        if (e.path) console.log(`    ${DIM}file: ${e.path}${RESET}`);
        if (e.files) console.log(`    ${DIM}grep: ${e.files.join(", ")}${RESET}`);
      }
    }
  }

  console.log(`Saved to system/persona-batch-synthesis/validation.json`);
  const precision = getPrecisionReport();
  if (precision.overall?.validated > 0) {
    console.log();
    console.log(`${BOLD}PRECISION TRACKING${RESET}`);
    console.log(`  Validated:        ${precision.overall.validated}/${precision.overall.total_gaps}`);
    console.log(`  True positives:   ${GREEN}${precision.overall.true_positives}${RESET}`);
    console.log(`  False positives:  ${RED}${precision.overall.false_positives}${RESET}`);
    console.log(`  Precision rate:   ${precision.overall.precision_rate}%`);
  }
}

async function cmdMarkGap() {
  const title = args.slice(1).filter(a => !a.startsWith("--")).join(" ");
  if (!title) { console.error("Usage: mark-real <gap title> | mark-false <gap title>"); process.exit(1); }
  const isReal = command === "mark-real";
  const result = markGapValidated(title, isReal);
  if (result.error) { console.error(result.error); process.exit(1); }
  console.log(`${isReal ? GREEN : RED}Marked "${title}" as ${isReal ? "REAL GAP" : "FALSE POSITIVE"}${RESET}`);
  console.log(`Precision: ${result.precision.precision_rate}% (${result.precision.validated_count} validated)`);
}

async function cmdPrecision() {
  const report = getPrecisionReport();
  if (report.error) { console.error(report.error); process.exit(1); }
  console.log();
  console.log(`${BOLD}PIPELINE PRECISION REPORT${RESET}`);
  console.log(`${"=".repeat(50)}`);
  console.log(`  Total gaps:       ${report.overall.total_gaps}`);
  console.log(`  Validated:        ${report.overall.validated}`);
  console.log(`  Unvalidated:      ${report.overall.unvalidated}`);
  console.log(`  ${GREEN}True positives:${RESET}  ${report.overall.true_positives}`);
  console.log(`  ${RED}False positives:${RESET} ${report.overall.false_positives}`);
  console.log(`  Precision rate:   ${report.overall.precision_rate !== null ? report.overall.precision_rate + "%" : "N/A"}`);
  console.log();
  console.log(`${BOLD}By Category:${RESET}`);
  for (const [cat, s] of Object.entries(report.by_category)) {
    const rate = s.validated > 0 ? Math.round((s.true_positives / s.validated) * 100) : "?";
    console.log(`  ${cat}: ${s.total} gaps, ${s.validated} validated, ${rate}% precision`);
  }
  console.log();
  console.log(`${BOLD}By Persona:${RESET}`);
  for (const [p, s] of Object.entries(report.by_persona)) {
    const rate = s.validated > 0 ? Math.round((s.true_positives / s.validated) * 100) : "?";
    console.log(`  ${p}: ${s.total} gaps, ${s.validated} validated, ${rate}% precision`);
  }
}

async function cmdAutoBuild() {
  const validation = readValidation();
  if (!validation || !Array.isArray(validation.gaps)) {
    console.log("No validation data. Run: persona-pipeline synthesize && persona-pipeline validate");
    return;
  }

  const missing = validation.gaps.filter((gap) => gap.status === "MISSING");
  const parsedLimit = Number.parseInt(getFlag("limit", "10"), 10);
  const limit = Number.isFinite(parsedLimit) ? Math.max(parsedLimit, 0) : 10;
  const dryRun = hasFlag("dry-run");
  const force = hasFlag("force");

  const queuePath = join(ROOT, "system", "persona-batch-synthesis", "priority-queue.json");
  let ranked = missing;
  if (existsSync(queuePath)) {
    try {
      const priorityQueue = JSON.parse(readFileSync(queuePath, "utf8"));
      if (Array.isArray(priorityQueue.queue)) {
        const byTitle = new Map(missing.map((gap) => [String(gap.title || "").toLowerCase(), gap]));
        const usedTitles = new Set();
        const ordered = [];

        for (const queuedGap of priorityQueue.queue) {
          const key = String(queuedGap.title || "").toLowerCase();
          const gap = byTitle.get(key);
          if (!gap || usedTitles.has(key)) continue;
          ordered.push({
            ...gap,
            description: queuedGap.description || gap.description,
            priority_score: queuedGap.priority_score,
          });
          usedTitles.add(key);
        }

        ranked = [
          ...ordered,
          ...missing.filter((gap) => !usedTitles.has(String(gap.title || "").toLowerCase())),
        ];
      }
    } catch (err) {
      console.warn(`Could not read priority queue, using validation order: ${err.message}`);
    }
  }

  const batch = ranked.slice(0, limit);
  console.log(`\n  Auto-build: ${missing.length} MISSING gaps, queuing top ${batch.length}\n`);

  const queueDir = join(ROOT, "system", "codex-queue");
  if (!dryRun && batch.length > 0) mkdirSync(queueDir, { recursive: true });

  let written = 0;
  for (let i = 0; i < batch.length; i++) {
    const { slug, spec } = generateGapBuildSpec(batch[i], i + 1);
    const outPath = join(queueDir, `${slug}.md`);
    if (existsSync(outPath) && !force) {
      console.log(`  SKIP ${slug} (already queued, use --force to overwrite)`);
      continue;
    }
    if (dryRun) {
      console.log(`  DRY-RUN would write: ${slug}.md`);
    } else {
      writeFileSync(outPath, spec, "utf8");
      console.log(`  QUEUED ${slug}.md (${batch[i].severity})`);
      written++;
    }
  }

  console.log(`\n  Done. ${written} specs written to system/codex-queue/`);
  if (!dryRun && written > 0) {
    console.log("  Next: submit with persona-to-codex or manually review specs");
  }
}

async function cmdConverge() {
  const subcommand = args[1] || "status";
  const allowed = ["status", "start-epoch", "build-batch", "close-epoch", "history"];
  if (!allowed.includes(subcommand)) {
    console.log(`Unknown converge subcommand: ${subcommand}`);
    console.log(`Available: ${allowed.join(", ")}`);
    return;
  }

  const cliArgs = ["devtools/persona-convergence.mjs", subcommand, ...process.argv.slice(4)];
  const result = spawnSync("node", cliArgs, {
    cwd: ROOT,
    stdio: "inherit",
    encoding: "utf8",
  });
  process.exitCode = result.status || 0;
}

async function cmdImport() {
  const filePath = args[1];
  if (!filePath) {
    console.error("Usage: persona-pipeline-cli.mjs import <file> [--type Chef]");
    process.exit(1);
  }

  const resolved = resolve(filePath);
  if (!existsSync(resolved)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }

  const content = readFileSync(resolved, "utf8");
  const typeFlag = getFlag("type", null);
  const defaultType = typeFlag ? inferType(typeFlag) : "Chef";
  const entries = splitBulk(content, defaultType);

  if (entries.length === 0) {
    console.error("No persona entries detected in file.");
    process.exit(1);
  }

  console.log(`Importing ${entries.length} persona(s)...`);
  for (const entry of entries) {
    const type = inferType(entry.type, defaultType);
    const name = cleanDisplayName(inferName(entry.content, entry.name));
    const result = writePersona(
      { type, name, content: entry.content },
      defaultType,
      { type: "human", name: "David", tool: "cli" },
    );
    console.log(`  ${GREEN}Saved:${RESET} ${result.name} (${result.type}) -> ${result.relativePath}`);
  }

  if (hasFlag("run")) {
    console.log("\nRunning pipeline...");
    const code = await spawnOrchestrator({ max: entries.length });
    process.exit(code);
  }
}

async function cmdQueue() {
  const buildQueue = readBuildQueueFiles();
  const { tasks, completedCount } = readBuildTaskFiles();

  console.log(`${BOLD}BUILD QUEUE${RESET} (${buildQueue.counts.total} items)`);
  console.log(`  Pending: ${buildQueue.counts.pending}  In-progress: ${buildQueue.counts.in_progress}  Built: ${buildQueue.counts.built}`);
  console.log();

  for (const item of buildQueue.items) {
    const sevColor = item.severity === "HIGH" ? RED : item.severity === "MEDIUM" ? YELLOW : GREEN;
    console.log(`  ${sevColor}[${item.severity}]${RESET} ${item.title}`);
    console.log(`    ${DIM}${item.category} | ${item.confidence} | ${item.source}${RESET}`);
  }

  if (tasks.length > 0) {
    console.log();
    console.log(`${BOLD}BUILD TASKS${RESET} (${tasks.length} active, ${completedCount} completed)`);
    for (const task of tasks.slice(0, 15)) {
      const sevColor = task.severity === "HIGH" ? RED : task.severity === "MEDIUM" ? YELLOW : GREEN;
      console.log(`  ${sevColor}[${task.severity}]${RESET} ${task.title} ${DIM}(${task.persona})${RESET}`);
    }
    if (tasks.length > 15) console.log(`  ${DIM}... and ${tasks.length - 15} more${RESET}`);
  }
}

async function cmdGenerate() {
  const type = getFlag("type", "Chef");
  const count = Number(getFlag("count", "1"));
  const category = getFlag("category", null);

  console.log(`Generating ${count} ${type} persona(s)${category ? ` (category: ${category})` : ""}...`);
  const code = await spawnGenerator({ type, count, category });
  process.exit(code);
}

async function cmdVault() {
  const stats = vaultStats();
  const index = vaultIndex();

  console.log(`${BOLD}PERSONA VAULT${RESET}`);
  console.log(`  Total:   ${stats.total}`);
  console.log(`  Human:   ${stats.human}`);
  console.log(`  AI:      ${stats.ai}`);
  console.log();

  if (stats.by_type && Object.keys(stats.by_type).length > 0) {
    console.log(`${BOLD}By Type${RESET}`);
    for (const [type, count] of Object.entries(stats.by_type)) {
      console.log(`  ${pad(type, 12)} ${count}`);
    }
    console.log();
  }

  if (stats.by_tool && Object.keys(stats.by_tool).length > 0) {
    console.log(`${BOLD}By Tool${RESET}`);
    for (const [tool, count] of Object.entries(stats.by_tool)) {
      console.log(`  ${pad(tool, 20)} ${count}`);
    }
    console.log();
  }

  console.log(`${BOLD}Recent Entries${RESET}`);
  const recent = index.slice(-10).reverse();
  for (const r of recent) {
    console.log(`  ${pad(r.persona_name, 28)} ${DIM}${r.persona_type} | ${r.author?.tool || "?"} | ${r.submitted_at?.slice(0, 10) || "?"}${RESET}`);
  }
}

async function cmdSources() {
  const sources = readAllPersonaSources();

  const byStatus = {};
  for (const s of sources) {
    byStatus[s.status] = (byStatus[s.status] || 0) + 1;
  }

  console.log(`${BOLD}PERSONA SOURCES${RESET} (${sources.length} total)`);
  for (const [status, count] of Object.entries(byStatus)) {
    const color = status === "completed" ? GREEN : status === "failed" ? RED : YELLOW;
    console.log(`  ${color}${pad(status, 14)}${RESET} ${count}`);
  }
  console.log();

  for (const s of sources.slice(0, 20)) {
    const color = s.status === "completed" ? GREEN : s.status === "failed" ? RED : YELLOW;
    console.log(`  ${color}[${s.status}]${RESET} ${pad(s.name, 32)} ${DIM}${s.type} | ${s.wordCount}w${RESET}`);
  }
  if (sources.length > 20) console.log(`  ${DIM}... and ${sources.length - 20} more${RESET}`);
}

async function cmdServe() {
  const port = getFlag("port", "3977");
  const host = getFlag("host", "127.0.0.1");
  console.log(`Starting dashboard on http://${host}:${port}...`);
  const child = spawn(process.execPath, ["devtools/persona-inbox-server.mjs", "--port", port, "--host", host], {
    cwd: ROOT,
    stdio: "inherit",
  });
  child.on("exit", (code) => process.exit(code ?? 0));
}

async function cmdIntake() {
  const intake = readIntakeQueue();

  console.log(`${BOLD}INTAKE QUEUE${RESET}`);
  console.log(`  Raw: ${intake.counts.raw}  Pending: ${intake.counts.pending}  Processed: ${intake.counts.processed}  Failed: ${intake.counts.failed}`);
  console.log();

  for (const item of intake.raw.slice(0, 15)) {
    const color = item.status === "processed" ? GREEN : item.status === "failed" ? RED : YELLOW;
    console.log(`  ${color}[${item.status}]${RESET} ${pad(item.type, 10)} ${item.title}`);
    console.log(`    ${DIM}${item.excerpt.slice(0, 100)}${RESET}`);
  }
  if (intake.raw.length > 15) console.log(`  ${DIM}... and ${intake.raw.length - 15} more${RESET}`);
}

async function cmdHelp() {
  console.log(`${BOLD}Persona Pipeline CLI${RESET}

${BOLD}Usage:${RESET} node devtools/persona-pipeline-cli.mjs <command> [options]

${BOLD}Commands:${RESET}
  status                     Pipeline state, queue counts, vault stats, synthesis freshness
  run [--max N] [--file F]   Run orchestrator pipeline on unprocessed personas
  synthesize                 Run batch synthesizer, stage build queue
  validate [--verbose]       Validate all gaps against codebase (grep-based)
  auto-build [--limit N]     Write Codex specs for validated MISSING gaps [--dry-run] [--force]
  converge [sub]             Convergence engine. Subcommands: status, start-epoch, build-batch, close-epoch, history
  import <file> [--type T]   Import persona file(s) to queue [--run to also process]
  queue                      Show build queue and build tasks
  generate [--type T]        Generate personas via AI [--count N] [--category C]
  vault                      Vault stats and recent entries
  sources                    List all persona source files by status
  intake                     Show intake queue (ideas, bugs, features, notes)
  serve [--port 3977]        Start the web dashboard (legacy server)
  help                       This message

${BOLD}Examples:${RESET}
  persona-pipeline-cli.mjs status
  persona-pipeline-cli.mjs run --max 3
  persona-pipeline-cli.mjs run --file "Chef Flow Personas/Uncompleted/Chef/someone.txt"
  persona-pipeline-cli.mjs import personas.txt --type Chef --run
  persona-pipeline-cli.mjs validate --verbose
  persona-pipeline-cli.mjs auto-build --limit 5 --dry-run
  persona-pipeline-cli.mjs converge status
  persona-pipeline-cli.mjs generate --type Vendor --count 2
`);
}

// ---------------------------------------------------------------------------
// Dispatch
// ---------------------------------------------------------------------------

const commands = {
  status: cmdStatus,
  run: cmdRun,
  synthesize: cmdSynthesize,
  synthesis: cmdSynthesize,
  validate: cmdValidate,
  "mark-real": cmdMarkGap,
  "mark-false": cmdMarkGap,
  precision: cmdPrecision,
  "auto-build": cmdAutoBuild,
  autobuild: cmdAutoBuild,
  converge: cmdConverge,
  convergence: cmdConverge,
  import: cmdImport,
  queue: cmdQueue,
  build: cmdQueue,
  generate: cmdGenerate,
  vault: cmdVault,
  sources: cmdSources,
  intake: cmdIntake,
  serve: cmdServe,
  dashboard: cmdServe,
  help: cmdHelp,
  "--help": cmdHelp,
  "-h": cmdHelp,
};

const handler = commands[command];
if (!handler) {
  console.error(`Unknown command: ${command}`);
  cmdHelp();
  process.exit(1);
}

handler().catch((err) => {
  console.error(err);
  process.exit(1);
});
