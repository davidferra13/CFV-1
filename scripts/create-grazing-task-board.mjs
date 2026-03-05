#!/usr/bin/env node

import { writeFile } from "node:fs/promises";
import path from "node:path";

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const value = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : "true";
    args[key] = value;
    if (value !== "true") i += 1;
  }
  return args;
}

function addDays(isoDate, days) {
  const date = new Date(`${isoDate}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function csvEscape(value) {
  const stringValue = String(value ?? "");
  if (!/[",\n]/.test(stringValue)) {
    return stringValue;
  }
  return `"${stringValue.replace(/"/g, '""')}"`;
}

function toCsv(rows) {
  return rows
    .map((row) => row.map((cell) => csvEscape(cell)).join(","))
    .join("\n")
    .concat("\n");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const eventDate = args["event-date"];
  const out = args.out;

  if (!eventDate || !out) {
    process.stderr.write(
      "Usage: node scripts/create-grazing-task-board.mjs --event-date YYYY-MM-DD --out <path>\n",
    );
    process.exitCode = 1;
    return;
  }

  const tasks = [
    { offset: -30, phase: "sales", task: "Contract signed and deposit received", owner: "sales" },
    { offset: -21, phase: "planning", task: "Initial menu direction finalized", owner: "lead" },
    { offset: -14, phase: "planning", task: "Venue access confirmed", owner: "ops" },
    { offset: -10, phase: "planning", task: "Staffing plan finalized", owner: "ops" },
    { offset: -7, phase: "procurement", task: "Core ingredient orders placed", owner: "procurement" },
    { offset: -5, phase: "procurement", task: "Rentals and decor confirmed", owner: "ops" },
    { offset: -4, phase: "compliance", task: "Allergy and dietary form finalized", owner: "lead" },
    { offset: -3, phase: "prep", task: "Dry goods and non-perishable prep complete", owner: "prep" },
    { offset: -2, phase: "prep", task: "Perishable receiving and quality check complete", owner: "prep" },
    { offset: -1, phase: "prep", task: "Final prep and packing complete", owner: "prep" },
    { offset: 0, phase: "event-day", task: "Load-out, transport, setup, QA, handoff", owner: "full-team" },
    { offset: 1, phase: "closeout", task: "Pickup complete and post-event closeout filed", owner: "ops" },
  ];

  const rows = [
    ["event_date", "due_date", "day_offset", "phase", "task", "owner", "status", "notes"],
    ...tasks.map((task) => [
      eventDate,
      addDays(eventDate, task.offset),
      task.offset,
      task.phase,
      task.task,
      task.owner,
      "pending",
      "",
    ]),
  ];

  await writeFile(path.resolve(out), toCsv(rows), "utf8");
  process.stdout.write(`Created task board: ${path.resolve(out)}\n`);
}

main().catch((error) => {
  process.stderr.write(`Failed to create task board: ${error.message}\n`);
  process.exitCode = 1;
});

