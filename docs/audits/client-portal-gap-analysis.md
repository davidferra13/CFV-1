# Client Portal Gap Analysis

> Audit Date: 2026-05-10
> Status: Assessment complete, prioritized

## Summary

- **Good:** lib layer clean, every page has proper client-scoped actions, token portal is strict subset of auth portal, no true orphan routes
- **Bad:** Massive blind spots in service lifecycle visibility, several domains missing for client trust/engagement

---

## MISSING DOMAINS (should exist, don't)

| #   | Domain                    | Why It Matters                                                                                                                | Chef-Side Exists?                               |
| --- | ------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| 1   | My Calendar               | Clients with multiple bookings need date overview. Currently zero calendar visibility.                                        | Chef has /calendar with day/week/year views     |
| 2   | Service Day Live          | Stage 8 is a complete blind spot. No course updates, no ETA, no live status. Client sits in the dark during their own dinner. | Chef has KDS, execution tracking, service pages |
| 3   | My Reviews                | Client can submit a review from event detail, but has no page to see all their past reviews or edit them.                     | Chef has /reviews                               |
| 4   | Help / FAQ                | No help center, no FAQ, no support contact page.                                                                              | Chef has /help                                  |
| 5   | Chef Availability         | Client wants to book but can't see open dates. Forces back-and-forth messaging.                                               | Chef has /availability                          |
| 6   | Referral Dashboard        | Hub has share-chef but no tracking. "Did my referral book? Did I earn anything?"                                              | Chef tracks referrals in analytics              |
| 7   | My Recipes / Menu Archive | After a dinner, clients often want recipes or menu details. Currently vanish after event closes.                              | Chef has full /recipes, /menus                  |
| 8   | Dietary Profile Hub       | Scattered across profile, household, pre-event checklist. No unified "here's everything my chef knows about what I eat."      | Chef sees it consolidated in client CRM         |
| 9   | Gift Cards / Vouchers     | Buying gift cards for friends. Huge private chef use case. No client purchase flow.                                           | Chef manages in commerce                        |

---

## GAPS WITHIN EXISTING DOMAINS

| Domain      | Gap                              | What To Build                                                                                              |
| ----------- | -------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| My Events   | No prep visibility               | "Your chef is shopping" / "Prep started" status indicators. Not full ops, just 3-4 milestone markers.      |
| My Events   | No post-event recipe sharing     | Chef marks recipes as "shareable," client sees them on event summary.                                      |
| My Events   | No dietary confirmation reminder | Pre-event checklist exists but no push/reminder. Client forgets to confirm guest allergies.                |
| My Events   | No guest management              | Client can't add/remove guests with names + dietary needs for upcoming event. Chef has full guest cards.   |
| My Hub      | No meal board                    | lib/hub/meal-board-actions.ts exists but no page renders it. Group meal planning is ghost feature.         |
| My Hub      | No event co-hosting              | Farm dinner co-host vision in specs. Hub has groups but no shared event planning.                          |
| My Quotes   | No comparison view               | Client with multiple quotes can't compare side-by-side.                                                    |
| My Spending | No receipt downloads             | Aggregate spending view but no downloadable receipt/statement PDFs.                                        |
| My Spending | No tax summary                   | Year-end spending summary for clients who expense meals (corporate clients).                               |
| My Profile  | No communication preferences     | Client can't set "text me, don't email" or notification frequency.                                         |
| My Profile  | No client tier visibility        | Chef classifies clients (VIP, regular, etc.) but client has no idea. Surface it as "loyalty status."       |
| My Rewards  | No redemption history            | Can earn rewards but no page showing what was redeemed and when.                                           |
| My Chat     | No file/photo sharing            | Text-only chat. Client can't send kitchen photos, dietary labels, venue details.                           |
| Onboarding  | One-shot only                    | No way to re-visit or update onboarding answers after initial flow.                                        |
| My Bookings | No rebooking shortcut            | "Book this again" exists on event summary but not on bookings list. Should be one-tap from any past event. |

---

## SERVICE LIFECYCLE COVERAGE

| Stage | Name          | Coverage | Notes                                   |
| ----- | ------------- | -------- | --------------------------------------- |
| 1     | Inquiry       | COVERED  |                                         |
| 2     | Discovery     | PARTIAL  | No "what chef still needs" view         |
| 3     | Quote         | COVERED  |                                         |
| 4     | Agreement     | COVERED  |                                         |
| 5     | Menu Planning | COVERED  |                                         |
| 6     | Pre-Service   | PARTIAL  | Checklist only, no logistics visibility |
| 7     | Payment       | COVERED  |                                         |
| 8     | Service Day   | MISSING  | Complete blind spot                     |
| 9     | Post-Service  | MOSTLY   | No recipe share, no leftovers           |
| 10    | Retention     | PARTIAL  | No tier viz, no referral tracking       |

---

## PRIORITY TIERS

### Tier 1 - Trust Builders (clients feel informed, not in the dark)

1. **Service Day Live** - even just 4 status milestones, no KDS mirror
2. **Prep Status Indicators** on events (shopping, prepping, en route, arrived)
3. **Guest Management** - add guests + dietary needs per event

### Tier 2 - Engagement Drivers (clients come back, refer friends)

4. **Menu/Recipe Archive** - post-dinner recipe access
5. **Referral Dashboard** - track referrals + earnings
6. **Client Tier / Loyalty Status** visibility
7. **My Calendar** - date overview across bookings

### Tier 3 - Completeness (professional polish)

8. Help/FAQ page
9. Communication Preferences
10. Gift Card purchasing
11. Tax/receipt downloads
12. Chef Availability viewer
13. Dietary Profile Hub (consolidate scattered dietary data)
14. Hub Meal Board (wire up existing ghost actions)
