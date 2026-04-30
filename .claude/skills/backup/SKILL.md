---
name: backup
description: Back up the ChefFlow database. Use when the user asks for a backup, database dump, restore point, or pre-risk safety copy. Runs the automated pg_dump path with verification, encryption when configured, and heartbeat logging.
user-invocable: true
---

# Database Backup

Run the automated database backup script.

```bash
bash scripts/backup-db-automated.sh
```

Report: backup file path, size, encryption status, timestamp, and verification result. If it fails, show the exact error.

**IMPORTANT:** This is a read-only export (`pg_dump`). Safe to run anytime. It does not modify the database.
