# Codex Activity Log

ChefFlow now has a repo-local progress log for Codex work:

- `logs/ACTIVITY_LOG.md`

Use it to watch meaningful progress during a working session without asking for snapshots.

## Watch It Live

On Windows PowerShell:

```powershell
Get-Content .\logs\ACTIVITY_LOG.md -Wait
```

Or use the helper script:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\codex-activity-log.ps1 -Action watch
```

Or use the npm shortcut:

```powershell
npm run codex:activity:watch
```

## What Goes In The Log

- meaningful task starts
- implementation milestones
- blockers worth knowing about
- verification results

It is not a keystroke recorder. It is a concise workstream log.
