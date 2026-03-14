# Pi-side Codex Prompt — OpenClaw + Remote Ollama

You are setting up a Raspberry Pi as the **always-on OpenClaw host** in a two-machine local AI system.

## Architecture Goal

- **Raspberry Pi** = OpenClaw host / gateway / orchestration layer
- **Main PC** = remote Ollama inference server
- **Remote Ollama endpoint**: `http://10.0.0.153:11434`
- **Primary starter model**: `qwen3:4b`
- All model inference must happen on the **PC**, not on the Pi

## Known Good PC-side Facts

These are already configured and verified on the PC:

- Ollama is installed and running
- Bound to `0.0.0.0:11434`
- OLLAMA_ORIGINS=\* (accepts cross-origin requests)
- LAN IP is `10.0.0.153`
- Firewall allows inbound TCP/UDP for ollama.exe
- Models available:
  - `qwen3:4b` (2.5 GB, fast, general purpose)
  - `qwen3:30b` (18 GB, high quality reasoning)
  - `qwen3-coder:30b` (18 GB, code-focused)
  - `llama3.2` (2.0 GB, general purpose)
  - `nomic-embed-text` (274 MB, embeddings)

## Your Role

Your job is to:

1. Verify the Pi can reach the remote Ollama server
2. Install and/or configure OpenClaw on the Pi
3. Point OpenClaw to the PC's Ollama server
4. Validate end-to-end inference
5. Keep all changes minimal, reversible, and clearly explained

## Hard Constraints

- Do **NOT** install Ollama on the Pi
- Do **NOT** expose anything to the public internet
- Do **NOT** make destructive system changes
- Do **NOT** guess config names if the real OpenClaw config can be discovered
- Do **NOT** invent commands
- Show commands before running them
- If something fails 3 times, stop and report clearly

---

## Step 1 — Verify connectivity to the PC first

Run these checks before anything else:

```bash
ping -c 3 10.0.0.153
curl -s --connect-timeout 5 http://10.0.0.153:11434/
curl -s http://10.0.0.153:11434/api/tags
curl -s http://10.0.0.153:11434/api/generate \
  -d '{"model":"qwen3:4b","prompt":"Hello from Pi","stream":false,"options":{"num_predict":10}}'
```

Expected outcomes:

- ping succeeds
- root endpoint returns "Ollama is running"
- `/api/tags` returns model list
- `/api/generate` returns a valid JSON response with generated text

If any of these fail, **stop and report exactly which check failed**. Do not proceed with setup until the PC is reachable.

---

## Step 2 — Inspect the Pi environment

Gather facts first:

```bash
uname -a
cat /etc/os-release
node --version 2>&1 || echo "Node not installed"
npm --version 2>&1 || echo "npm not installed"
pnpm --version 2>&1 || echo "pnpm not installed"
git --version 2>&1 || echo "git not installed"
df -h /
free -h
```

If Node.js is missing or too old for OpenClaw, recommend the safest upgrade path and explain before installing.

---

## Step 3 — Discover how OpenClaw is actually installed or should be installed

Before cloning or installing anything, check whether OpenClaw already exists on the Pi.

Look for:

- an existing OpenClaw repo checkout
- an installed CLI
- an existing config file
- an existing service

Discovery examples:

```bash
which openclaw 2>/dev/null || true
find ~ -maxdepth 3 \( -iname "*openclaw*" -o -iname "openclaw.json" \) 2>/dev/null
systemctl list-unit-files 2>/dev/null | grep -i openclaw || true
```

If OpenClaw is already present:

- inspect it first
- do not reinstall blindly

If it is not present:

- determine the correct installation method from the repo/docs actually available to you
- then install it

Do **not** assume:

- repo URL
- start command
- env var names
- config file location

Discover them from the codebase or docs before changing anything.

---

## Step 4 — Discover the real OpenClaw config surface

Your next task is to identify how this OpenClaw installation configures model providers.

Search the real code/docs/config for:

- provider definitions
- model provider settings
- Ollama-related config
- gateway config
- model picker / provider registry
- user config file path

Search examples:

```bash
grep -Rni "ollama" .
grep -Rni "provider" . | head -30
grep -Rni "openclaw.json" .
grep -Rni "models" . | grep -i "provider\|config\|setting" | head -20
grep -Rni "gateway" .
grep -Rni "base.url\|baseurl\|base_url\|endpoint" . | head -20
```

Important:

- Prefer the **main runtime config path**, not test files, examples, or dead code
- If OpenClaw uses a user config file (like `openclaw.json`, `.env`, `config.yaml`), edit that instead of hardcoding values in source
- If there are multiple possible configuration layers, identify which one is authoritative and explain why

---

## Step 5 — Configure OpenClaw to use remote Ollama

Once you have identified the real config method, set OpenClaw to use:

- **provider**: Ollama
- **base URL**: `http://10.0.0.153:11434`
- **default model**: `qwen3:4b`

Use the actual config shape that exists in the codebase. Do not guess patterns if the real schema is available.

If multiple model slots are supported, note these recommended choices:
| Use Case | Model | Why |
|----------|-------|-----|
| Chat, quick responses | `qwen3:4b` | Fast (sub-second on GPU), low VRAM |
| Complex reasoning | `qwen3:30b` | Higher quality, 15-20s cold start |
| Code generation | `qwen3-coder:30b` | Optimized for code tasks |
| Embeddings | `nomic-embed-text` | Purpose-built for vectors |

Start with `qwen3:4b` unless testing proves another default is better.

---

## Step 6 — Start or restart OpenClaw correctly

Do not invent a start command.

Determine the correct way to run OpenClaw on this Pi by inspecting:

- `package.json` scripts (if Node-based)
- CLI help output (if installed as a binary)
- README or docs in the repo
- existing service files

Then:

- start or restart OpenClaw using the discovered method
- capture startup logs
- verify it comes up cleanly without errors

---

## Step 7 — Validate end-to-end behavior

Confirm all of the following:

1. OpenClaw process is running on the Pi
2. OpenClaw can reach `http://10.0.0.153:11434`
3. OpenClaw can request `qwen3:4b` and get a response
4. A real prompt returns a real response end-to-end
5. Any UI/gateway health checks pass (if applicable)

If possible, also verify from logs that requests are leaving the Pi and arriving at the PC.

---

## Step 8 — Optional persistence (only after Step 7 passes)

Only after successful manual validation:

1. Check whether OpenClaw already has a service manager, daemon mode, or recommended persistence method
2. If it does, use that
3. If it does not, create a minimal systemd service:
   - waits for `network-online.target`
   - runs as the correct user
   - uses externalized config (env vars or config file, not hardcoded)
   - restarts on failure with a sane delay (10s)
   - uses the start command discovered in Step 6

Do not create a service until the manual run works.

---

## Troubleshooting Priorities

If something breaks, check in this order:

1. **Pi cannot reach PC over LAN** — ping fails, wrong IP, different subnet/VLAN
2. **Ollama reachable but wrong model name** — run `curl http://10.0.0.153:11434/api/tags` to get exact names
3. **OpenClaw configured in wrong file or wrong schema** — re-run Step 4 discovery
4. **Gateway/service running but not using updated config** — restart after config change
5. **PC sleeping or IP changed** — wake PC, check DHCP reservation

---

## What not to do

- Do not install Ollama on the Pi
- Do not copy model files to the Pi
- Do not expose router ports to the internet
- Do not edit application source code if config-based setup is possible
- Do not hardcode the PC IP into application source (use config/env)
- Do not assume OpenClaw is a generic Express/Next.js app without checking
- Do not create services, cron jobs, or startup scripts before manual validation passes

---

## Output Format

When finished, report:

- Pi OS and architecture
- Node.js version (if applicable)
- Whether OpenClaw was already installed or freshly set up
- How OpenClaw is installed and run (exact command)
- Exact config file(s) changed (with before/after)
- Exact provider/model settings used
- Whether end-to-end inference works (with proof)
- Any remaining risks or follow-up steps
- Rollback steps for every change made
