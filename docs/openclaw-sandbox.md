# OpenClaw Sandbox

This copy-only sandbox is superseded by the real clone workflow in `docs/openclaw-clone.md`.

Use a separate working copy for OpenClaw. Do not point it at the real repo at `C:\Users\david\Documents\CFv1`.

## Safe path

`C:\Users\david\Documents\CFv1-openclaw-sandbox`

## Refresh the sandbox

```powershell
powershell -ExecutionPolicy Bypass -File scripts/sync-openclaw-sandbox.ps1
```

What the sync does:

- Mirrors the repo into the sandbox path
- Excludes `.git`, `.auth`, build output, logs, temp folders, and live `.env.local`
- Seeds sandbox `.env.local` from `.env.local.dev` when available

## Rule

OpenClaw can only edit files inside the sandbox copy. If you want any of its work in the real repo, migrate the changes over manually after review.
