#!/usr/bin/env node

import { readdir, readFile, writeFile } from "node:fs/promises";
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

function escapeRegex(source) {
  return source.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function applyReplacements(input, replacements) {
  let output = input;
  for (const [key, value] of Object.entries(replacements)) {
    const pattern = new RegExp(escapeRegex(key), "g");
    output = output.replace(pattern, value);
  }
  return output;
}

async function listMarkdownFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const nested = await listMarkdownFiles(fullPath);
      files.push(...nested);
      continue;
    }
    if (entry.isFile() && fullPath.toLowerCase().endsWith(".md")) {
      files.push(fullPath);
    }
  }
  return files;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const packetPath = args.packet ? path.resolve(args.packet) : "";
  const defaultsPath = args.defaults ? path.resolve(args.defaults) : "";

  if (!packetPath || !defaultsPath) {
    process.stderr.write(
      "Usage: node scripts/prefill-grazing-packet.mjs --packet <packet-path> --defaults <defaults-json>\n",
    );
    process.exitCode = 1;
    return;
  }

  const defaultsRaw = await readFile(defaultsPath, "utf8");
  const defaults = JSON.parse(defaultsRaw);

  const replacements = {
    "[Business Name]": defaults.businessName || "[Business Name]",
    "[Business Legal Name]": defaults.businessLegalName || "[Business Legal Name]",
    "[Your Name]": defaults.ownerName || "[Your Name]",
    "[Phone]": defaults.phone || "[Phone]",
    "[Email]": defaults.email || "[Email]",
    "[Website]": defaults.website || "[Website]",
    "[State]": defaults.state || "[State]",
    "[hold date]": defaults.holdDateDaysDefault
      ? `${defaults.holdDateDaysDefault} days from proposal date`
      : "[hold date]"
  };

  const templateRoot = path.join(packetPath, "templates");
  const markdownFiles = await listMarkdownFiles(templateRoot);

  for (const file of markdownFiles) {
    const original = await readFile(file, "utf8");
    const updated = applyReplacements(original, replacements);
    if (updated !== original) {
      await writeFile(file, updated, "utf8");
    }
  }

  const metadataPath = path.join(packetPath, "BUSINESS_DEFAULTS_APPLIED.json");
  await writeFile(metadataPath, JSON.stringify(defaults, null, 2), "utf8");

  process.stdout.write(`Applied defaults to packet templates: ${packetPath}\n`);
}

main().catch((error) => {
  process.stderr.write(`Failed to prefill packet: ${error.message}\n`);
  process.exitCode = 1;
});

