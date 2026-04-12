#!/usr/bin/env node

import { cp, mkdir, writeFile, access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

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

function slugify(value) {
  return String(value || "unspecified")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function todayIsoDate() {
  const _td = new Date()
  return `${_td.getFullYear()}-${String(_td.getMonth() + 1).padStart(2, '0')}-${String(_td.getDate()).padStart(2, '0')}`
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

function buildEventTaskBoard(eventDate) {
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

  return toCsv(rows);
}

async function pathExists(target) {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const eventDate = args["event-date"] || todayIsoDate();
  const client = args.client || "unspecified-client";
  const venue = args.venue || "unspecified-venue";
  const eventName = args["event-name"] || "event-service";

  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const repoRoot = path.resolve(scriptDir, "..");
  const preferredKitRoot = args["kit-root"]
    ? path.resolve(repoRoot, args["kit-root"])
    : path.join(repoRoot, "docs", "event-ops-kit");
  const fallbackKitRoot = path.join(repoRoot, "docs", "grazing-table-ops-kit");
  const kitRoot =
    (await pathExists(path.join(preferredKitRoot, "templates"))) ? preferredKitRoot : fallbackKitRoot;
  const templatesDir = path.join(kitRoot, "templates");
  const sheetsDir = path.join(kitRoot, "spreadsheets");
  const packetsDir = path.join(kitRoot, "packets");

  const baseFolderName = `${eventDate}-${slugify(client)}-${slugify(eventName)}`;
  let packetPath = path.join(packetsDir, baseFolderName);
  let version = 1;
  while (await pathExists(packetPath)) {
    version += 1;
    packetPath = path.join(packetsDir, `${baseFolderName}-v${version}`);
  }

  await mkdir(packetPath, { recursive: true });
  await cp(templatesDir, path.join(packetPath, "templates"), { recursive: true });
  await cp(sheetsDir, path.join(packetPath, "spreadsheets"), { recursive: true });
  await writeFile(
    path.join(packetPath, "spreadsheets", "event-task-board.csv"),
    buildEventTaskBoard(eventDate),
    "utf8",
  );

  const metadata = `# Event Metadata

- Event date: ${eventDate}
- Client: ${client}
- Venue: ${venue}
- Event name: ${eventName}
- Packet generated at: ${new Date().toISOString()}

## Next Actions
1. Complete \`templates/01-client-intake.md\`
2. Complete \`templates/02-venue-questionnaire.md\`
3. Complete \`templates/03-dietary-allergen-intake.md\`
4. Finalize quote and service agreement
5. Fill logs for temperature, sanitizer, and equipment on event day
`;

  await writeFile(path.join(packetPath, "EVENT_METADATA.md"), metadata, "utf8");

  process.stdout.write(`Created packet: ${packetPath}\n`);
}

main().catch((error) => {
  process.stderr.write(`Failed to create packet: ${error.message}\n`);
  process.exitCode = 1;
});
