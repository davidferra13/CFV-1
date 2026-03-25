# Production Database Setup

ChefFlow production database procedures. Covers project creation, backups, and restoration.

Current dev/beta database: database project `luefkpakzvxcsqroxyhz`

---

## 1. Production Project Setup

> Status: Not yet created. Production will use a separate database project from dev/beta.

### Steps (to be completed before launch)

- [ ] Create new database project for production (Pro plan recommended for PITR)
- [ ] Run all migrations in order against production project
- [ ] Configure production environment variables in Vercel:
  - `NEXT_PUBLIC_DATABASE_URL` (production project URL)
  - `NEXT_PUBLIC_DATABASE_ANON_KEY` (production anon key)
  - `DATABASE_SERVICE_ROLE_KEY` (production service role key)
- [ ] Verify RLS policies are applied correctly
- [ ] Seed required reference data (tiers, modules, default settings)
- [ ] Run health check: `curl https://app.cheflowhq.com/api/health/readiness?strict=1`
- [ ] Verify cron jobs are registered and executing
- [ ] Link CLI to production: `database link --project-ref <prod-project-id>`

### Migration Application

```bash
# Link to production project
database link --project-ref <prod-project-id>

# Apply all migrations
drizzle-kit push --linked

# Verify schema
database db diff --linked
```

Always back up before running `db push` on production (see section 2).

---

## 2. Backup Procedures

### 2a. Automated Backups (PostgreSQL)

PostgreSQL provides automatic daily backups on all paid plans:

| Plan | Backup type           | Retention     | Granularity       |
| ---- | --------------------- | ------------- | ----------------- |
| Free | Daily snapshot        | 7 days        | Full database     |
| Pro  | Daily snapshot + PITR | 7 days (PITR) | Any point in time |

PITR (Point-in-Time Recovery) is strongly recommended for production. It allows restoration to any second within the retention window.

### 2b. Manual Backups (Pre-Migration)

Run before every migration on production. This is a CLAUDE.md hard rule.

```bash
# Dump the full database to a SQL file
database db dump --linked > backup-$(date +%Y%m%d).sql
```

Store backups in a safe location outside the repo (they contain real data).

### 2c. Backup Schedule

| Trigger                       | Action                                  | Who                                 |
| ----------------------------- | --------------------------------------- | ----------------------------------- |
| Before any `drizzle-kit push` | Manual SQL dump                         | Developer (or agent, with approval) |
| Daily (automated)             | PostgreSQL snapshot                     | PostgreSQL (automatic)              |
| Before major releases         | Manual SQL dump + verify PITR is active | Developer                           |
| Weekly (recommended)          | Download and store SQL dump off-machine | Developer                           |

---

## 3. Restoration Procedures

### 3a. Restore from SQL Dump

```bash
# Get the connection string from the database dashboard > Settings > Database
psql "postgresql://postgres:<password>@<host>:5432/postgres" < backup-YYYYMMDD.sql
```

This is a full restore. It replaces all data. Use only when necessary.

### 3b. Restore from PITR (Pro Plan)

1. Go to PostgreSQL Dashboard > Project > Database > Backups
2. Select "Point in Time" tab
3. Choose a timestamp before the incident
4. Click "Restore" and confirm

PITR restores into the same project. The database will be briefly unavailable during restoration (typically under 5 minutes).

### 3c. Restore from Daily Snapshot

1. Go to PostgreSQL Dashboard > Project > Database > Backups
2. Select the desired daily backup
3. Click "Restore"

Snapshots are less granular than PITR (once per day vs. any second).

### 3d. Restoration Decision Matrix

| Scenario                                                   | Method                                | Data loss risk               |
| ---------------------------------------------------------- | ------------------------------------- | ---------------------------- |
| Bad migration (caught within minutes)                      | PITR to pre-migration timestamp       | None (if within PITR window) |
| Bad migration (caught hours later, new data created since) | Manual SQL dump from before migration | Lose data created after dump |
| Accidental data deletion                                   | PITR to moment before deletion        | None                         |
| Full database corruption                                   | Daily snapshot or SQL dump            | Lose data since last backup  |
| Need to inspect old state without restoring                | Dump to a separate local database     | None (non-destructive)       |

---

## 4. Safety Rules

These are enforced in `CLAUDE.md` and repeated here for reference:

1. Never run `drizzle-kit push` without explicit developer approval
2. Always dump before pushing: `database db dump --linked > backup-$(date +%Y%m%d).sql`
3. All migrations are additive by default (no DROP, DELETE, TRUNCATE without approval)
4. Never manually edit `types/database.ts` (auto-generated)
5. Check for migration timestamp collisions before creating new migration files
