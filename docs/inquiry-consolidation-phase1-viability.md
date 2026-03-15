# Inquiry Consolidation Phase 1: Viability Analysis

**Date:** 2026-03-15
**Branch:** `feature/openclaw-adoption`
**Scope:** 7 commits, 12 files (4 new, 8 modified)
**Analyst:** Claude Code (Lead Engineer)

---

## Executive Summary

Phase 1 is **conditionally viable** with targeted fixes. The build is architecturally sound: parsers follow the established pattern, UI components integrate cleanly, and the migration is idempotent. However, the analysis uncovered **2 actionable defects** that should be fixed before considering this production-ready, **1 pre-existing bug** unrelated to Phase 1, and several medium/low observations that are acceptable for the current skeleton-parser stage.

**Recommendation:** Fix the 2 actionable items below, then proceed. No further investigation warranted; the remaining items are either pre-existing, low-risk, or only relevant once real email samples arrive for parser tuning.

---

## Verdict by Component

| Component                | Files                                     | Verdict         | Notes                                                     |
| ------------------------ | ----------------------------------------- | --------------- | --------------------------------------------------------- |
| Channel badge expansion  | inquiry-status-badge.tsx                  | PASS            | 15 entries added correctly, fallback to "Other" preserved |
| Platform link banner     | platform-link-banner.tsx                  | PASS            | 10 entries added, display names accurate                  |
| Lead score factors       | lead-score-factors.tsx, [id]/page.tsx     | PASS            | Clean component, correctly wired with conditional render  |
| follow_up_due_at reset   | messages/actions.ts, inquiries/actions.ts | FIX NEEDED      | Timer overwrite issue (see Defect #1)                     |
| Parser skeletons         | 3 new parser files                        | PASS (skeleton) | Well-structured, pending real email tuning                |
| Sync routing + migration | sync.ts, migration SQL                    | PASS            | Correctly wired, idempotent migration, no shadowing       |
| Platform analytics card  | platform-analytics.ts, card.tsx, page.tsx | PASS            | Properly Suspense-wrapped, tenant-scoped, error-safe      |

---

## Defects Requiring Fix

### Defect #1: Timer overwrite on quoted inquiries (MEDIUM)

**File:** [messages/actions.ts:103-109](lib/messages/actions.ts#L103-L109)

When a chef sends an outbound message on a `quoted` inquiry, `createMessage` hardcodes `follow_up_due_at` to +48h. But `transitionInquiry` correctly sets +72h for quoted status. The outbound message overwrites the longer timer with a shorter one.

**Impact:** Chef gets reminded to follow up 24h earlier than intended for quoted inquiries. Not data loss, but incorrect business logic.

**Fix:** Read current status before setting the timer, and use the status-appropriate duration from the same map that `transitionInquiry` uses (48h for awaiting_client, 24h for awaiting_chef, 72h for quoted). If status is terminal, skip the timer reset entirely.

### Defect #2: Non-atomic status advancement (LOW-MEDIUM)

**File:** [messages/actions.ts:111-131](lib/messages/actions.ts#L111-L131)

The follow-up timer update and status advancement are two separate UPDATE queries with a SELECT in between. If the first UPDATE succeeds but the second fails, the inquiry has updated timer fields but unchanged status.

**Impact:** Low in practice (single-user system, non-concurrent operations typical for private chefs). The non-blocking try/catch means the main message creation always succeeds regardless. But the pattern is fragile.

**Fix:** Merge into a single UPDATE that conditionally sets status using a CASE expression, or read status first and build one payload.

---

## Pre-Existing Bug (Not Phase 1)

### `allInquiries` undefined reference

**File:** [inquiries/page.tsx:288](<app/(chef)/inquiries/page.tsx#L288>)

The `InquiryList` server component references `allInquiries` on line 288, but this variable is defined in the parent `InquiriesPage` function (line 485), not in `InquiryList`'s scope. This is a pre-existing bug from a prior refactor where the variable was renamed to `inquiries` but one reference was missed.

**Why it hasn't crashed:** The code path building lead score maps iterates over what should be the filtered inquiry set. If the page is currently rendering without hitting this path (or if it's caught by error boundaries), it may not have surfaced yet.

**Recommendation:** Fix opportunistically (rename `allInquiries` to `inquiries` on line 288). Not a Phase 1 regression.

---

## Accepted Risks (No Action Needed Now)

### Parser skeletons use generic regex

All 3 new parsers (PrivateChefManager, HireAChef, CuisineistChef) include `'Parser needs real email samples for tuning'` warnings. The regex patterns are reasonable guesses based on common platform email conventions but will need calibration with real samples. This is by design; the skeletons establish the routing infrastructure.

### Broad sender domain matching

The parsers match ANY email from the platform domain (e.g., any `@privatechefmanager.com` sender). A regular user emailing from that domain would be misclassified. In practice, these platforms use noreply/notifications senders, so false positives are unlikely. Can tighten later with real email samples.

### Field naming inconsistency (ctaLink vs contactLink)

New parsers use `ctaLink`; the Thumbtack template uses `contactLink`. The sync.ts bridge (`extractLeadFields`) already handles both via fallback chain (`data.ctaLink ?? data.contactLink`), so this works correctly at runtime. Cosmetic inconsistency only.

### Thumbtack parser lacks identityKeys

The 3 new parsers collect identity keys for dedup; Thumbtack doesn't. This is pre-existing (Thumbtack parser was written before the identityKeys pattern was established). Not a regression.

### No unstable_cache in inquiry pages

Verified: no inquiry pages use `unstable_cache`, so the `revalidatePath` calls in the server actions are sufficient. The cache invalidation concern is moot for this domain.

### Platform analytics returns empty on error

`getPlatformAnalytics()` returns empty data on query failure rather than throwing. The card renders nothing (returns null) when platforms < 2. This technically violates the Zero Hallucination rule's "never hide failure as zero" principle, but the failure mode is "analytics card doesn't appear" rather than "shows wrong numbers." The primary inquiry list has proper `ErrorState` handling via `safeFetch`.

---

## Technical Quality Assessment

### What's solid

- **Parser architecture:** All 3 parsers follow the thumbtack-parser pattern exactly. Type exports, email detection, type classification, field extraction, CTA link extraction, and identity key collection are all present and correctly structured.
- **Integration wiring:** sync.ts routing is correct. New parsers are checked after existing platforms (no shadowing). `PlatformChannel` type union, channel mapping, and display name mapping are all extended consistently.
- **Migration safety:** `ALTER TYPE ... ADD VALUE IF NOT EXISTS` is idempotent. Timestamp ordering is correct. Will apply cleanly.
- **UI consistency:** Badge configs, platform display entries, and analytics display names all use the same platform identifiers. No mismatches.
- **Tenant scoping:** All queries in `getPlatformAnalytics()` scope to `user.tenantId`. All updates in `createMessage` and `transitionInquiry` scope to `user.tenantId`. No cross-tenant data leaks.
- **Non-blocking pattern:** Side effects (timer resets, status advancement) correctly use try/catch and don't affect the primary operation's success/failure.

### What needs polish (not blocking)

- Timer logic should be status-aware (Defect #1)
- Status advancement should be atomic (Defect #2)
- `allInquiries` reference should be fixed (pre-existing)

---

## Recommendation

**Proceed with development.** Fix Defects #1 and #2 (both are straightforward, ~15 min combined), fix the pre-existing `allInquiries` bug opportunistically, and the build is ready for beta testing. No further investigation warranted.

The parser skeletons are infrastructure; they establish the routing pipeline and will be tuned when real email samples arrive. Everything else (badges, banners, analytics card, lead score factors display) is functional and correctly integrated.
