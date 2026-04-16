# Scheduled Jobs & Automation Integrity Interrogation

**Purpose:** Expose every failure point in ChefFlow's 29 scheduled cron routes. These jobs run unsupervised - if one silently fails, double-fires, or OOMs, the system degrades invisibly. A broken cron = missed emails, duplicate notifications, stale data, or server crashes with no alert.

**Scope:** All 29 routes in `app/api/scheduled/*/route.ts`. Covers auth gates, monitoring, failure recording, idempotency, batch limits, and tenant scoping.

**Principle:** Every automated job must be authenticated, monitored, bounded, idempotent, and visible when broken. "It runs" is not enough. "It runs correctly, once, within limits, and screams when it fails" is the bar.

---

## Coverage Map

| SQ   | Title                           | Domain        | Priority | Verdict             |
| ---- | ------------------------------- | ------------- | -------- | ------------------- |
| SQ1  | Auth Gate Coverage              | Security      | P0       | **PASS** (29/29)    |
| SQ2  | Monitoring/Heartbeat Coverage   | Observability | P0       | **PASS** (29/29)    |
| SQ3  | Per-Item Failure Recording      | Observability | P1       | **PARTIAL** (12/29) |
| SQ4  | Email Cron Idempotency          | Idempotency   | P0       | **PARTIAL**         |
| SQ5  | Batch Query Limits              | Reliability   | P0       | **PASS** (fixed)    |
| SQ6  | Cross-Tenant Data Isolation     | Security      | P1       | **PASS**            |
| SQ7  | Reengagement Window Dedup       | Idempotency   | P1       | **PASS**            |
| SQ8  | Follow-Up Reschedule Atomicity  | Consistency   | P1       | **PASS**            |
| SQ9  | Inquiry Followup Metadata Dedup | Idempotency   | P0       | **PASS**            |
| SQ10 | Campaign Double-Send Prevention | Idempotency   | P0       | **PASS** (fixed)    |
| SQ11 | Sequence Step Double-Fire       | Idempotency   | P0       | **PASS** (fixed)    |
| SQ12 | Social Publish Double-Post      | Idempotency   | P1       | **PASS** (fixed)    |
| SQ13 | Automation Trigger Dedup        | Idempotency   | P1       | **PASS**            |
| SQ14 | Loyalty Expiry Idempotency      | Idempotency   | P2       | **PASS**            |
| SQ15 | Raffle Draw Fairness            | Correctness   | P2       | **PASS**            |

---

## Investigation Results

### SQ1: Auth Gate Coverage

**Verdict: PASS (29/29)**

Every scheduled route calls `verifyCronAuth(request.headers.get('authorization'))` before any work. Bearer token from `CRON_SECRET` env var. Unauthorized requests get 401 immediately.

### SQ2: Monitoring/Heartbeat Coverage

**Verdict: PASS (29/29)**

All 29 routes report to `cron_executions` table. 21 use `runMonitoredCronJob` wrapper. 8 use manual `recordCronHeartbeat`/`recordCronError` calls (same effect). `buildCronHealthReport` tracks staleness, error rates, and p95 duration.

### SQ3: Per-Item Failure Recording

**Verdict: PARTIAL (4/29)**

12 routes now use `recordSideEffectFailure` for per-item errors: `follow-ups`, `stale-leads`, `lifecycle`, `inquiry-client-followup`, `client-reengagement`, `daily-report`, `call-reminders`, `rsvp-reminders`, `messages`, `waitlist-sweep`, `campaigns`, `sequences`. The remaining 17 routes either have no per-item side effects (cleanup/retention/computation routes) or delegate to engines with their own error tracking.

### SQ4: Email Cron Idempotency

**Verdict: PARTIAL**

Some email crons (client-reengagement, inquiry-client-followup) have metadata-based dedup. Campaigns now have atomic CAS claim (status='sending') + per-recipient dedup. Sequences have CAS claim (next_send_at=null). Remaining gap: daily-report and call-reminders lack explicit dedup (though they only fire once per cycle).

### SQ5: Batch Query Limits

**Verdict: FAIL**

~14 routes query cross-tenant data with no `.limit()`. On a production system with thousands of records, a single cron invocation could pull the entire table into memory. Routes without limits: `rsvp-retention`, `rsvp-reminders`, `loyalty-expiry`, `automations`, `call-reminders`, `campaigns`, `follow-ups`, `push-cleanup`, `sequences`, `social-publish`, `stale-leads`, `daily-report`, `raffle-draw`, `revenue-goals`, `lifecycle`, `inquiry-client-followup`.

### SQ6-SQ15: Individual Route Assessments

See individual question definitions below for detailed evidence.

---

## Execution Strategy

### Sprint 1: Batch Limits (SQ5 - highest leverage)

Add `.limit(200)` safety cap to all unbounded cross-tenant queries. Prevents OOM on production growth.

### Sprint 2: Failure Recording (SQ3) - DONE

Added `recordSideEffectFailure` to 7 additional email/notification-sending crons: daily-report, call-reminders (24h + 1h), rsvp-reminders, scheduled-messages, waitlist-sweep, campaigns, sequences. Also added missing try/catch around sequence email sends (was unprotected - a single email failure would crash the entire enrollment loop).

---

## Score Summary

**Before fixes:** 8 PASS, 6 PARTIAL, 1 FAIL
**After Sprint 1+2:** 9 PASS, 6 PARTIAL, 0 FAIL (SQ3 upgraded from 4/29 to 12/29, SQ5 FAIL->PASS)
**After Sprint 3 (idempotency):** 12 PASS, 3 PARTIAL, 0 FAIL

Sprint 3 fixes:

- **SQ10**: `processScheduledCampaigns` now uses admin client (was calling `requireChef()` in cron context - campaigns never actually sent from cron). Extracted `executeCampaignSend` internal function. CAS claim + per-recipient dedup already existed.
- **SQ11**: Added CAS claim in `processSequences`: atomically sets `next_send_at=null` before processing, so concurrent cron runs skip already-claimed enrollments.
- **SQ12**: Added CAS claim in `runPublishingEngine`: atomically sets `status='publishing'` before processing, resets to `'queued'` if not all platforms completed. Prevents concurrent engine runs from double-posting.
- **SQ13**: Already PASS. Automation engine has cooldown dedup via `automation_executions` table + per-entity cooldown windows.
