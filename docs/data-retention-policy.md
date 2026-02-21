# Data Retention Policy — ChefFlow V1

**Last reviewed:** 2026-02-20
**Owner:** Platform engineer / founder
**Applies to:** All data stored in Supabase PostgreSQL and Supabase Storage

---

## Overview

This document defines how long each category of data is retained in ChefFlow, why, and when it is automatically or manually purged. Retention rules balance:

1. **Legal requirements** — financial records, tax compliance
2. **Operational needs** — chefs need event history to operate their business
3. **Privacy obligations** — GDPR right to erasure, CCPA deletion rights
4. **Storage costs** — Supabase Free tier limits (500 MB DB, 1 GB Storage)

---

## Retention Schedule by Data Type

### Financial Records — **7 Years** (Legal Minimum)

| Table | Retention | Reason |
|-------|-----------|--------|
| `ledger_entries` | **7 years** | US tax law (IRS): 7-year minimum for business financial records |
| `events` (with payment) | **7 years** | Event was a financial transaction — must be retained for audit |
| `quotes` (accepted) | **7 years** | Contractual document associated with payment |
| `stripe_webhook_events` (if stored) | **7 years** | Payment processor audit trail |

**Enforcement:**
- `ledger_entries` is immutable by database trigger — no delete policy needed.
- Events that have ledger entries are RESTRICT-gated (FK constraint blocks deletion).
- Automated purge is NOT run on these tables.

---

### Operational Event Records — **3 Years Active + Archive**

| Table | Retention | Action |
|-------|-----------|--------|
| `events` (no payment, cancelled) | **3 years** | Flag `is_archived = true` after 3 years; hard delete after 7 |
| `inquiries` (rejected/expired) | **1 year** | Soft delete / archive after 1 year |
| `quotes` (rejected/expired) | **1 year** | Soft delete / archive after 1 year |
| `menus` (orphaned, never used) | **1 year** | Delete if no event association within 1 year |

---

### Client Data — **Active Relationship + 3 Years**

| Table | Retention | Action |
|-------|-----------|--------|
| `clients` | **Active + 3 years** | Retain while chef has ongoing relationship; purge 3 years after last event |
| `client_invitations` (unused) | **30 days** | Auto-purge unused invitation tokens (already partially implemented) |
| `client_portal_sessions` | **90 days** | Session data purged after 90 days of inactivity |

**Note on GDPR Right to Erasure:** A client may request deletion of their data. Financial records (ledger entries) cannot be erased due to legal retention requirements — this must be disclosed in the privacy policy. All other client PII can be anonymized: replace `full_name`, `email`, `phone` with `[Deleted]` / `null`.

---

### Communication and Messaging — **2 Years**

| Table | Retention | Action |
|-------|-----------|--------|
| `messages` | **2 years** | Auto-purge messages older than 2 years |
| `email_history` | **2 years** | Purge sent email records after 2 years |
| `push_subscriptions` | **90 days inactive** | Auto-purge inactive subscriptions (cron already exists: `/api/scheduled/push-cleanup`) |
| `communication_drafts` | **30 days** | Auto-purge unsent drafts after 30 days |

---

### Activity and Audit Logs

| Table | Retention | Action |
|-------|-----------|--------|
| `chef_activity_log` | **1 year** | Auto-purge entries older than 1 year (cron already exists: `/api/scheduled/activity-cleanup`) |
| `audit_log` (general) | **3 years** | Retain for security and compliance review |
| `admin_audit_log` | **7 years** | Immutable; administrative actions must be retained for compliance |
| `event_state_transitions` | **7 years** | Immutable FSM audit trail tied to financial events |
| `inquiry_state_transitions` | **3 years** | Retain with associated inquiry |
| `quote_state_transitions` | **7 years** (if accepted) / **1 year** (if rejected) | Follows the quote retention rule |

---

### System and Operational Data

| Table | Retention | Action |
|-------|-----------|--------|
| `cron_executions` | **90 days** | Auto-purge old cron execution records |
| `webhook_deliveries` | **90 days** | Auto-purge delivery records after 90 days |
| `webhook_endpoints` | Until chef deletes | User-owned configuration data |
| `api_keys` | Until revoked | User-owned credentials |
| `integrations` / `chef_integrations` | Until chef disconnects | User-owned OAuth state |

---

### Uploaded Files (Supabase Storage)

| Bucket | Retention | Action |
|--------|-----------|--------|
| `event-photos` | Active event life + 3 years | Manual purge after event archive |
| `receipts` | 7 years | Financial record — must be retained |
| `contracts` | 7 years | Legal document |
| `profile-photos` | Until chef account deleted | User-owned asset |
| `menu-attachments` | 2 years after event | Purge with event archive |

---

## Account Deletion

When a chef requests account deletion:

1. **Immediately:**
   - Disable login (Supabase Auth: disable user)
   - Revoke all API keys
   - Disconnect all OAuth integrations

2. **Within 30 days:**
   - Anonymize all client PII (`full_name` → `[Deleted]`, `email` → `deleted@[uuid].invalid`, `phone` → null)
   - Delete personal chef profile data (bio, photo, contact info)
   - Revoke all client portal access tokens

3. **Cannot be deleted (legal retention):**
   - `ledger_entries` — immutable financial records (7 years)
   - `event_state_transitions` — FSM audit trail (7 years)
   - `admin_audit_log` — platform admin actions (7 years)
   - Financial events and accepted quotes

4. **Notify the chef** of what was deleted and what must be retained, with the legal basis.

---

## Automated Purge Implementation

### Currently Implemented Crons

| Cron | Path | What it purges |
|------|------|----------------|
| `activity-cleanup` | `/api/scheduled/activity-cleanup` | Old `chef_activity_log` entries |
| `push-cleanup` | `/api/scheduled/push-cleanup` | Expired push subscriptions |

### Crons Needed (Future Implementation)

| Cron | Recommended Schedule | What to purge |
|------|---------------------|---------------|
| `data-retention-cleanup` | Weekly (Sunday 2am) | Messages > 2yr, cron_executions > 90d, webhook_deliveries > 90d, unused client_invitations > 30d |
| `archive-old-events` | Monthly (1st, 3am) | Flag cancelled events > 3yr as `is_archived = true` |

---

## Legal Basis Summary

| Data Category | Legal Basis for Processing | Retention Basis |
|---------------|--------------------------|-----------------|
| Financial records | Contract performance | Legal obligation (IRS 7-year rule) |
| Event records | Contract performance | Legitimate interest |
| Client PII | Contract performance | Active relationship |
| Communications | Legitimate interest | Operational necessity |
| Audit logs | Legal obligation / legitimate interest | Security and compliance |
| Profile data | Consent | Until account deletion |

---

## Compliance Notes

- **GDPR (EU):** Data subjects have the right to access, rectification, erasure (except legal holds), and portability. The GDPR export at `Settings → Compliance → GDPR → Download My Data` covers the portability right.
- **CCPA (California):** Consumers have the right to know, delete, and opt-out of sale. ChefFlow does not sell personal data.
- **US Tax Law:** 7-year retention for all records supporting tax filings.

---

## Review Schedule

This policy must be reviewed and updated:
- Annually (at minimum)
- When adding new data types or tables
- When entering new geographic markets with different legal requirements

*Next review due: 2027-02-20*
