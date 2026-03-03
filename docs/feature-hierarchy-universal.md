# ChefFlow — Universal Feature Hierarchy

> **Scope:** Single ranked hierarchy of ALL features, applicable to all 6 archetypes (private chef, caterer, meal-prep, restaurant, food-truck, bakery).
> **Logic:** Features ranked by universal criticality — what every archetype needs first to have a functioning business.
> **Date:** March 2, 2026

---

## Rating System

- **YES** — Must have, critical for business function
- **MAYBE** — Nice to have, supports business but not required to start
- **NO** — Can be deferred, not necessary for MVP
- **TBD** — To be determined by developer/user preference

---

## UNIVERSAL FEATURE HIERARCHY (All Archetypes)

### 1. CLIENTS & CONTACTS MANAGEMENT

**Rating: YES**

- Client directory (list, search, filter)
- Client detail page (name, contact info, history)
- Create/edit/delete client
- Client communication (email, SMS, phone)
- Client status (active, inactive, DNC)
- Repeat client tracking

**Why #1:** Every archetype (private chef, pizzeria, café, caterer, bakery, meal-prep, food-truck) needs to know WHO they're serving. This is the foundation of any business.

---

### 2. FINANCIAL TRACKING & LEDGER

**Rating: YES**

- Ledger (immutable transaction log)
- Invoice creation & tracking
- Payment recording & status
- Revenue summary (total, by period)
- Expenses logging & categorization
- Profit/loss calculation (computed)
- Outstanding balance tracking
- Financial dashboard (quick metrics)

**Why #2:** Every business must know if it's making or losing money. This is non-negotiable for survival and decision-making.

---

### 3. TRANSACTIONS / WORK UNITS

**Rating: YES**

- Core unit of work varies by archetype:
  - Private chef: **Events** (in-home dinners)
  - Caterer: **Events** (catered occasions)
  - Meal-prep: **Orders** (weekly deliveries)
  - Restaurant: **Orders** (daily sales/tickets)
  - Food-truck: **Daily sales/orders** (by location)
  - Bakery: **Orders** (customer orders)
- Create/view/edit/delete transaction
- Link client to transaction
- Link recipes/menu/products to transaction
- Track transaction status (draft → completed)
- Record revenue for transaction
- Transaction history

**Why #3:** Every archetype needs to track "what I delivered to whom and for how much." This is the core work unit that generates revenue.

---

### 4. RECIPES

**Rating: YES**

- Recipe library (searchable, filterable)
- Create/edit/delete recipe
- Ingredients list with costs
- Method/instructions
- Dietary flags (allergens, vegan, GF, etc.)
- Yield & cost per serving
- Allergen warnings (prominently displayed)
- Recipe usage tracking (which transactions used it)

**Why #4:** Recipes are the chef's intellectual property and product definition. Almost every archetype (except pure food-truck with suppliers) needs this. You can't execute work without knowing what you're cooking.

---

### 5. COMMUNICATION / MESSAGING

**Rating: YES**

- Send message to client (email/SMS)
- View message history with client
- Compose & send (with timestamps)
- Search message history
- Attachments in messages
- Message templates (optional)

**Why #5:** Every archetype needs to communicate with clients about orders, confirmations, issues, follow-ups. This is table stakes.

---

### 6. SCHEDULE / CALENDAR

**Rating: YES**

- View upcoming work (by day/week/month)
- Per transaction: date, time, location
- Travel time visibility (if applicable)
- Schedule conflicts detection
- Prep schedule (days before)
- Calendar views (month, week, day, agenda)
- Add/edit/delete transaction timing

**Why #6:** Every archetype needs to know WHEN things are happening and plan around capacity. Schedule conflicts = lost business.

---

### 7. MENU / PRODUCT PACKAGING

**Rating: YES** (with caveats)

- Create menus (collections of recipes)
- Link recipes to menu
- Menu description & occasion type
- Menu pricing (bundled rate)
- Use menu in transaction (quote/order)
- Dietary coverage summary (vegan options, GF, allergen-free)

**Caveats:**

- Private chef/caterer: **Critical** (they quote custom menus)
- Bakery: **Yes** (collection of items they offer)
- Restaurant/food-truck: **Maybe** (may use POS system instead, simpler ordering)
- Meal-prep: **Maybe** (may have fixed weekly menus)

---

### 8. QUOTES & PRICING

**Rating: YES** (with caveats)

- Create quote (select menu/products, calculate price)
- Quote template
- Send quote to client
- Track quote status (draft, sent, accepted, expired, declined)
- Auto-calculate from recipe costs
- Apply discount/surcharge
- Pricing history
- Expires/expiration date

**Caveats:**

- Private chef/caterer: **Critical** (custom quote per event)
- Bakery/meal-prep: **Maybe** (fixed menu pricing, less quoting)
- Restaurant/food-truck: **Maybe** (POS-driven, not quote-based)

---

### 9. INQUIRIES & LEAD PIPELINE

**Rating: YES** (with caveats)

- Receive inquiry from client/public
- Inquiry detail (occasion, date, guests, budget, notes)
- Inquiry status (new, contacted, quoted, closed, declined)
- Lead scoring (GOLDMINE or similar)
- Follow-up tracking (due dates)
- Create quote from inquiry
- Close/convert inquiry

**Caveats:**

- Private chef/caterer: **Critical** (inquiries are pipeline)
- Restaurant: **Maybe** (walk-ins, not inquiries)
- Food-truck: **Maybe** (daily sales, not inquiries)

---

### 10. PUBLIC INQUIRY INTAKE

**Rating: YES**

- Embeddable inquiry widget (on website)
- Public inquiry form (email, occasion, date, guests, budget, dietary)
- Auto-create inquiry + client on submission
- Send confirmation email to public user
- AI lead scoring applied

**Why:** Every archetype can attract new business from a website. Public form + widget is zero-friction lead generation.

---

### 11. STAFF / TEAM COORDINATION

**Rating: YES** (with caveats)

- Staff directory (name, role, contact, rate)
- Assign staff to transaction
- Track staff availability
- Assign roles (prep, plating, service, etc.)
- Message staff
- Staff confirmations
- Payroll tracking (hours, rate)

**Caveats:**

- Private chef: **Maybe** (often solo)
- Caterer/restaurant/food-truck/bakery: **Critical** (need teams)
- Meal-prep: **Maybe** (may be solo)

---

### 12. STATIONS / KITCHEN OPERATIONS

**Rating: YES** (with caveats)

- Configure kitchen stations (app/plating/sauce/proteins/etc.)
- Per station: assigned staff, tasks, status
- Task checklist per station
- Ticket queue (orders coming in)
- Mark station ready
- Real-time station status display

**Caveats:**

- Restaurant/food-truck: **Critical** (core to kitchen ops)
- Bakery: **Maybe** (similar to restaurant)
- Private chef/caterer: **Maybe** (may not need structured stations)
- Meal-prep: **Maybe** (assembly-line workflow)

---

### 13. DAILY OPS / TASK MANAGEMENT

**Rating: YES**

- Task board (admin/prep/creative/relationship lanes)
- Create/edit/delete task
- Task status (pending, in-progress, done)
- Task deadline & duration estimate
- Assign to staff
- Mark complete
- Drag between lanes

**Why:** Every archetype has day-of-execution tasks. Tracking them prevents forgotten steps and staff confusion.

---

### 14. PRIORITY QUEUE / ACTION INBOX

**Rating: YES**

- Auto-generated action items (overdue follow-ups, pending confirmations, unpaid invoices, etc.)
- Filter by urgency (critical/high/normal/low)
- Filter by domain (events/clients/finance/culinary/ops)
- Per item: link to relevant page, due date, context
- Mark complete / archive
- Snooze / defer to later

**Why:** Every archetype has competing priorities. Queue system surfaces what's urgent right now.

---

### 15. ANALYTICS & REPORTING

**Rating: YES** (with caveats)

- Revenue trend (over time)
- Expense tracking
- Profit margin %
- Event/order count (by period, type)
- Client count & repeat rate
- Average transaction value
- Seasonal patterns

**Caveats:**

- All archetypes benefit, but **Nice to have** for MVP.
- Can be phase 2.

---

### 16. DASHBOARD OVERVIEW

**Rating: YES**

- Quick metrics (revenue this month, profit, pending actions, upcoming work)
- Widgets (configurable):
  - Today's schedule
  - Next action
  - Priority queue summary
  - Upcoming transactions (next 7 days)
  - Response time metrics (if applicable)
  - Financial summary
- Banners (alerts: overdue follow-ups, scheduling gaps, unpaid invoices)

**Why:** Single entry point where chef can see at a glance: "What's urgent right now?"

---

### 17. NOTIFICATIONS & ALERTS

**Rating: YES**

- In-app notification center
- Email notifications (opt-in per type)
- SMS alerts (critical only)
- Notification settings (which types, when)
- Do Not Disturb hours

**Why:** Every archetype needs reminders for deadlines, confirmations, follow-ups.

---

### 18. SETTINGS & CONFIGURATION

**Rating: YES** (partial)

- Profile (name, business, contact info)
- Notification preferences
- Module toggles (enable/disable features by tier)
- Navigation customization (show/hide nav items)
- Archetype selection (sets defaults)
- Data privacy (delete account, download data)

**Partial:** Only core settings for MVP. Advanced settings (integrations, billing) can be phase 2.

---

### 19. SEARCH & FILTERS

**Rating: YES**

- Global search (Cmd+K) across clients, transactions, recipes, messages
- Per-page filters (by status, date, amount, type, etc.)
- Sort options (date, amount, name, etc.)

**Why:** Every archetype accumulates data. Search/filter is how you find things without drowning in lists.

---

### 20. REVIEW & REFLECTION (AAR / Post-Event)

**Rating: MAYBE**

- Post-transaction reflection form (what went well, improve, learnings)
- Staff feedback (on their performance)
- Photos gallery
- Client testimonial/review collection
- Pricing review (was margin OK?)

**Why:** Helps iterative improvement. Nice to have, can be deferred.

---

### 21. LOYALTY PROGRAM

**Rating: MAYBE** (with caveats)

- Track repeat clients
- Points system (earn points per transaction)
- Tier progression (bronze/silver/gold/etc.)
- Redemption (points for discounts or free items)
- Client dashboard (points balance, rewards)

**Caveats:**

- Private chef: **Maybe** (repeat clients important)
- Restaurant/café/bakery: **Yes** (customer retention critical)
- Caterer: **Maybe** (less frequent repeats)
- Meal-prep: **Yes** (retention critical for subscriptions)

---

### 22. CULINARY BOARD / PREP PLANNING

**Rating: MAYBE**

- Recipe capture checklist (uncaptured recipes)
- Seasonal ingredients/ideas
- Vendor specials alerts
- Equipment inventory tracking
- Ingredient cost tracking

**Why:** Supports quality, but not essential for MVP.

---

### 23. MARKETING & OUTREACH

**Rating: MAYBE**

- Email campaigns (send to client list)
- SMS campaigns
- Social media scheduling
- Portfolio / public gallery
- Blog articles
- Referral tracking

**Why:** Growth tool. Important for scaling, but not essential to execute one transaction.

---

### 24. NETWORK & COMMUNITY

**Rating: NO**

- Connect with other chefs
- Community forum
- Share recipes with network
- Collaboration invitations

**Why:** Nice-to-have. Doesn't affect core business function. Defer to phase 2.

---

### 25. GAMES / GAMIFICATION

**Rating: NO**

- Achievements
- Leaderboards
- Challenges

**Why:** Motivational, but not necessary. Defer.

---

### 26. HELP CENTER & DOCUMENTATION

**Rating: MAYBE**

- Help articles (searchable)
- Tutorials per feature
- FAQ
- Contact support

**Why:** Reduces user confusion, but can be built as users request help.

---

### 27. DEVELOPER TOOLS

**Rating: NO**

- Debug panel
- Logs viewer
- Schema inspector

**Why:** Admin-only, not user-facing.

---

### 28. INTEGRATIONS (OPTIONAL, NON-CRITICAL)

**Rating: MAYBE**

- Stripe (payments): **YES** (accept money)
- Gmail/calendar sync: **MAYBE** (nice to have)
- Ollama (local AI): **MAYBE** (Remy AI suggestions)
- Gemini (cloud AI): **NO** (privacy risk)

---

### 29. IMPORT & DATA MIGRATION

**Rating: MAYBE**

- Import past events / clients (CSV)
- Brain dump (paste recipes, parse)
- Grandfather data (one-time migration)

**Why:** Helpful for onboarding, but not critical if starting fresh.

---

### 30. CANNABIS VERTICAL

**Rating: NO**

- Cannabis menu templates
- Dosing calculators

**Why:** Niche feature, only for specific chefs. Defer to specialized tier.

---

### 31. MULTI-LANGUAGE SUPPORT

**Rating: NO**

**Why:** MVP is English-only.

---

### 32. MOBILE APP

**Rating: NO**

**Why:** Web app is responsive. Native mobile apps come later.

---

### 33. ADVANCED ANALYTICS & FORECASTING

**Rating: NO**

- Projections (revenue, capacity)
- Cohort analysis
- Churn prediction

**Why:** Phase 2 / premium features.

---

### 34. REMY AI CONCIERGE

**Rating: MAYBE** (with caveats)

- Chat interface
- Menu suggestions
- Contingency planning
- Email drafting
- Business advice

**Caveats:**

- **Must have Ollama connection** (privacy-first, local only)
- **Do NOT use Gemini** for private data
- If Ollama is offline, feature gracefully degrades
- Helpful but not blocking to core business function

---

### 35. PAYROLL & ACCOUNTING

**Rating: MAYBE** (with caveats)

- Timesheet entry (staff hours)
- Payroll calculation
- Tax deduction categorization
- Tax reporting

**Caveats:**

- **Essential for restaurants/food-trucks/bakeries** (multiple staff)
- **Nice-to-have for private chef** (often solo)
- Can be phase 2 if solo operation

---

### 36. INVOICING

**Rating: YES**

- Generate invoice from transaction
- Send invoice (email/SMS/print)
- Track payment status
- Record payment
- Overdue reminders

**Why:** Essential for getting paid. Every archetype needs this.

---

### 37. EXPENSE TRACKING

**Rating: YES**

- Log expense (groceries, supplies, equipment, labor, venue)
- Categorize by type
- Attach receipt
- Track paid/pending
- Recurring expenses

**Why:** You can't know profit without tracking costs.

---

### 38. CLIENT PROFILE & HISTORY

**Rating: YES**

- All transactions with client (linked)
- Contact history
- Dietary restrictions & allergies (critical for safety)
- Preferences & notes
- Loyalty info (if applicable)
- Reviews & testimonials from them

**Why:** Essential context for every transaction.

---

### 39. TRANSACTION DETAIL PAGE

**Rating: YES**

- Overview (date, client, products, amount)
- Timeline of status changes
- Activity feed (messages, updates, payments)
- Linked resources (menu, recipes, staff, schedule)
- Notes section

**Why:** Single source of truth for a specific transaction.

---

### 40. MESSAGING / COMMUNICATION HISTORY

**Rating: YES**

- Per client: message thread (email/SMS combined)
- Compose & send
- Attachments
- Message search
- Timestamps

**Why:** Critical for client relationships and accountability.

---

---

## SUMMARY

### **CRITICAL (YES) — Must ship for MVP:**

1. Clients & contacts
2. Financial tracking & ledger
3. Transactions / work units
4. Recipes
5. Communication / messaging
6. Schedule / calendar
7. Menu / product packaging
8. Quotes & pricing
9. Inquiries & lead pipeline
10. Public inquiry intake
11. Staff / team coordination
12. Stations / kitchen operations
13. Daily ops / task management
14. Priority queue / action inbox
15. Analytics & reporting
16. Dashboard overview
17. Notifications & alerts
18. Settings & configuration
19. Search & filters
20. Invoicing
21. Expense tracking
22. Client profile & history
23. Transaction detail page
24. Messaging / communication history

**Total: 24 critical features**

### **IMPORTANT (MAYBE) — Phase 2 / nice-to-have:**

- Review & reflection (AAR)
- Loyalty program
- Culinary board / prep planning
- Marketing & outreach
- Help center & documentation
- Integrations (non-payment)
- Import & data migration
- Remy AI concierge
- Payroll & accounting
- Advanced analytics

### **DEFER (NO) — Post-launch:**

- Network & community
- Games / gamification
- Developer tools
- Cannabis vertical
- Multi-language support
- Mobile app
- Advanced forecasting
- Etc.

---

## NEXT STEP

**Which of the 24 CRITICAL features are currently BROKEN, INCOMPLETE, or MISSING?**

That's the launch checklist.
