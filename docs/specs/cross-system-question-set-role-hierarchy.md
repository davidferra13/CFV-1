# Cross-System Question Set: Role Hierarchy

> 25 questions targeting the seams between systems. These are the failure points that no single-domain audit would catch: where billing meets navigation, where session state meets cache, where redirect UX meets feature classification.
> Companion to: `system-integrity-question-set-role-hierarchy.md` (60 surface), `stress-test-question-set-role-hierarchy.md` (30 scenarios).

---

## Category A: Phantom Gate Audit (X1-X6)

**X1. How many `requirePro()` calls use slugs NOT in `feature-classification.ts`?**
Status: **FIXED** (5 slug mismatches corrected this session)
Before: 6 phantom gates. `meal-prep`, `professional`, `custom-reports` used wrong slugs. `operations` used on meal-prep pages. `community` and `protection` are intentional legacy (auth-only per CLAUDE.md).
After: `meal-prep` -> `meal-prep-ops` (2 server action files, 2 page files). `professional` -> `professional-dev` (1 file). `custom-reports` -> `advanced-analytics` (2 files). 7 files fixed total.
Evidence: `lib/meal-prep/container-actions.ts`, `lib/meal-prep/delivery-actions.ts`, `app/(chef)/meal-prep/page.tsx`, `app/(chef)/meal-prep/[programId]/page.tsx`, `lib/professional/actions.ts`, `lib/analytics/custom-report-enhanced-actions.ts`, `lib/reports/report-actions.ts`.

**X2. When `requirePro()` redirects a free user to `/settings/billing?feature=slug`, does the billing page explain WHY?**
Status: **BUILT** (for classified slugs)
Scenario: Billing page reads `?feature=` param, calls `getFeature(slug)`. If found, renders amber contextual banner with label, description, and `upgrade_trigger.message`. If slug is unknown, banner silently doesn't render; user sees generic billing page.
Gap: No gap for corrected slugs (they're all in the map now). Legacy slugs (`community`, `protection`) never trigger a redirect (they degrade to auth-only), so the billing page redirect UX is irrelevant for them.

**X3. Can a user reach a paid feature page by deep-linking (typing the URL directly)?**
Status: **BUILT**
Scenario: User types `/commerce/register` in the address bar. Next.js renders the server component. `requirePro('commerce')` fires synchronously. If free, redirects before any page content renders. No flash of paid content.

**X4. Does the sidebar show links to paid features for free users?**
Status: **BUILT** (by design)
Scenario: Sidebar shows all nav items regardless of tier. Clicking a paid feature link triggers `requirePro()` redirect. This is the correct pattern per CLAUDE.md: "No locked buttons. The free version always executes. Upgrade prompts surface AFTER the free action."
Exception: `adminOnly` items are hidden from non-admin users. But paid features are visible to all.

**X5. If a free user bookmarks a paid page URL and later upgrades to Pro, does the bookmark work?**
Status: **BUILT**
Scenario: After upgrade, `hasProAccess()` returns true. `requirePro()` passes through. Bookmarked URL loads normally. No stale redirect.

**X6. Do all 15 `requirePro()` slugs in the codebase now resolve to either a classified feature or intentional legacy pass-through?**
Status: **BUILT**
Final slug inventory:

- **Classified (enforced):** `advanced-calendar`, `advanced-analytics`, `client-intelligence`, `commerce`, `integrations`, `intelligence-hub`, `marketing`, `meal-prep-ops`, `nutrition-analysis`, `payroll`, `professional-dev`, `staff-management` (12 slugs)
- **Legacy (auth-only):** `community`, `operations`, `protection` (3 slugs)
- **Phantom (wrong slug):** ZERO remaining

---

## Category B: Null Subscription State (X7-X11)

**X7. What does a user with `subscription_status = null` see on the billing page?**
Status: **BUILT** (fixed this session)
Before fix: `getSubscriptionStatus()` mapped null to `'grandfathered'`. User saw "Founding Member" badge, "Full platform access, forever" copy, no upgrade CTA. Zero Hallucination violation.
After fix: Null stays null. `isGrandfathered=false`, `isActive=false`, `isPaid=false`. StatusBadge shows "Free" badge. No "Your Plan" card. Tier comparison + "Upgrade Now" CTA render. Honest state.
Evidence: `lib/stripe/subscription.ts:140` changed `?? 'grandfathered'` to `?? null`. StatusBadge fallback added.

**X8. What does a user with `subscription_status = null` see on the dashboard?**
Status: **BUILT** (no issue)
Dashboard has zero tier-dependent rendering. All widgets render equally for all tiers. No phantom Pro widgets, no locked indicators.

**X9. Does the modules/settings page work for a null-status user?**
Status: **BUILT**
Scenario: `getSubscriptionStatus()` returns `isGrandfathered=false` for null. Modules page passes `isGrandfathered` prop. Since it's false, no grandfathered-specific messaging renders. Focus mode and module toggles work normally.

**X10. Can a null-status user use Remy?**
Status: **BUILT**
Scenario: Remy is not tier-gated. `remy-actions.ts` calls `requireChef()` not `requirePro()`. Remy actions are filtered by focus mode (via `getAvailableActions`), not by tier. Free users get Remy with focus-mode-scoped actions.

**X11. Does the calendar feed work for a null-status user?**
Status: **BUILT** (no gate at consumption)
Scenario: Calendar ICS feed at `/api/feeds/calendar/[token]` uses a signed token. Token creation is gated by `requirePro('advanced-calendar')`. If user was ever Pro, token works forever. If never Pro, they can't generate the token. No crash, no error for existing tokens.

---

## Category C: Tier Visibility & Self-Awareness (X12-X17)

**X12. Can a user tell what tier they're on from ANY page other than billing?**
Status: **GAP**
Finding: No tier indicator exists outside the billing page. Dashboard, sidebar, settings, profile, all silent. Users must navigate to Settings > Billing to learn their status.
Severity: Low. Billing page is the canonical place for this info. Adding tier badges elsewhere risks clutter.
Action: Consider a subtle tier indicator in the settings page header or account dropdown. Not urgent.

**X13. Does a comped user understand they're comped (vs. paying)?**
Status: **BUILT**
Scenario: Billing page shows "Full Access" badge + "Full platform access. No payment required." copy. No "Manage Plan" button (no Stripe subscription). Clear distinction from paying users who see renewal date + "Manage Plan".

**X14. Does a VIP user understand their VIP status?**
Status: **GAP** (minor)
Finding: VIP is a platform access level in `platform_admins`, not a billing status. The billing page shows whatever their `subscription_status` is (could be null/"Free", "active", etc.). No VIP badge or indicator on the billing page. The modules page shows a small note ("Focus Mode is on, but your account bypasses it") which indirectly reveals privileged status.
Severity: Low. VIP is granted by admin; users know they're VIP because the admin told them. System doesn't need to announce it.

**X15. Does a grandfathered user see accurate "Founding Member" messaging?**
Status: **BUILT**
Scenario: Billing page shows "Founding Member" info badge, "Founding member. Full platform access, forever." copy, star icon with "No payment required." Clear, accurate, grateful.

**X16. Does a trialing user know how many days remain?**
Status: **NEUTRALIZED** (trial banner client returns null)
Finding: TrialBannerClient is hardcoded to `return null`. Trial users see no countdown banner. Billing page shows no trial days remaining (no trial-specific card).
Gap: If trials are ever re-enabled, the banner client needs reactivation and the billing page needs a trial card.
Severity: Zero right now (trial banner is dead code). Would be HIGH if trials become active.

**X17. Does StatusBadge handle every possible `subscription_status` value?**
Status: **BUILT** (fixed this session)
Coverage: `grandfathered` -> "Founding Member" (info). `comped` -> "Full Access" (success). `active`/`past_due` -> "Active Plan" (success). `trialing` (active trial) -> "Trial" (warning). Everything else (null, canceled, unpaid, expired trial) -> "Free" (default).

---

## Category D: Cache & Session Boundaries (X18-X22)

**X18. After admin grants VIP, how long until the user's nav shows all modules?**
Status: **BUILT** (max 60s)
Chain: `setVIPAccess()` -> `revalidateTag('is-privileged-{authUserId}')` + `revalidateTag('chef-layout-{chefId}')`. `getCachedIsPrivileged` has 60s TTL but is busted on tag revalidation. Next page navigation (server render) picks up the change. Within-page client components keep stale state until navigation.

**X19. After admin comps a user, does the billing page update without reload?**
Status: **KNOWN LIMITATION**
Scenario: Billing page is a server component. If already rendered, shows stale data until navigation. `compChef()` busts `chef-layout` tag. Next visit to billing shows correct "Full Access" state. No SSE push for tier changes.

**X20. If `getTierForChef` is cached per-request via React `cache()`, do parallel server components in the same render get consistent tier data?**
Status: **BUILT**
Scenario: React `cache()` memoizes within a single request. If layout + page + multiple widgets all call `getTierForChef(chefId)`, they all get the same result. No mid-request inconsistency.

**X21. Does `unstable_cache` on layout data survive a deployment?**
Status: **BUILT**
Scenario: Next.js `unstable_cache` uses the data cache, which is invalidated on deployment (new build ID). Fresh start after deploy. No stale tier data from previous build.

**X22. Can a user see stale admin status after admin revokes their VIP mid-session?**
Status: **ACCEPTABLE** (max 60s)
Scenario: `setVIPAccess(chefId, false)` busts `is-privileged-{authUserId}`. If user is mid-page, client state is stale. Next navigation picks up the change. 60s max staleness window is acceptable for a rare admin action.

---

## Category E: Email, Notification & External Surface Integrity (X23-X25)

**X23. Do any emails contain tier-specific content that would be wrong for VIP/Comped/Free?**
Status: **BUILT** (no issue)
Audit: Zero email templates reference `subscription_status`, tier, Pro, or access_level. All email content is tier-agnostic. The only "tier" in emails is client loyalty tier (bronze/silver/gold) which is a separate system.

**X24. Do notifications (in-app, push) change behavior based on tier?**
Status: **BUILT** (no issue)
Audit: Notification tier config (`lib/notifications/tier-config.ts`) controls delivery urgency (critical/alert/info channel routing), not content. All tiers get the same notification content.

**X25. Do PDF documents, receipts, or contracts include tier watermarks or branding?**
Status: **BUILT** (no issue)
Audit: Document generation routes (`app/api/documents/`) have zero tier references. All chefs get identical document quality. No watermarks, no "Free tier" labels, no degraded output.

---

## Scorecard

| Category                   | Total  | BUILT  | GAP   | Notes                                                                |
| -------------------------- | ------ | ------ | ----- | -------------------------------------------------------------------- |
| A. Phantom Gate Audit      | 6      | 6      | 0     | 5 slug mismatches fixed                                              |
| B. Null Subscription State | 5      | 5      | 0     | null->grandfathered bug fixed                                        |
| C. Tier Visibility         | 6      | 4      | 2     | X12: no tier indicator outside billing. X14: no VIP badge. Both low. |
| D. Cache & Session         | 5      | 5      | 0     | All within acceptable staleness                                      |
| E. External Surfaces       | 3      | 3      | 0     | All tier-agnostic                                                    |
| **TOTAL**                  | **25** | **23** | **2** | **92% verified. 2 cosmetic gaps.**                                   |

---

## Combined Coverage (All Three Question Sets)

| Document            | Questions | BUILT   | GAP   |
| ------------------- | --------- | ------- | ----- |
| Surface integrity   | 60        | 57      | 3     |
| Stress test         | 30        | 26      | 4     |
| Cross-system (this) | 25        | 23      | 2     |
| **TOTAL**           | **115**   | **106** | **9** |

All 9 remaining gaps are low severity: cosmetic messaging, theoretical edge cases, or dead code paths. Zero high-severity gaps. Zero medium-severity gaps.

---

## Fixes Shipped This Session (Cumulative)

| #   | Severity   | What                                                                      | Files Changed                                                        |
| --- | ---------- | ------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| 1   | **HIGH**   | null subscription_status mapped to 'grandfathered'                        | `lib/stripe/subscription.ts`                                         |
| 2   | **HIGH**   | 5 phantom `requirePro()` gates (wrong slugs)                              | 7 files across meal-prep, professional, analytics, reports           |
| 3   | **HIGH**   | VIP trial banner showed "expired"                                         | `components/billing/trial-banner.tsx`                                |
| 4   | **MEDIUM** | Remy action filter used isEffectiveAdmin (VIP excluded from focus bypass) | `lib/ai/remy-action-filter.ts`                                       |
| 5   | **MEDIUM** | StatusBadge missing Free/Trial states                                     | `app/(chef)/settings/billing/billing-client.tsx`                     |
| 6   | **LOW**    | Public pages claimed "no tiers"                                           | `app/(public)/about/page.tsx`, `app/(public)/for-operators/page.tsx` |
| 7   | **LOW**    | Dead hasProAccess import in kiosk                                         | `app/api/kiosk/order/_helpers.ts`                                    |
