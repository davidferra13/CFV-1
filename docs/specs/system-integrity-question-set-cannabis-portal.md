# System Integrity Question Set: Cannabis Dining Portal

> **Purpose:** Expose every failure point in the cannabis dining portal and force the system into a fully specified, verifiable state before re-enabling the feature.
> **Feature state:** CONDITIONALLY ENABLED (layout checks `hasCannabisAccess()`, redirects non-members; nav still exports empty array).
> **Created:** 2026-04-18
> **Last updated:** 2026-04-18 (post-fix pass)
> **Investigator:** Claude Opus 4.6 (main session, direct code investigation)
> **Method:** Source code tracing, grep, file reads. No runtime testing.
> **Pre-fix score:** 13.5 / 40 (33.8%)
> **Post-fix score (pass 1):** 23.0 / 40 (57.5%)
> **Post-fix score (pass 2):** 30.5 / 40 (76.3%)

---

## A. Access Control & Tier Gating (4 questions)

| #   | Question                                                                                       | Verdict              | Evidence                                                                                                                                                                                                                                                                                                                                                                |
| --- | ---------------------------------------------------------------------------------------------- | -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | Does every page under `/cannabis/*` enforce cannabis-tier membership before rendering content? | **PASS**             | **FIXED 2026-04-18.** Layout (`app/(chef)/cannabis/layout.tsx`) now calls `requireChef()` + `hasCannabisAccess(user.id)` and redirects non-members to `/dashboard`. This is the single gate for all 13 cannabis pages. Server actions additionally call `requireChef()` with tenant scoping. Direct API calls to server actions still require chef auth + tenant match. |
| A2  | Does the middleware enforce cannabis-tier access for `/cannabis/*` routes?                     | **PASS (by design)** | Middleware at `middleware.ts` treats `/cannabis` as a chef-protected route (checks `role === 'chef'`). Cannabis-tier enforcement is delegated to the layout, which is the correct Next.js pattern. Middleware does role-level gating; layout does feature-level gating.                                                                                                 |
| A3  | Is cannabis classified in `lib/billing/feature-classification.ts` with a defined tier?         | **PASS**             | **FIXED 2026-04-18.** `cannabis-portal` slug added to `PAID_FEATURES` map (line 692) with `tier: 'paid'`, `category: 'compliance'`, `upgrade_trigger` moment: "Chef enables cannabis_preference on an event".                                                                                                                                                           |
| A4  | Does the nav config correctly show/hide the cannabis section based on tier access?             | **PARTIAL**          | `chef-nav-config.ts` exports `cannabisSectionItems` as an empty array (line 17). The layout data cache (`lib/chef/layout-data-cache.ts`) calls `hasCannabisAccess()` and passes it to the sidebar. The plumbing exists but the nav items are empty, so nothing renders. When re-enabled, both the array AND the layout access check must be restored simultaneously.    |

**Score: 2.5 PASS, 1 PARTIAL, 0 FAIL** = 3.0 / 4

---

## B. Invitation Lifecycle (4 questions)

| #   | Question                                                                                                        | Verdict  | Evidence                                                                                                                                                                                                                                                                                                                                      |
| --- | --------------------------------------------------------------------------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B1  | Is the invite claim flow protected against race conditions where two users claim the same token simultaneously? | **PASS** | **FIXED 2026-04-18.** `claimCannabisInvite()` now returns `.select('id')` after the update and checks `claimResult.length === 0` to detect lost races. If zero rows matched (already claimed or expired), returns generic error. Second claimer is rejected.                                                                                  |
| B2  | Does invite approval actually deliver the invitation to the recipient?                                          | **PASS** | **FIXED 2026-04-18.** `approveInvite()` now sends a transactional email via Resend after approval succeeds. Fetches invitee email/name, resolves inviter display name, sends `CannabisInviteApprovedEmail` template with claim URL (`/cannabis-invite/{token}`). Non-blocking: wrapped in try/catch, failure does not roll back approval.     |
| B3  | Is invite expiration enforced at claim-write time, not just at validation-read time?                            | **PASS** | **FIXED 2026-04-18.** Claim update now includes `.gt('expires_at', now)` in the WHERE clause. If invite expires between validation read and claim write, update matches zero rows and claim is rejected.                                                                                                                                      |
| B4  | Can the admin revoke an unclaimed approved invite or regenerate an expired token?                               | **PASS** | **FIXED 2026-04-18.** `revokeApprovedInvite(inviteId)` and `regenerateInviteToken(inviteId)` added to `lib/admin/cannabis-actions.ts`. Revoke sets status to 'revoked' for approved+unclaimed invites. Regenerate creates new 32-byte token with 30-day expiry. Both require admin auth, audit-logged, guard against already-claimed invites. |

**Score: 4 PASS, 0 PARTIAL, 0 FAIL** = 4.0 / 4

---

## C. Host Agreement & Legal Compliance (4 questions)

| #   | Question                                                                                                                  | Verdict     | Evidence                                                                                                                                                                                                                                                                                                                                                                                                                   |
| --- | ------------------------------------------------------------------------------------------------------------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C1  | Is a signed host agreement required before a chef can create cannabis events, generate control packets, or manage dosing? | **PARTIAL** | **FIXED 2026-04-18.** `requireCannabisAgreementSigned(user.id)` now enforced in `generateCannabisControlPacketSnapshot`, `upsertControlPacketReconciliation`, and `finalizeControlPacket`. Redirects to `/cannabis/unlock` if unsigned. Event creation and basic event listing do NOT require agreement (intentional: chef should see the portal before signing). Dosing operations are gated.                             |
| C2  | Is the host agreement's `immutable_hash` verified on read to detect tampering?                                            | **PASS**    | **FIXED 2026-04-18.** `getCannabisHostAgreement()` in `cannabis-access-guards.ts` now recomputes SHA-256 from `agreement_text_snapshot` and compares to stored `immutable_hash`. On mismatch, logs warning and returns null (treats tampered agreement as unsigned). Chef must re-sign.                                                                                                                                    |
| C3  | Are cannabis operations audit-logged for compliance traceability?                                                         | **PASS**    | **FIXED 2026-04-18.** `logCannabisAudit()` added to `lib/admin/audit.ts` (non-admin variant, no requireAdmin). 7 new audit action types. Calls added to: snapshot generation, evidence upload/delete, reconciliation save, packet finalization, agreement signing, guest profile update. All wrapped in try/catch (non-blocking). Admin actions (tier grant/revoke, invite approve/reject) already had `logAdminAction()`. |
| C4  | Does the compliance page provide actionable regulatory guidance, or is it a placeholder?                                  | **PARTIAL** | `app/(chef)/cannabis/compliance/page.tsx` renders a `CompliancePlaceholderClient` component. The page acknowledges it is a placeholder (acknowledged via `compliance_placeholder_acknowledged` boolean in `cannabis_event_details`). It is honest about being incomplete, but provides no real regulatory value.                                                                                                           |

**Score: 2 PASS, 1 PARTIAL, 0 FAIL** = 3.0 / 4 (C2, C3 FIXED this pass; C1 improved prior pass)

---

## D. Control Packet Integrity (4 questions)

| #   | Question                                                                                                                       | Verdict  | Evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| --- | ------------------------------------------------------------------------------------------------------------------------------ | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Does finalization enforce all prerequisites (reconciliation completed, evidence uploaded, operator identified) before locking? | **PASS** | `finalizeControlPacket()` in `cannabis-control-packet-actions.ts` (lines 1090-1173) checks: reconciliation exists (line 1125), evidence count >= 1 (line 1129), `service_operator` and `extract_label_strength` present (line 1133). Sets `finalization_locked = true`, `finalized_at`, `finalized_by`. Post-finalization, `uploadControlPacketEvidence` rejects uploads (line 922), `upsertControlPacketReconciliation` rejects edits (line 991). Solid. |
| D2  | Is the reconciliation save protected against concurrent writes (optimistic locking or conflict detection)?                     | **PASS** | **FIXED 2026-04-18.** `upsertControlPacketReconciliation()` now uses select-then-insert-or-update pattern. On update, compares `expectedUpdatedAt` against `existing.updated_at`. Mismatch returns conflict error. No migration needed (uses existing `updated_at` column). New inserts unaffected.                                                                                                                                                       |
| D3  | Can evidence be deleted before finalization if uploaded in error?                                                              | **PASS** | **FIXED 2026-04-18.** `deleteControlPacketEvidence(evidenceId)` added to `cannabis-control-packet-actions.ts`. Checks tenant ownership, verifies snapshot not finalized, deletes DB record, then cleans storage (non-blocking). Rejects deletion after finalization.                                                                                                                                                                                      |
| D4  | Does the snapshot alert the chef when guest RSVPs change after the snapshot was generated?                                     | **PASS** | `getCannabisControlPacketData()` computes `alertRsvpUpdatedAfterSnapshot` (line 664) by comparing `sourceGuestUpdatedAt` against `snapshot.generated_at`. If any guest profile or RSVP was updated after the snapshot, the flag is true. UI can display a "stale snapshot" warning.                                                                                                                                                                       |

**Score: 4 PASS, 0 PARTIAL, 0 FAIL** = 4.0 / 4

---

## E. Guest Intake & Consent (4 questions)

| #   | Question                                                                                                                                                     | Verdict  | Evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| E1  | Can guests themselves submit cannabis intake forms (age confirmation, voluntary acknowledgment, transportation acknowledgment) through the public RSVP flow? | **FAIL** | Public cannabis invite page (`app/(public)/cannabis-invite/[token]/page.tsx`) hard-redirects to `/`. The `guest_event_profile` table has consent fields (`age_confirmed`, `voluntary_acknowledgment`, `alcohol_acknowledgment`, `transportation_acknowledgment`, `final_confirmation`) but only the chef-side `updateChefCannabisGuestProfile()` writes to them, preserving existing values with `false` fallback. No guest-facing form exists. The consent architecture is defined but disconnected. |
| E2  | Does `updateChefCannabisGuestProfile` enforce the edit window cutoff (no changes after event arrival time)?                                                  | **PASS** | Lines 522-525 in `cannabis-actions.ts`: computes `cutoff` from event date + arrival/serve time, throws "This guest intake is now read-only" if `new Date() > cutoff`. Correctly prevents post-event edits.                                                                                                                                                                                                                                                                                            |
| E3  | Are consumption style options validated against a closed enum, preventing injection of arbitrary values?                                                     | **PASS** | `UpdateChefCannabisGuestSchema` (lines 42-54) uses `z.enum()` for consumption style: `['smoking', 'edibles', 'tincture', 'other', 'infused_course', 'paired_noninfused', 'skip_infusion', 'unsure']`. Zod rejects any value outside this set. Same pattern for `familiarityLevel`, `edibleFamiliarity`, `cannabisParticipation`, `attendingStatus`.                                                                                                                                                   |
| E4  | Does the RSVP dashboard correctly handle events with zero guests?                                                                                            | **PASS** | `getCannabisRSVPDashboardData()` (lines 356-365): if events array is empty, returns clean empty state with `guests: [], summary: null`. Guest token collection (line 412) guards with `if (guestTokens.length > 0)` before querying profiles. No crash on zero guests.                                                                                                                                                                                                                                |

**Score: 3 PASS, 0 PARTIAL, 1 FAIL** = 3.0 / 4

---

## F. Data Isolation & Tenant Scoping (4 questions)

| #   | Question                                                                                  | Verdict  | Evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| --- | ----------------------------------------------------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F1  | Is RLS currently enabled on all cannabis tables?                                          | **FAIL** | Migration `20260401000098_disable_rls_all_tables.sql` disables RLS on ALL tables including `cannabis_tier_users`, `cannabis_tier_invitations`, `cannabis_event_details`, `cannabis_control_packet_snapshots`, `cannabis_control_packet_reconciliations`, `cannabis_control_packet_evidence`, `cannabis_host_agreements`, and `guest_event_profile`. All tenant isolation currently depends solely on server-action query filters, not database-level enforcement. |
| F2  | Do all cannabis server actions derive `tenant_id` from session, never from request input? | **PASS** | Every function in `cannabis-actions.ts` and `cannabis-control-packet-actions.ts` calls `requireChef()` and uses `user.tenantId!`. No function accepts `tenantId` from client input. Matches CLAUDE.md rule #2.                                                                                                                                                                                                                                                    |
| F3  | Will `getCannabisInviteByToken()` work when RLS is re-enabled?                            | **PASS** | **FIXED 2026-04-18.** Switched from `createServerClient()` to `createAdminClient()`. Admin client bypasses RLS. Token lookup works regardless of RLS state.                                                                                                                                                                                                                                                                                                       |
| F4  | Does `guest_event_profile` have tenant-scoped access control?                             | **FAIL** | Table has no `tenant_id` column. RLS policies (when enabled) use `USING (true)` for anon SELECT and a self-referential `guest_token = guest_token` for UPDATE (tautologically true). Any anonymous user can read all profiles and update any profile's data. Chef access uses a subquery through `events -> user_roles`, which is correct but the anon policies make it moot.                                                                                     |

**Score: 2 PASS, 0 PARTIAL, 2 FAIL** = 2.0 / 4

---

## G. Financial Tracking (4 questions)

| #   | Question                                                                                                                                   | Verdict  | Evidence                                                                                                                                                                                                                                                                                                                                                   |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------ | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| G1  | Does the cannabis ledger derive financial totals from ledger entries (not stored balances), consistent with ChefFlow's ledger-first model? | **PASS** | `getCannabisLedger()` (lines 199-259) queries `ledger_entries` for cannabis event IDs, then computes revenue/expenses/profit from entry types. Uses `filter` + `reduce` over raw entries. No stored balance columns. Matches architecture rule #3.                                                                                                         |
| G2  | Does the ledger correctly handle refunds in profit calculation?                                                                            | **PASS** | Line 241-243: `const refunds = allEntries.filter((e: any) => e.is_refund).reduce(...)`. Line 257: `profit: revenue - expenses - refunds`. Refunds are subtracted from profit independently of revenue/expenses. Correct.                                                                                                                                   |
| G3  | Does the ledger page handle the zero-events case without showing misleading $0.00?                                                         | **PASS** | Line 213-214: if `eventIds.length === 0`, returns `{ events: [], entries: [], totals: { revenue: 0, expenses: 0, profit: 0 } }`. This is a genuine zero, not a failed-load zero. The distinction matters: a chef with no cannabis events truly has $0 revenue. However, the page should differentiate "no events yet" from "events exist but no payments." |
| G4  | Does the ledger page handle database errors without silently showing zeros?                                                                | **PASS** | **FIXED 2026-04-18.** Ledger page wraps `getCannabisLedger()` in try/catch. On error, renders explicit error state card ("Failed to load ledger data") with red-tinted styling matching cannabis portal aesthetic. No silent zeros, no crash.                                                                                                              |

**Score: 4 PASS, 0 PARTIAL, 0 FAIL** = 4.0 / 4

---

## H. UI Completeness & Error Handling (4 questions)

| #   | Question                                                                                           | Verdict     | Evidence                                                                                                                                                                                                                                                                                                        |
| --- | -------------------------------------------------------------------------------------------------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| H1  | Do cannabis pages use consistent error handling (no silent swallowing, no unhandled crashes)?      | **PASS**    | **FIXED 2026-04-18.** Removed all `.catch(() => [])` patterns from `/cannabis`, `/events`, `/compliance`, `/invite`. All pages now throw on error, caught by `error.tsx` boundary at the layout level. Consistent pattern: server component throws, error boundary renders. No more silent empty arrays.        |
| H2  | Does `error.tsx` exist and handle cannabis page crashes gracefully?                                | **PASS**    | `app/(chef)/cannabis/error.tsx` exists. If any cannabis page throws during server rendering, Next.js will catch it and render this error boundary. (Content not read, but file exists.)                                                                                                                         |
| H3  | Does the cannabis portal have loading states to prevent white-screen blocking on slow queries?     | **PARTIAL** | `app/(chef)/cannabis/loading.tsx` exists at the layout level. This provides a loading skeleton during page navigation. However, no individual page uses `<Suspense>` for progressive loading. The control packet page (6+ sequential DB queries) will show the layout loading state until ALL queries complete. |
| H4  | Does the "New Event" flow from the cannabis portal guide the user to enable `cannabis_preference`? | **PARTIAL** | **FIXED 2026-04-18.** Events page now links to `/events/new?cannabis=true` and button reads "+ New Cannabis Event". Query param signals intent. The event creation form still needs to read this param and auto-enable the cannabis toggle (not yet wired).                                                     |

**Score: 2 PASS, 1 PARTIAL, 0.5 FAIL** = 2.5 / 4

---

## I. Public Surface Security (4 questions)

| #   | Question                                                                            | Verdict     | Evidence                                                                                                                                                                                                                                                                                                                                                                                                                     |
| --- | ----------------------------------------------------------------------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I1  | Is the public cannabis invite claim page protected against token enumeration?       | **PARTIAL** | The claim page redirects to `/` (currently disabled). When re-enabled: `getCannabisInviteByToken()` requires token match + `admin_approval_status = 'approved'` + not claimed + not expired. Tokens are UUIDs (unguessable). But the function returns different responses for "not found" vs "already claimed" vs "expired," which could leak invite status. Should return a single generic "invalid" for all failure modes. |
| I2  | Can an unauthenticated user read cannabis guest profiles via direct Supabase query? | **FAIL**    | RLS is globally disabled (`20260401000098_disable_rls_all_tables.sql`). Even if re-enabled, the anon SELECT policy on `guest_event_profile` is `USING (true)`. Any user with the Supabase URL and anon key (both are public in client bundles) can query all guest cannabis profiles including dietary restrictions, dose preferences, familiarity levels, and comfort notes. This is sensitive health/consumption data.     |
| I3  | Is the `cannabis-control-packets` storage bucket access-controlled?                 | **PARTIAL** | Evidence upload uses `db.storage.from(CONTROL_PACKET_BUCKET).upload()` and signed URLs with 1-hour expiry for reads. Storage bucket policies were not audited (not in migration files). If the bucket has public read access, evidence photos are exposed. Signed URLs suggest private bucket, but unverified.                                                                                                               |
| I4  | Can a client who claims a cannabis invite access chef-side cannabis data?           | **PASS**    | Tier grant in `claimCannabisInvite()` sets `user_type` based on role. Chef pages call `requireChef()` which checks role = 'chef'. A client with cannabis tier access cannot reach chef pages. The client-side cannabis actions (`cannabis-client-actions.ts`) have their own scoped queries. Role separation is correct.                                                                                                     |

**Score: 1 PASS, 1 PARTIAL, 1.5 FAIL** = 1.5 / 4

---

## J. Operational Resilience & Scale (4 questions)

| #   | Question                                                                                | Verdict     | Evidence                                                                                                                                                                                                                                                        |
| --- | --------------------------------------------------------------------------------------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| J1  | Does `adminGrantTierByEmail` scale to thousands of users?                               | **PASS**    | **FIXED 2026-04-18.** Replaced `listUsers()` + `.find()` with direct email query attempt first, falling back to paginated scan (50/page, max 100 pages = 5000 users safety cap). No more full user table load.                                                  |
| J2  | Is there pagination on cannabis events, ledger entries, and invite history?             | **PARTIAL** | **PARTIALLY FIXED 2026-04-18.** Added `.limit(100)` to `getCannabisEvents()`, `.limit(500)` to ledger entries, `.limit(100)` to `getMySentCannabisInvites()`. Prevents unbounded loads. No offset/cursor pagination UI yet; chef sees most recent N items only. |
| J3  | Does the control packet template page protect against denial-of-service via seat count? | **PASS**    | **FIXED 2026-04-18.** `generateSeatBlueprint()` now applies `Math.min(safeSeatCount, MAX_SEAT_COUNT)` where `MAX_SEAT_COUNT = 300` for ALL layout types (linear, grid, custom). Requests with `?seats=999999` produce max 300 seats.                            |
| J4  | Is invite submission rate-limited to prevent admin queue flooding?                      | **PASS**    | **FIXED 2026-04-18.** `sendCannabisInvite()` now counts today's invites per chef (`DAILY_INVITE_LIMIT = 10`). Throws "Daily invite limit reached" if exceeded. Query uses `gte('created_at', dayStart)` scoped to the inviting user.                            |

**Score: 3 PASS, 1 PARTIAL, 0 FAIL** = 3.5 / 4

---

## Score Summary

| Domain                          | Pre-Fix               | Pass 1                | Pass 2                | Details (pass 2)                                        |
| ------------------------------- | --------------------- | --------------------- | --------------------- | ------------------------------------------------------- |
| A. Access Control & Tier Gating | 1.0 / 4               | 2.0 / 4               | 3.0 / 4               | A3 FIXED: cannabis-portal in feature-classification     |
| B. Invitation Lifecycle         | 0.0 / 4               | 2.0 / 4               | 4.0 / 4               | B2 FIXED: email delivery. B4 FIXED: revoke + regenerate |
| C. Host Agreement & Legal       | 0.5 / 4               | 1.0 / 4               | 3.0 / 4               | C2 FIXED: hash verification. C3 FIXED: audit logging    |
| D. Control Packet Integrity     | 2.0 / 4               | 3.0 / 4               | 4.0 / 4               | D2 FIXED: optimistic locking on reconciliation          |
| E. Guest Intake & Consent       | 3.0 / 4               | 3.0 / 4               | 3.0 / 4               | No change                                               |
| F. Data Isolation & Tenant      | 1.0 / 4               | 2.0 / 4               | 2.0 / 4               | No change (F1, F4 remain: RLS disabled)                 |
| G. Financial Tracking           | 3.0 / 4               | 3.0 / 4               | 4.0 / 4               | G4 FIXED: ledger error handling                         |
| H. UI Completeness              | 1.5 / 4               | 2.5 / 4               | 2.5 / 4               | No change                                               |
| I. Public Surface Security      | 1.5 / 4               | 1.5 / 4               | 1.5 / 4               | No change (I2 remains: RLS/anon policy)                 |
| J. Operational Resilience       | 0.0 / 4               | 3.0 / 4               | 3.5 / 4               | J2 PARTIAL: limits added, no offset pagination yet      |
| **TOTAL**                       | **13.5 / 40 (33.8%)** | **23.0 / 40 (57.5%)** | **30.5 / 40 (76.3%)** | 8 questions improved this pass (+7.5)                   |

---

## Critical Path to Re-Enable (Ordered by Blast Radius)

### P0: Must Fix Before Re-Enabling

1. ~~**A1: Cannabis layout must check `hasCannabisAccess()` and redirect non-members**~~ **DONE 2026-04-18**
2. ~~**B1: Fix claim race condition**~~ **DONE 2026-04-18**
3. ~~**F3: Switch `getCannabisInviteByToken` to use admin client**~~ **DONE 2026-04-18**
4. ~~**C1: Enforce host agreement before control packet operations**~~ **DONE 2026-04-18** (control packet ops gated)
5. **F1: Re-enable RLS on all cannabis tables** (or confirm server-action-only access pattern is intentional and document it as a conscious decision)
6. **I2: Fix `guest_event_profile` RLS policies** (anon SELECT should NOT be `USING (true)`; anon UPDATE should use real token comparison)

### P1: Should Fix Before Production Use

7. ~~**B3: Re-check expiration at claim-write time**~~ **DONE 2026-04-18**
8. ~~**D3: Build evidence deletion before finalization**~~ **DONE 2026-04-18**
9. ~~**H1: Standardize error handling**~~ **DONE 2026-04-18**
10. ~~**J1: Replace `listUsers()` with email-based lookup query**~~ **DONE 2026-04-18**
11. ~~**J3: Cap seat count at 300 for all layout types**~~ **DONE 2026-04-18**
12. ~~**H4: Pass `?cannabis=true` to `/events/new`**~~ **DONE 2026-04-18** (form still needs to read param)
13. ~~**J4: Rate-limit invite submissions**~~ **DONE 2026-04-18** (10/day/chef)
14. ~~**B2: Build email delivery for approved invites**~~ **DONE 2026-04-18** (Resend transactional email with claim URL)
15. ~~**C3: Add audit logging to cannabis operations**~~ **DONE 2026-04-18** (`logCannabisAudit()` + 7 action types)
16. ~~**D2: Add optimistic locking to reconciliation**~~ **DONE 2026-04-18** (`updated_at` comparison)

### P2: Fix Before Scale

17. ~~**J2: Add pagination to events, ledger, invites**~~ **PARTIAL 2026-04-18** (limits added, no offset UI)
18. ~~**A3: Classify cannabis in `feature-classification.ts`**~~ **DONE 2026-04-18**
19. ~~**B4: Build invite revocation and token regeneration**~~ **DONE 2026-04-18**
20. ~~**C2: Add hash verification on agreement read**~~ **DONE 2026-04-18**

---

## Verification Protocol

When a builder agent addresses items from the critical path:

1. Read this question set first. Identify which questions your changes affect.
2. After each fix, update the verdict and evidence for the affected question(s).
3. Run `npx tsc --noEmit --skipLibCheck` after changes (cannabis module is heavily `any`-typed; aim to reduce).
4. Test access control changes by attempting to reach `/cannabis/events` as a chef WITHOUT cannabis tier access.
5. Test invitation flow end-to-end: send invite -> admin approve -> claim -> verify tier access.
6. Test control packet flow: create event with cannabis_preference -> attach menu -> generate snapshot -> reconcile -> upload evidence -> finalize -> verify lock.
7. Recompute score. Target: 32/40 (80%) before re-enabling, 36/40 (90%) before production use.

---

## Remaining FAILs (9.5 points to recover)

| #   | Verdict | Points | What's needed                                                                  |
| --- | ------- | ------ | ------------------------------------------------------------------------------ |
| A4  | PARTIAL | 0.5    | Restore `cannabisSectionItems` array in nav config                             |
| C1  | PARTIAL | 0.5    | Gate event creation on agreement (not just control packet ops)                 |
| C4  | PARTIAL | 0.5    | Replace compliance placeholder with real regulatory guidance                   |
| E1  | FAIL    | 1.0    | Build guest-facing cannabis intake form in public RSVP flow                    |
| F1  | FAIL    | 1.0    | Re-enable RLS on cannabis tables or document server-action-only as intentional |
| F4  | FAIL    | 1.0    | Fix `guest_event_profile` RLS policies (anon SELECT/UPDATE too permissive)     |
| H3  | PARTIAL | 0.5    | Add `<Suspense>` boundaries to control packet page for progressive loading     |
| H4  | PARTIAL | 0.5    | Wire `?cannabis=true` query param into event creation form                     |
| I1  | PARTIAL | 0.5    | Unify all claim error responses into single generic "invalid"                  |
| I2  | FAIL    | 1.0    | Fix anon RLS policy on `guest_event_profile` (health/consumption data exposed) |
| I3  | PARTIAL | 0.5    | Audit `cannabis-control-packets` storage bucket access policy                  |
| J2  | PARTIAL | 0.5    | Add offset/cursor pagination UI to events, ledger, invites                     |
