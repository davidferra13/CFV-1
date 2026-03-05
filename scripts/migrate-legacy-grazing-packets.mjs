#!/usr/bin/env node

import { cp, mkdir, readdir, access } from "node:fs/promises";
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

async function pathExists(target) {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

async function getAvailableTarget(basePath) {
  if (!(await pathExists(basePath))) return basePath;
  let version = 2;
  while (true) {
    const candidate = `${basePath}-migrated-v${version}`;
    if (!(await pathExists(candidate))) return candidate;
    version += 1;
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const source = path.resolve(args.source || "docs/grazing-table-ops-kit/packets");
  const dest = path.resolve(args.dest || "docs/event-ops-kit/packets");

  await mkdir(dest, { recursive: true });
  const entries = await readdir(source, { withFileTypes: true });
  const packetDirs = entries.filter((entry) => entry.isDirectory());

  let migrated = 0;
  for (const entry of packetDirs) {
    const from = path.join(source, entry.name);
    const toBase = path.join(dest, entry.name);
    const to = await getAvailableTarget(toBase);
    await cp(from, to, { recursive: true });
    migrated += 1;
    process.stdout.write(`Migrated packet: ${entry.name} -> ${path.basename(to)}\n`);
  }

  process.stdout.write(`Migration complete. Total packets migrated: ${migrated}\n`);
}

main().catch((error) => {
  process.stderr.write(`Failed to migrate legacy packets: ${error.message}\n`);
  process.exitCode = 1;
});

