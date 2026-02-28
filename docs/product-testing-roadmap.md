# Product Testing Roadmap

> **UI Testing** = does the interface behave correctly?
> **Product Testing** = does the feature deliver its value?
>
> We've completed UI testing across ~265 pages. This roadmap defines the product tests —
> verifying that features actually work end-to-end with real data, real accounts, and real
> external services. Every test uses the developer's real account (davidferra13@gmail.com).

---

## How This Works

- **Developer account:** `davidferra13@gmail.com` — a real Google account, real inbox, real business identity
- **Reset button:** Mission Control > Logins > "Reset" — wipes all data and starts fresh anytime
- **Login button:** Mission Control > "My Dashboard" — one-click sign-in to the app
- **Test environment:** `localhost:3100` (dev server)
- **Each tier builds on the one below it.** Don't move up until the tier below is solid.

---

## The Dependency Chain

```
Tier 0: Account & Auth
  └─ Tier 1: Communication (email, inquiries, messages)
       └─ Tier 2: Client & Event Lifecycle
            └─ Tier 3: Financials (quotes, invoices, payments)
                 └─ Tier 4: Operations (menus, recipes, staff, logistics)
                      └─ Tier 5: Intelligence (AI, analytics, automations)
```

If a lower tier fails, everything above it is unreliable. Email sync (Tier 1) is the
foundation — if communication doesn't work, events can't be created from inquiries,
quotes can't be sent, payments can't be collected.

---

## Tier 0: Account & Auth

**What it proves:** A real person can sign up, sign in, and see their dashboard.

| #   | Test                          | What "pass" looks like                                        |
| --- | ----------------------------- | ------------------------------------------------------------- |
| 0.1 | Sign in with real credentials | Dashboard loads, shows correct email, no errors               |
| 0.2 | Account reset → clean slate   | After reset, dashboard shows empty state (no stale data)      |
| 0.3 | Profile setup                 | Enter business name, bio, slug → profile page displays them   |
| 0.4 | Settings load correctly       | All settings pages render with real preferences, not defaults |
| 0.5 | Session persistence           | Close browser, reopen, still signed in (cookie works)         |
| 0.6 | Sign out and back in          | Sign out → redirected to login → sign in → back to dashboard  |

**Status:** Not started

---

## Tier 1: Communication

**What it proves:** The app can receive, organize, and respond to real-world communication.

This is the foundation. A private chef's business starts with someone reaching out.
If ChefFlow can't capture and manage that communication, nothing else matters.

### 1A. Email Sync (Gmail)

| #    | Test                           | What "pass" looks like                                                               |
| ---- | ------------------------------ | ------------------------------------------------------------------------------------ |
| 1A.1 | Connect Gmail (OAuth)          | OAuth flow completes, Google connection saved, sync starts                           |
| 1A.2 | Initial sync pulls real emails | Inbox shows actual emails from the developer's Gmail                                 |
| 1A.3 | Email classification           | Emails correctly classified: client inquiry, vendor, personal, spam                  |
| 1A.4 | New email appears              | Send a test email to the account → it appears in ChefFlow inbox within sync interval |
| 1A.5 | Reply from ChefFlow            | Reply to an email from within ChefFlow → reply appears in Gmail sent folder          |
| 1A.6 | Thread continuity              | Multi-message thread displays correctly with full history                            |
| 1A.7 | Disconnect and reconnect       | Remove Gmail connection → inbox clears → reconnect → emails return                   |

### 1B. Inquiry Flow

| #    | Test                           | What "pass" looks like                                               |
| ---- | ------------------------------ | -------------------------------------------------------------------- |
| 1B.1 | Public inquiry form submission | Submit inquiry from public page → it appears in chef's inbox         |
| 1B.2 | Embedded widget inquiry        | Submit via embeddable widget → appears in inbox with correct source  |
| 1B.3 | Inquiry creates draft event    | Accepting an inquiry auto-creates a draft event with correct details |
| 1B.4 | Inquiry notification           | Inquiry submission triggers notification (email + in-app)            |
| 1B.5 | Inquiry response               | Chef responds to inquiry → client receives the response              |
| 1B.6 | Lead scoring                   | AI lead score appears on inquiry (requires Ollama running)           |

### 1C. Messaging

| #    | Test                        | What "pass" looks like                                     |
| ---- | --------------------------- | ---------------------------------------------------------- |
| 1C.1 | Send message to client      | Chef sends message → it appears in the conversation thread |
| 1C.2 | Client portal messages      | Client logs in and sees messages from chef                 |
| 1C.3 | Notification on new message | New message triggers in-app notification                   |
| 1C.4 | Message with attachment     | Attach a file → it uploads, displays, and is downloadable  |

**Status:** Not started

---

## Tier 2: Client & Event Lifecycle

**What it proves:** The app can manage the core business workflow — from first contact to confirmed event.

### 2A. Client Management

| #    | Test                        | What "pass" looks like                                                     |
| ---- | --------------------------- | -------------------------------------------------------------------------- |
| 2A.1 | Create client manually      | Add a client with name, email, dietary restrictions → shows in client list |
| 2A.2 | Client created from inquiry | Accept an inquiry → client record auto-created with correct info           |
| 2A.3 | Client profile data         | Dietary restrictions, allergies, preferences all display correctly         |
| 2A.4 | Client portal invite        | Send portal invite → client receives email with login link                 |
| 2A.5 | Client signs in to portal   | Client uses invite → sees their events, messages, documents                |

### 2B. Event Lifecycle (the 8-state FSM)

| #     | Test                      | What "pass" looks like                                          |
| ----- | ------------------------- | --------------------------------------------------------------- |
| 2B.1  | Create event from scratch | New event with date, type, guest count → appears in events list |
| 2B.2  | Create event from inquiry | Inquiry → draft event with pre-filled details from inquiry      |
| 2B.3  | draft → proposed          | Transition event to proposed → client notified                  |
| 2B.4  | proposed → accepted       | Client accepts → event moves to accepted state                  |
| 2B.5  | accepted → paid           | Payment received → event moves to paid                          |
| 2B.6  | paid → confirmed          | Chef confirms → event locked in                                 |
| 2B.7  | confirmed → in_progress   | Event day arrives → status updates                              |
| 2B.8  | in_progress → completed   | Event finished → marked complete, AAR available                 |
| 2B.9  | Any state → cancelled     | Cancel event → status is terminal, no further transitions       |
| 2B.10 | Calendar integration      | Event appears on calendar with correct date/time                |
| 2B.11 | Event detail page         | All panels load: staff, menu, financials, timeline, contingency |

**Status:** Not started

---

## Tier 3: Financials

**What it proves:** The app can quote, invoice, and track real money.

### 3A. Quotes & Invoices

| #    | Test                   | What "pass" looks like                                        |
| ---- | ---------------------- | ------------------------------------------------------------- |
| 3A.1 | Create quote for event | Add line items, set prices → quote total calculates correctly |
| 3A.2 | Send quote to client   | Client receives quote email with correct amounts              |
| 3A.3 | Client accepts quote   | Client portal → accept → quote state transitions              |
| 3A.4 | Generate invoice       | Invoice created from accepted quote with correct line items   |
| 3A.5 | Invoice PDF            | PDF renders with correct branding, amounts, tax calculations  |
| 3A.6 | Loyalty adjustments    | Loyalty discounts apply correctly to invoice subtotal         |

### 3B. Payments

| #    | Test                       | What "pass" looks like                                         |
| ---- | -------------------------- | -------------------------------------------------------------- |
| 3B.1 | Stripe checkout            | Client pays via Stripe → payment recorded in ledger            |
| 3B.2 | Payment confirmation email | Client receives payment confirmation with correct amount       |
| 3B.3 | Partial payment            | Client pays deposit → balance remaining shows correctly        |
| 3B.4 | Ledger accuracy            | All payments, expenses, refunds reflected in financial summary |
| 3B.5 | Dashboard revenue          | Dashboard shows correct total revenue from real transactions   |

### 3C. Expenses

| #    | Test               | What "pass" looks like                                  |
| ---- | ------------------ | ------------------------------------------------------- |
| 3C.1 | Log expense        | Add expense to event → shows in event financials        |
| 3C.2 | Receipt upload     | Upload receipt photo → stored and viewable              |
| 3C.3 | Profit calculation | Revenue minus expenses = correct profit on event detail |

**Status:** Not started

---

## Tier 4: Operations

**What it proves:** The app can handle the logistics of actually running events.

| #    | Test                    | What "pass" looks like                                               |
| ---- | ----------------------- | -------------------------------------------------------------------- |
| 4.1  | Create recipe           | Add recipe with ingredients, instructions → shows in recipe book     |
| 4.2  | Build menu from recipes | Create menu, add dishes from recipe book → menu displays correctly   |
| 4.3  | Assign menu to event    | Link menu to event → menu appears on event detail                    |
| 4.4  | Menu approval flow      | Send menu for client approval → client approves in portal            |
| 4.5  | Grocery list generation | Generate grocery list from menu → correct ingredients and quantities |
| 4.6  | Grocery pricing         | Fetch real prices from Spoonacular/Kroger → food cost calculates     |
| 4.7  | Staff assignment        | Assign staff to event → they see it on their dashboard               |
| 4.8  | Temperature logging     | Log temps during event → stored and viewable on event detail         |
| 4.9  | Contingency planning    | Generate contingency plan for event → displays on event detail       |
| 4.10 | After Action Review     | Complete event → generate AAR → lessons learned stored               |

**Status:** Not started

---

## Tier 5: Intelligence

**What it proves:** AI and analytics deliver real insights from real data.

| #   | Test                       | What "pass" looks like                                                 |
| --- | -------------------------- | ---------------------------------------------------------------------- |
| 5.1 | Remy chat (basic)          | Ask Remy a question → gets contextual answer about your business       |
| 5.2 | Remy with client context   | Ask about a specific client → Remy knows their history and preferences |
| 5.3 | Dashboard analytics        | Revenue charts, event counts, client metrics reflect real data         |
| 5.4 | Client satisfaction trends | After multiple events, trend data appears                              |
| 5.5 | Smart scheduling           | Availability blocks respected when proposing event dates               |
| 5.6 | Automated follow-ups       | After event completion, follow-up email sent automatically             |
| 5.7 | Campaign outreach          | Draft campaign → personalized for real clients with real history       |

**Status:** Not started

---

## Testing Protocol

### Before Each Test Session

1. Reset account if needed (Mission Control > Reset button)
2. Ensure dev server is running on port 3100
3. Ensure Ollama is running (for AI features)
4. Sign in via "My Dashboard" button

### During Testing

- Screenshot failures
- Log the exact steps to reproduce
- Note whether the failure is UI (rendering) or Product (functionality)
- Fix before moving on — don't accumulate broken tests

### Passing Criteria

- A test passes when the **real outcome matches the expected outcome**
- "The button didn't crash" is NOT a pass — the feature must deliver its value
- If a feature requires an external service (Gmail, Stripe), the external round-trip must complete

### After Each Session

- Update this doc with test results (pass/fail/blocked)
- Commit the updated doc
- File bugs for failures that can't be fixed immediately

---

## Progress Tracker

| Tier      | Name                     | Tests  | Passed | Failed | Blocked | Status      |
| --------- | ------------------------ | ------ | ------ | ------ | ------- | ----------- |
| 0         | Account & Auth           | 6      | 0      | 0      | 0       | Not started |
| 1         | Communication            | 17     | 0      | 0      | 0       | Not started |
| 2         | Client & Event Lifecycle | 16     | 0      | 0      | 0       | Not started |
| 3         | Financials               | 14     | 0      | 0      | 0       | Not started |
| 4         | Operations               | 10     | 0      | 0      | 0       | Not started |
| 5         | Intelligence             | 7      | 0      | 0      | 0       | Not started |
| **Total** |                          | **70** | **0**  | **0**  | **0**   |             |

---

_Created 2026-02-28. This is a living document — update as tests are run._
