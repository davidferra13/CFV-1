# ChefFlow Failure Rubric

> Foundational philosophy document. Defines what constitutes a failing grade across every feature domain ChefFlow mirrors.

---

## The Universal Failure Law

> **If the user has to leave your app to do the thing your app claims to do, you failed.**

Three failure types recur across every product category:

1. **The Void** - Action taken, no visible feedback. Sent proposal, no tracking. Recorded payment, no updated balance. Background job ran, no proof. Consumer feels: "Did that work?"
2. **The Island** - Data exists but isn't connected. Client exists, events exist, payments exist, but they don't reference each other. Recipe has ingredients but no cost. Event has a menu but no shopping list. Consumer feels: "I still have to connect the dots myself."
3. **The Facade** - Page exists, nav item exists, but the feature is shallow. Staff page is a phone book. Marketing is a send button. Analytics is a number with no context. Consumer feels: "This looks like it does something but it doesn't really."

---

## The Visual Mandate

Every human digests the world visually. If something happens in the background with no visual representation, it is the same as it not happening. Three rules:

- **No unwired surfaces.** Everything on screen does something. No exceptions, no "coming soon," no dead buttons. Wired or hidden.
- **No headless operations.** Every background process has a visual heartbeat. Sync running? Show it. Data importing? Show it. AI thinking? Show it. Cron job completed? Show the result somewhere the chef will see it.
- **No silent state changes.** If a price updated, a client responded, an event changed status, a payment cleared: the chef sees proof. Toast, badge, status change, timeline entry, something.

---

## Failure Rubric by Product Mirror

### 1. CRM (mirrors: HoneyBook, HubSpot, Dubsado)

**ChefFlow features:** clients, client profiles, communication history, lifecycle tracking

| Failure Type         | What it looks like                                                                                                                                                |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**               | Client profile with no visible history. Chef clicks a client, sees a name and nothing else. No timeline, no last contact date, no event count.                    |
| **Backend**          | Contact created but no relationship to their events, emails, or payments. Orphan record.                                                                          |
| **Consumer verdict** | "I can't see my relationship with this person at a glance." HubSpot shows EVERYTHING on one contact page. If ChefFlow shows less than a Google Contact, it fails. |

**Passing grade:** One-page client view shows: last contact, total events, total revenue, dietary notes, upcoming events, communication timeline. All without scrolling.

---

### 2. Event Booking (mirrors: Tripleseat, Caterease, Planning Pod)

**ChefFlow features:** events, event lifecycle, booking, event detail pages

| Failure Type         | What it looks like                                                                                                                                                                     |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**               | Event page that doesn't show current status front and center. Chef has to hunt for whether this dinner is confirmed, pending, or paid.                                                 |
| **Backend**          | Event exists but menu isn't linked, or payment status is stale, or date changed but calendar didn't update.                                                                            |
| **Consumer verdict** | "I don't know what state this event is in." Tripleseat puts status badge + next action on every event card. If a chef has to click into 3 tabs to know if a dinner is ready, it fails. |

**Passing grade:** Event card shows: status badge, date, guest count, payment status, menu status, next required action. All visible before clicking in.

---

### 3. Recipe Management (mirrors: Meez, ChefTec, Galley)

**ChefFlow features:** recipes, ingredients, scaling, food costing

| Failure Type         | What it looks like                                                                                                                                                     |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**               | Recipe with no cost, no yield, no prep time visible. Just a list of ingredients and steps like a blog recipe.                                                          |
| **Backend**          | Recipe exists but ingredients aren't linked to pricing data. Scaling math doesn't work. Yields are wrong.                                                              |
| **Consumer verdict** | "This is just a note-taking app." Meez shows cost-per-serving, allergens, scaling, and prep photos inline. If ChefFlow recipes are text-only, it's a fancy Google Doc. |

**Passing grade:** Recipe view shows: total cost, cost-per-serving, yield, prep time, cook time, allergen flags, scalable quantities. All inline, not behind tabs.

---

### 4. Finance (mirrors: QuickBooks, FreshBooks, Wave)

**ChefFlow features:** finance, payments, expenses, receipts, invoicing

| Failure Type         | What it looks like                                                                                                                                                                                      |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**               | No visible outstanding balance. No aging report. No "you're owed $X" on the dashboard. Money exists in the system but the chef can't see the financial picture.                                         |
| **Backend**          | Payment recorded but invoice status not updated. Revenue calculated but expenses not deducted. Partial payments not tracked.                                                                            |
| **Consumer verdict** | "I don't trust the numbers." QuickBooks dashboard: income, expenses, profit, outstanding, overdue. All visible in 2 seconds. If a chef has to manually calculate profit, finance feature is decoration. |

**Passing grade:** Finance hub shows: total revenue (period), total expenses, profit margin, outstanding invoices (count + amount), overdue invoices flagged red. Updated in real-time.

---

### 5. Proposals & Quotes (mirrors: Proposify, PandaDoc, HoneyBook)

**ChefFlow features:** proposals, quotes, client-facing documents

| Failure Type         | What it looks like                                                                                                                                                                              |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**               | Proposal sent but no way to see if client opened it, viewed it, or how long ago. No "awaiting response" badge. No follow-up prompt.                                                             |
| **Backend**          | Proposal created but not linked to the event it belongs to. Accepted proposal doesn't auto-create the event or trigger next steps.                                                              |
| **Consumer verdict** | "I sent it into the void." PandaDoc shows: sent, opened, viewed (with time), commented, signed. Every state visible. If a proposal has only "sent" and "accepted" as states, the chef is blind. |

**Passing grade:** Proposal card shows: status (draft/sent/viewed/accepted/declined), last activity timestamp, linked event, follow-up reminder if stale > 48h.

---

### 6. Kitchen Ops (mirrors: Meez, Galley, KitchenOS)

**ChefFlow features:** prep, kitchen, stations, production, meal-prep

| Failure Type         | What it looks like                                                                                                                                                                                                                                |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**               | Event happening tomorrow but no consolidated prep list. Chef has to open each recipe individually and mentally compile what needs to happen.                                                                                                      |
| **Backend**          | Prep tasks exist but aren't time-sequenced. No dependency chain (defrost before marinate before sear).                                                                                                                                            |
| **Consumer verdict** | "This doesn't help me cook." Meez generates a prep list from the menu with times, quantities, and station assignments. If ChefFlow can't produce a "here's what to do and when" view for tomorrow's dinner, kitchen ops is a label on a nav item. |

**Passing grade:** Given an event date, the system produces: consolidated prep list (all recipes combined), time-sequenced tasks, quantities adjusted for guest count, station assignments if applicable.

---

### 7. Inventory & Shopping (mirrors: MarketMan, BlueCart, xtraCHEF)

**ChefFlow features:** inventory, shopping, vendor management

| Failure Type         | What it looks like                                                                                                                                                                                                                   |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **UI**               | No "you need to buy X for Saturday's dinner" anywhere. Shopping list exists but isn't generated from upcoming events.                                                                                                                |
| **Backend**          | Ingredients on a menu but not mapped to inventory. No quantity aggregation across events.                                                                                                                                            |
| **Consumer verdict** | "I still have to make my own shopping list." MarketMan auto-generates purchase orders from menu planning. If the chef is still writing lists on paper because ChefFlow's list doesn't account for what's already in stock, it fails. |

**Passing grade:** One click from an event generates a shopping list. Quantities aggregated across all upcoming events. Items grouped by vendor or store aisle. Existing inventory subtracted.

---

### 8. Staff Management (mirrors: 7shifts, Homebase, When I Work)

**ChefFlow features:** staff, team

| Failure Type         | What it looks like                                                                                                                                                                         |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **UI**               | Staff page with names but no schedule view. No "who's working Saturday?" answer visible.                                                                                                   |
| **Backend**          | Staff member exists but isn't assignable to events. Hours not trackable.                                                                                                                   |
| **Consumer verdict** | "I still text my staff." 7shifts: visual schedule, shift swaps, availability, labor cost. If ChefFlow staff is a contact list with no operational connection to events, it's a phone book. |

**Passing grade:** Staff view answers: who's assigned to upcoming events, who's available this week, labor cost per event. Staff linked to events, not just listed.

---

### 9. Marketing & Email (mirrors: Mailchimp, Constant Contact)

**ChefFlow features:** marketing, content, social, email campaigns

| Failure Type         | What it looks like                                                                                                                                                                                                            |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**               | "Send email" exists but no send history, no open rates, no "last contacted" anywhere.                                                                                                                                         |
| **Backend**          | Email sent but no record on the client's profile. No segmentation. Blast to everyone or nobody.                                                                                                                               |
| **Consumer verdict** | "I have no idea if anyone read it." Mailchimp shows: sent, delivered, opened, clicked, unsubscribed. Per campaign AND per contact. If ChefFlow emails vanish into the void with no feedback, marketing is a form, not a tool. |

**Passing grade:** After sending: delivery confirmation, open tracking (if possible), send record appears on client profile, campaign history with performance visible.

---

### 10. Pipeline & Sales (mirrors: Pipedrive, HubSpot Sales)

**ChefFlow features:** pipeline, leads, guest-leads, prospecting

| Failure Type         | What it looks like                                                                                                                                                                                                 |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **UI**               | Pipeline exists but no visual Kanban. Or Kanban exists but cards have no value, no age, no next action.                                                                                                            |
| **Backend**          | Lead captured but no automatic stage progression. Stale leads sit forever with no flag.                                                                                                                            |
| **Consumer verdict** | "I can't see my revenue forecast." Pipedrive: drag deals across stages, weighted pipeline value, activities due today. If ChefFlow pipeline is a list of names with statuses, it's a spreadsheet with extra steps. |

**Passing grade:** Pipeline view: visual stages, deal value on each card, days-in-stage visible, stale leads flagged, total pipeline value calculated.

---

### 11. Calendar & Scheduling (mirrors: Calendly, Acuity)

**ChefFlow features:** calendar, availability, scheduling

| Failure Type         | What it looks like                                                                                                                                  |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**               | Calendar page but events don't show prep time, travel time, or blocked dates. Just dots on days.                                                    |
| **Backend**          | Two events booked on same day with no conflict warning. Availability says "open" when chef is working.                                              |
| **Consumer verdict** | "I got double-booked." Calendly prevents this by design. If ChefFlow allows conflicting events without a visible warning, calendar is a decoration. |

**Passing grade:** Calendar shows: events with time blocks (including prep/travel), conflict warnings, availability accurately reflects bookings, blocked dates visible.

---

### 12. Guest & Loyalty (mirrors: SevenRooms, Thanx)

**ChefFlow features:** guests, loyalty, guest-analytics, dietary tracking

| Failure Type         | What it looks like                                                                                                                                                                                                         |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**               | Guest attended 5 dinners but profile shows no history. No dietary preferences visible when planning next menu for them.                                                                                                    |
| **Backend**          | Guest linked to events but preferences not surfaced during menu planning. Allergies exist in profile but don't flag on recipes.                                                                                            |
| **Consumer verdict** | "It doesn't know my regulars." SevenRooms: lifetime spend, visit count, preferences, allergies, auto-surfaced. If a returning guest's nut allergy doesn't appear when the chef adds almonds to a menu, loyalty is a label. |

**Passing grade:** Guest profile shows: event history, total spend, dietary restrictions, preferences. Dietary flags surface automatically during menu planning for any event that guest is attending.

---

## How to Use This Rubric

When building or reviewing any ChefFlow feature:

1. **Identify which product mirror applies** (use the table above)
2. **Check for The Void** - Does every action produce visible feedback?
3. **Check for The Island** - Is data connected to related entities?
4. **Check for The Facade** - Does the feature actually DO what it claims, or is it a nav item with a form?
5. **Compare to the passing grade** - Would the mirrored product's users accept this?

A feature that fails on any of the three failure types is not ready for production, regardless of whether the code compiles and the page loads.

---

## Scoring

- **A (No failures):** Feature meets or exceeds the passing grade. Data connected, actions produce feedback, depth matches the mirrored product.
- **B (Minor gaps):** Core function works, one or two secondary connections missing. Usable but not impressive.
- **C (Facade risk):** Feature exists but shallow. Works for the happy path, breaks on edge cases, missing key connections.
- **D (Island):** Data exists but disconnected. Feature works in isolation but doesn't integrate with the rest of the system.
- **F (Void/Facade):** Feature claimed but non-functional, or actions produce no feedback. Chef has to leave the app to accomplish the task.
