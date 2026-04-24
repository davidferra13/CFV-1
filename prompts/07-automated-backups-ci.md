# BUILD: Automated Database Backups

## Context

ChefFlow is a Next.js + PostgreSQL (Drizzle ORM via postgres.js) private chef operations platform running self-hosted. Read `CLAUDE.md` before doing anything. The developer has an ABSOLUTE rule: no cloud providers, no hosted DBs, no S3, no monthly bills. Self-hosted only. Cloudflare (domain/tunnel) is the one exception.

## Problem

There are NO automated database backups. The spec exists at `docs/specs/p1-automated-database-backup-system.md` - READ IT. A manual `/backup` skill exists but requires the developer to remember to run it.

## What to Build

### 1. Automated Backup Script

- Read the existing backup skill/script (search for `backup` in `scripts/`)
- Create or enhance a backup script that:
  - Runs `pg_dump` with custom format (compressed)
  - Saves to local filesystem: `./backups/chefflow-{YYYY-MM-DD-HHmmss}.dump`
  - Keeps last 30 daily backups, last 12 weekly backups (Sunday), last 6 monthly backups (1st of month)
  - Deletes older backups according to retention policy
  - Logs success/failure to `./backups/backup-log.json`
  - Returns exit code 0 on success, non-zero on failure

### 2. Scheduled Execution

- Add a cron entry or system-level scheduler to run the backup daily at 3 AM
- Check existing cron patterns: `lib/ai/scheduled/job-definitions.ts` for app-level cron, or system crontab
- If using app-level cron (Next.js API route hit by external cron): add a `/api/cron/backup` route
- If using system crontab: provide the crontab entry

### 3. Integrity Verification

- After each backup, verify the dump file:
  - File exists and size > 0
  - Optional: `pg_restore --list` on the dump to verify it's readable
- Log verification result

### 4. Restore Script

- Create `scripts/restore-backup.sh` (or .mjs)
- Takes a backup file path as argument
- Shows what will be restored (table count, approximate size)
- Requires explicit confirmation flag (`--confirm`) to execute
- NEVER auto-executes restore

### 5. Health Integration

- If a `/health` or `/morning` briefing exists, include backup status: last successful backup timestamp, backup count, total backup size

## Key Files to Read First

- `CLAUDE.md` (mandatory, especially data safety section)
- `docs/specs/p1-automated-database-backup-system.md` (full spec)
- `scripts/` - existing scripts
- Search for `pg_dump` - existing backup logic
- `lib/ai/scheduled/job-definitions.ts` - scheduled job patterns
- `app/api/cron/` - existing cron routes
- `.env` or `.env.local` - database connection string location

## Rules

- Read CLAUDE.md fully before starting
- No em dashes anywhere
- NEVER run restore without explicit user approval
- Backup script must be idempotent and safe to run multiple times
- No cloud storage - local filesystem only
- Database credentials from environment variables, never hardcoded
- Test the backup script manually before setting up automation
- The backup directory should be gitignored
