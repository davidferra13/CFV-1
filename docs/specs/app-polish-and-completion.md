# Spec: App Polish & Completion

> **Status:** superseded
> **Priority:** was P0
> **Depends on:** none
> **Estimated complexity:** was large (50+ files) - see supersession note
> **Created:** 2026-03-28
> **Built by:** not started (superseded before build)
> **Superseded:** 2026-03-30 - Planner Gate validation found 5 of 7 workstreams already completed by other specs
>
> ### Supersession Notes (2026-03-30 Planner Gate Audit)
>
> This spec was drafted 2026-03-28 but massive work happened in the following 2 days:
>
> | Workstream             | Status                                                                                                                 | Evidence                                            |
> | ---------------------- | ---------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
> | 1. Navigation          | **Partially done** - Action Bar spec (verified 3/28) solved discoverability. Alphabetical sort still pending.          | `docs/specs/navigation-action-bar.md` (verified)    |
> | 2. Visual Personality  | **Done** - globals.css has warm brand tokens, card hover effects, glass morphism, DM Serif Display, success animations | `app/globals.css` (1245 lines of brand styling)     |
> | 3. Onboarding          | **Done** - 6-step wizard with First Menu + inline First Booking. Copy already generic.                                 | `docs/specs/onboarding-overhaul.md` (verified 3/27) |
> | 4. Platform Liability  | **Done** - All platform names replaced with "your inbox"/"email notifications". No liability risk.                     | Verified in actual files 3/30                       |
> | 5. Wiring Verification | **Done** - 25 routes tested, 25 PASS                                                                                   | `docs/wiring-verification-report.md` (3/28)         |
> | 6. Client Portal       | **Built** - Routes, nav, auth all exist. Polish-level only.                                                            | All `/my-*` routes verified                         |
> | 7. Public Pages        | **Built** - All routes exist, header + footer wired. Polish-level only.                                                | All public routes verified                          |
>
> **Remaining work extracted to:** `docs/specs/app-final-touches.md` (small scope, 1-2 sessions)

---

## What This Does (Plain English)

This is the master spec for taking ChefFlow from "every feature I've ever needed" to "finished product I'm proud to show people." It covers seven workstreams: navigation cleanup, visual personality, onboarding overhaul, platform liability fixes, wiring verification, client portal polish, and public pages review. When complete, a chef opens ChefFlow and immediately feels at home, not like they're navigating a developer's passion project.

---

## Why It Matters

The app has ~265 pages and ~200 features built by ~500 agent sessions. Everything works in isolation, but the overall experience feels fragmented. Features are hard to find, the interface lacks warmth, onboarding is half-done, and nobody has systematically verified that every button does what it says. This is the gap between "built" and "done." Without this pass, operators who sign up will bounce before they discover the power underneath.

---

## Workstream 1: Navigation & Discoverability

### Problem

"All Features" is organized by workflow categories (Pipeline, Clients, Events, etc.) but within those categories and at the top level, items appear in a seemingly random order. A chef who wants to find something specific has to memorize where it lives or use search. The quick tabs (Inbox, Calendar, Events, Clients, Menus, Money, Prep, Community) are great, but everything else is a maze.

### Changes

| File                                              | What to Change                                                                                                                                                                                                                                                              |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `components/navigation/nav-config.tsx`            | Sort all 17 groups alphabetically within the All Features section. Sort all items within each group alphabetically. Sort all children within each item alphabetically.                                                                                                      |
| `components/navigation/nav-config.tsx`            | Review all 17 group names for clarity. A chef should instantly know what "Pipeline" or "Protection" means without thinking. Consider renaming: Pipeline -> Sales, Protection -> Safety, Commerce -> Point of Sale, Network -> Community (if not conflicting with quick tab) |
| `components/navigation/nav-config.tsx`            | Audit every nav item: does the page it links to actually exist and load? Flag dead links.                                                                                                                                                                                   |
| `components/navigation/all-features-collapse.tsx` | When All Features is expanded, show all groups expanded by default (not collapsed). The extra click to expand each group creates friction.                                                                                                                                  |
| `components/navigation/chef-nav.tsx`              | Add a small "A-Z" indicator or sort toggle so users know the list is alphabetical                                                                                                                                                                                           |

### Verification

- Open All Features, confirm every group is A-Z
- Within each group, confirm every item is A-Z
- Click every single nav link, confirm it loads a real page (not 404, not blank)

---

## Workstream 2: Visual Personality

### Problem

The app looks competent but clinical. It feels like a coder built it for coders. Missing: warmth, texture, the feeling that a chef's tool was designed by someone who understands kitchens. The foundation is solid (brand colors, spring animations, glass morphism, DM Serif Display headings) but it's underutilized.

### Changes

| File                               | What to Change                                                                                                                                                |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/globals.css`                  | Add subtle warm background texture or gradient to main content area (not flat gray/white). Even a slight warm tint to surfaces makes the app feel alive.      |
| `app/globals.css`                  | Add page transition: fade-in on route change (150ms, spring easing). Currently routes just swap with no transition.                                           |
| `app/globals.css`                  | Add success micro-animation: brief green pulse/checkmark on successful actions (save, create, send). Currently no celebratory feedback.                       |
| `components/ui/empty-state.tsx`    | Make empty state illustrations warmer. Current SVGs are flat outlines. Add subtle gradients using brand palette, slight animation (gentle bob or shimmer).    |
| `components/ui/card.tsx`           | Add optional warm left-border accent (like dashboard cards have) as a default for content cards across the app. Subtle, not loud.                             |
| Dashboard page                     | Review the "morning newspaper" layout. Ensure greeting feels personal, metrics feel glanceable, and the page has visual rhythm (not just stacked rectangles). |
| All section headers across the app | Ensure DM Serif Display is used consistently for page titles and section headers. It's the "chef" font. If any pages use DM Sans for headers, switch them.    |
| Toast notifications                | Add slide-in animation + warm brand accent (not just colored border). Toasts are the app's voice; they should feel intentional.                               |

### Design Principles (for builder agent)

- Warm, not cold. Terracotta, cream, wood tones. Not blue, not gray.
- Professional, not playful. This is a business tool, not a game. Subtle, not loud.
- Consistent, not scattered. One animation language, one color story, one typography hierarchy.
- The kitchen metaphor: think copper pots, wooden boards, warm lighting. Not sterile stainless steel.

### Verification

- Navigate through 10 representative pages. Does it feel cohesive?
- Complete an action (create event, save recipe). Does success feel satisfying?
- View an empty page. Does it feel inviting, not barren?
- Switch between light and dark mode. Does warmth carry through both?

---

## Workstream 3: Onboarding Overhaul (rename to "Setup")

### Problem

Current onboarding is half-done. The wizard has 5 steps (Profile, Portfolio, Pricing, Gmail Import, First Event) but "First Event" just redirects to /events. There's no menu creation step. The word "onboarding" sounds corporate. Post-wizard hub offers 5 more phases but they're disconnected from the wizard flow. A new chef doesn't know what to do first.

### Changes

| File                                                  | What to Change                                                                                                                                                                                                                                          |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| All UI references to "onboarding"                     | Rename to "Setup" everywhere user-facing. URL can stay `/onboarding` for now but page titles, buttons, banners all say "Setup" or "Get Started"                                                                                                         |
| `lib/onboarding/onboarding-constants.ts`              | Rename step labels. "connect_gmail" -> "Connect Your Inbox", "first_event" -> "Your First Booking"                                                                                                                                                      |
| `components/onboarding/onboarding-wizard.tsx`         | Replace the "First Event" redirect step with an actual inline mini-form: event name, date, guest count, client name. Create the event right there. Don't send them away.                                                                                |
| `components/onboarding/onboarding-wizard.tsx`         | Add a "Your First Menu" step after Portfolio. Simple: menu name, add 3-5 dishes by typing names. No costing, no recipes, just dish names. Get something on the board.                                                                                   |
| `components/onboarding/onboarding-wizard.tsx`         | Add clear progress indicator: "Step 2 of 6" not just dots. Show what's coming.                                                                                                                                                                          |
| `components/onboarding/onboarding-wizard.tsx`         | Every step must have a "Skip for now" that's clearly visible, not buried. Nobody should feel trapped.                                                                                                                                                   |
| Post-wizard hub                                       | After wizard completion, show a single "Setup Checklist" on the dashboard (not a separate /onboarding page). Items: Complete profile, Add first menu, Create first event, Connect email, Add first client, Set up pricing. Check them off as completed. |
| `components/dashboard/onboarding-reminder-banner.tsx` | Update copy. Remove "onboarding" language. Change to "Finish setting up your account" with clear next step.                                                                                                                                             |

### New Wizard Flow (6 steps)

1. **Profile** - Business name, location, bio (existing, works fine)
2. **Portfolio** - Upload photos (existing, works fine)
3. **Your First Menu** - NEW: menu name + dish names (simple text entry)
4. **Pricing** - Rates and packages (existing, works fine)
5. **Connect Your Inbox** - Gmail import (existing, needs copy cleanup)
6. **Your First Booking** - NEW: inline event creation mini-form (replaces redirect)

### Verification

- Create a new test account, go through the full wizard
- Confirm every step works, skip works, back button works
- Confirm the menu created in step 3 actually appears in /menus after
- Confirm the event created in step 6 actually appears in /events after
- Confirm dashboard checklist reflects completion state accurately

---

## Workstream 4: Platform Liability Cleanup

### Problem

The app claims integration with Take a Chef, Bark, Thumbtack, and others in user-facing UI. Only Take a Chef (via Gmail parsing) actually works. Bark and Thumbtack are explicitly marked "API integration not yet available" in the integrations settings, but the onboarding banner says "Auto-import inquiries from Take a Chef, Bark, Thumbtack and more." This is a legal liability and a trust issue.

### Changes

| File                                                            | What to Change                                                                                                                                                                                                              |
| --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `components/dashboard/onboarding-reminder-banner.tsx` (line 28) | Change "auto-import leads from Take a Chef, Bark, and more" to "auto-import leads from your email" (generic, no platform names)                                                                                             |
| `lib/onboarding/onboarding-constants.ts` (line 33)              | Change "Auto-import inquiries from Take a Chef, Bark, Thumbtack and more" to "Auto-import inquiries from your inbox"                                                                                                        |
| `app/(chef)/settings/integrations/page.tsx`                     | For platforms marked as disabled/unavailable: change copy from "Integration" to "Email Parsing" or "Inbox Detection." We parse their notification emails; we don't integrate with their API. That's a critical distinction. |
| `components/integrations/take-a-chef-setup.tsx`                 | Review copy. Make clear this is Gmail-based email parsing, not an official API integration. Remove any language implying partnership or endorsement.                                                                        |
| `lib/integrations/platform-connections-constants.ts`            | For disabled platforms (Bark, The Knot, Cozymeal, GigSalad): either remove entirely from the UI or clearly label as "Planned" with no false capability claims                                                               |
| `lib/marketplace/platforms.ts`                                  | Review all platform entries. Any platform listed here should have a disclaimer if we don't have a formal relationship.                                                                                                      |

### Principles

- Never claim an integration that doesn't exist
- "We parse emails from these platforms" is honest. "We integrate with these platforms" is not.
- Remove platform logos/branding unless we have explicit permission
- Generic language ("your inbox", "email notifications") is always safer than naming platforms

### Verification

- Search entire codebase for TakeAChef, Bark, Thumbtack, Cozymeal, GigSalad, The Knot in .tsx files
- Confirm no user-facing UI implies official partnership or API integration
- Confirm onboarding and settings pages use honest, generic language

---

## Workstream 5: Wiring Verification Audit

### Problem

~500 agent sessions have contributed to this codebase. Things may be fragmented: buttons that do nothing, forms that don't save, pages that error, features half-wired. The developer's gut says "I think it works but I don't know for sure." This workstream is a systematic sweep.

### Audit Plan (by priority)

**Tier 1: Daily Driver Features (test first)**
These are the features a chef uses every single day. If these don't work, nothing else matters.

| Feature   | Route        | What to Verify                                                                           |
| --------- | ------------ | ---------------------------------------------------------------------------------------- |
| Dashboard | `/dashboard` | Loads with real data. Metrics are from DB, not hardcoded. Command center links all work. |
| Inbox     | `/inbox`     | Messages load. Can send a message. Client receives it (check client portal).             |
| Events    | `/events`    | List loads. Can create event. Can transition states (draft -> proposed -> accepted etc). |
| Clients   | `/clients`   | List loads. Can create client. Can view client detail. Dietary info saves.               |
| Calendar  | `/calendar`  | Renders events on correct dates. Can click event to view detail.                         |
| Menus     | `/menus`     | List loads. Can create menu. Can add dishes. Can view menu detail.                       |
| Recipes   | `/recipes`   | List loads. Can create recipe. Can add ingredients. Cost calculates.                     |
| Inquiries | `/inquiries` | List loads. New inquiry form works. Status transitions work.                             |
| Quotes    | `/quotes`    | Can create quote from event. Price calculates. Can send to client.                       |

**Tier 2: Financial Features (test second)**
Money features that are wrong are worse than money features that are missing.

| Feature       | Route                  | What to Verify                                                                                       |
| ------------- | ---------------------- | ---------------------------------------------------------------------------------------------------- |
| Costing       | `/culinary/costing`    | Recipe costs calculate from ingredients. Menu costs aggregate from recipes. Food cost % makes sense. |
| Invoices      | `/finance/invoices`    | Can create invoice. Amount matches quote. Can mark as paid.                                          |
| Expenses      | `/finance/expenses`    | Can create expense. Shows in event financials. Categorization works.                                 |
| Financial hub | `/finance`             | Revenue, expenses, profit all pull from real ledger data. Not zeros, not hardcoded.                  |
| Plate costs   | `/finance/plate-costs` | Per-plate breakdown calculates correctly with all cost categories.                                   |

**Tier 3: Operational Features (test third)**

| Feature        | Route               | What to Verify                                                       |
| -------------- | ------------------- | -------------------------------------------------------------------- |
| Prep workspace | `/culinary/prep`    | Can create prep tasks. Can check them off. Tied to events.           |
| Documents      | `/documents`        | Can generate prep list, grocery list, front-of-house doc from event. |
| Staff          | `/operations/staff` | Can add staff member. Can assign to event.                           |
| Daily ops      | `/daily`            | Shows today's events and tasks. Actionable.                          |

**Tier 4: Growth & Marketing Features (test fourth)**

| Feature   | Route                  | What to Verify                                 |
| --------- | ---------------------- | ---------------------------------------------- |
| Campaigns | `/marketing/campaigns` | Can create campaign. Can draft content.        |
| Analytics | `/analytics`           | Charts render with real data. Not placeholder. |
| Reviews   | `/reviews`             | Can view client reviews. Can respond.          |

**Tier 5: Settings & Configuration (test last)**

| Feature      | Route                    | What to Verify                                  |
| ------------ | ------------------------ | ----------------------------------------------- |
| Profile      | `/settings/my-profile`   | All fields save. Photo upload works.            |
| Integrations | `/settings/integrations` | Gmail sync connects. Stripe connects.           |
| Billing      | `/settings/billing`      | Supporter flow works (or is honestly hidden).   |
| Modules      | `/settings/modules`      | Toggle modules on/off. Nav updates accordingly. |

### Methodology

For each feature:

1. Sign in with agent account
2. Navigate to the page
3. Screenshot the initial state
4. Attempt the primary action (create, save, send, calculate)
5. Verify the result persisted (refresh, check DB, check other views)
6. Screenshot the result
7. Log: PASS, FAIL (with error), or PARTIAL (works but has issues)

### Output

A verification report: `docs/wiring-verification-report.md` with pass/fail for every feature, screenshots of failures, and a prioritized fix list.

---

## Workstream 6: Client Portal Polish

### Problem

The client portal has elaborate features (dinner circles, loyalty programs, rewards) but hasn't received the same attention as the chef portal. It needs to feel like a premium experience for the chef's clients, not an afterthought.

### Audit Checklist

| Area               | What to Check                                                                                |
| ------------------ | -------------------------------------------------------------------------------------------- |
| Sign in / sign up  | Flow works. Error messages are clear. Redirect to bookings after.                            |
| Bookings list      | Shows client's events with correct status, dates, and details.                               |
| Booking detail     | Event info, menu, dietary preferences, payment status all visible and accurate.              |
| Messages           | Can send message to chef. Chef receives it in inbox. Real-time or near-real-time.            |
| Dinner Circles     | Can view circles. Can join/leave. Can see other members (if allowed).                        |
| Loyalty / Rewards  | Points display correctly. Rewards catalog loads. Can redeem (or clearly shows requirements). |
| Payments           | Payment history accurate. Can make payment if outstanding balance.                           |
| Profile            | Can update dietary preferences, allergies, contact info. Saves correctly.                    |
| Mobile experience  | All pages work on mobile viewport. Bottom tabs functional. Book Now button works.            |
| Visual consistency | Same warmth and polish as chef portal. Not a stripped-down version.                          |

### Changes (exact files TBD after audit)

| File                                   | What to Change                                                                                                                                    |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `components/navigation/client-nav.tsx` | Ensure nav labels are clear for non-technical users. "Friends & Groups" might be confusing; consider "Dinner Circles" if that's what it links to. |
| Client portal pages                    | Apply same visual personality from Workstream 2 (warm tones, transitions, success feedback).                                                      |
| Client booking flow                    | Verify the full loop: client gets invited -> views menu -> confirms dietary needs -> sees booking in their portal.                                |

---

## Workstream 7: Public Pages Review

### Problem

Public pages (homepage, /book, /chefs, /for-operators, /discover) are the first impression. They need to clearly communicate what ChefFlow is and make it trivially easy to either book a chef or sign up as an operator. Lowest priority workstream but still needs a pass.

### Audit Checklist

| Page                             | What to Check                                                                  |
| -------------------------------- | ------------------------------------------------------------------------------ |
| Homepage (`/`)                   | Clear value prop. CTA works. Not cluttered. Mobile responsive.                 |
| Book a Chef (`/book`)            | Form works end-to-end. Creates inquiry. Chef gets notified.                    |
| Browse Chefs (`/chefs`)          | Shows real chef profiles (or honest empty state if none). Search/filter works. |
| Discover (`/discover`)           | Content loads. Categories make sense. Links work.                              |
| For Operators (`/for-operators`) | Clear pitch. Sign up CTA works. No false claims about features.                |
| Sign Up (`/auth/signup`)         | Works for both chef and client roles. Clear differentiation.                   |
| Privacy Policy (`/privacy`)      | Exists. Loads. Content is current.                                             |
| Terms of Service (`/terms`)      | Exists. Loads. Content is current.                                             |
| FAQ (`/faq`)                     | Answers are accurate and current. No outdated feature descriptions.            |

### Changes (exact files TBD after audit)

| File                                      | What to Change                                                                |
| ----------------------------------------- | ----------------------------------------------------------------------------- |
| `components/navigation/public-header.tsx` | Verify all nav links work. CTA buttons prominent.                             |
| `components/navigation/public-footer.tsx` | All footer links work. No dead links.                                         |
| Public pages                              | Apply same visual warmth. Hero sections should feel inviting, not template-y. |

---

## Database Changes

None. This is a UI/UX/verification spec. No schema changes needed.

---

## Execution Order

1. **Workstream 4: Platform Liability** - Do first. This is a legal risk sitting in production right now. Small scope, high urgency. (1 session)
2. **Workstream 1: Navigation** - Do second. Alphabetical sort + dead link audit. Immediate usability win. (1 session)
3. **Workstream 3: Onboarding** - Do third. New user experience is broken without this. (1-2 sessions)
4. **Workstream 5: Wiring Verification** - Do fourth. Systematic sweep, tier by tier. (2-3 sessions)
5. **Workstream 2: Visual Personality** - Do fifth. Polish after everything works. (1-2 sessions)
6. **Workstream 6: Client Portal** - Do sixth. Second-priority user role. (1 session)
7. **Workstream 7: Public Pages** - Do last. Third-priority, lowest risk. (1 session)

**Total estimated effort:** 8-12 sessions, serial execution.

---

## Out of Scope

- OpenClaw integration or configuration (separate concern, not part of app polish)
- New features (this spec finishes and polishes what exists, it doesn't add new capabilities)
- Database migrations or schema changes
- E-Phone Book / consumer directory (future spec)
- Operator recruitment pipeline (future spec, after app is polished)
- Performance optimization (separate spec if needed)
- Mobile app / PWA enhancements (separate spec if needed)

---

## Notes for Builder Agent

- Read `CLAUDE.md` completely before starting any workstream. Especially the Zero Hallucination Rule, Anti-Loop Rule, and Definition of Done.
- Read `docs/app-complete-audit.md` for the full page/feature inventory.
- For Workstream 5 (Wiring Verification), use the agent test account (`.auth/agent.json`). Sign in via `POST http://localhost:3100/api/e2e/auth`.
- For visual changes (Workstream 2), reference `app/globals.css` for existing design tokens. Don't invent new color values; use the brand palette.
- For navigation changes (Workstream 1), `components/navigation/nav-config.tsx` is the single source of truth. It's 1,977 lines. Read it before editing.
- Every change must be verified in the real app with screenshots. "I edited the file" is not done. "Here's a screenshot showing it works" is done.
- Do NOT add new dependencies or packages for visual polish. Use what's already in the project (Tailwind, existing animations, brand colors).
- Do NOT rename URL routes (would break bookmarks and links). Only rename user-facing labels and copy.
