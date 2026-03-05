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

function getQuarter(monthValue) {
  const [year, month] = String(monthValue).split("-");
  const m = Number.parseInt(month ?? "0", 10);
  if (!year || Number.isNaN(m) || m < 1 || m > 12) return "";
  const quarter = Math.floor((m - 1) / 3) + 1;
  return `${year}-Q${quarter}`;
}

function recommendation(marginPercent, targetMargin) {
  if (marginPercent < targetMargin) {
    return "Increase pricing 5-10% and reduce top cost drivers";
  }
  if (marginPercent < targetMargin + 8) {
    return "Maintain pricing; monitor food and labor ratios";
  }
  return "Margin strong; test strategic upsell packages";
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const input = args.input
    ? path.resolve(args.input)
    : path.resolve("docs/event-ops-kit/spreadsheets/monthly-pl-review.csv");
  const output = args.output
    ? path.resolve(args.output)
    : path.resolve("docs/event-ops-kit/spreadsheets/quarterly-pricing-review.csv");
  const targetMargin = toNumber(args["target-margin"] ?? 35);

  const raw = await readFile(input, "utf8");
  const rows = parseCsv(raw);

  const grouped = new Map();
  for (const row of rows) {
    const quarter = getQuarter(row.month);
    if (!quarter) continue;
    if (!grouped.has(quarter)) {
      grouped.set(quarter, {
        totalEvents: 0,
        totalRevenue: 0,
        foodCost: 0,
        laborCost: 0,
        totalCost: 0,
      });
    }
    const bucket = grouped.get(quarter);
    bucket.totalEvents += toNumber(row.total_events);
    bucket.totalRevenue += toNumber(row.total_revenue);
    bucket.foodCost += toNumber(row.food_cost);
    bucket.laborCost += toNumber(row.labor_cost);
    bucket.totalCost += toNumber(row.total_cost);
  }

  const outputRows = [
    [
      "quarter",
      "total_events",
      "total_revenue",
      "total_cost",
      "gross_profit",
      "gross_margin_percent",
      "food_cost_percent",
      "labor_cost_percent",
      "target_margin_percent",
      "recommendation",
    ],
  ];

  for (const [quarter, bucket] of grouped.entries()) {
    const grossProfit = bucket.totalRevenue - bucket.totalCost;
    const grossMargin = bucket.totalRevenue > 0 ? (grossProfit / bucket.totalRevenue) * 100 : 0;
    const foodPercent = bucket.totalRevenue > 0 ? (bucket.foodCost / bucket.totalRevenue) * 100 : 0;
    const laborPercent = bucket.totalRevenue > 0 ? (bucket.laborCost / bucket.totalRevenue) * 100 : 0;
    outputRows.push([
      quarter,
      round2(bucket.totalEvents),
      round2(bucket.totalRevenue),
      round2(bucket.totalCost),
      round2(grossProfit),
      round2(grossMargin),
      round2(foodPercent),
      round2(laborPercent),
      targetMargin,
      recommendation(grossMargin, targetMargin),
    ]);
  }

  await writeFile(output, toCsv(outputRows), "utf8");
  process.stdout.write(`Wrote quarterly pricing review: ${output}\n`);
}

main().catch((error) => {
  process.stderr.write(`Failed to build quarterly pricing review: ${error.message}\n`);
  process.exitCode = 1;
});
