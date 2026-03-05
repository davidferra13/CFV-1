#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const target = path.join(scriptDir, "prefill-grazing-packet.mjs");
const result = spawnSync(process.execPath, [target, ...process.argv.slice(2)], { stdio: "inherit" });

if (result.error) {
  process.stderr.write(`Failed to run prefill-event-packet: ${result.error.message}\n`);
  process.exitCode = 1;
} else {
  process.exitCode = result.status ?? 0;
}

