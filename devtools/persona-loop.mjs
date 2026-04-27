#!/usr/bin/env node
/**
 * Persona Loop - Autonomous persona generation + pipeline execution
 *
 * Runs indefinitely: generates personas via Ollama, pipes them through
 * persona-to-codex.mjs, and optionally submits to Codex.
 *
 * Usage:
 *   node devtools/persona-loop.mjs                          # Generate + queue, every 10 min
 *   node devtools/persona-loop.mjs --interval 300           # Every 5 min
 *   node devtools/persona-loop.mjs --batch 3                # 3 personas per cycle
 *   node devtools/persona-loop.mjs --submit                 # Also submit to Codex
 *   node devtools/persona-loop.mjs --max 50                 # Stop after 50 total personas
 *   node devtools/persona-loop.mjs --type Chef              # Only Chef personas
 *   node devtools/persona-loop.mjs --once                   # Single cycle then exit
 *
 * Requires: Ollama running (OLLAMA_BASE_URL or localhost:11434)
 */

import { execFile } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const ROOT = process.cwd();
const TAG = "[persona-loop]";
const UNCOMPLETED = join(ROOT, "Chef Flow Personas", "Uncompleted");
const TYPES = ["Chef", "Client", "Guest", "Vendor", "Staff", "Partner", "Public"];

function parseArgs(argv) {
  const opts = {
    interval: 600,  // seconds between cycles
    batch: 2,       // personas per cycle
    submit: false,  // submit to Codex
    max: Infinity,  // total persona cap
    type: null,     // restrict to one type
    once: false,    // single cycle
  };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--interval") opts.interval = Math.max(30, Number(argv[i + 1] || "600"));
    if (argv[i] === "--batch") opts.batch = Math.max(1, Math.min(10, Number(argv[i + 1] || "2")));
    if (argv[i] === "--submit") opts.submit = true;
    if (argv[i] === "--max") opts.max = Math.max(1, Number(argv[i + 1] || "50"));
    if (argv[i] === "--type") opts.type = argv[i + 1] || null;
    if (argv[i] === "--once") opts.once = true;
  }
  return opts;
}

function countUncompleted() {
  let count = 0;
  for (const type of TYPES) {
    const dir = join(UNCOMPLETED, type);
    if (!existsSync(dir)) continue;
    try {
      count += readdirSync(dir).filter(f => /\.(txt|md)$/i.test(f)).length;
    } catch {}
  }
  return count;
}

async function runFactory(batch, type) {
  const args = ["devtools/persona-factory.mjs", "--count", String(batch)];
  if (type) args.push("--type", type);

  try {
    const { stdout, stderr } = await execFileAsync("node", args, {
      cwd: ROOT,
      timeout: 300000, // 5 min per batch (Ollama can be slow)
      maxBuffer: 2 * 1024 * 1024,
    });
    const output = (stdout + stderr).trim();
    if (output) console.log(output);
    return true;
  } catch (err) {
    const detail = err.stderr || err.stdout || err.message;
    console.error(`${TAG} Factory error: ${detail.slice(0, 300)}`);
    return false;
  }
}

async function runPipeline(submit) {
  const args = ["devtools/persona-to-codex.mjs"];
  if (submit) args.push("--submit");

  try {
    const { stdout, stderr } = await execFileAsync("node", args, {
      cwd: ROOT,
      timeout: 120000,
      maxBuffer: 2 * 1024 * 1024,
    });
    const output = (stdout + stderr).trim();
    if (output) console.log(output);
    return true;
  } catch (err) {
    const detail = err.stderr || err.stdout || err.message;
    console.error(`${TAG} Pipeline error: ${detail.slice(0, 300)}`);
    return false;
  }
}

function timestamp() {
  return new Date().toISOString().replace("T", " ").slice(0, 19);
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  let totalGenerated = 0;
  let cycleNum = 0;

  console.log(`${TAG} ========================================`);
  console.log(`${TAG} Autonomous Persona Loop`);
  console.log(`${TAG} Batch size: ${opts.batch} | Interval: ${opts.interval}s | Max: ${opts.max === Infinity ? "unlimited" : opts.max}`);
  console.log(`${TAG} Type filter: ${opts.type || "all"} | Submit: ${opts.submit} | Mode: ${opts.once ? "once" : "continuous"}`);
  console.log(`${TAG} ========================================`);

  while (true) {
    cycleNum++;
    console.log(`\n${TAG} [${timestamp()}] Cycle #${cycleNum} starting...`);

    // Check cap
    if (totalGenerated >= opts.max) {
      console.log(`${TAG} Reached max (${opts.max}). Stopping.`);
      break;
    }

    // How many to generate this cycle
    const remaining = opts.max - totalGenerated;
    const thisBatch = Math.min(opts.batch, remaining);

    // Step 1: Generate personas
    const beforeCount = countUncompleted();
    const factoryOk = await runFactory(thisBatch, opts.type);
    const afterCount = countUncompleted();
    const newPersonas = afterCount - beforeCount;

    if (factoryOk && newPersonas > 0) {
      totalGenerated += newPersonas;
      console.log(`${TAG} +${newPersonas} new persona(s) (total: ${totalGenerated})`);
    } else if (newPersonas === 0) {
      console.log(`${TAG} No new personas generated (dedup or Ollama issue)`);
    }

    // Step 2: Run pipeline (process Uncompleted/ -> Codex queue)
    if (afterCount > 0) {
      console.log(`${TAG} Running pipeline (${afterCount} file(s) in queue)...`);
      await runPipeline(opts.submit);
    }

    // Step 3: Status
    const remainingUncompleted = countUncompleted();
    console.log(`${TAG} [${timestamp()}] Cycle #${cycleNum} done. Total generated: ${totalGenerated}. Uncompleted queue: ${remainingUncompleted}`);

    if (opts.once) {
      console.log(`${TAG} Single cycle mode. Exiting.`);
      break;
    }

    // Sleep
    console.log(`${TAG} Sleeping ${opts.interval}s until next cycle...`);
    await new Promise(resolve => setTimeout(resolve, opts.interval * 1000));
  }

  console.log(`\n${TAG} ========================================`);
  console.log(`${TAG} Loop complete. ${totalGenerated} personas generated across ${cycleNum} cycle(s).`);
  console.log(`${TAG} ========================================`);
}

// Graceful shutdown
process.on("SIGINT", () => {
  console.log(`\n${TAG} Interrupted. Exiting gracefully.`);
  process.exit(0);
});
process.on("SIGTERM", () => {
  console.log(`\n${TAG} Terminated. Exiting gracefully.`);
  process.exit(0);
});

main();
