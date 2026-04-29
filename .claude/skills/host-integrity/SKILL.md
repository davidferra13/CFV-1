---
name: host-integrity
description: Audit ChefFlow Windows host, scheduled task, launcher, watchdog, tunnel, port, and process truth without disrupting running services. Use when work involves Task Scheduler, watchdogs, Cloudflare tunnels, ports 3100/3200/3300, dev/beta/prod servers, hidden launchers, popup windows, zombie Playwright or Node processes, process resurrection, startup scripts, host topology, or old audit findings about Windows process hygiene.
---

# Host Integrity

Use this skill to inspect the local Windows host topology safely. This is an audit skill first, not a repair skill.

## Hard Stops

- Do not kill, restart, or start servers without explicit developer approval.
- Do not run long-running servers without explicit developer approval.
- Do not change Task Scheduler registrations without explicit developer approval.
- Do not assume a process is rogue just because it is unfamiliar.
- Do not treat cleanup hooks as proof of hygiene. Repeated cleanup means hygiene debt.
- Do not retry failed VNC, RDP, SSH, tunnel, or remote desktop connections unless the developer explicitly asks for a retry.
- If a TigerVNC prompt fails against `10.0.0.177:5900`, treat it as a stop condition. Do not attempt reconnect loops.
- If the developer says to stop repeated remote connection attempts, terminate only the viewer/client process that is attempting the connection, then report the PID and command line.

## Read-Only Checks

Prefer read-only commands:

```powershell
Get-CimInstance Win32_Process | Select-Object ProcessId,ParentProcessId,Name,CommandLine
```

```powershell
Get-NetTCPConnection -LocalPort 3100,3200,3300,11434 -ErrorAction SilentlyContinue
```

```powershell
Get-ScheduledTask | Where-Object { $_.TaskName -like '*ChefFlow*' -or $_.TaskName -like '*OpenClaw*' }
```

```powershell
Get-Content -Tail 200 .claude\hooks\cleanup.log
```

## Topology Model

Classify each layer:

- `dev`: localhost development server, expected port 3100.
- `beta`: beta server, expected port 3200 and beta tunnel.
- `prod`: production server, expected port 3300 and app tunnel.
- `ollama`: shared AI runtime, expected port 11434.
- `watchdog`: process supervisor, should be single-instance and hidden.
- `scheduled-task`: Task Scheduler owned automation.
- `tunnel`: Cloudflare tunnel process.
- `test-runner`: Playwright, Vitest, or other short-lived child process.
- `unknown`: needs more evidence before action.

## Audit Questions

Answer these before recommending a host change:

1. Which process owns each expected port?
2. Which scheduled task or parent process launched it?
3. Is the launcher hidden or capable of stealing focus?
4. Is there a single-instance guard such as a mutex or Task Scheduler policy?
5. Could another launcher resurrect this service if it is stopped?
6. Are there repeated zombie cleanup entries?
7. Does repo-defined task registration match live Task Scheduler state?
8. Does runbook language match the current live topology?

## Finding Classes

- `healthy`: live state matches repo intent and no hygiene debt is visible.
- `partial-proof`: live state looks right, but launch path or scheduler proof is missing.
- `focus-risk`: task or launcher can open visible windows unexpectedly.
- `resurrection-risk`: stopped services may be restarted by another layer.
- `zombie-debt`: repeated cleanup of child processes or leaked workers.
- `port-conflict`: expected port has the wrong owner or multiple contenders.
- `stale-runbook`: docs or scripts describe a topology that live state does not match.
- `needs-approval`: fix would kill, restart, register, unregister, or start services.

## Output Format

```text
HOST INTEGRITY

VERDICT: [healthy | mixed | unsafe | needs approval]

TOPOLOGY:
- [layer] [port/process/task] -> [owner/evidence]

FINDINGS:
- [class] [evidence]

DO NOT TOUCH WITHOUT APPROVAL:
- [process/task/action]

NEXT SAFE STEP:
- [read-only check or explicit approval request]
```

## Repair Rule

If a fix is needed, first produce the exact proposed command or task change and ask for approval. Only proceed after approval, unless the user already explicitly requested that exact action.
