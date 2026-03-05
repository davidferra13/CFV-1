#!/usr/bin/env node

import { access, readFile, writeFile } from "node:fs/promises";
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

async function readCsvRows(filePath) {
  try {
    await access(filePath);
    const raw = await readFile(filePath, "utf8");
    return parseCsv(raw);
  } catch {
    return [];
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const packet = args.packet ? path.resolve(args.packet) : "";
  const eventId = args["event-id"] || "";

  if (!packet || !eventId) {
    process.stderr.write(
      "Usage: node scripts/reconcile-grazing-event.mjs --packet <packet-path> --event-id <id>\n",
    );
    process.exitCode = 1;
    return;
  }

  const sheets = path.join(packet, "spreadsheets");
  const pricingFile = path.join(sheets, "pricing-calculator.csv");
  const laborFile = path.join(sheets, "labor-model.csv");
  const actualsFile = path.join(sheets, "event-actuals.csv");
  const reconFile = path.join(sheets, "event-financial-recon.csv");

  const pricingRows = await readCsvRows(pricingFile);
  const laborRows = await readCsvRows(laborFile);
  const actualRows = await readCsvRows(actualsFile);

  const pricing = pricingRows.find((row) => row.event_id === eventId);
  const actual = actualRows.find((row) => row.event_id === eventId);

  if (!pricing) {
    process.stderr.write(`Event id '${eventId}' not found in pricing-calculator.csv\n`);
    process.exitCode = 1;
    return;
  }

  const quotedTotal = toNumber(pricing.total_quote);
  const quotedFood = toNumber(pricing.food_cost_per_guest) * toNumber(pricing.guest_count);
  const quotedLabor = toNumber(pricing.labor_hours) * toNumber(pricing.labor_rate);
  const quotedRentals = toNumber(pricing.rentals_cost);
  const quotedTransport = toNumber(pricing.delivery_cost) + toNumber(pricing.travel_surcharge);
  const quotedOverhead = toNumber(pricing.overhead_allocation);

  const laborSum = laborRows
    .filter((row) => row.event_id === eventId)
    .reduce((acc, row) => acc + toNumber(row.total_labor_cost), 0);

  const actualFood = toNumber(actual?.actual_food_cost);
  const actualLaborOverride = toNumber(actual?.actual_labor_cost_override);
  const actualLabor = actualLaborOverride > 0 ? actualLaborOverride : laborSum;
  const actualRentals = toNumber(actual?.actual_rentals_disposables_cost);
  const actualTransport = toNumber(actual?.actual_transport_cost);
  const actualOverhead = toNumber(actual?.actual_overhead_allocated);
  const actualMisc = toNumber(actual?.actual_misc_cost);

  const quotedCost = quotedFood + quotedLabor + quotedRentals + quotedTransport + quotedOverhead;
  const actualCost = actualFood + actualLabor + actualRentals + actualTransport + actualOverhead + actualMisc;
  const grossProfit = quotedTotal - actualCost;
  const grossMarginPercent = quotedTotal > 0 ? (grossProfit / quotedTotal) * 100 : 0;
  const costVariance = actualCost - quotedCost;

  const headers = [
    "event_id",
    "quoted_total",
    "quoted_total_cost",
    "actual_total_cost",
    "gross_profit",
    "gross_margin_percent",
    "cost_variance_vs_quote",
    "actual_food_cost",
    "actual_labor_cost",
    "actual_rentals_disposables_cost",
    "actual_transport_cost",
    "actual_overhead_allocated",
    "actual_misc_cost",
  ];

  const outputRows = [
    headers,
    [
      eventId,
      round2(quotedTotal),
      round2(quotedCost),
      round2(actualCost),
      round2(grossProfit),
      round2(grossMarginPercent),
      round2(costVariance),
      round2(actualFood),
      round2(actualLabor),
      round2(actualRentals),
      round2(actualTransport),
      round2(actualOverhead),
      round2(actualMisc),
    ],
  ];

  await writeFile(reconFile, toCsv(outputRows), "utf8");
  process.stdout.write(`Wrote reconciliation: ${reconFile}\n`);
}

main().catch((error) => {
  process.stderr.write(`Failed to reconcile event: ${error.message}\n`);
  process.exitCode = 1;
});

