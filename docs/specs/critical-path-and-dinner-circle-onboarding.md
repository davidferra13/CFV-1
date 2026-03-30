# Spec: Critical Path Tracking & Dinner Circle Onboarding

> **Status:** verified
> **Priority:** P0 (blocking)
> **Depends on:** none (standalone; lifecycle-intelligence spec enhances this later but is not required)
> **Estimated complexity:** medium (3-8 files)
> **Created:** 2026-03-30
> **Built by:** Claude Code session 2026-03-30

---

## What This Does (Plain English)

Two things:

1. **Critical Path Tracker:** Every inquiry/event has 10 hard-block items that must be confirmed before a chef can execute the service. The system tracks these separately from the full 200+ checkpoint blueprint. They are always visible, always prominent, and the system actively prompts for missing ones. If all 10 are green, the chef can execute. If any are red, the system tells the chef (and optionally the client) exactly what's blocking.

2. **Dinner Circle Onboarding:** Every first response to a new inquiry includes a natural, non-invasive invitation to the Dinner Circle. Clients can join as guests with zero account creation. The Dinner Circle becomes the shared workspace where both chef and client see the critical path status, menu, details, and can communicate without endless email chains.

---

## Why It Matters

The developer has an 8-day-old unanswered email. That's one lost critical path item (response sent). Over 10 years of private chef work, email chains regularly exceed 20 messages trying to collect information that could be captured in a single shared view. The Dinner Circle eliminates that friction, but only if clients actually join it. This spec defines how to get them there without making it feel forced.

---

## What Already Exists (DO NOT Rebuild)

The validation audit confirmed these are already fully built and functional:

| Capability                              | File                                                                                                        | Status     |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ---------- |
| Dinner Circle auto-creation on inquiry  | `lib/hub/inquiry-circle-actions.ts:16-153` (`createInquiryCircle()`)                                        | Production |
| Public guest access via token (no auth) | `app/(public)/hub/g/[groupToken]/page.tsx`                                                                  | Production |
| Hub group view with tabs                | `app/(public)/hub/g/[groupToken]/hub-group-view.tsx`                                                        | Production |
| Group fetch by token                    | `lib/hub/group-actions.ts:59` (`getGroupByToken()`)                                                         | Production |
| Reply composer with AI draft            | `components/inquiries/inquiry-response-composer.tsx`                                                        | Production |
| Gmail send (not just drafts)            | `lib/gmail/client.ts:281` (`sendEmail()`)                                                                   | Production |
| Draft creation + approval flow          | `lib/gmail/actions.ts:71-220` (`createDraftMessage()`, `approveAndSendMessage()`)                           | Production |
| OAuth `gmail.send` scope                | `components/settings/google-integrations.tsx:229`, `connected-accounts.tsx:50`, `connect-gmail-step.tsx:12` | Production |
| Circle auto-created from Gmail sync     | `lib/gmail/sync.ts:671`                                                                                     | Production |
| Circle auto-created from manual inquiry | `lib/inquiries/actions.ts:586`                                                                              | Production |

**Builder: do NOT create duplicate files for any of the above.** The only new work is the critical path computation, the client status view, and wiring the Dinner Circle link into the existing reply composer.

---

## Part 1: Critical Path (The 10 Hard Blocks)

### The List

These are the only items where, if missing, the service literally cannot happen:

| #   | Key                | Label                                | DB Column Source                                                                                        | When Required      |
| --- | ------------------ | ------------------------------------ | ------------------------------------------------------------------------------------------------------- | ------------------ |
| 1   | `host_name`        | Host name                            | `inquiries.contact_name` (DB) / `client_name` (Zod input)                                               | Inquiry            |
| 2   | `host_contact`     | Contact method (email or phone)      | `inquiries.contact_email` OR `inquiries.contact_phone` (either satisfies)                               | Inquiry            |
| 3   | `event_date`       | Confirmed date                       | `inquiries.confirmed_date`                                                                              | Before quote       |
| 4   | `event_address`    | Exact address                        | `inquiries.confirmed_location` (must contain street-level detail, not just city)                        | Before shopping    |
| 5   | `guest_count`      | Final guest count                    | `inquiries.confirmed_guest_count`                                                                       | Before quote       |
| 6   | `allergies`        | Life-threatening allergies confirmed | `inquiries.confirmed_dietary_restrictions` + explicit "no known allergies" or specific allergies listed | Before menu lock   |
| 7   | `dietary`          | Dietary restrictions                 | `inquiries.confirmed_dietary_restrictions`                                                              | Before menu lock   |
| 8   | `menu_confirmed`   | Menu confirmed by host               | Event menu record exists with status 'confirmed' or 'locked'                                            | Before shopping    |
| 9   | `service_time`     | Dinner time / chef arrival           | `inquiries.confirmed_date` time component, or `events.start_time`                                       | Before service day |
| 10  | `deposit_received` | Deposit or payment received          | `ledger_entries` record for event with category 'deposit' or 'payment'                                  | Before shopping    |

### Column Name Mapping (Critical for Builder)

The inquiry table and the Zod input schema use DIFFERENT names for the same fields:

| DB Column (`inquiries` table)    | Zod Schema (`CreateInquirySchema`) | Used Where                |
| -------------------------------- | ---------------------------------- | ------------------------- |
| `contact_name`                   | `client_name`                      | DB queries vs. form input |
| `contact_email`                  | `client_email`                     | DB queries vs. form input |
| `contact_phone`                  | `client_phone`                     | DB queries vs. form input |
| `confirmed_date`                 | `confirmed_date`                   | Same                      |
| `confirmed_guest_count`          | `confirmed_guest_count`            | Same                      |
| `confirmed_location`             | `confirmed_location`               | Same                      |
| `confirmed_dietary_restrictions` | `confirmed_dietary_restrictions`   | Same                      |

**When computing critical path: always query the DB column names, not the Zod input names.**

### How It Works

- Computed on-the-fly from existing data (no new columns, no new tables)
- `getCriticalPath(inquiryId?, eventId?)` returns an array of 10 items, each with:
  - `key`, `label`, `status` ('confirmed' | 'missing' | 'partial')
  - `value` (the confirmed data, if any)
  - `source` (where the data came from: email, form, manual)
  - `blocking_stage` (which stage this blocks: 'quote', 'shopping', 'menu_lock', 'service_day')
- `allergies` vs `dietary` distinction: allergies are life-threatening (anaphylaxis, hospitalization risk). Dietary are lifestyle/preference (vegetarian, kosher, no pork). Both are required but allergies are safety-critical.
- `event_address` heuristic: `confirmed_location` is 'confirmed' if it contains a digit (street number) AND at least two commas or a ZIP/postal code pattern (`\d{5}`). "Harrison, Maine" = partial. "42 Lake Road, Harrison, ME 04040" = confirmed. "Suite 200, Boston" = partial (no street).

### Address Detection Examples

| Input                                | Status    | Why                   |
| ------------------------------------ | --------- | --------------------- |
| `"Harrison, Maine"`                  | partial   | No street number      |
| `"42 Lake Road, Harrison, ME 04040"` | confirmed | Street number + ZIP   |
| `"their place in Maine"`             | partial   | No structured address |
| `null` or `""`                       | missing   | No data               |
| `"123 Main St, Boston, MA"`          | confirmed | Street number + city  |

### Soft Blocks (Separate, Lower Priority)

Displayed below the critical path, not blocking but flagged:

| Key                | Label                                       | Risk If Missing                         |
| ------------------ | ------------------------------------------- | --------------------------------------- |
| `kitchen_capacity` | Kitchen details (range type, counter space) | Chef arrives unprepared for the kitchen |
| `service_style`    | Service style (plated, family, buffet)      | Wrong presentation                      |
| `phone_number`     | Phone number (if only email)                | Day-of emergency unreachable            |
| `occasion_details` | Special occasion                            | Miss a celebration moment               |
| `parking_access`   | Parking/loading access                      | Circling the block with groceries       |

### Relationship to Existing `computeReadinessScore()`

`computeReadinessScore()` in `lib/inquiries/actions.ts` already computes data completeness (8 fields, 0-100%). The critical path is NOT a replacement. They coexist:

- **Readiness score** = "how much do we know?" (data completeness percentage)
- **Critical path** = "can we execute?" (binary go/no-go on 10 specific items)

A readiness score of 80% might still have a critical path blocker (e.g., no address). They serve different purposes.

---

## Part 2: Dinner Circle Onboarding

### The Flow

1. Chef receives inquiry (email, form, text, platform)
2. System auto-creates the Dinner Circle (this already happens via `createInquiryCircle()` in `lib/hub/inquiry-circle-actions.ts`)
3. Chef responds to the inquiry normally (answering questions, being human)
4. The existing reply composer (`components/inquiries/inquiry-response-composer.tsx`) auto-appends a Dinner Circle invitation paragraph to the draft
5. Client clicks the link, lands on the Dinner Circle as a **guest** (no account, no login, no signup)
6. Client sees: confirmed details, what's still needed, menu (if drafted), a message thread
7. Client can respond in the Dinner Circle or continue via email (both sync to the same conversation)

### Guest Access (Zero Friction)

- **Dinner Circle URL format: `app.cheflowhq.com/hub/g/{token}`** (existing route: `app/(public)/hub/g/[groupToken]/page.tsx`)
- No login required. The token IS the authentication for guest-level access.
- Guest can: view all details, post messages, confirm dietary restrictions, RSVP, see the menu
- Guest cannot: edit the menu, change event details, access other circles, see financial details
- If the guest later creates an account, their guest activity is linked to their account automatically

### Email Template (Appended to First Response)

The existing reply composer (`components/inquiries/inquiry-response-composer.tsx`) gets a new feature: auto-append a Dinner Circle invitation to the draft. The chef can edit or remove it.

**Default template:**

> I also set up a page for your dinner where you can see the menu, share details with anyone joining, and keep everything in one place. No account needed:
>
> {dinner_circle_url}
>
> If you prefer email, that works too.

**Characteristics:**

- Casual, not corporate
- Mentions the benefit (one place, share with others)
- Explicitly says no account needed
- Gives permission to not use it
- Short (3 lines)

**Variations the chef can customize:**

- Formal version (for corporate clients)
- Minimal version (just the link with one sentence)
- Enthusiastic version (for clients who seem tech-friendly)
- No invitation (for clients who clearly prefer email only)

### What the Client Sees in the Dinner Circle

The existing hub group view (`hub-group-view.tsx`) gets a new tab or top-of-page section: "Your Dinner Status."

```text
+----------------------------------------------------------+
| Your Dinner with Chef David                    April 2026 |
+----------------------------------------------------------+
|                                                           |
| CONFIRMED                                                 |
| [x] Date: May [TBD], 2026                                |
| [x] Guests: 2                                            |
| [x] Dietary: Strict vegetarian (no meat, chicken, fish)   |
| [x] Occasion: 15th wedding anniversary celebration        |
|                                                           |
| STILL NEEDED                                              |
| [ ] Exact date in May                                     |
| [ ] Address in Harrison, ME                               |
| [ ] Preferred dinner time                                 |
|                                                           |
| MENU (Draft)                                              |
| +-------------------------------------------------+      |
| | Starters                                         |      |
| |   Malai Soya Chaap                               |      |
| |   Paneer Tikka                                   |      |
| |                                                  |      |
| | Main Course                                      |      |
| |   Malai Kofta Curry                              |      |
| |   Egg Curry (vegetarian egg)                     |      |
| |   Dry Jackfruit Stir-Fry                         |      |
| |   with naan, rice, salad, raita, papad           |      |
| |                                                  |      |
| | Dessert                                          |      |
| |   Shahi Tukra                                    |      |
| |   Gulab Jamun                                    |      |
| +-------------------------------------------------+      |
|                                                           |
| CONVERSATION                                              |
| [Message thread synced with email]                        |
|                                                           |
+----------------------------------------------------------+
```

**Guest-visible critical path items (8 of 10):**
Items 1-9 are shown to guests (host name, contact, date, address, guest count, allergies, dietary, menu status, service time). **Item 10 (deposit_received) is NEVER shown to guests** because it exposes financial state. Instead, guests see a generic "Your chef is preparing for your dinner" once the chef confirms readiness.

### Chef View (Same Circle, More Detail)

Chef sees everything the client sees, plus:

- Critical path status (all 10 items including deposit)
- Lead score and tier
- Financial details (quote, deposit, payment status)
- Internal notes (not visible to client)
- "Draft Email for Missing Info" button (uses existing reply composer)
- Quick actions: send quote, lock menu, request deposit

---

## Files to Create

| File                                          | Purpose                                                                                                                                                         |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/lifecycle/critical-path.ts`              | `getCriticalPath()` and `getCriticalPathForGuest()` functions. Computes 10 hard blocks from existing inquiry/event/ledger data. Pure computation, no DB writes. |
| `components/lifecycle/critical-path-card.tsx` | Visual card showing 10 items with red/yellow/green status. Used on inquiry detail page.                                                                         |
| `components/hub/circle-client-status.tsx`     | Client-facing "confirmed / still needed" view. Renders in the Dinner Circle public page. Calls `getCriticalPathForGuest()`.                                     |
| `lib/lifecycle/dinner-circle-templates.ts`    | Email invitation paragraph templates (default + variations). Returns formatted string with chef name and circle URL.                                            |

## Files to Modify

| File                                                 | What to Change                                                                                                                                                                                                                       |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `lib/inquiries/actions.ts`                           | Export `getCriticalPath()` from `lib/lifecycle/critical-path.ts` and include it in inquiry detail data responses. Do NOT create a separate `confirmCriticalPathItem()` action; use existing `updateInquiry()` for all field updates. |
| `app/(public)/hub/g/[groupToken]/hub-group-view.tsx` | Add `circle-client-status.tsx` as a new "Status" tab or as a banner section above the existing tabs.                                                                                                                                 |
| `app/(public)/hub/g/[groupToken]/page.tsx`           | Fetch critical path data for guest view via `getCriticalPathForGuest(groupToken)` and pass to hub-group-view.                                                                                                                        |
| `components/inquiries/inquiry-response-composer.tsx` | Auto-append Dinner Circle invitation paragraph from `dinner-circle-templates.ts` to the draft. Chef can edit or remove. Include toggle: "Include Dinner Circle link" (default: on for first response, off for subsequent).           |

## Database Changes

None. Critical path is computed from existing columns:

- `inquiries`: `contact_name`, `contact_email`, `contact_phone`, `confirmed_date`, `confirmed_guest_count`, `confirmed_location`, `confirmed_dietary_restrictions`
- `events`: `start_time`, menu records
- `ledger_entries`: deposit/payment records
- `hub_groups`: `group_token`, `inquiry_id`

---

## Server Actions

| Action                                         | Auth                | Input                                 | Output                                                                                          | Side Effects     |
| ---------------------------------------------- | ------------------- | ------------------------------------- | ----------------------------------------------------------------------------------------------- | ---------------- | ------------------------------------------ | ---- |
| `getCriticalPath(inquiryId?, eventId?)`        | `requireChef()`     | inquiry or event ID                   | `{ items: CriticalPathItem[], complete: boolean, completedCount: number, nextBlocker: string }` | None (read-only) |
| `getCriticalPathForGuest(groupToken)`          | Public (token-auth) | hub group token                       | `{ confirmed: GuestItem[], missing: GuestItem[] }` (items 1-9 only, no deposit/financial data)  | None             |
| `getDinnerCircleInvitation(inquiryId, style?)` | `requireChef()`     | inquiry ID + optional style ('casual' | 'formal'                                                                                        | 'minimal')       | `{ paragraph: string, circleUrl: string }` | None |

**Note: No `confirmCriticalPathItem()` action.** Critical path items are updated via the existing `updateInquiry()` action which already handles CAS-guarded field updates, cache busting, and activity logging. Adding a second mutation path to the same columns creates race conditions.

---

## Edge Cases and Error Handling

| Scenario                                                | Correct Behavior                                                                                 |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Inquiry has city but no street address                  | `event_address` shows 'partial' status with "Need exact address"                                 |
| Dietary says "vegetarian" but no allergy info           | `dietary` is confirmed, `allergies` shows 'missing' with "Confirm no life-threatening allergies" |
| Client visits Dinner Circle link after event completed  | Show "This dinner has concluded" with thank-you message                                          |
| Client visits with invalid token                        | 404, not a redirect to login                                                                     |
| Guest posts a message in Dinner Circle                  | Message syncs to chef's conversation thread, notification sent                                   |
| Chef hasn't drafted a menu yet                          | Menu section shows "Menu coming soon" instead of empty state                                     |
| All 10 critical path items confirmed                    | Show celebration state: "Ready to cook!" with green checkmarks                                   |
| Inquiry converts to event                               | Critical path seamlessly transfers (query uses both inquiry_id and event_id)                     |
| `confirmed_dietary_restrictions` is empty array vs null | Empty array = "no restrictions confirmed" (partial). Null = "never asked" (missing).             |
| Guest count is 0                                        | Treat as missing, not confirmed. 0 guests is not a real dinner.                                  |

---

## Verification Steps

1. Sign in with agent account
2. Create a new inquiry with partial data (name, email, date, guest count)
3. Open inquiry detail page
4. Verify: critical path card shows 4/10 confirmed, 6 missing
5. Verify: missing items show which stage they block
6. Get the Dinner Circle URL for this inquiry (format: `/hub/g/{token}`)
7. Open the URL in an incognito window (no login)
8. Verify: guest sees confirmed items (items 1-9 only), missing items, no financial data
9. Post a message as guest
10. Verify: message appears in chef's conversation thread
11. Open the reply composer on the inquiry detail page
12. Verify: Dinner Circle invitation paragraph is auto-appended to the draft with correct `/hub/g/{token}` URL
13. Verify: "Include Dinner Circle link" toggle works
14. Screenshot chef view and guest view side by side

---

## Out of Scope

- Full lifecycle intelligence layer (200+ checkpoints, auto-detection from conversation text; that's `service-lifecycle-intelligence.md`)
- Bidirectional email-to-Dinner-Circle sync (messages posted in Circle don't auto-email the client yet; follow-up spec)
- Account creation upsell in the Dinner Circle (no "create an account" prompts)
- Multiple dinner circles per inquiry (one inquiry = one circle)
- Kitchen capacity questionnaire UI (structured form is a separate spec)
- New Gmail OAuth scopes (already have `gmail.send`, no changes needed)
- New reply composer component (already exists at `components/inquiries/inquiry-response-composer.tsx`)
- New Gmail compose/send methods (already exist at `lib/gmail/client.ts:281` and `lib/gmail/actions.ts:71-220`)

---

## Notes for Builder Agent

- **Guest access via token already exists.** The route is `app/(public)/hub/g/[groupToken]/page.tsx`. It loads without auth. Verify it works as-is before adding the client-status component.
- **Critical path is a computed view, not stored state.** Don't create new columns or tables. Query existing fields: `contact_name`, `contact_email`, `contact_phone`, `confirmed_date`, `confirmed_location`, `confirmed_guest_count`, `confirmed_dietary_restrictions`, event menu status, ledger entries for deposits.
- **Use `updateInquiry()` for all field mutations.** Do NOT create a separate `confirmCriticalPathItem()` action. The existing `updateInquiry()` in `lib/inquiries/actions.ts` already handles CAS guards, cache busting, and activity logging.
- **Privacy in guest view:** Never show: quote amount, deposit amount, payment status details, chef's internal notes, lead score, item #10 (deposit_received). Only show items 1-9: confirmed facts, menu, what's still needed (phrased as questions, not demands), conversation thread.
- **Dinner Circle invitation templates** should use the chef's `display_name` from their profile, not hardcoded "Chef David."
- **The critical path card should be the FIRST thing a chef sees** when opening an inquiry or event. Not buried in a tab. Not in a sidebar. Front and center. This is the "can I execute this dinner?" answer.
- **Column name warning:** The DB uses `contact_name`/`contact_email`/`contact_phone`. The Zod schema for `createInquiry` uses `client_name`/`client_email`/`client_phone`. When querying the DB, use the DB column names. When parsing form input, use the Zod names.
- **The hub group view is tab-based.** The client status component should be added as either (a) a new "Status" tab, or (b) a persistent banner/header above the tabs that's always visible. Option (b) is preferred since the status is the most important information and shouldn't be hidden behind a tab click.
