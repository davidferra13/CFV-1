# OpenClaw Clone

OpenClaw should run in a separate git clone, not in the live repo at `C:\Users\david\Documents\CFv1`.

## Clone path

`C:\Users\david\Documents\CFv1-openclaw-clone`

## Prepare or refresh the clone

```powershell
powershell -ExecutionPolicy Bypass -File scripts/prepare-openclaw-clone.ps1
```

What this does:

- Creates a real git clone on the current branch if it does not exist
- Overlays the current working-tree files so the clone matches local WIP
- Excludes `.auth`, build output, temp folders, and live `.env.local`
- Replaces the clone `.env.local` with a minimal local-only safe env
- Removes `.env.local.beta` and `.env.local.dev` from the clone so remote credentials are not available there
- Disables git pushes from the clone by setting `origin` push URL to `DISABLED_PUSH`

## Start the clone watch server

```powershell
powershell -ExecutionPolicy Bypass -File scripts/start-openclaw-watch.ps1
```

What this does:

- Reads the clone `.env.local`
- If the clone is pointed at local Supabase, verifies local auth health first
- Starts local Supabase automatically when needed
- Waits for auth to come up before launching Next on `http://localhost:3300`

## Rule

Point OpenClaw at `C:\Users\david\Documents\CFv1-openclaw-clone` only.

If you later want any of its changes in the real repo, review them and migrate them over deliberately.
