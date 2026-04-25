# Automated Backups CI

## What Changed

- Upgraded `scripts/backup-db-automated.sh` to write PostgreSQL custom-format dumps at `backups/chefflow-YYYY-MM-DD-HHmmss.dump`.
- Added tiered retention for generated dumps: 30 daily backup days, 12 Sunday backups, and 6 first-of-month backups.
- Added structured `backups/backup-log.json` success and failure entries, with `backup.log` kept for human-readable output.
- Added restore preview and guarded restore execution in `scripts/restore-backup.sh`.
- Added backup status to `scripts/session-briefing.sh`.

## Verification

- Ran a full backup on April 24, 2026. The script created `chefflow-2026-04-24-104726.dump`, verified it with `pg_restore --list`, and pruned the older same-day generated dump.
- Ran `scripts/verify-backup.sh`; it reported 1,928 table entries and 9,750 dump entries.
- Ran `scripts/restore-backup.sh` in preview mode only.
- Verified `/api/cron/backup-heartbeat` with `Authorization: Bearer CRON_SECRET`; latest `db-backup` cron row is `success`.

## Notes

- `BACKUP_PASSPHRASE` is not currently set in `.env.local`, so the verified backup was saved unencrypted. Set it before relying on the scheduled backup for encrypted-at-rest coverage.
- `BACKUP_APP_BASE_URL` defaults to `http://localhost:3000` and can be overridden in `.env.local` if the self-hosted app listens elsewhere.
