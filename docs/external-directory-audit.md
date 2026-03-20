# External Directory Audit: Add Buttons + Callable Functions

> Ground-truth codebase scan. Every feature mapped across three access layers:
> **UI** (add/create button), **API** (REST endpoint), and **Remy** (conversational AI action).
> Generated from scanning 495 pages, 28 v2 API routes, 2 v1 API routes, 62 Remy actions, and ~4,093 server actions.

---

## How to Read This Document

Each feature is categorized by its access coverage across three layers:

| Layer    | What It Means                                          |
| -------- | ------------------------------------------------------ |
| **UI**   | An add/create/new button exists on the page            |
| **API**  | A REST endpoint exists for external automation         |
| **Remy** | The AI concierge can perform this via natural language |

Status shorthand:

| Status        | UI  | API | Remy | Risk Level                                      |
| ------------- | --- | --- | ---- | ----------------------------------------------- |
| **FULL**      | Yes | Yes | Yes  | None                                            |
| **UI+API**    | Yes | Yes | No   | No conversational path                          |
| **UI+REMY**   | Yes | No  | Yes  | Can't automate externally                       |
| **UI-ONLY**   | Yes | No  | No   | Can't automate at all                           |
| **REMY-ONLY** | No  | No  | Yes  | Users can't discover via UI                     |
| **DARK**      | No  | No  | No   | Feature is inaccessible outside its owning page |
| **READ-ONLY** | N/A | N/A | N/A  | Intentional, no CTA needed                      |

---

## Part 1: Core Entity CRUD (Primary Workflow)

### Events

| Action           | UI CTA                           | API Endpoint                          | Remy Action               | Status   |
| ---------------- | -------------------------------- | ------------------------------------- | ------------------------- | -------- |
| Create event     | "New Event" on `/events`         | `POST /api/v2/events`                 | `agent.create_event`      | **FULL** |
| List events      | `/events` page                   | `GET /api/v2/events`                  | (search)                  | UI+API   |
| View event       | `/events/[id]` page              | `GET /api/v2/events/[id]`             | (search)                  | UI+API   |
| Update event     | Edit form on `/events/[id]/edit` | `PATCH /api/v2/events/[id]`           | `agent.update_event`      | **FULL** |
| Delete event     | Button on event page             | `DELETE /api/v2/events/[id]`          | Restricted                | UI+API   |
| Transition state | Buttons on event page            | `POST /api/v2/events/[id]/transition` | `agent.transition_event`  | **FULL** |
| Clone event      | Button on event page             | None                                  | `agent.clone_event`       | UI+REMY  |
| Archive event    | Button on event page             | None                                  | None                      | UI-ONLY  |
| Create from text | `/events/new/from-text`          | None                                  | `agent.intake_brain_dump` | UI+REMY  |
| Event wizard     | `/events/new/wizard`             | None                                  | None                      | UI-ONLY  |

### Clients

| Action             | UI CTA                                | API Endpoint                 | Remy Action                                        | Status   |
| ------------------ | ------------------------------------- | ---------------------------- | -------------------------------------------------- | -------- |
| Create client      | "Add Client" on `/clients`            | `POST /api/v2/clients`       | `agent.create_client`                              | **FULL** |
| List clients       | `/clients` page                       | `GET /api/v2/clients`        | (search)                                           | UI+API   |
| View client        | `/clients/[id]` page                  | `GET /api/v2/clients/[id]`   | (search)                                           | UI+API   |
| Update client      | Edit form                             | `PATCH /api/v2/clients/[id]` | `agent.update_client`                              | **FULL** |
| Invite client      | Button on client page                 | None                         | `agent.invite_client`                              | UI+REMY  |
| Add note           | Button on client page                 | None                         | `agent.add_client_note`                            | UI+REMY  |
| Add/remove tag     | Button on client page                 | None                         | `agent.add_client_tag` / `agent.remove_client_tag` | UI+REMY  |
| Merge duplicates   | `/clients/duplicates` page            | None                         | None                                               | UI-ONLY  |
| Client segments    | "Add" on `/clients/segments`          | None                         | None                                               | UI-ONLY  |
| Client preferences | `/clients/[id]/preferences`           | None                         | None                                               | UI-ONLY  |
| Gift cards         | `/clients/gift-cards`                 | None                         | None                                               | UI-ONLY  |
| Referrals          | "Add" on `/clients/loyalty/referrals` | None                         | None                                               | UI-ONLY  |
| Bulk import        | `/import` page                        | None                         | `agent.intake_bulk_clients`                        | UI+REMY  |

### Quotes

| Action         | UI CTA                   | API Endpoint                      | Remy Action              | Status   |
| -------------- | ------------------------ | --------------------------------- | ------------------------ | -------- |
| Create quote   | "New Quote" on `/quotes` | `POST /api/v2/quotes`             | `agent.create_quote`     | **FULL** |
| List quotes    | `/quotes` page           | `GET /api/v2/quotes`              | (search)                 | UI+API   |
| View quote     | `/quotes/[id]` page      | `GET /api/v2/quotes/[id]`         | (search)                 | UI+API   |
| Update quote   | Edit form                | `PATCH /api/v2/quotes/[id]`       | None                     | UI+API   |
| Send to client | Button on quote page     | `POST /api/v2/quotes/[id]/send`   | `agent.transition_quote` | **FULL** |
| Accept quote   | Button on quote page     | `POST /api/v2/quotes/[id]/accept` | None                     | UI+API   |

### Inquiries

| Action             | UI CTA                        | API Endpoint                   | Remy Action                    | Status   |
| ------------------ | ----------------------------- | ------------------------------ | ------------------------------ | -------- |
| Create inquiry     | "New Inquiry" on `/inquiries` | `POST /api/v2/inquiries`       | `agent.create_inquiry`         | **FULL** |
| List inquiries     | `/inquiries` page             | `GET /api/v2/inquiries`        | (search)                       | UI+API   |
| Update inquiry     | Edit form                     | `PATCH /api/v2/inquiries/[id]` | `agent.update_inquiry`         | **FULL** |
| Transition inquiry | Buttons on inquiry page       | None                           | `agent.transition_inquiry`     | UI+REMY  |
| Convert to event   | Button on inquiry page        | None                           | `agent.convert_inquiry`        | UI+REMY  |
| Decline inquiry    | Button on inquiry page        | None                           | `agent.decline_inquiry`        | UI+REMY  |
| Add note           | Button on inquiry page        | None                           | `agent.add_inquiry_note`       | UI+REMY  |
| Embed widget       | Public embed form             | `POST /api/embed/inquiry`      | None                           | UI+API   |
| First response     | Button                        | None                           | `draft.inquiry_first_response` | UI+REMY  |

### Menus

| Action             | UI CTA                          | API Endpoint               | Remy Action                | Status   |
| ------------------ | ------------------------------- | -------------------------- | -------------------------- | -------- |
| Create menu        | "New Menu" on `/culinary/menus` | `POST /api/v2/menus`       | `agent.create_menu`        | **FULL** |
| List menus         | `/culinary/menus` page          | `GET /api/v2/menus`        | (search)                   | UI+API   |
| View menu          | `/culinary/menus/[id]`          | `GET /api/v2/menus/[id]`   | (search)                   | UI+API   |
| Update menu        | Edit form                       | `PATCH /api/v2/menus/[id]` | `agent.update_menu`        | **FULL** |
| Upload menu        | `/menus/upload`                 | `POST /api/menus/upload`   | None                       | UI+API   |
| Link menu to event | Button                          | None                       | `agent.link_menu_event`    | UI+REMY  |
| Add dish           | Button in menu editor           | None                       | `agent.add_dish`           | UI+REMY  |
| Update dish        | Inline edit                     | None                       | `agent.update_dish`        | UI+REMY  |
| Add component      | Button in dish detail           | None                       | `agent.add_component`      | UI+REMY  |
| Duplicate menu     | Button                          | None                       | `agent.duplicate_menu`     | UI+REMY  |
| Save as template   | Button                          | None                       | `agent.save_menu_template` | UI+REMY  |
| Send for approval  | Button                          | None                       | `agent.send_menu_approval` | UI+REMY  |
| Transition menu    | Button                          | None                       | `agent.transition_menu`    | UI+REMY  |
| Approve menu       | Button on menu page             | None                       | None                       | UI-ONLY  |
| Scale menu         | `/culinary/menus/scaling`       | None                       | None                       | UI-ONLY  |
| Menu substitutions | `/culinary/menus/substitutions` | None                       | None                       | UI-ONLY  |
| Menu proposal      | Button                          | None                       | `draft.menu_proposal`      | UI+REMY  |
| Run grocery quote  | Button                          | None                       | `agent.run_grocery_quote`  | UI+REMY  |
| Log grocery actual | Button                          | None                       | `agent.log_grocery_actual` | UI+REMY  |

### Recipes

| Action        | UI CTA                     | API Endpoint               | Remy Action     | Status   |
| ------------- | -------------------------- | -------------------------- | --------------- | -------- |
| Create recipe | "New Recipe" on `/recipes` | `POST /api/v2/recipes`     | Restricted      | UI+API   |
| List recipes  | `/recipes` page            | `GET /api/v2/recipes`      | `recipe.search` | **FULL** |
| View recipe   | `/recipes/[id]`            | `GET /api/v2/recipes/[id]` | `recipe.search` | **FULL** |
| Update recipe | Edit form                  | None (PATCH missing)       | Restricted      | UI-ONLY  |
| Import recipe | Button on recipes page     | None                       | None            | UI-ONLY  |

---

## Part 2: Finance + Commerce

### Expenses

| Action         | UI CTA                       | API Endpoint                | Remy Action            | Status   |
| -------------- | ---------------------------- | --------------------------- | ---------------------- | -------- |
| Create expense | "New Expense" on `/expenses` | `POST /api/v2/expenses`     | `agent.log_expense`    | **FULL** |
| List expenses  | `/expenses` page             | `GET /api/v2/expenses`      | (search)               | UI+API   |
| View expense   | `/expenses/[id]`             | `GET /api/v2/expenses/[id]` | (search)               | UI+API   |
| Update expense | Edit form                    | None (PATCH missing)        | `agent.update_expense` | UI+REMY  |

### Payments + Ledger

| Action              | UI CTA                                 | API Endpoint                     | Remy Action         | Status  |
| ------------------- | -------------------------------------- | -------------------------------- | ------------------- | ------- |
| Record payment      | Button on event page                   | `POST /api/v2/payments`          | Restricted          | UI+API  |
| List ledger entries | `/finance/ledger` page                 | `GET /api/v2/ledger`             | None                | UI+API  |
| Financial summary   | Dashboard widgets                      | `GET /api/v2/financials/summary` | None                | UI+API  |
| Ledger adjustments  | "Add" on `/finance/ledger/adjustments` | None                             | Restricted          | UI-ONLY |
| Record tip          | Button on event page                   | None                             | `agent.record_tip`  | UI+REMY |
| Log mileage         | Button on event page                   | None                             | `agent.log_mileage` | UI+REMY |
| Cash flow view      | `/finance/cash-flow`                   | None                             | None                | UI-ONLY |
| Tax prep            | `/finance/tax/*` pages                 | None                             | None                | UI-ONLY |
| Payroll             | `/finance/payroll/*` pages             | None                             | None                | UI-ONLY |
| Year-end reporting  | `/finance/year-end`                    | None                             | None                | UI-ONLY |

### Invoices

| Action               | UI CTA                        | API Endpoint                           | Remy Action | Status  |
| -------------------- | ----------------------------- | -------------------------------------- | ----------- | ------- |
| Create invoice       | Button on `/finance/invoices` | None                                   | None        | UI-ONLY |
| Generate invoice PDF | Button on event page          | `GET /api/documents/invoice/[eventId]` | None        | UI+API  |
| List invoices        | `/finance/invoices` page      | None                                   | None        | UI-ONLY |

### Retainers

| Action          | UI CTA                                 | API Endpoint | Remy Action | Status  |
| --------------- | -------------------------------------- | ------------ | ----------- | ------- |
| Create retainer | "New Retainer" on `/finance/retainers` | None         | None        | UI-ONLY |
| View retainer   | `/finance/retainers/[id]`              | None         | None        | UI-ONLY |

### Commerce / POS (entire module)

| Action           | UI CTA                                | API Endpoint | Remy Action | Status  |
| ---------------- | ------------------------------------- | ------------ | ----------- | ------- |
| Products CRUD    | "Add Product" on `/commerce/products` | None         | None        | UI-ONLY |
| Orders           | `/commerce/orders`                    | None         | None        | UI-ONLY |
| Sales            | `/commerce/sales`                     | None         | None        | UI-ONLY |
| Register         | `/commerce/register`                  | None         | None        | UI-ONLY |
| Settlements      | `/commerce/settlements`               | None         | None        | UI-ONLY |
| Promotions       | `/commerce/promotions`                | None         | None        | UI-ONLY |
| Refunds/disputes | Various                               | None         | Restricted  | UI-ONLY |
| Table service    | "Add" on `/commerce/table-service`    | None         | None        | UI-ONLY |

---

## Part 3: Staff + Operations

| Action                | UI CTA                 | API Endpoint                       | Remy Action                | Status                  |
| --------------------- | ---------------------- | ---------------------------------- | -------------------------- | ----------------------- |
| Add staff member      | "Add" on `/staff`      | None                               | `agent.create_staff`       | UI+REMY                 |
| Assign staff to event | Button on event page   | None                               | `agent.assign_staff`       | UI+REMY                 |
| Record staff hours    | Button                 | None                               | `agent.record_staff_hours` | UI+REMY                 |
| Staff schedule        | `/staff/schedule`      | None                               | None                       | UI-ONLY                 |
| Staff availability    | `/staff/availability`  | None                               | None                       | UI-ONLY                 |
| Staff performance     | `/staff/performance`   | None                               | None                       | UI-ONLY                 |
| Time clock            | `/staff/clock`         | None                               | None                       | UI-ONLY                 |
| Labor tracking        | `/staff/labor`         | None                               | None                       | UI-ONLY                 |
| Scheduling (chef)     | "Add" on `/scheduling` | `GET /api/scheduling/availability` | None                       | UI-ONLY (read API only) |
| Stations              | "Add" on `/stations`   | None                               | None                       | UI-ONLY                 |

---

## Part 4: Inventory + Vendors

| Action                | UI CTA                                                 | API Endpoint | Remy Action | Status   |
| --------------------- | ------------------------------------------------------ | ------------ | ----------- | -------- |
| Inventory audits      | "New Audit" on `/inventory/audits`                     | None         | None        | UI-ONLY  |
| Purchase orders       | "New PO" on `/inventory/purchase-orders`               | None         | None        | UI-ONLY  |
| Ingredients           | "Add" on `/culinary/ingredients`                       | None         | None        | UI-ONLY  |
| Seasonal availability | "Add" on `/culinary/ingredients/seasonal-availability` | None         | None        | UI-ONLY  |
| Waste tracking        | `/inventory/waste`                                     | None         | None        | **DARK** |
| Vendor management     | "Add" on `/vendors`                                    | None         | None        | UI-ONLY  |
| Vendor invoices       | `/vendors/invoices`                                    | None         | None        | UI-ONLY  |
| Price comparison      | `/vendors/price-comparison`                            | None         | None        | **DARK** |

---

## Part 5: Marketing + Engagement

| Action              | UI CTA                                         | API Endpoint | Remy Action | Status  |
| ------------------- | ---------------------------------------------- | ------------ | ----------- | ------- |
| Marketing campaigns | "Add" on `/marketing/sequences`                | None         | None        | UI-ONLY |
| Email templates     | "Add" on `/marketing/templates`                | None         | None        | UI-ONLY |
| Push dinners        | "New Push Dinner" on `/marketing/push-dinners` | None         | None        | UI-ONLY |
| Loyalty program     | "Add" on `/loyalty`                            | None         | None        | UI-ONLY |
| Loyalty rewards     | "New Reward" on `/loyalty/rewards/new`         | None         | None        | UI-ONLY |
| Leads               | "Add" on `/leads`                              | None         | None        | UI-ONLY |
| Guest leads         | "Add" on `/guest-leads`                        | None         | None        | UI-ONLY |
| Waitlist            | "Add" on `/waitlist`                           | None         | None        | UI-ONLY |
| Proposals           | "Add" on `/proposals`                          | None         | None        | UI-ONLY |

---

## Part 6: Social + Community

| Action                 | UI CTA                                 | API Endpoint | Remy Action | Status    |
| ---------------------- | -------------------------------------- | ------------ | ----------- | --------- |
| Circles (dinner clubs) | "+ Dinner Club" on `/circles`          | None         | None        | UI-ONLY   |
| Chat conversations     | "New Conversation" on `/chat`          | None         | None        | UI-ONLY   |
| Network connections    | **NONE** on `/network`                 | None         | None        | **DARK**  |
| Network channels       | **NONE** on `/network`                 | None         | None        | **DARK**  |
| Reviews                | "Log Feedback" on `/reviews`           | None         | None        | UI-ONLY   |
| Testimonials           | None (auto from surveys)               | None         | None        | READ-ONLY |
| Surveys                | None (auto from events)                | None         | None        | READ-ONLY |
| Social posts           | Compose on `/social/compose/[eventId]` | None         | None        | UI-ONLY   |
| Guests                 | Inline form on `/guests`               | None         | None        | UI-ONLY   |

---

## Part 7: Calls, Goals, Partners, Safety (Previously Missing)

| Action                 | UI CTA                                   | API Endpoint | Remy Action              | Status  |
| ---------------------- | ---------------------------------------- | ------------ | ------------------------ | ------- |
| Schedule call          | "Schedule call" on `/calls`              | None         | `agent.schedule_call`    | UI+REMY |
| Log call outcome       | Button on call detail                    | None         | `agent.log_call_outcome` | UI+REMY |
| Cancel call            | Button on call detail                    | None         | `agent.cancel_call`      | UI+REMY |
| Create goal            | "Add Goal" on `/goals`                   | None         | None                     | UI-ONLY |
| Add partner            | "+ Add Partner" on `/partners`           | None         | None                     | UI-ONLY |
| Report safety incident | "Report Incident" on `/safety/incidents` | None         | None                     | UI-ONLY |

---

## Part 8: Event Operations (During/After Service)

| Action                    | UI CTA                    | API Endpoint | Remy Action                       | Status  |
| ------------------------- | ------------------------- | ------------ | --------------------------------- | ------- |
| Save debrief              | Button on event close-out | None         | `agent.save_debrief`              | UI+REMY |
| Complete safety checklist | Button                    | None         | `agent.complete_safety_checklist` | UI+REMY |
| Log alcohol served        | Button                    | None         | `agent.log_alcohol`               | UI+REMY |
| Generate prep timeline    | Button                    | None         | `agent.generate_prep_timeline`    | UI+REMY |
| Acknowledge scope drift   | Button                    | None         | `agent.acknowledge_scope_drift`   | UI+REMY |
| Pre-event briefing        | Button                    | None         | `send.pre_event_briefing`         | UI+REMY |
| Arrival notification      | Button                    | None         | `send.arrival_notification`       | UI+REMY |

---

## Part 9: Documents + Search

| Action                | UI CTA            | API Endpoint                                     | Remy Action               | Status   |
| --------------------- | ----------------- | ------------------------------------------------ | ------------------------- | -------- |
| Generate document     | Button per event  | `POST /api/v2/documents/generate`                | None                      | UI+API   |
| List documents        | `/documents` page | `GET /api/v2/documents`                          | `agent.search_documents`  | **FULL** |
| Invoice PDF           | Button            | `GET /api/documents/invoice/[eventId]`           | None                      | UI+API   |
| Quote PDF             | Button            | `GET /api/documents/quote/[quoteId]`             | None                      | UI+API   |
| Contract PDF          | Button            | `GET /api/documents/contract/[contractId]`       | None                      | UI+API   |
| Receipt               | Button            | `GET /api/documents/receipt/[eventId]`           | None                      | UI+API   |
| Financial summary PDF | Button            | `GET /api/documents/financial-summary/[eventId]` | None                      | UI+API   |
| FOH menu              | Button            | `GET /api/documents/foh-menu/[eventId]`          | None                      | UI+API   |
| Universal search      | Cmd+K palette     | `GET /api/v2/search`                             | (built-in)                | **FULL** |
| Create doc folder     | Button            | None                                             | `agent.create_doc_folder` | UI+REMY  |

---

## Part 10: Settings + Configuration

| Action             | UI CTA                                     | API Endpoint                             | Remy Action | Status  |
| ------------------ | ------------------------------------------ | ---------------------------------------- | ----------- | ------- |
| Preferences        | Settings pages                             | `GET/PATCH /api/v2/settings/preferences` | None        | UI+API  |
| Pricing config     | Settings page                              | `GET/PATCH /api/v2/settings/pricing`     | None        | UI+API  |
| Automation rules   | "Add" on `/settings/automations`           | `CRUD /api/v2/settings/automations`      | None        | UI+API  |
| API keys           | `/settings/api-keys`                       | Used for auth (not CRUD via API)         | None        | PARTIAL |
| Embed widget       | `/settings/embed`                          | Public embed routes                      | None        | UI+API  |
| Webhook endpoints  | "+ New Endpoint" on `/settings/webhooks`   | None                                     | None        | UI-ONLY |
| Module toggles     | `/settings/modules`                        | None                                     | None        | UI-ONLY |
| Menu engine config | `/settings/menu-engine`                    | None                                     | None        | UI-ONLY |
| Dashboard layout   | `/settings/dashboard`                      | None                                     | None        | UI-ONLY |
| Calendar sync      | `/settings/calendar-sync`                  | `GET /api/feeds/calendar/[token]`        | None        | PARTIAL |
| Notification prefs | `/settings/notifications`                  | `POST /api/push/subscribe`               | None        | PARTIAL |
| Compliance certs   | "Add" on `/settings/compliance`            | None                                     | None        | UI-ONLY |
| Custom fields      | "+ Add Field" on `/settings/custom-fields` | None                                     | None        | UI-ONLY |
| Event types        | `/settings/event-types`                    | None                                     | None        | UI-ONLY |
| Response templates | "Create new" on `/settings/templates`      | None                                     | None        | UI-ONLY |
| Contract templates | "Add template" on `/settings/contracts`    | None                                     | None        | UI-ONLY |

---

## Part 11: Scheduling + Calendar

| Action                | UI CTA                | API Endpoint                       | Remy Action                   | Status  |
| --------------------- | --------------------- | ---------------------------------- | ----------------------------- | ------- |
| Create calendar entry | Button on `/calendar` | None                               | `agent.create_calendar_entry` | UI+REMY |
| Update calendar entry | Edit on calendar      | None                               | `agent.update_calendar_entry` | UI+REMY |
| Hold date             | Button                | None                               | `agent.hold_date`             | UI+REMY |
| Chef availability     | Calendar view         | `GET /api/scheduling/availability` | None                          | UI+API  |

---

## Part 12: Remy-Only Actions (No UI Button, No API)

These actions are accessible only through conversational AI. Users must know to ask Remy.

| Action                | Remy Action                   | What It Does                                           | UI Equivalent                |
| --------------------- | ----------------------------- | ------------------------------------------------------ | ---------------------------- |
| Daily briefing        | `agent.daily_briefing`        | Morning summary of today's events, prep, overdue items | `/briefing` page (read-only) |
| What's next           | `agent.whats_next`            | Prioritized recommendation of most important action    | `/queue` page (read-only)    |
| Create todo           | `agent.create_todo`           | Create task with due date and priority                 | `/tasks` page                |
| Add emergency contact | `agent.add_emergency_contact` | Add backup chef or emergency contact                   | `/settings/emergency`        |
| Intake transcript     | `agent.intake_transcript`     | Parse call/meeting transcript for client info          | None                         |
| Draft email           | `agent.draft_email`           | Draft 10+ email types (thank you, referral, etc.)      | None                         |

---

## Part 13: Prospecting (Admin-Only)

| Action           | UI CTA                  | API Endpoint                              | Remy Action | Status |
| ---------------- | ----------------------- | ----------------------------------------- | ----------- | ------ |
| Add prospect     | "Add" on `/prospecting` | `POST /api/prospecting/import`            | None        | UI+API |
| Enrich prospect  | Button                  | `PATCH /api/prospecting/[id]/enrich`      | None        | UI+API |
| Convert prospect | Button                  | `POST /api/prospecting/[id]/convert`      | None        | UI+API |
| Pipeline view    | `/prospecting/pipeline` | `GET /api/prospecting/queue`              | None        | UI+API |
| Draft email      | Button                  | `PATCH /api/prospecting/[id]/draft-email` | None        | UI+API |

---

## Part 14: Permanently Restricted Actions

These actions are intentionally blocked from API and Remy for safety/compliance reasons.

| Action                  | Why Restricted                                                | How to Do It                                       |
| ----------------------- | ------------------------------------------------------------- | -------------------------------------------------- |
| Write to ledger         | Financial ledger is immutable, append-only. Audit compliance. | Event page, Payments tab, Record Payment           |
| Modify user roles       | Security: tenant isolation protection                         | Settings, Team, Manage roles                       |
| Delete data permanently | Prevent accidental data loss                                  | Navigate to record, use delete button (draft-only) |
| Send email directly     | All outbound comms require chef review                        | Draft via Remy, then copy/send manually            |
| Process refund          | Financial ledger operations require manual entry              | Event page, Payments, Record Adjustment            |
| Create/update recipe    | Chef's creative IP. AI must never generate recipes.           | Recipes, New Recipe (manual only)                  |
| Add recipe ingredients  | Chef's creative IP.                                           | Recipe edit form (manual only)                     |

---

## Part 15: Intentionally Read-Only Pages (No CTA Needed)

| Page                   | Why No Add Button                   | Data Source           |
| ---------------------- | ----------------------------------- | --------------------- |
| `/dashboard`           | Aggregation view                    | Multiple tables       |
| `/notifications`       | System-generated                    | Notification engine   |
| `/activity`            | System-generated                    | Activity log          |
| `/documents`           | Generated from events               | Document generation   |
| `/surveys`             | Auto-sent post-event                | Survey engine         |
| `/testimonials`        | Sourced from survey responses       | Surveys               |
| `/travel`              | Created from event travel planning  | Events                |
| `/portfolio`           | Photos uploaded per-event           | Events                |
| `/analytics/*` (all)   | Computed views                      | Multiple tables       |
| `/finance/overview/*`  | Computed summaries                  | Ledger + events       |
| `/calendar/*`          | Events rendered from events table   | Events                |
| `/queue`               | Priority queue (computed)           | Multiple tables       |
| `/insights`            | AI-generated intelligence           | Ollama + data         |
| `/consulting`          | Educational content                 | Static                |
| `/rate-card`           | Generated from pricing config       | `chef_pricing_config` |
| `/daily`               | Daily briefing (computed)           | Multiple tables       |
| `/food-cost`           | Computed from recipes + ingredients | Recipes + inventory   |
| `/production`          | Calendar view of events             | Events                |
| `/briefing`            | Auto-generated morning summary      | Multiple tables       |
| `/inbox`               | Messages from external sources      | Gmail + messages      |
| `/cannabis`            | Navigation hub to sub-sections      | N/A                   |
| `/social` (root)       | Redirects to `/social/planner`      | N/A                   |
| `/community/templates` | Browse + import shared templates    | Community             |
| `/meal-prep`           | Program view (events via clients)   | Events                |

---

## Summary: The Complete Gap Matrix

### By the Numbers

| Category                             | Count       | % of Features |
| ------------------------------------ | ----------- | ------------- |
| **FULL** (UI + API + Remy)           | 12 actions  | 5%            |
| **UI+API** (no Remy)                 | 33 actions  | 14%           |
| **UI+REMY** (no API)                 | 42 actions  | 17%           |
| **UI-ONLY** (no API, no Remy)        | ~95 actions | 39%           |
| **REMY-ONLY** (no UI button, no API) | 6 actions   | 2%            |
| **DARK** (no UI, no API, no Remy)    | 4 features  | 2%            |
| **READ-ONLY** (intentional)          | ~25 pages   | 10%           |
| **RESTRICTED** (intentional)         | 8 actions   | 3%            |

### FULL Coverage (all three layers)

These 12 features have complete access: UI button, REST API, and Remy conversational action.

1. Create event
2. Update event
3. Transition event state
4. Create client
5. Update client
6. Create quote
7. Send quote
8. Create inquiry
9. Update inquiry
10. Create menu
11. Update menu
12. Create expense

### Critical DARK Features (task completion blockers)

No UI add button, no API endpoint, no Remy action. Users cannot perform these actions.

1. **`/network` - Add Connection** - browse the chef network but can't initiate a connection
2. **`/network` - Create Channel** - no CTA to create a network channel
3. **`/inventory/waste` - Log Waste** - page shows waste data but no add button
4. **`/vendors/price-comparison` - Add Comparison** - read-only view, no action path

### Top Priority Gaps

**Tier 1: Complete missing CRUD on existing v2 resources**

- `PATCH /api/v2/recipes/[id]` (update recipe, create exists)
- `PATCH /api/v2/expenses/[id]` (update expense, create exists)
- `DELETE /api/v2/expenses/[id]`
- `DELETE /api/v2/quotes/[id]`
- `DELETE /api/v2/menus/[id]`
- `DELETE /api/v2/inquiries/[id]`

**Tier 2: New resource APIs (high business value)**

- `/api/v2/invoices` - CRUD
- `/api/v2/staff` - CRUD
- `/api/v2/vendors` - CRUD
- `/api/v2/inventory` - CRUD
- `/api/v2/calls` - CRUD

**Tier 3: Action APIs (verb endpoints)**

- `POST /api/v2/events/[id]/clone`
- `POST /api/v2/events/[id]/archive`
- `POST /api/v2/menus/[id]/approve`
- `POST /api/v2/clients/[id]/merge`
- `POST /api/v2/inquiries/[id]/convert`

**Tier 4: Feature module APIs**

- `/api/v2/loyalty` - rewards, points
- `/api/v2/marketing` - campaigns, templates
- `/api/v2/commerce` - POS, orders, settlements
- `/api/v2/webhooks` - manage webhook subscriptions via API
- `/api/v2/calendar` - entries, holds, availability

### UI CTA Fixes Needed (DARK features)

1. **`/network`** - Add "Invite Connection" button to Connections tab
2. **`/network`** - Add "Create Channel" button to Channels tab
3. **`/inventory/waste`** - Add "Log Waste" button
4. **`/vendors/price-comparison`** - Add "New Comparison" or link from vendor pages

### Entire Modules with ZERO API Coverage

| Module                    | Server Action Files | UI Pages | Remy Coverage                   | API Routes |
| ------------------------- | ------------------- | -------- | ------------------------------- | ---------- |
| Finance (beyond expenses) | 28                  | 30+      | Partial (tips, mileage)         | 0          |
| Commerce / POS            | 22                  | 15+      | None                            | 0          |
| Inventory                 | 18                  | 10+      | None                            | 0          |
| Staff                     | 14                  | 8+       | Partial (create, assign, hours) | 0          |
| Vendors                   | 10                  | 4+       | None                            | 0          |
| Analytics                 | 8                   | 10+      | None                            | 0          |
| Marketing                 | 8                   | 5+       | None                            | 0          |
| Loyalty                   | 6                   | 5+       | None                            | 0          |
| Community/Network         | 6                   | 5+       | None                            | 0          |
| Compliance                | 5                   | 3+       | None                            | 0          |
| Proposals                 | 5                   | 3+       | None                            | 0          |

---

## Methodology

This audit was produced by:

1. **Page scan:** `glob app/(chef)/**/page.tsx` found 495 pages
2. **CTA scan:** Each page read and searched for "Add", "New", "Create", "+", `href.*new` patterns
3. **API scan:** `glob app/api/**/route.ts` found 114 route files (28 v2, 2 v1, 84 internal/webhook/cron/health)
4. **Server action scan:** `grep 'use server'` across `lib/` found ~899 files with ~4,093 exported functions
5. **Remy action scan:** All files in `lib/ai/agent-actions/` read; 62 callable actions + 8 restricted actions cataloged
6. **Cross-reference:** Each entity type checked for UI CTA, API endpoint, and Remy action existence
7. **Classification:** Every feature placed in FULL / UI+API / UI+REMY / UI-ONLY / REMY-ONLY / DARK / READ-ONLY / RESTRICTED

The scan is deterministic and repeatable. Run the same globs and greps to verify.

---

## Update Log

| Date       | What Changed                                                |
| ---------- | ----------------------------------------------------------- |
| 2026-03-20 | Initial comprehensive audit with three-layer coverage model |
