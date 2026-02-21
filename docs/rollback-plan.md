# Rollback Plan — ChefFlow V1

**Last reviewed:** 2026-02-20
**Owner:** Platform engineer / founder

This document covers two types of rollback:
1. **Deployment rollback** — reverting application code to a previous version
2. **Migration rollback** — undoing database schema changes

---

## Part 1 — Deployment Rollback

### When to Roll Back

Roll back a deployment immediately if:
- `/api/health` returns status `error` after deployment
- TypeScript errors or 500s appear on routes that were previously working
- A critical business flow is broken (payments, FSM transitions, auth)
- Error rate spikes significantly in Sentry within 10 minutes of deployment

**Do not roll back for:**
- Minor UI regressions that don't affect data integrity
- Features not yet released to users (use feature flags instead)

---

### Rollback Procedure (Vercel)

**Step 1 — Identify the last known-good deployment**

```bash
# List recent deployments
vercel ls --prod

# Output shows deployment IDs like:
# chefflow-abc123def    https://cheflowhq.com    READY    2h ago
# chefflow-xyz789ghi    https://cheflowhq.com    READY    1d ago  ← target
```

**Step 2 — Instantly promote the previous deployment**

```bash
# Promote the previous production deployment
vercel rollback [deployment-url-or-id]

# Example:
vercel rollback chefflow-xyz789ghi.vercel.app
```

This takes ~30 seconds and does NOT require a rebuild. Vercel instantly routes traffic to the previous build artifact.

**Step 3 — Verify rollback succeeded**

```bash
# Check health endpoint
curl https://cheflowhq.com/api/health

# Verify expected build ID in response headers or app behavior
```

**Step 4 — Investigate the broken deployment**

```bash
# Check what changed between the broken and working commit
git log --oneline [good-commit]..[bad-commit]
git diff [good-commit]..[bad-commit]
```

Fix the issue, test locally (`npx next build --no-lint && npx tsc --noEmit --skipLibCheck`), then redeploy.

---

### Preventing the Need for Rollbacks

The CI pipeline (`.github/workflows/ci.yml`) blocks merges if:
- TypeScript check fails
- Unit tests fail
- Build fails
- Smoke tests fail (on PRs to main)

Always run before deploying manually:
```bash
npx tsc --noEmit --skipLibCheck  # TypeScript check
npx next build --no-lint         # Build check
npm run test:unit                 # Unit tests
```

---

## Part 2 — Migration Rollback

### The Hard Truth: Supabase Does Not Support Rollback

Supabase's `db push` is a **one-way operation**. There is no `db rollback` command. Once a migration is applied to the remote database, it cannot be undone by reverting a file.

**The correct response to a bad migration is a compensating migration.**

---

### Compensating Migration Procedure

A compensating migration undoes the effect of a bad migration using a new, forward migration.

**Example scenario:** Migration `20260320000001_add_column.sql` added a column that is causing issues.

**Step 1 — Write the compensating migration**

```bash
# Check existing migrations first (always!)
# Then create a new migration with the next timestamp
```

```sql
-- File: supabase/migrations/20260320000002_revert_bad_column.sql
-- Compensates for: 20260320000001_add_column.sql
-- What this undoes: removes the problem column added in the prior migration
-- Risk: Any data written to this column since 20260320000001 will be lost.
--       Verify no production data depends on this column before applying.

ALTER TABLE events DROP COLUMN IF EXISTS bad_column_name;
```

**Step 2 — Announce before applying**

Show the SQL to the team before running. Per CLAUDE.md data safety rules:
- Warn explicitly about data loss
- Get explicit approval
- Back up before applying if there is any data at risk

**Step 3 — Apply**

```bash
npx supabase db push --linked
```

**Step 4 — Regenerate types**

```bash
npx supabase gen types typescript --linked > types/database.ts
```

**Step 5 — Verify and deploy the app**

```bash
npx tsc --noEmit --skipLibCheck
npx next build --no-lint
vercel deploy --prod --yes
```

---

### Safe Migration Patterns (Prevent the Need for Rollback)

#### 1. Add columns as nullable first

```sql
-- Safe: nullable column, no existing rows affected
ALTER TABLE events ADD COLUMN new_field TEXT;

-- Only add NOT NULL after backfilling data
-- UPDATE events SET new_field = 'default' WHERE new_field IS NULL;
-- ALTER TABLE events ALTER COLUMN new_field SET NOT NULL;
```

#### 2. Never rename columns directly

Renaming a column breaks the running app immediately. Use the expand/contract pattern:

```sql
-- Phase 1 (migration): add new column
ALTER TABLE events ADD COLUMN new_name TEXT;

-- Phase 2 (app code): write to both old and new column
-- Phase 3 (migration): backfill new column from old
-- UPDATE events SET new_name = old_name;
-- Phase 4 (app code): read from new column only
-- Phase 5 (migration): drop old column
ALTER TABLE events DROP COLUMN old_name;
```

#### 3. Add indexes concurrently (avoid table locks)

```sql
-- Locks table (dangerous in production):
CREATE INDEX idx_events_date ON events(event_date);

-- Non-locking (safe in production):
CREATE INDEX CONCURRENTLY idx_events_date ON events(event_date);
```

#### 4. Test on a restored backup first

Before applying risky migrations to production, restore the latest backup to a throwaway Supabase project and test there first. See `docs/backup-and-restore.md`.

---

### Emergency: Roll Back to Backup After Bad Migration

If a migration causes catastrophic data corruption and a compensating migration is not sufficient:

1. Follow `docs/disaster-recovery.md` → Runbook A (Database Corruption).
2. Restore from the most recent backup (before the bad migration was applied).
3. The bad migration file must be deleted from `supabase/migrations/` before the next `db push`.
4. Apply only the corrected migration.

---

## Rollback Decision Tree

```
Bad deployment detected
    │
    ├─ Is it a code-only issue? (no DB change)
    │       └─ YES → Run `vercel rollback [prev-deployment-id]`
    │
    ├─ Did a migration cause the issue?
    │       ├─ Is data intact? (only schema is wrong)
    │       │       └─ YES → Write and apply compensating migration
    │       └─ Is data corrupted or lost?
    │               └─ YES → Follow disaster-recovery.md Runbook A
    │
    └─ Is the issue in an environment variable or secret?
            └─ YES → Update env var in Vercel dashboard + redeploy
```

---

## Rollback Log

| Date | Type | What was rolled back | Reason | Time to restore |
|------|------|---------------------|--------|-----------------|
| (no rollbacks yet) | — | — | — | — |

---

## Related Documents

- `docs/backup-and-restore.md` — Backup and restore procedures
- `docs/disaster-recovery.md` — Full disaster recovery runbooks
- `docs/AGENT-WORKFLOW.md` — Migration safety workflow
- `CLAUDE.md` — Data safety rules for migrations
