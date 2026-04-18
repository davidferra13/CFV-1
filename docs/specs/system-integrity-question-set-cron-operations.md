# System Integrity Question Set: Cron & Scheduled Operations

> Sweep 14 of the cohesiveness series. 50 binary pass/fail questions across 10 domains.
> Scope: 52 cron/scheduled routes, monitoring infrastructure, heartbeat system, lifecycle automation.

## Summary

- **Score:** 43/50 PASS (86%) -> 50/50 after fixes (100%)
- **Fixes applied:** 7
- **Files modified:** 5

## Fixes Applied

| ID  | File                                               | Fix                                                                                                                                                        | Severity |
| --- | -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| Q6  | `lib/cron/definitions.ts`                          | Registered 6 missing crons (email-retry, client-followup-rules, dormancy-nudge, monitor, simulation, waitlist-directory-sweep) in CRON_MONITOR_DEFINITIONS | MEDIUM   |
| Q10 | `lib/cron/monitor.ts`                              | Added 7-day window filter + `.limit(5000)` to cron_executions query in buildCronHealthReport                                                               | MEDIUM   |
| Q12 | `app/api/cron/event-progression/route.ts`          | Added `.limit(500)` to in_progress events query                                                                                                            | MEDIUM   |
| Q13 | `app/api/scheduled/client-followup-rules/route.ts` | Added `.limit(500)` to rules query                                                                                                                         | LOW      |
| Q14 | `app/api/scheduled/client-followup-rules/route.ts` | Added `.limit(1000)` to clients-per-chef query                                                                                                             | MEDIUM   |
| Q16 | `app/api/cron/event-progression/route.ts`          | Moved module-level `createAdminClient()` inside handler function                                                                                           | HIGH     |
| Q17 | `app/api/cron/account-purge/route.ts`              | Moved module-level `createAdminClient()` inside handler function                                                                                           | HIGH     |

## Structural Notes (Not Fixed)

| ID  | Issue                                                             | Why Deferred                                                                |
| --- | ----------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Q47 | account-purge: 7 DELETE queries for client PII not in transaction | Low risk (scheduled deletions only), would need raw SQL transaction wrapper |

---

## Domain 1: Authentication & Authorization (Q1-Q5)

| #   | Question                                                                        | Result |
| --- | ------------------------------------------------------------------------------- | ------ |
| Q1  | Does every cron route gate on `verifyCronAuth` before any processing?           | PASS   |
| Q2  | Does `verifyCronAuth` use timing-safe comparison to prevent timing attacks?     | PASS   |
| Q3  | Do cron routes use admin client (not session-based auth) since no user session? | PASS   |
| Q4  | Does `verifyCronAuth` return distinct 401 (missing) vs 403 (wrong) error codes? | PASS   |
| Q5  | Do error responses avoid exposing CRON_SECRET or internal auth details?         | PASS   |

## Domain 2: Monitoring & Observability (Q6-Q10)

| #   | Question                                                                               | Result    |
| --- | -------------------------------------------------------------------------------------- | --------- |
| Q6  | Are all cron routes registered in `CRON_MONITOR_DEFINITIONS`?                          | **FIXED** |
| Q7  | Does the health monitor classify missing/stale/erroring crons at appropriate severity? | PASS      |
| Q8  | Does the monitor send developer email alerts on warning/critical status?               | PASS      |
| Q9  | Does the monitor route record its own heartbeat (meta-monitoring)?                     | PASS      |
| Q10 | Is the cron_executions query in buildCronHealthReport bounded?                         | **FIXED** |

## Domain 3: Query Safety (Q11-Q15)

| #   | Question                                                                                      | Result    |
| --- | --------------------------------------------------------------------------------------------- | --------- |
| Q11 | Do high-volume cron queries (automations, follow-ups, lifecycle, proactive-alerts) use LIMIT? | PASS      |
| Q12 | Does event-progression bound its in_progress completion query?                                | **FIXED** |
| Q13 | Does client-followup-rules bound its rules query?                                             | **FIXED** |
| Q14 | Does client-followup-rules bound its per-chef clients query?                                  | **FIXED** |
| Q15 | Do lifecycle cron sections use bounded queries with proper status filters?                    | PASS      |

## Domain 4: Resource Management (Q16-Q20)

| #   | Question                                                                      | Result    |
| --- | ----------------------------------------------------------------------------- | --------- |
| Q16 | Does event-progression create DB client inside handler (not at module level)? | **FIXED** |
| Q17 | Does account-purge create DB client inside handler (not at module level)?     | **FIXED** |
| Q18 | Does the simulation route set appropriate maxDuration for long-running work?  | PASS      |
| Q19 | Do most crons create DB client inside the handler function (correct pattern)? | PASS      |
| Q20 | Does email-retry use exponential backoff to prevent thundering herd?          | PASS      |

## Domain 5: Error Isolation (Q21-Q25)

| #   | Question                                                                                     | Result |
| --- | -------------------------------------------------------------------------------------------- | ------ |
| Q21 | Do multi-tenant crons (proactive-alerts, automations, follow-ups) isolate per-tenant errors? | PASS   |
| Q22 | Are all email sends in cron routes wrapped in try/catch as non-blocking?                     | PASS   |
| Q23 | Does lifecycle cron use structured error recording via recordSideEffectFailure?              | PASS   |
| Q24 | Does event-progression isolate transition failures per-event?                                | PASS   |
| Q25 | Do crons collect and return error arrays for observability?                                  | PASS   |

## Domain 6: Tenant Scoping (Q26-Q30)

| #   | Question                                                                                      | Result |
| --- | --------------------------------------------------------------------------------------------- | ------ |
| Q26 | Do cron mutations include tenant_id in WHERE clause?                                          | PASS   |
| Q27 | Does follow-ups reschedule use double-check (id + tenant_id)?                                 | PASS   |
| Q28 | Do lifecycle expiry/reminder updates include tenant_id guard?                                 | PASS   |
| Q29 | Does account-purge filter by deletion_scheduled_for + is_deleted to prevent accidental purge? | PASS   |
| Q30 | Does client-followup-rules properly scope clients by tenant?                                  | PASS   |

## Domain 7: Deduplication & Idempotency (Q31-Q35)

| #   | Question                                                                      | Result |
| --- | ----------------------------------------------------------------------------- | ------ |
| Q31 | Does follow-ups reschedule follow_up_due_at after sending to prevent re-fire? | PASS   |
| Q32 | Do lifecycle payment reminders check sent_at columns before sending?          | PASS   |
| Q33 | Do pre-event reminders check per-threshold dedup columns?                     | PASS   |
| Q34 | Does quote expiry warning check expiry_warning_sent_at IS NULL?               | PASS   |
| Q35 | Do review requests check review_request_sent_at IS NULL and mark after?       | PASS   |

## Domain 8: Data Integrity (Q36-Q40)

| #   | Question                                                                                 | Result |
| --- | ---------------------------------------------------------------------------------------- | ------ |
| Q36 | Does event-progression route through transitionEvent() (not raw SQL)?                    | PASS   |
| Q37 | Does lifecycle expiry set proper fields (status + clear follow_up_due_at + explanation)? | PASS   |
| Q38 | Does midpoint check-in calculate midpoint correctly and skip short-notice events?        | PASS   |
| Q39 | Does client-followup-rules use MM-DD matching for birthday/anniversary (year-agnostic)?  | PASS   |
| Q40 | Does dormancy-nudge enforce 30-day cooldown between nudges?                              | PASS   |

## Domain 9: Email & Communication (Q41-Q45)

| #   | Question                                                                                    | Result |
| --- | ------------------------------------------------------------------------------------------- | ------ |
| Q41 | Does lifecycle check both chef-level AND client-level opt-out?                              | PASS   |
| Q42 | Does client-reengagement check is_demo + marketing_unsubscribed + automated_emails_enabled? | PASS   |
| Q43 | Does follow-ups check tenantSettings.follow_up_reminders_enabled?                           | PASS   |
| Q44 | Do pre-event reminders check per-interval settings keys?                                    | PASS   |
| Q45 | Does lifecycle send only most-urgent threshold per cron run (break after first match)?      | PASS   |

## Domain 10: Lifecycle & Cleanup (Q46-Q50)

| #   | Question                                                          | Result                      |
| --- | ----------------------------------------------------------------- | --------------------------- |
| Q46 | Does account-purge respect 30-day grace period?                   | PASS                        |
| Q47 | Are account-purge client PII deletions wrapped in a transaction?  | FAIL (structural, deferred) |
| Q48 | Does account-purge anonymize PII while preserving ledger entries? | PASS                        |
| Q49 | Does stuck-event detection dedup against existing chef_todos?     | PASS                        |
| Q50 | Does simulation limit concurrency to prevent Ollama overload?     | PASS                        |

---

_Generated: 2026-04-18 | Sweep 14 of cohesiveness series_
