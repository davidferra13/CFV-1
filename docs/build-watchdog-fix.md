# ChefFlow Watchdog — Bug Fix & Restart

**Date:** 2026-02-21

---

## What Was Wrong

The persistent autostart system (`chefflow-watchdog.ps1`) was built but had never been activated. Two bugs prevented it from working:

### Bug 1: Em Dash Encoding Corruption

The original watchdog file contained Unicode em dash characters (`—`) in log strings. These caused PowerShell to fail with:

```
The string is missing the terminator: "."
TerminatorExpectedAtEndOfString
```

The parser couldn't read the file at all, so the watchdog never ran. The file was rewritten clean with standard ASCII hyphens.

### Bug 2: `npm run dev` Exits Immediately on Windows

The watchdog used `cmd.exe /c npm run dev` to start the server. On Windows, `npm.cmd` spawns `node` as a child and then **exits itself**. Since the watchdog waited on the `cmd.exe` process (which returns immediately), it thought the server crashed and kept restarting — creating a tight loop of hundreds of orphaned node processes.

**Fix:** Changed to invoke `node.exe` directly with the Next.js binary:

```powershell
$psi.FileName  = "C:\nvm4w\nodejs\node.exe"
$psi.Arguments = "`"C:\Users\david\Documents\CFv1\node_modules\next\dist\bin\next`" dev -p 3100 -H 0.0.0.0"
```

`node.exe` stays alive for the entire server lifetime, so `WaitForExit()` correctly blocks until the server stops.

### Bug 3: Non-Interactive PATH Missing Node

When PowerShell runs hidden (no profile loaded), `C:\nvm4w\nodejs` is not in PATH. The generic `"node"` command wasn't found. Fix: use the full absolute path `C:\nvm4w\nodejs\node.exe`.

---

## What Was Done

1. Rewrote `chefflow-watchdog.ps1` with clean ASCII, full node path, and direct Next.js invocation
2. Ran `install-autostart.bat` — copied `chefflow-launcher.vbs` to Windows Startup folder
3. Launched watchdog as a detached `Start-Process` so it survives bash session close
4. Cleaned up ~82 stray node processes and ~14 duplicate PowerShell instances from the restart loop
5. Verified: watchdog PID alive, server HTTP 200 on port 3100

---

## Current State

| Component  | Status                                            |
| ---------- | ------------------------------------------------- |
| Server     | `http://localhost:3100` — HTTP 200                |
| Watchdog   | PowerShell process, detached, managing node       |
| Auto-login | `chefflow-launcher.vbs` in Windows Startup folder |
| Log        | `chefflow-watchdog.log` in project root           |

---

## Files Changed

| File                    | Change                                                             |
| ----------------------- | ------------------------------------------------------------------ |
| `chefflow-watchdog.ps1` | Full rewrite — ASCII clean, full node path, direct next binary     |
| `cleanup-node.ps1`      | New utility — kills stray node processes, preserves server on 3100 |
| `cleanup-watchdogs.ps1` | New utility — kills duplicate watchdog instances                   |

---

## Architecture Connection

```
Windows Login
  └─ Startup folder → chefflow-launcher.vbs
       └─ PowerShell (hidden) → chefflow-watchdog.ps1
            └─ C:\nvm4w\nodejs\node.exe next dev -p 3100 -H 0.0.0.0
                 └─ Server at http://0.0.0.0:3100
                 └─ If exits for any reason → watchdog restarts in 5s
```

Tablet access: `http://[PC-local-IP]:3100` — always available while PC is on and logged in.
