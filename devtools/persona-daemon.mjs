#!/usr/bin/env node

/**
 * Persona Daemon - Continuous persona generation + analysis loop
 *
 * Generates personas via Ollama, analyzes them against the codebase,
 * synthesizes findings. Runs forever until killed.
 *
 * Usage:
 *   node devtools/persona-daemon.mjs                    # default: all types, spread
 *   node devtools/persona-daemon.mjs --type Chef        # only Chef personas
 *   node devtools/persona-daemon.mjs --batch 3          # 3 per cycle (default: 2)
 *   node devtools/persona-daemon.mjs --cooldown 30      # 30s between cycles (default: 15)
 *   node devtools/persona-daemon.mjs --synth-every 5    # synthesize every 5 personas (default: 6)
 *   node devtools/persona-daemon.mjs --max 50           # stop after 50 total
 */

import { spawn } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

// --- Args ---

const args = process.argv.slice(2);
function getFlag(name, def) {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] || def : def;
}

const TYPE = getFlag("type", null); // null = spread across all types
const BATCH = Math.max(1, Number(getFlag("batch", "2")));
const COOLDOWN_SEC = Math.max(5, Number(getFlag("cooldown", "15")));
const SYNTH_EVERY = Math.max(1, Number(getFlag("synth-every", "6")));
const MAX_TOTAL = Number(getFlag("max", "0")) || Infinity;
const MODEL = getFlag("model", "gemma4:e4b");

const TYPES = ["Chef", "Client", "Guest", "Vendor", "Staff", "Partner", "Public"];
let typeIndex = 0;
let totalGenerated = 0;
let totalFailed = 0;
let sinceLastSynth = 0;
let cycleCount = 0;

// --- Helpers ---

function ts() {
  return new Date().toISOString().slice(11, 19);
}

function runChild(cmd, childArgs) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [cmd, ...childArgs], {
      cwd: ROOT,
      stdio: "inherit",
      windowsHide: true,
    });
    child.on("exit", (code) => resolve(code ?? 1));
    child.on("error", (err) => {
      console.error(`[daemon] spawn error: ${err.message}`);
      resolve(1);
    });
  });
}

function sleep(sec) {
  return new Promise((r) => setTimeout(r, sec * 1000));
}

// --- Cycle ---

async function generateBatch() {
  const type = TYPE || TYPES[typeIndex % TYPES.length];
  typeIndex++;

  console.log(`\n[daemon ${ts()}] Generating ${BATCH} ${type} persona(s) [${MODEL}]...`);
  const code = await runChild("devtools/persona-generator.mjs", [
    "--count", String(BATCH),
    "--type", type,
    "--spread",
    "--model", MODEL,
  ]);

  if (code === 0) {
    totalGenerated += BATCH;
    sinceLastSynth += BATCH;
    console.log(`[daemon ${ts()}] Generation OK. Total: ${totalGenerated}, failed: ${totalFailed}`);
  } else {
    totalFailed += BATCH;
    console.log(`[daemon ${ts()}] Generation had failures (exit ${code}). Total: ${totalGenerated}, failed: ${totalFailed}`);
  }
  return code;
}

async function analyzeNew() {
  console.log(`[daemon ${ts()}] Analyzing unprocessed personas...`);
  const code = await runChild("devtools/persona-orchestrator.mjs", [
    "--once",
    "--max", String(BATCH + 2),
  ]);
  if (code === 0) {
    console.log(`[daemon ${ts()}] Analysis complete.`);
  } else {
    console.log(`[daemon ${ts()}] Analysis exited ${code}.`);
  }
  return code;
}

async function synthesize() {
  console.log(`[daemon ${ts()}] Running batch synthesis...`);
  const code = await runChild("devtools/persona-pipeline-cli.mjs", ["synthesize"]);
  if (code === 0) {
    console.log(`[daemon ${ts()}] Synthesis complete.`);
    sinceLastSynth = 0;
  } else {
    console.log(`[daemon ${ts()}] Synthesis exited ${code}.`);
  }
  return code;
}

// --- Main loop ---

async function main() {
  console.log(`[daemon ${ts()}] Persona daemon starting`);
  console.log(`[daemon] batch=${BATCH}, cooldown=${COOLDOWN_SEC}s, synth-every=${SYNTH_EVERY}, type=${TYPE || "all"}, max=${MAX_TOTAL === Infinity ? "unlimited" : MAX_TOTAL}`);
  console.log(`[daemon] model=${MODEL}`);
  console.log("");

  while (totalGenerated < MAX_TOTAL) {
    cycleCount++;
    console.log(`\n${"=".repeat(60)}`);
    console.log(`[daemon ${ts()}] CYCLE ${cycleCount} (generated: ${totalGenerated}, failed: ${totalFailed})`);
    console.log(`${"=".repeat(60)}`);

    // Step 1: Generate
    await generateBatch();

    // Step 2: Analyze
    await analyzeNew();

    // Step 3: Synthesize periodically
    if (sinceLastSynth >= SYNTH_EVERY) {
      await synthesize();
    }

    // Check cap
    if (totalGenerated >= MAX_TOTAL) {
      console.log(`[daemon ${ts()}] Reached max (${MAX_TOTAL}). Stopping.`);
      break;
    }

    // Cooldown
    console.log(`[daemon ${ts()}] Cooling down ${COOLDOWN_SEC}s...`);
    await sleep(COOLDOWN_SEC);
  }

  // Final synthesis
  if (sinceLastSynth > 0) {
    await synthesize();
  }

  console.log(`\n[daemon ${ts()}] DONE. Generated: ${totalGenerated}, Failed: ${totalFailed}, Cycles: ${cycleCount}`);
}

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log(`\n[daemon] SIGINT received. Final synthesis...`);
  if (sinceLastSynth > 0) await synthesize();
  console.log(`[daemon] Shutdown. Generated: ${totalGenerated}, Failed: ${totalFailed}`);
  process.exit(0);
});

main().catch((err) => {
  console.error(`[daemon] Fatal: ${err.message}`);
  process.exit(1);
});
