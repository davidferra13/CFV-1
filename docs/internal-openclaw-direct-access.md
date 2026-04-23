# OpenClaw Direct Access

Date: 2026-04-19

## What This Gives You

This is the direct path into the Pi's native OpenClaw gateway, not the ChefFlow app and not the raw Ollama relay.

Current verified state on 2026-04-19:

- OpenClaw gateway service is running on the Raspberry Pi and enabled under the user service manager.
- The gateway uses local `ollama/gemma4:e2b-it-q4_K_M`.
- Four agents are configured: `main`, `research`, `exec`, `rescue`.
- The main agent heartbeat is enabled every 30 minutes.
- OpenClaw reports `7/51` skills ready in the current Pi environment.

## Fastest Way In

Run this on the Windows machine:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\openclaw-direct-dashboard.ps1
```

What the script does:

1. Starts the Pi `openclaw-gateway` service if it is not already running.
2. Creates a local SSH tunnel from this machine to the Pi for ports `18789` and `18791`.
3. Fetches the native dashboard URL from the Pi without hardcoding the gateway token in the repo.
4. Opens the direct OpenClaw control UI in your default browser.

If you only want the authenticated URL without opening a browser:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\openclaw-direct-dashboard.ps1 -PrintOnly
```

## Direct Control Surfaces

- Native OpenClaw control UI: opened by the script above
- Native OpenClaw health: `ssh pi "openclaw health --json"`
- Native OpenClaw skills inventory: `ssh pi "openclaw skills list"`
- Raw Gemma relay, no OpenClaw agent layer: `http://10.0.0.177:8081/api/ollama`

## What "Autonomy" Means Right Now

OpenClaw already has the base pieces for autonomy:

- a persistent gateway
- multiple named agents
- heartbeat polling on the main agent
- skill discovery and installation commands
- session history per agent

What it does not have yet is a rich installed skill set on this Pi. Most bundled skills are still marked missing because their backing CLIs or dependencies are not installed. The next expansion step is to install the specific skills you want it to use, then tighten `HEARTBEAT.md` and memory files so the main agent has a sharper background playbook.
