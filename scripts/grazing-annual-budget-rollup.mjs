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

function getYear(monthValue) {
  const [year] = String(monthValue).split("-");
  return /^\d{4}$/.test(year ?? "") ? year : "";
}

async function readCsv(pathValue) {
  const raw = await readFile(pathValue, "utf8");
  return parseCsv(raw);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const monthlyInput = args.input
    ? path.resolve(args.input)
    : path.resolve("docs/event-ops-kit/spreadsheets/monthly-pl-review.csv");
  const plannerInput = args.planner
    ? path.resolve(args.planner)
    : path.resolve("docs/event-ops-kit/spreadsheets/yearly-budget-planner.csv");
  const output = args.output
    ? path.resolve(args.output)
    : path.resolve("docs/event-ops-kit/spreadsheets/yearly-budget-rollup.csv");

  const monthlyRows = await readCsv(monthlyInput);
  const plannerRows = await readCsv(plannerInput);

  const plannerMap = new Map(plannerRows.map((row) => [String(row.year), row]));
  const grouped = new Map();

  for (const row of monthlyRows) {
    const year = getYear(row.month);
    if (!year) continue;
    if (!grouped.has(year)) {
      grouped.set(year, {
        events: 0,
        revenue: 0,
        cost: 0,
      });
    }
    const bucket = grouped.get(year);
    bucket.events += toNumber(row.total_events);
    bucket.revenue += toNumber(row.total_revenue);
    bucket.cost += toNumber(row.total_cost);
  }

  const outRows = [
    [
      "year",
      "actual_events",
      "actual_revenue",
      "actual_total_cost",
      "actual_gross_profit",
      "actual_gross_margin_percent",
      "target_events",
      "target_revenue",
      "target_gross_margin_percent",
      "revenue_variance",
      "margin_variance",
    ],
  ];

  for (const [year, bucket] of grouped.entries()) {
    const target = plannerMap.get(year);
    const grossProfit = bucket.revenue - bucket.cost;
    const margin = bucket.revenue > 0 ? (grossProfit / bucket.revenue) * 100 : 0;
    const targetRevenue = toNumber(target?.target_revenue);
    const targetMargin = toNumber(target?.target_gross_margin_percent);

    outRows.push([
      year,
      round2(bucket.events),
      round2(bucket.revenue),
      round2(bucket.cost),
      round2(grossProfit),
      round2(margin),
      toNumber(target?.target_events),
      round2(targetRevenue),
      round2(targetMargin),
      round2(bucket.revenue - targetRevenue),
      round2(margin - targetMargin),
    ]);
  }

  await writeFile(output, toCsv(outRows), "utf8");
  process.stdout.write(`Wrote yearly budget rollup: ${output}\n`);
}

main().catch((error) => {
  process.stderr.write(`Failed to build yearly budget rollup: ${error.message}\n`);
  process.exitCode = 1;
});
