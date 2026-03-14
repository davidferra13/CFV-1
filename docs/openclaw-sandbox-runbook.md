# OpenClaw Sandbox Runbook

## Purpose

This runbook creates and uses a separate ChefFlow clone for OpenClaw work. The real repo stays protected.

## What This Setup Does

- Creates `C:\Users\david\Documents\CFv1-openclaw-sandbox`
- Writes a scrubbed local-only `.env.local` into the sandbox
- Rewrites local Supabase config to a sandbox-only project ID and port range
- Writes blocked-command and verification reminders into the sandbox
- Leaves the real repo untouched

## Prerequisites

- `git`
- `node`
- `npm`
- Docker Desktop if local Supabase is required

## Create The Sandbox

Run this from the real repo:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/setup-openclaw-sandbox.ps1
```

If you want the script to install packages and run local bootstrap immediately:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/setup-openclaw-sandbox.ps1 -Bootstrap
```

## First Boot Inside The Sandbox

```powershell
cd C:\Users\david\Documents\CFv1-openclaw-sandbox
npm install
npm run local:bootstrap
powershell -ExecutionPolicy Bypass -File scripts/start-openclaw-sandbox-dev.ps1
git checkout -b oc/first-task
```

The sandbox uses these local ports:

- App: `3300`
- Supabase API: `54421`
- Supabase DB: `54422`
- Supabase Studio: `54423`
- Inbucket: `54424`

## OpenClaw Session Rules

Before letting OpenClaw write:

1. Point it at `C:\Users\david\Documents\CFv1-openclaw-sandbox`, not the real repo.
2. Give it one task only.
3. Keep command execution on an allowlist.
4. Keep deploy, push, and production commands blocked.
5. Require the verification loop from `docs/openclaw-operating-policy.md`.
6. Start the sandbox app with `scripts/start-openclaw-sandbox-dev.ps1`, not `npm run dev`.

## Minimum Review Before Promotion

Check these before promoting anything back to the real repo:

1. The diff only touches the intended surface.
2. `npm run typecheck` passed.
3. The targeted tests passed.
4. The changed flow was verified in a real browser.
5. No blocked command was used.

## Promotion Back To The Real Repo

Preferred:

```powershell
git log --oneline
git show <sandbox-commit>
git cherry-pick <sandbox-commit>
```

Alternative:

- Manually port the accepted change

## Reset Or Rebuild The Sandbox

If the sandbox becomes noisy or unreliable, delete the sandbox clone manually and run the setup script again. Do not delete or reset the real repo.
