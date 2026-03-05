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
  if (!/[",\n]/.test(stringValue)) {
    return stringValue;
  }
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

function classify(score) {
  if (score >= 4.5) return "preferred";
  if (score >= 3.0) return "watchlist";
  return "replace_candidate";
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const input = args.input
    ? path.resolve(args.input)
    : path.resolve("docs/event-ops-kit/spreadsheets/vendor-scorecard-entries.csv");
  const out = args.out
    ? path.resolve(args.out)
    : path.resolve("docs/event-ops-kit/spreadsheets/vendor-scorecard-summary.csv");

  const raw = await readFile(input, "utf8");
  const rows = parseCsv(raw);

  const buckets = new Map();
  for (const row of rows) {
    const key = row.vendor_id || row.vendor_name;
    if (!buckets.has(key)) {
      buckets.set(key, {
        vendorId: row.vendor_id,
        vendorName: row.vendor_name,
        category: row.category,
        observations: 0,
        quality: 0,
        onTime: 0,
        price: 0,
        communication: 0,
        issues: 0,
      });
    }
    const bucket = buckets.get(key);
    bucket.observations += 1;
    bucket.quality += toNumber(row.quality_score);
    bucket.onTime += toNumber(row.on_time_score);
    bucket.price += toNumber(row.price_score);
    bucket.communication += toNumber(row.communication_score);
    bucket.issues += toNumber(row.issue_count);
  }

  const outputRows = [
    [
      "vendor_id",
      "vendor_name",
      "category",
      "observations",
      "avg_quality",
      "avg_on_time",
      "avg_price",
      "avg_communication",
      "issue_rate",
      "composite_score",
      "classification",
    ],
  ];

  for (const bucket of buckets.values()) {
    const obs = Math.max(1, bucket.observations);
    const avgQuality = bucket.quality / obs;
    const avgOnTime = bucket.onTime / obs;
    const avgPrice = bucket.price / obs;
    const avgCommunication = bucket.communication / obs;
    const issueRate = bucket.issues / obs;
    const composite =
      avgQuality * 0.35 + avgOnTime * 0.25 + avgPrice * 0.2 + avgCommunication * 0.2;

    outputRows.push([
      bucket.vendorId,
      bucket.vendorName,
      bucket.category,
      bucket.observations,
      round2(avgQuality),
      round2(avgOnTime),
      round2(avgPrice),
      round2(avgCommunication),
      round2(issueRate),
      round2(composite),
      classify(composite),
    ]);
  }

  await writeFile(out, toCsv(outputRows), "utf8");
  process.stdout.write(`Wrote vendor scorecard summary: ${out}\n`);
}

main().catch((error) => {
  process.stderr.write(`Failed to build vendor scorecard: ${error.message}\n`);
  process.exitCode = 1;
});
