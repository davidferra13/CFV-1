# Build: Security & Operational Documentation (Category 3)

**Date:** 2026-02-20
**Branch:** feature/scheduling-improvements
**Audit items addressed:** #52, #53, #64, #65, #66, #67, #69

---

## What Changed

Six operational and security policy documents were created to close critical gaps identified in the 79-concept system audit.

### Files Created

| File | Audit Item | Description |
|------|-----------|-------------|
| `docs/key-rotation-policy.md` | #64 | Rotation schedule, procedures, emergency rotation |
| `docs/backup-and-restore.md` | #52, #67 | Backup strategy, restore runbooks, quarterly drill |
| `docs/disaster-recovery.md` | #53 | 7 incident runbooks, RTO/RPO, communication templates |
| `docs/data-retention-policy.md` | #65 | Retention schedule by data type, legal basis, purge crons |
| `docs/pii-handling-policy.md` | #66 | PII classification, handling rules, subject rights, sub-processors |
| `docs/rollback-plan.md` | #69 | Vercel deployment rollback, compensating migration procedure |

---

## Why These Documents

The audit found 30 missing and 24 partial items. Security/operational docs were the lowest-cost, highest-risk gap to close. A single unhandled incident (breach, database corruption, bad migration) without a documented procedure could result in:

- Extended downtime (no runbook → guessing under pressure)
- Legal exposure (no documented GDPR response procedures)
- Data loss (no backup restore procedure had been tested or documented)
- Permanent data corruption (no migration rollback strategy documented)

---

## Key Decisions

### Disaster Recovery: 7 Runbooks

Covered the realistic failure scenarios for this stack:
- Database corruption → Supabase backup restore
- Data breach → immediate key rotation + session invalidation + GDPR notification
- Key compromise → emergency rotation < 15 min
- Vercel compromise → audit + redeploy from known-good commit
- DNS hijack → Cloudflare record restoration
- Stripe suspension → graceful degradation + backup processor
- Hosting outage → Railway/Netlify failover procedure

### Data Retention: Legal + Operational Split

- Financial records: 7 years (IRS mandate)
- Operational records: 3 years
- Communications: 2 years
- Activity logs: 1 year
- Tokens/sessions: 30–90 days
Two crons already exist (`activity-cleanup`, `push-cleanup`) — documented their scope and identified two additional crons needed.

### PII Policy: Minimum-Necessary Principle

Each third-party integration listed with exactly what PII it receives. Engineers and AI agents are required to read this before touching PII tables. The policy establishes the "never log PII" rule explicitly.

### Rollback Plan: Forward-Only with Escape Hatch

Supabase does not support migration rollback. The document codifies the expand/contract pattern, compensating migration procedure, and the emergency path (restore from backup) when compensating is insufficient. A decision tree makes the rollback choice mechanical under pressure.

---

## Related Documents

- `docs/alerting-and-monitoring.md` — Observability setup (Category 1)
- `docs/DEPLOYMENT_AND_DOMAIN_SETUP.md` — Existing deployment guide
- `CLAUDE.md` — Data safety rules that these docs enforce
- `docs/audit-system-concepts.md` — Full 79-item audit source
