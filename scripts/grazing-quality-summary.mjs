#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
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

function splitCsvLine(line) {
  const cells = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === "," && !inQuotes) {
      cells.push(current);
      current = "";
      continue;
    }
    current += char;
  }
  cells.push(current);
  return cells;
}

function parseCsv(csv) {
  const lines = csv
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.length > 0);
  if (lines.length === 0) return [];
  const header = splitCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const row = splitCsvLine(line);
    const entry = {};
    for (let i = 0; i < header.length; i += 1) {
      entry[header[i]] = row[i] ?? "";
    }
    return entry;
  });
}

function csvEscape(value) {
  const stringValue = String(value ?? "");
  if (!/[",\n]/.test(stringValue)) return stringValue;
  return `"${stringValue.replace(/"/g, '""')}"`;
}

function toCsv(rows) {
  return rows.map((row) => row.map((cell) => csvEscape(cell)).join(",")).join("\n").concat("\n");
}

function toNumber(value) {
  const parsed = Number.parseFloat(String(value ?? "").trim());
  return Number.isFinite(parsed) ? parsed : 0;
}

function round2(value) {
  return Math.round(value * 100) / 100;
}

function monthKey(dateValue) {
  const value = String(dateValue || "");
  const parts = value.split("-");
  if (parts.length < 2) return "";
  return `${parts[0]}-${parts[1]}`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const input = args.input
    ? path.resolve(args.input)
    : path.resolve("docs/event-ops-kit/spreadsheets/event-quality-score-log.csv");
  const out = args.out
    ? path.resolve(args.out)
    : path.resolve("docs/event-ops-kit/spreadsheets/event-quality-summary.csv");
  const threshold = toNumber(args.threshold ?? 75);

  const raw = await readFile(input, "utf8");
  const rows = parseCsv(raw);

  const grouped = new Map();
  const categoryKeys = [
    "setup_timeliness",
    "visual_presentation",
    "food_quality",
    "labeling_allergen_clarity",
    "tool_readiness",
    "team_communication",
    "client_satisfaction",
    "cleanup_closeout",
  ];

  for (const row of rows) {
    const month = monthKey(row.event_date);
    if (!month) continue;
    if (!grouped.has(month)) {
      grouped.set(month, {
        events: 0,
        percentTotal: 0,
        belowThreshold: 0,
        categoryTotals: Object.fromEntries(categoryKeys.map((key) => [key, 0])),
      });
    }
    const bucket = grouped.get(month);
    bucket.events += 1;
    const percent = toNumber(row.percent_score);
    bucket.percentTotal += percent;
    if (percent < threshold) bucket.belowThreshold += 1;
    for (const key of categoryKeys) {
      bucket.categoryTotals[key] += toNumber(row[key]);
    }
  }

  const outRows = [
    ["month", "events_scored", "avg_percent_score", "below_threshold_count", "lowest_avg_category"],
  ];

  for (const [month, bucket] of grouped.entries()) {
    const avgPercent = bucket.events > 0 ? bucket.percentTotal / bucket.events : 0;
    let lowestCategory = "";
    let lowestValue = Number.POSITIVE_INFINITY;
    for (const key of categoryKeys) {
      const avg = bucket.events > 0 ? bucket.categoryTotals[key] / bucket.events : 0;
      if (avg < lowestValue) {
        lowestValue = avg;
        lowestCategory = key;
      }
    }

    outRows.push([
      month,
      bucket.events,
      round2(avgPercent),
      bucket.belowThreshold,
      lowestCategory,
    ]);
  }

  await writeFile(out, toCsv(outRows), "utf8");
  process.stdout.write(`Wrote quality summary: ${out}\n`);
}

main().catch((error) => {
  process.stderr.write(`Failed to build quality summary: ${error.message}\n`);
  process.exitCode = 1;
});
