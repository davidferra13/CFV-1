# Backup Strategy & Restore Procedure — ChefFlow V1

## Overview

ChefFlow data lives in three places:
1. **Supabase PostgreSQL** — all structured data (events, clients, ledger, etc.)
2. **Supabase Storage** — uploaded files (photos, documents, receipts)
3. **Vercel** — application code (backed by git)

---

## 1. Database Backup Strategy

### Automatic Backups (Supabase Managed)

Supabase automatically backs up the production database:

| Plan | Backup Type | Retention | PITR |
|------|------------|-----------|------|
| Free | Daily snapshots | 7 days | No |
| Pro ($25/mo) | Daily + continuous WAL | 7 days | Yes (up to 7 days) |

**Current plan:** Free (daily snapshots, 7-day retention)

**Implication:** In a disaster scenario, we can restore to any point within the last 7 days, but only to a daily snapshot boundary (not arbitrary point in time).

**Recommendation:** Upgrade to Supabase Pro for Point-in-Time Recovery (PITR) when revenue justifies it.

### Manual Export Backups (Weekly)

Run weekly to supplement automatic backups:

```bash
# Export full database via pg_dump
# Get the connection string from Supabase Dashboard > Settings > Database > Connection string (URI)
pg_dump "postgresql://postgres:[PASSWORD]@db.luefkpakzvxcsqroxyhz.supabase.co:5432/postgres" \
  --format=custom \
  --file="backup-$(date +%Y%m%d).dump"
```

Store backups in a separate location (not same Supabase account):
- Google Drive / Dropbox (encrypted)
- S3 bucket (separate AWS account)
- Local encrypted storage

### Financial Data Export (Append to Backups)

The system can export financial summaries via the Finance section. For backup purposes, the full ledger is also exportable:

```bash
# The GDPR export captures all chef-owned data including ledger entries
# Available via: Settings > Compliance > GDPR > Download My Data
```

---

## 2. File Storage Backup Strategy

Supabase Storage (files/photos) is backed by AWS S3, which provides:
- 99.999999999% (11 nines) durability
- Versioning: Not enabled by default on Supabase Storage buckets

**Current state:** Files are durable but not versioned. Accidental deletions cannot be recovered.

**Recommendation:** Enable cross-region replication via Supabase Pro or manually sync to a secondary S3 bucket.

---

## 3. Application Code Backup

Application code is stored in Git (GitHub). The repository IS the backup. All code changes are committed and pushed before deployment.

---

## 4. Restore Procedure

### Scenario A: Accidental Data Deletion (within 7 days)

1. Go to [app.supabase.com](https://app.supabase.com) → Project: `luefkpakzvxcsqroxyhz`
2. Settings → Backups
3. Select the most recent backup before the deletion occurred
4. Click "Restore" (this will restore to a SEPARATE project — do NOT overwrite production until verified)
5. Verify restored data is correct
6. If correct: migrate data back to production using SQL INSERT statements
7. If incorrect: try an earlier backup

**Time estimate:** 15-30 minutes for restore, 1-2 hours for verification and data migration back.

### Scenario B: Full Database Corruption

1. Immediately set Vercel app to maintenance mode (add a temporary `MAINTENANCE_MODE=1` env var and handle in middleware)
2. Restore from most recent Supabase backup to a NEW project
3. Verify data integrity
4. Update all env vars (`NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) to point to restored project
5. Redeploy Vercel
6. Remove maintenance mode
7. Notify customers

**RTO (Recovery Time Objective):** 4 hours
**RPO (Recovery Point Objective):** Up to 24 hours of data loss possible on Free plan

### Scenario C: Restore from Manual pg_dump Backup

```bash
# Create a new Supabase project first, then:
pg_restore \
  --dbname="postgresql://postgres:[PASSWORD]@db.[NEW_PROJECT_ID].supabase.co:5432/postgres" \
  --verbose \
  "backup-YYYYMMDD.dump"
```

---

## 5. Backup Restore Testing

**Restore tests should be performed quarterly.**

### Test Procedure

1. On the 1st of each quarter:
   - Create a new throwaway Supabase project (free tier)
   - Restore the most recent backup to the throwaway project
   - Verify the following queries return expected results:
     ```sql
     SELECT COUNT(*) FROM chefs;
     SELECT COUNT(*) FROM events;
     SELECT SUM(amount_cents) FROM ledger_entries WHERE entry_type = 'payment';
     ```
   - Verify the app can connect and display data (update `.env.local` temporarily to point to test project)
   - Delete the throwaway project
2. Document test result in this file:

| Test Date | Backup Date Restored | Result | Notes |
|-----------|---------------------|--------|-------|
| (first test pending) | — | — | — |

---

## 6. Backup Checklist

Run this monthly:

- [ ] Verify Supabase dashboard shows backup completed in the last 24 hours
- [ ] Check storage usage hasn't approached limits (free tier: 500MB DB, 1GB storage)
- [ ] Run manual `pg_dump` and store encrypted copy off-platform
- [ ] Verify GDPR export works (Settings > Compliance > GDPR)

---

*Last reviewed: 2026-02-20*
