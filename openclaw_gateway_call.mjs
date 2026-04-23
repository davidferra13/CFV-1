import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { platform } from "node:os";

const [, , method, paramsSource = "{}", timeoutMs = "300000"] = process.argv;
const token = process.env.GW_TOKEN;

const paramsJson = paramsSource.startsWith("@")
  ? readFileSync(paramsSource.slice(1), "utf8")
  : paramsSource;

if (!method) {
  console.error("Usage: node openclaw_gateway_call.mjs <method> [paramsJson] [timeoutMs]");
  process.exit(2);
}

if (!token) {
  console.error("GW_TOKEN is required");
  process.exit(2);
}

const args = [
  "-y",
  "openclaw@2026.3.23-2",
  "gateway",
  "call",
  method,
  "--url",
  "ws://127.0.0.1:18789",
  "--token",
  token,
  "--timeout",
  timeoutMs,
  "--json",
  "--params",
  paramsJson,
];

if (method === "agent") {
  args.splice(11, 0, "--expect-final");
}

const isWindows = platform() === "win32";
const command = isWindows ? process.env.ComSpec || "cmd.exe" : "npx";
const commandArgs = isWindows ? ["/d", "/s", "/c", "npx.cmd", ...args] : args;

const result = spawnSync(command, commandArgs, {
  stdio: "inherit",
  shell: false,
});

if (result.error) {
  console.error(String(result.error));
}

process.exit(result.status ?? 1);
