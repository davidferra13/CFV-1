#!/usr/bin/env node

import { cp, mkdir, writeFile } from "node:fs/promises";
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

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const packet = args.packet ? path.resolve(args.packet) : "";
  const out = args.out ? path.resolve(args.out) : path.join(packet, "proposal-bundle");

  if (!packet) {
    process.stderr.write(
      "Usage: node scripts/export-grazing-proposal-bundle.mjs --packet <packet-path> [--out <folder>]\n",
    );
    process.exitCode = 1;
    return;
  }

  const files = [
    "templates/04-proposal-quote-template.md",
    "templates/06-service-agreement-template.md",
    "templates/19-allergy-disclosure-language.md",
    "templates/23-booking-confirmation-template.md",
    "templates/44-client-package-one-sheet.md",
    "EVENT_METADATA.md",
  ];

  await mkdir(out, { recursive: true });

  for (const relative of files) {
    const source = path.join(packet, relative);
    const target = path.join(out, path.basename(relative));
    await cp(source, target, { recursive: false });
  }

  const readme = `# Proposal Bundle

This folder contains the client-facing proposal pack for this event.

Included:
- Proposal quote template
- Service agreement template
- Allergy disclosure language
- Booking confirmation template
- Client package one-sheet
- Event metadata
`;

  await writeFile(path.join(out, "README.md"), readme, "utf8");
  process.stdout.write(`Created proposal bundle: ${out}\n`);
}

main().catch((error) => {
  process.stderr.write(`Failed to export proposal bundle: ${error.message}\n`);
  process.exitCode = 1;
});

