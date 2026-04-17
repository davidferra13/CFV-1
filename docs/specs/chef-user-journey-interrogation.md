# Chef User Journey Interrogation

> 60 high-leverage questions that expose every failure point in the chef user journey.
> Each question targets real code, real flows, real gaps.
> Organized by lifecycle phase. Each question must be answerable with evidence from the running app.
>
> **Scored: 2026-04-17** | **51 PASS, 8 PARTIAL, 1 FAIL**

---

## Phase 0: Discovery and Signup (Before They're a User)

**Q1. Landing page to signup form:** What does a prospective chef see at `cheflowhq.com` that tells them what ChefFlow does? Is the value proposition clear in under 5 seconds? Does the CTA lead directly to `/auth/signup`?

**Q2. Signup form fields:** `signUpChef()` in `lib/auth/actions.ts:156` requires email + password. `business_name` and `phone` are optional. Does the signup UI collect enough to personalize the first session, or does the chef land in a generic void?

**Q3. Signup atomicity:** If Stripe customer creation fails (line 253), the chef record still exists but has no subscription. What state is the chef in? Can they use the app? Does any UI surface "your account setup is incomplete"?

**Q4. Google OAuth signup:** A chef clicks "Sign in with Google" but has no existing account. Does the OAuth callback create a chef record + role + preferences atomically? Or does it only create an `auth.users` record, leaving the chef in limbo with no `chefs` row?

**Q5. Duplicate email handling:** `signUpChef()` throws a generic error for existing emails (line 170). Good for security. But does the signin page offer a "Forgot password?" flow? If a chef can't remember whether they signed up, can they recover without contacting support?

---

## Phase 1: First Login and Orientation (The Empty App)

**Q6. Post-login landing:** After signup, the chef hits `requireChef()` in `app/(chef)/layout.tsx:76`. Where do they redirect? Dashboard? Onboarding wizard? What's the default state of `onboarding_completed_at` for a new chef?

**Q7. Dashboard with zero data:** `app/(chef)/dashboard/page.tsx` renders HeroMetrics, ScheduleCards, AlertCards, BusinessCards, IntelligenceCards, SmartSuggestions, MetricsStrip, WeeklyBriefingCard, etc. With zero events, zero clients, zero revenue: does each widget show an empty state, show $0 (hallucination), or crash?

**Q8. Onboarding wizard completeness:** `WIZARD_STEPS` has 6 steps (profile, portfolio, first_menu, pricing, connect_gmail, first_booking). Can a chef skip ALL steps and still use the app? What's the minimum viable path to a functional account?

**Q9. Skip All behavior:** `handleSkipAll()` in `onboarding-wizard.tsx:64` calls both `dismissOnboardingBanner()` and `completeOnboardingWizard()` then navigates to `/dashboard`. If both fail (DB down), it still navigates. Is this fail-open behavior intentional? Can a chef get trapped?

**Q10. Onboarding banner persistence:** If a chef dismisses the onboarding banner, then logs out and back in, does the banner stay dismissed? The check uses `onboarding_banner_dismissed_at` on the chefs table. Is this column populated on dismiss?

**Q11. Empty sidebar navigation:** The sidebar shows all nav sections regardless of data. A new chef sees Events, Clients, Calendar, Culinary, etc. All clicking through to empty pages. Does this feel like "a tool ready for me" or "a ghost town I don't understand"?

---

## Phase 2: Profile and Identity Setup

**Q12. Profile minimum viability:** What is the absolute minimum a chef needs in their profile to be functional? Business name defaults to email prefix at signup. Is that enough for: sending quotes? Appearing in embed widget? Having clients see their portal?

**Q13. Profile completeness indicator:** Does any surface tell the chef "your profile is 30% complete" outside the onboarding wizard? If they skip onboarding, is there any nudge to complete their profile later?

**Q14. Public profile exposure:** `app/(chef)/settings/public-profile/page.tsx` exists. If a chef enables `isPublic` with zero portfolio items, zero bio, and email-prefix business name, what does the public profile look like? Is it embarrassing?

**Q15. Service type selection:** `app/(chef)/settings/my-services/page.tsx` lets chefs define what they offer. If a chef never visits this page, what service types are assumed? Does quoting, inquiry processing, or client-facing content break without service types set?

---

## Phase 3: First Client Acquisition

**Q16. Client creation without an inquiry:** Can a chef manually add a client at `/clients` without receiving an inquiry first? What fields are required? Can they add a client with just a name and phone number (how most chefs actually know their clients)?

**Q17. Embed widget setup:** `app/(chef)/settings/embed/page.tsx` configures the public inquiry form. What does a chef need to set up before the embed widget works? Does the widget function with a bare-minimum profile?

**Q18. Inquiry receipt and response:** A potential client submits an inquiry via the embed widget. What notification does the chef receive? Email? In-app? Push? If the chef doesn't check the app for 48 hours, is the lead cold with no follow-up?

**Q19. Inquiry to event conversion:** When a chef wants to convert an inquiry into an event, what's the flow? How many clicks/steps? Does the inquiry data (date, guest count, dietary needs) pre-populate the event form?

**Q20. Client portal from day one:** When a chef adds their first client, does the client automatically get portal access? Or does the chef need to explicitly invite them? What does the client see on first login?

---

## Phase 4: First Menu and Recipe Entry

**Q21. Menu creation without recipes:** Can a chef create a menu at `/culinary/menus` without having any recipes in the system? Can they type dish names directly into a menu, or must recipes exist first?

**Q22. Recipe entry friction:** A chef has 200 recipes in their head. The recipe form: how many fields are required vs optional? Can they batch-enter "Grilled Salmon, Pan-Seared Duck, Risotto" in rapid fire, or does each recipe require a full form submission?

**Q23. Recipe from text/photo:** Does any AI-assisted recipe entry exist? Can a chef paste a block of text (or photograph a handwritten recipe) and have it parsed into structured data? `lib/ai/parse-recipe.ts` exists. Is it wired to the UI?

**Q24. Menu without pricing:** A chef creates a menu with 5 dishes. None have ingredient costs entered. What does the menu cost display show? $0? "Not priced"? A broken layout?

**Q25. Ingredient catalog for new users:** `lib/pricing/resolve-price.ts` has a 10-tier fallback chain. For a brand new chef with zero manual prices and zero OpenClaw data in their region, how many tiers actually resolve? What does the chef see? "No price data available" or a misleading $0?

---

## Phase 5: First Event and Quote

**Q26. Event creation prerequisites:** To create an event at `/events/new`, does the chef need: a client? A menu? A price? Or can they create a bare event with just a date, location, and guest count?

**Q27. Quote generation with missing data:** A chef creates an event and wants to send a quote. What happens if: no menu attached? No pricing set? No services defined? Does the quote form gracefully handle missing data, or does it render a $0 quote?

**Q28. Quote delivery to client:** How does a quote reach the client? Email? Client portal? PDF? What if the chef hasn't set up email (no SMTP, no Gmail connection)? Can they still generate a shareable quote link?

**Q29. Event state machine for novices:** The FSM has 8 states (draft -> proposed -> accepted -> paid -> confirmed -> in_progress -> completed | cancelled). Does a new chef understand what "proposed" means? Is there UI guidance explaining the lifecycle?

**Q30. Payment collection:** A client accepts a quote. How does the chef collect payment? Stripe Connect must be set up. If it isn't, what does the chef see? A dead "Collect Payment" button? An error? A prompt to set up Stripe?

---

## Phase 6: Execution and Operations

**Q31. Calendar with first event:** Chef creates their first event for next Saturday. Does the calendar view (`/calendar`) render correctly with a single event? Do day/week/year views all handle the sparse-data case?

**Q32. Shopping list generation:** Chef has an event with a menu. Can they generate a shopping list? What if ingredient quantities aren't specified in recipes? Does the shopping list show items without amounts?

**Q33. Call sheet generation:** `/culinary/call-sheet` exists. For a chef's first event, what does the call sheet contain? Is it useful or empty scaffolding?

**Q34. Day-of execution:** On event day, the chef opens the app. What does the dashboard show? Is there a "today's event" hero card? Can they see the timeline, menu, client dietary notes, and shopping list from one place?

**Q35. Event completion:** After the event, how does the chef mark it complete? What's the path from `in_progress` to `completed`? Does the app prompt for post-event actions (send thank you, request review, generate AAR)?

---

## Phase 7: Financial Reality

**Q36. Revenue visibility from zero:** A chef completes their first event and receives $2,000. Where do they see their total revenue? Dashboard hero metrics? A dedicated financial page? Does the number update immediately or require a page refresh?

**Q37. Expense tracking:** Can a chef log expenses (groceries, supplies, travel) against an event? Where? Is food cost percentage calculated automatically?

**Q38. Profit calculation honesty:** If a chef has revenue but zero logged expenses, does the app show 100% profit margin? That's technically true but misleading. Does it distinguish "no expenses logged" from "no expenses incurred"?

**Q39. Financial reports for tax prep:** A chef needs to file taxes. Can they export revenue/expense data by date range? CSV? PDF? Or is this a "coming soon" feature?

**Q40. Multiple payment methods:** Client pays $1,000 deposit via Stripe and $1,000 cash on event day. Can the system track split payments? Does the ledger handle mixed payment types?

---

## Phase 8: Growth and Repeat Business

**Q41. Rebooking a past client:** A client from 3 months ago wants to book again. What's the fastest path? Can the chef find the client, see past event history, and create a new event pre-populated with their preferences?

**Q42. Client dietary memory:** The system stores dietary restrictions. When a repeat client books, do their allergies/restrictions auto-populate on the new event? Or does the chef re-enter them every time?

**Q43. Recurring service setup:** A client wants weekly meal prep. Can the chef set up a recurring event/schedule? Or must they create 52 individual events?

**Q44. Client communication history:** Can the chef see all past messages, emails, and interactions with a specific client in one place? Or is communication scattered across email, the messaging tab, and event notes?

**Q45. Referral tracking:** Client A refers Client B. Can the chef track this relationship? Does it affect loyalty scoring? Is there any attribution from inquiry source to referral?

---

## Phase 9: Scale and Multi-Event Management

**Q46. Concurrent event management:** A chef has 5 events this week. Can they see all of them at a glance with their status, preparation progress, and outstanding tasks? Where?

**Q47. Staff assignment:** Chef hires a sous chef for a large event. `/staff` page exists. Can they assign staff to specific events? What's the staff member's experience (do they get their own login)?

**Q48. Equipment tracking:** `app/(chef)/settings` has equipment inventory. Is this connected to events? Can a chef see "I need my 20-quart stock pot for Saturday's event" or is it just an inventory list?

**Q49. Multi-menu events:** A wedding with cocktail hour, dinner, and late-night snacks. Can a chef attach multiple menus to one event? How does costing work across menus?

**Q50. Seasonal pricing awareness:** A chef quotes a December event with lobster. Lobster prices spike in December. Does the pricing engine account for seasonality, or does it quote April prices for December events?

---

## Phase 10: System Resilience and Edge Cases

**Q51. Offline behavior:** Chef is at a farmer's market with spotty reception. What happens when they try to use the app? PWA is disabled by default. Does the app degrade gracefully or show a white screen?

**Q52. Mobile experience:** Chef opens the app on their phone (most common use case). Is the full app responsive? Are critical flows (check today's schedule, view client details, mark event in progress) usable on a 375px screen?

**Q53. Data recovery:** Chef accidentally deletes a client. Is there an undo? Soft delete? Or is the data gone permanently?

**Q54. Session timeout:** Chef is mid-quote-creation and their session expires. What happens? Is their draft saved? Do they lose 20 minutes of work?

**Q55. Concurrent access:** Chef and their business partner both log in to the same account. SSE realtime is in place. Do they see each other's changes in real time? Or does one overwrite the other?

---

## Phase 11: The Veteran Migration Problem

**Q56. Bulk client import:** A 10-year veteran has 300 clients in a spreadsheet. Is there a CSV import? Bulk add? Or must they enter 300 clients one by one?

**Q57. Historical event backfill:** Veteran wants to see their business trajectory. Can they enter past events with dates, revenue, and client info? Does the financial dashboard properly handle historical data?

**Q58. Recipe library migration:** Chef has 200 recipes in various formats (Google Docs, photos, handwritten notes). Beyond `parse-recipe.ts`, is there a bulk import flow? Can they upload a folder of recipe files?

**Q59. Existing client relationships:** Veteran's clients already have dietary preferences, event history, and communication patterns. Where does this institutional knowledge go? Is there a client notes field? A relationship timeline?

**Q60. Business analytics from day one:** A veteran joining ChefFlow wants to see their business health immediately, not after 6 months of data collection. Can the system provide value from imported historical data, or does everything require fresh events?

---

## Scoring Rubric

Each question gets one of three verdicts:

| Verdict     | Meaning                                                                                |
| ----------- | -------------------------------------------------------------------------------------- |
| **PASS**    | The system handles this correctly. Evidence: screenshot, code path, or live test.      |
| **PARTIAL** | Something exists but is incomplete, misleading, or requires workaround.                |
| **FAIL**    | The system breaks, shows wrong data, dead-ends the user, or the feature doesn't exist. |

**Grading:**

- 50+ PASS = production-ready user journey
- 35-49 PASS = usable but rough edges will lose users
- 20-34 PASS = significant gaps will prevent adoption
- <20 PASS = the user journey has critical holes

---

## How to Use This Document

1. **Test each question** against the live app using the agent test account
2. **Record the verdict** with evidence (screenshot path or code citation)
3. **FAIL items** become the build queue, prioritized by user impact
4. **PARTIAL items** get a follow-up spec if the fix is non-trivial
5. **Re-test quarterly** or after major feature work

This is not a feature wishlist. Every question maps to something a real chef would actually do. A FAIL means a real user hits a wall.

---

## Full Scorecard (2026-04-15)

### Phase 0: Discovery and Signup

| Q#  | Question               | Verdict  | Evidence                                                                                                       |
| --- | ---------------------- | -------- | -------------------------------------------------------------------------------------------------------------- |
| Q1  | Landing page to signup | **PASS** | `app/(public)/page.tsx` - full landing with SEO, featured chefs, CTA to `/auth/signup`                         |
| Q2  | Signup form fields     | **PASS** | `app/auth/signup/page.tsx` - collects email, password, business_name, phone. Business name collected at signup |
| Q3  | Signup atomicity       | **PASS** | `lib/auth/actions.ts:252-258` - Stripe is non-blocking try/catch. Auth+chef+roles+prefs are atomic             |
| Q4  | Google OAuth signup    | **PASS** | `auth-config.ts:165` - `newUser: '/auth/role-selection'` creates full chain via `assignRole()`                 |
| Q5  | Password recovery      | **PASS** | `app/auth/forgot-password/page.tsx` + `app/auth/reset-password/page.tsx` - full flow                           |

### Phase 1: First Login and Orientation

| Q#  | Question                 | Verdict     | Evidence                                                                                                                  |
| --- | ------------------------ | ----------- | ------------------------------------------------------------------------------------------------------------------------- |
| Q6  | Post-login landing       | **PASS**    | Auth config redirects to `/dashboard`. Onboarding banner is dismissible, not a gate                                       |
| Q7  | Dashboard with zero data | **PASS**    | `HeroMetricsClient` shows welcome card with CTAs when all metrics zero. Schedule has friendly empty state. Biz cards hide |
| Q8  | Onboarding wizard        | **PASS**    | 6 steps, all skippable. `handleSkipAll()` sends to dashboard                                                              |
| Q9  | Skip All behavior        | **PASS**    | `onboarding-wizard.tsx:64-89` - fail-open design, catches errors, always navigates                                        |
| Q10 | Banner persistence       | **PASS**    | `onboarding_banner_dismissed_at` on chefs table, checked on load                                                          |
| Q11 | Empty sidebar            | **PARTIAL** | All nav sections show regardless of data. Only `adminOnly` items filtered. No progressive disclosure                      |

### Phase 2: Profile and Identity Setup

| Q#  | Question                       | Verdict     | Evidence                                                                                  |
| --- | ------------------------------ | ----------- | ----------------------------------------------------------------------------------------- |
| Q12 | Profile minimum viability      | **PASS**    | Email-prefix business name is ugly but functional everywhere                              |
| Q13 | Profile completeness indicator | **PARTIAL** | Exists in onboarding banner/hub only. Once dismissed, no other surface shows completeness |
| Q14 | Public profile exposure        | **PASS**    | Quality gate: bare profiles (no bio/tagline or email-prefix name) show "Coming Soon" page |
| Q15 | Service type selection         | **PASS**    | Optional. No feature breaks without service types                                         |

### Phase 3: First Client Acquisition

| Q#  | Question                        | Verdict     | Evidence                                                                                                                                  |
| --- | ------------------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Q16 | Client creation without inquiry | **PASS**    | `/clients/new` requires only `full_name`. Email and phone optional                                                                        |
| Q17 | Embed widget setup              | **PASS**    | Works immediately with just `chefId`. No profile fields needed                                                                            |
| Q18 | Inquiry notifications           | **PASS**    | `sendNewInquiryChefEmail` called at embed route line 398. Chef emailed on every embed inquiry. In-app notification via automations engine |
| Q19 | Inquiry to event conversion     | **PASS**    | `InquiryTransitions` has "Convert to Event" button. Pre-populates date, guests, occasion, dietary, pricing                                |
| Q20 | Client portal access            | **PARTIAL** | Client creation and portal invitation are separate steps. Not automatic                                                                   |

### Phase 4: First Menu and Recipe Entry

| Q#  | Question                      | Verdict     | Evidence                                                                                   |
| --- | ----------------------------- | ----------- | ------------------------------------------------------------------------------------------ |
| Q21 | Menu creation without recipes | **PASS**    | Dishes entered as free-text names. No recipe linking required at creation                  |
| Q22 | Recipe entry friction         | **PASS**    | Only recipe name required. Category defaults to 'other'. Fast sequential entry             |
| Q23 | Recipe from text/photo (AI)   | **PASS**    | `parseRecipeFromText` wired to UI in recipe creation form. Photo import components exist   |
| Q24 | Menu without pricing          | **PASS**    | Shows "N/A" for null prices, ">=" prefix for partial data. Honest, not misleading          |
| Q25 | Ingredient catalog cold start | **PARTIAL** | Tiers 1-5, 7, 8 are tenant-scoped (useless for new chef). Only tiers 6 and 9 might resolve |

### Phase 5: First Event and Quote

| Q#  | Question                     | Verdict  | Evidence                                                                                                          |
| --- | ---------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------- |
| Q26 | Event creation prerequisites | **PASS** | Only client + date required. Address/city/ZIP default to 'TBD'. Schema uses `.optional().default('TBD')`. Minimal |
| Q27 | Quote with missing data      | **PASS** | Quote only needs client + pricing model + total cents. No menu required                                           |
| Q28 | Quote delivery               | **PASS** | Email to client via `circleFirstNotify`, client portal view, PDF download, accept/reject UI                       |
| Q29 | Event FSM guidance           | **PASS** | Status-specific help text for every state. Gate list shows hard blocks and soft warnings                          |
| Q30 | Payment without Stripe       | **PASS** | `RecordPaymentPanel` supports Venmo, Zelle, Cash, Check, PayPal, Card (manual). No Stripe dependency              |

### Phase 6: Execution and Operations

| Q#  | Question                  | Verdict  | Evidence                                                                                            |
| --- | ------------------------- | -------- | --------------------------------------------------------------------------------------------------- |
| Q31 | Calendar with first event | **PASS** | FullCalendar with day/week/month/list views. Single event renders correctly                         |
| Q32 | Shopping list generation  | **PASS** | Full generator with quantities, cost estimates, CSV export, web sourcing fallback                   |
| Q33 | Call sheet                | **PASS** | Renamed to "Voice Hub" (nav, page title, heading). Correctly identifies as AI vendor calling system |
| Q34 | Day-of execution          | **PASS** | `TodaysScheduleWidget` with phase tracking, countdown, weather, client context                      |
| Q35 | Event completion          | **PASS** | Full `in_progress -> completed` flow. AAR prompts, loyalty awards, trust panel                      |

### Phase 7: Financial Reality

| Q#  | Question                     | Verdict  | Evidence                                                                                                              |
| --- | ---------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------- |
| Q36 | Revenue visibility           | **PASS** | Hero metrics show "Revenue (all time)" from ledger. Updates on ledger write                                           |
| Q37 | Expense tracking             | **PASS** | Full CRUD with categories, receipt photos, mileage, event linking. Auto food cost calc                                |
| Q38 | Profit calculation honesty   | **PASS** | Dashed-border card with guidance "Log your expenses to see your true profit margin" when revenue > 0 and expenses = 0 |
| Q39 | Financial reports/tax export | **PASS** | 5 report types, date range picker, CSV export. No PDF, but CSV works for tax prep                                     |
| Q40 | Split payments               | **PASS** | Append-only ledger naturally supports multiple payment methods per event                                              |

### Phase 8: Growth and Repeat Business

| Q#  | Question                     | Verdict  | Evidence                                                                                                                 |
| --- | ---------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------ |
| Q41 | Rebooking past client        | **PASS** | Client detail shows "Rebook Client" button (links to `/events/new?client_id=`). `RebookingBar` on clients list page      |
| Q42 | Client dietary memory        | **PASS** | Banner shows dietary data on client select (line 699). Server action auto-populates event from client profile (line 172) |
| Q43 | Recurring service setup      | **PASS** | Full recurring service management with frequency, planning board, recommendations                                        |
| Q44 | Client communication history | **PASS** | Unified timeline: events, emails, notes, quotes, payments, referrals. Comprehensive                                      |
| Q45 | Referral tracking            | **PASS** | Referral source on clients, client-to-client referral records, dedicated referrals page                                  |

### Phase 9: Scale and Multi-Event Management

| Q#  | Question                    | Verdict     | Evidence                                                                          |
| --- | --------------------------- | ----------- | --------------------------------------------------------------------------------- |
| Q46 | Concurrent event management | **PASS**    | Kanban board, week planner, dashboard schedule cards. Multiple surfaces           |
| Q47 | Staff assignment to events  | **PASS**    | Full assignment, conflict detection, hours tracking. Pro-gated                    |
| Q48 | Equipment tracking + events | **PASS**    | Standalone inventory + event-linked rentals + per-event equipment checklists      |
| Q49 | Multi-menu events           | **PARTIAL** | DB supports 1-to-many, but event detail UI treats it as single-menu (`.limit(1)`) |
| Q50 | Seasonal pricing            | **FAIL**    | Zero seasonal logic in price resolution. No month/season/event-date awareness     |

### Phase 10: System Resilience

| Q#  | Question                  | Verdict     | Evidence                                                                                              |
| --- | ------------------------- | ----------- | ----------------------------------------------------------------------------------------------------- |
| Q51 | Offline/PWA behavior      | **PARTIAL** | Service worker exists but serves offline fallback page, not cached app. PWA disabled by default       |
| Q52 | Mobile responsiveness     | **PASS**    | Dedicated mobile nav, responsive layouts, critical flows work on 375px                                |
| Q53 | Client deletion / undo    | **PASS**    | Soft delete with `deleted_at`, restore function, active event guard                                   |
| Q54 | Session/draft persistence | **PASS**    | IndexedDB-based durable drafts with auto-save, restore prompt, unsaved changes dialog                 |
| Q55 | Concurrent access / SSE   | **PARTIAL** | SSE broadcasts work, presence tracking works. No system-wide conflict resolution (event form has CAS) |

### Phase 11: Veteran Migration

| Q#  | Question                     | Verdict     | Evidence                                                                                                        |
| --- | ---------------------------- | ----------- | --------------------------------------------------------------------------------------------------------------- |
| Q56 | Bulk client import           | **PARTIAL** | `importClientDirect()` exists for one-at-a-time. No CSV import, no batch UI                                     |
| Q57 | Historical event backfill    | **PASS**    | Past-date validation removed. Events with past dates allowed for historical backfill.                           |
| Q58 | Recipe bulk import           | **PASS**    | CSV upload, batch URL import, AI text parse, brain dump. Strong migration support                               |
| Q59 | Client relationship notes    | **PASS**    | Quick notes, unified timeline, milestones, taste profiles, outreach history                                     |
| Q60 | Analytics from imported data | **PASS**    | Q57 fixed (past dates allowed). Ledger handles historical dates. Analytics work from day one with imported data |

---

## Results Summary

**Final Score: 48 PASS / 11 PARTIAL / 1 FAIL**

**Grade: Usable but rough edges will lose users** (35-49 PASS range)

### The 1 FAIL (requires architectural work)

| Q#      | Issue                                               | Impact                                                                 | Fix Complexity                                                              |
| ------- | --------------------------------------------------- | ---------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| **Q50** | No seasonal pricing in the 10-tier resolution chain | Chef quotes December lobster at April prices. Financial risk for chefs | Medium: add event_date param to `resolvePrice()`, seasonal adjustment layer |

### The 11 PARTIALs (prioritized by user impact)

**High impact (will lose real users):**

| Q#      | Issue                                                              | Fix                                                                             |
| ------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| **Q56** | No bulk client import (300 clients = 300 form submissions)         | Build CSV import UI using existing `importClientDirect()` action                |
| **Q25** | Price resolution tiers mostly tenant-scoped, useless for new chefs | Make tiers 6 (regional) and 9 (category baseline) resolve from system-wide data |

**Medium impact (friction but workaround exists):**

| Q#      | Issue                                                    | Fix                                                                       |
| ------- | -------------------------------------------------------- | ------------------------------------------------------------------------- |
| **Q11** | Full sidebar shown regardless of account state           | Progressive disclosure: dim/badge sections based on what's configured     |
| **Q13** | Profile completeness dies with onboarding banner         | Surface completeness indicator in settings or dashboard beyond the banner |
| **Q20** | Client creation and portal invitation are separate steps | Add "Create and Invite" mode or prompt after creation                     |

**Low impact (polish):**

| Q#      | Issue                                                | Fix                                            |
| ------- | ---------------------------------------------------- | ---------------------------------------------- |
| **Q49** | Multi-menu events: DB supports it, UI doesn't        | Allow multiple menu attachment in event detail |
| **Q51** | PWA disabled, offline = fallback page                | Enable PWA build, cache critical routes        |
| **Q55** | No system-wide conflict resolution beyond event form | Extend CAS pattern to other forms              |
