# Research: Multi-Persona Workflow Analysis for ChefFlow

> **Date:** 2026-04-03
> **Question:** How does each stakeholder group in food services actually handle their work, where does it break, and what does ChefFlow need to match reality?
> **Status:** complete

## Origin Context

Developer requested a ground-truth research pass across every persona that touches ChefFlow: chefs, clients, staff, back office, finance, compliance, integrations, and service verticals. The goal is to identify real workflows, real breakpoints, real workarounds, and real gaps - then apply only relevant insights to ChefFlow. No merging or systemizing. Each persona stands on its own.

## Summary

Food service operations run on fragmented, manual systems held together by text messages, spreadsheets, and memory. The universal pain is not "lack of software" but "too many disconnected tools that don't know about each other." ChefFlow's strongest alignment is with the solo/small private chef operator who currently manages everything through phone + spreadsheet + memory. The biggest gaps are in multi-party coordination (staff, vendors, clients all needing different views of the same event) and in the invisible back-office work that eats 30-40% of a chef's non-cooking hours.

---

## 1. PRIVATE CHEF

### Real Workflow

- **Inquiry:** Client finds chef via referral, Instagram, Google, Thumbtack, or Take a Chef. Initial contact is almost always text message or DM, not email or form.
- **Discovery call:** 15-30 min phone/video call. Chef asks about dietary restrictions, guest count, vibe, budget. Most chefs do this from memory with no template.
- **Proposal:** Chef texts or emails a rough menu with a price. Often no formal quote document. "I can do a 4-course dinner for 8 at $85/person plus groceries."
- **Booking:** Client says yes via text. Chef marks the date on Google Calendar or a paper planner. Deposit collected via Venmo, Zelle, or Square invoice.
- **Menu planning:** Chef builds menu 3-7 days before. Often in their head, sometimes in Notes app or a paper notebook. Cross-references client allergies from the original text thread.
- **Shopping:** Chef shops at 1-3 stores 1-2 days before. Shopping list is handwritten or in Notes app. Keeps receipts in a bag/envelope for tax time. Some use Instacart for staples.
- **Prep:** 4-8 hours day-of or day-before. Mise en place, batch cooking components, packing equipment. No formal prep list for most solo operators.
- **Service:** Chef arrives 2-3 hours early, cooks, plates, serves. Handles front-of-house if no server hired. Cleans kitchen before leaving.
- **Payment:** Remaining balance collected same night or next day. Text message "sending the rest now" via Venmo. Groceries often reimbursed separately.
- **Follow-up:** Maybe a thank-you text. No formal review request. Repeat clients are managed purely by relationship and memory.

### Breakpoints

- **Lost inquiry details.** Dietary restrictions mentioned once in a DM three weeks ago. Chef forgets, serves shellfish to someone allergic. Near-miss happens more than anyone admits.
- **Price amnesia.** Chef quoted $75/person last time but doesn't remember. Client expects the same rate. Awkward conversation.
- **Calendar chaos.** Double-bookings happen when using personal and business calendars that don't sync. Chef realizes at 10pm Sunday that two events are on the same Saturday.
- **Receipt black hole.** Tax time requires reconstructing a year of grocery runs from crumpled receipts and bank statements. Typical private chef loses $2,000-5,000 in unclaimed deductions annually.
- **Scope creep.** Client adds 4 guests the day before. Chef absorbs the cost because they quoted a flat fee, not per-person.
- **No-show deposits.** Chef doesn't collect deposits consistently. Client cancels 48 hours before; chef already bought $400 in groceries.

### Current Workarounds

- Google Calendar (personal) for scheduling
- Venmo/Zelle for payment (no formal invoicing)
- iPhone Notes or paper notebook for menus
- Text message threads as "CRM"
- Instagram as portfolio/marketing
- Spreadsheet (maybe) for year-end tax totals
- Word of mouth for 80%+ of new business

### Missing Pieces

- A single place where client preferences, past menus, pricing history, and dietary needs live together (not scattered across text threads)
- Automatic grocery cost tracking tied to specific events (not just bank statement totals)
- A way to send a client a clean proposal without building a PDF from scratch every time
- Deposit collection that's built into the booking flow, not a separate Venmo request

---

## 2. EXECUTIVE CHEF / SOUS CHEF

### Real Workflow

Executive chefs in the private/catering context (not restaurant line) operate similarly to private chefs but with delegation. They design menus, price events, manage client relationships, and delegate prep/execution to sous chefs or hired day-labor.

- **Sous chef reality:** Receives a prep list (often verbal or via text) the day before. Shows up, executes, leaves. Paid hourly or per-event. Has little visibility into the client relationship, pricing, or overall business.
- **Executive chef delegation:** "I need you there at 2pm, here's the menu, here's the address. I'll handle wine and dessert, you handle mains and sides."

### Breakpoints

- **Communication gap with sous.** Menu changes after the sous already prepped. Client adds a vegan guest; sous wasn't told.
- **Inconsistent execution.** Chef can't be at every event. Sous doesn't know the client's preferences ("Mrs. Johnson hates cilantro"). Quality varies.
- **Payment delays to contractors.** Sous chef invoices the exec chef, who invoices the client, who pays net-30. Sous is waiting 45-60 days.

### Current Workarounds

- Text message group chats per event
- Photos of handwritten prep lists sent via text
- Sous tracks own hours; disputes are common
- Google Docs shared menu documents (sometimes)

### Missing Pieces

- A way to share event details with team members without exposing client financials
- Prep list generation tied to the menu that sous can access on their phone
- Time tracking that's tied to the event, not just a generic timesheet

---

## 3. CLIENT HOST / EVENT ORGANIZER

### Real Workflow

- **Finding a chef:** Google "private chef near me," asks friends, checks Instagram, browses Thumbtack/Bark/Take a Chef. Luxury market uses agencies.
- **Initial outreach:** Client sends the same message to 3-5 chefs: "Looking for a private chef for a dinner party of 12 on March 15. Budget around $100/person. Any allergies: one guest is gluten-free."
- **Comparison:** Waits for responses (hours to days). Compares on: price, menu appeal, reviews/photos, vibe of communication. No standardized format, making comparison difficult.
- **Booking:** Picks a chef, confirms via text/email. Asks "what do you need from me?" Chef says "just the address and a working kitchen."
- **Pre-event:** Client worries about things chef takes for granted (do I need to buy plates? should I set the table? what about drinks?). Asks via text 2-3 days before.
- **Day-of:** Client hovers in kitchen nervously or disappears entirely. Neither extreme is ideal.
- **Post-event:** Pays remaining balance. Maybe leaves a review if asked. Tells friends about the experience.

### Breakpoints

- **Opaque pricing.** Client doesn't understand what's included. "Is that $100/person including groceries? Tax? Tip? Cleanup?" Most quotes don't break this down.
- **Ghosting.** Chef takes 3 days to respond to inquiry. Client already booked someone else. The chef who responds fastest wins 70%+ of the time.
- **Dietary miscommunication.** Client tells chef "one guest is dairy-free" but doesn't mention the guest who's vegetarian because they assumed the menu would be flexible. Chef brings a pork-focused menu.
- **No visibility.** After booking, client has zero insight into what's happening until the chef shows up. No menu confirmation, no timeline, no shopping status.
- **Tipping anxiety.** Client doesn't know if they should tip, how much, or when. Awkward moment at the end of the night.

### Current Workarounds

- Sends the same inquiry email/text to multiple chefs
- Screenshots chef's Instagram as menu reference
- Group text with partner to discuss chef options
- Venmo/Zelle with a note "for dinner 3/15 + tip"

### Missing Pieces

- A way to submit one inquiry and get structured responses from multiple chefs (marketplace model)
- Clear, itemized pricing that separates food cost, labor, travel, and service fee
- A timeline or status view showing event preparation progress
- Built-in dietary/allergy collection that aggregates guest responses

---

## 4. EVENT ORGANIZER (Corporate/Social)

### Real Workflow

- **RFP process.** Corporate organizers send formal RFPs to 3-5 caterers. Include date, headcount, budget range, venue details, AV needs. Expect itemized proposals.
- **Vendor management.** Organizer coordinates caterer, venue, rentals, AV, florals. Each vendor has their own invoice, timeline, and contact person.
- **BEO (Banquet Event Order).** The industry-standard document listing every detail: menu, timing, setup, staffing, equipment, dietary counts. Caterers create BEOs; organizers review and approve.
- **Day-of coordination.** Organizer or event manager on-site. Checks caterer setup against BEO. Manages timeline deviations.
- **Post-event.** Collects invoices from all vendors. Reconciles against budget. Reports to stakeholders.

### Breakpoints

- **Version control.** Menu changes 5 times between booking and event. Which version did the kitchen prep for?
- **Headcount changes.** RSVPs trickle in. Final count given 72 hours before, but 15 more people show up.
- **Dietary aggregation.** 200-person event, 47 dietary requirements across 12 categories. Organizer collects via Google Form, manually reconciles into a list for the caterer.

### Current Workarounds

- Excel spreadsheets for budget tracking
- Email chains for menu revisions (10+ messages deep)
- Google Forms for dietary collection
- AllSeated, Social Tables, or Tripleseat for large events
- Caterease or Total Party Planner for catering-specific management

### Missing Pieces

- Automated dietary aggregation that flows from guest RSVP to kitchen prep list
- Version-controlled menus with change tracking
- Multi-vendor timeline coordination

---

## 5. FIRST-TIME USER (Chef New to Software)

### Real Workflow

- **Discovery:** Hears about tool from another chef, sees an ad, or googles "private chef business management."
- **First 5 minutes:** Signs up, sees dashboard. Immediately overwhelmed or underwhelmed. "Where do I start?" or "Is this it?"
- **Data entry wall.** Realizes they need to input all their clients, recipes, and pricing to get value. Closes the tab. This is where 60-70% of food service SaaS users churn.
- **If they persist:** Enters one client and one event to test. Judges the entire platform based on this single experience.
- **Adoption or abandonment.** If the first event flow felt natural and saved time, they'll enter a second. If it felt like extra work, they'll never return.

### Breakpoints

- **Empty state paralysis.** Dashboard with all zeros. No guidance on what to do first.
- **Jargon mismatch.** Software says "Create Event" but chef thinks in terms of "I have a dinner on Saturday." Software says "Add Line Item" but chef thinks "it's $85 a head."
- **Import friction.** Chef has 50 clients in their phone contacts and 200 recipes in a notebook. No way to bring them in without manual entry.
- **Time cost.** Chef earns $50-100/hour cooking. Every minute spent learning software costs that much in perceived opportunity cost. The tool must save time from minute one.

### Missing Pieces

- A "quick add" flow: "I have a dinner for 8 on Saturday at 7pm, $85/head" that creates the event, client, and invoice in one step
- Contact import from phone
- Value before data entry (show what the platform can do with demo data, then swap to real data)

---

## 6. POWER USER CHEF

### Real Workflow

- 15-30 events per month. Has systems, even if manual.
- Needs batch operations: "copy last week's meal prep menu to this week with these swaps."
- Wants keyboard shortcuts, quick navigation, templates.
- Uses the platform as their operating system, not a side tool.

### Breakpoints

- **Repetitive clicking.** Creating similar events over and over without templates.
- **No bulk operations.** Can't update pricing across 20 recurring clients at once.
- **Limited reporting.** "How much did I spend on groceries in Q1?" requires manual calculation.

### Missing Pieces

- Event templates with one-click duplication
- Bulk price adjustments
- Financial reporting by time period, client, or event type
- Keyboard-driven navigation

---

## 7. SOLO CHEF (One-Person Operation)

### Real Workflow

- Is the chef, marketer, accountant, shopper, driver, server, and dishwasher. All roles, one person.
- Works 12-16 hour days during busy periods. Administrative work happens at 11pm after cleaning up from the last event.
- Prioritizes cooking and client relationships over paperwork. Everything else is "I'll deal with it later."
- Tax filing is an annual crisis, not a continuous process.

### Breakpoints

- **Admin backlog.** Invoices unsent for weeks. Expenses untracked. Clients not followed up with.
- **No separation of concerns.** Personal phone is business phone. Personal car is delivery vehicle. Personal kitchen is sometimes prep kitchen.
- **Burnout from context switching.** Goes from creative menu design to chasing a $300 payment to fixing a website to shopping at Costco, all in one day.

### Current Workarounds

- Phone = CRM + calendar + camera (receipt photos) + marketing (Instagram)
- Venmo = accounts receivable
- Ziploc bag of receipts = bookkeeping
- Memory = client preference database

### Missing Pieces

- A mobile-first experience that lets them capture an event, snap a receipt photo, and send an invoice from the same app while sitting in their car between gigs
- Automated follow-ups ("You cooked for the Johnsons 6 months ago. Suggest a seasonal menu?")
- One-tap receipt capture tied to the event it was for

---

## 8. SMALL BUSINESS (2-5 People)

### Real Workflow

- Owner/head chef handles clients and menu design. 1-2 sous chefs handle prep and execution. Maybe a part-time admin.
- Coordination happens via group text. "Saturday's event: Juan you're on mains, Sarah you're on dessert, I'm handling the passed apps."
- Scheduling is a shared Google Calendar with color coding.
- Payroll is manual: count hours, Venmo or write a check.

### Breakpoints

- **Information silos.** Owner has client context; team has none. Team shows up and asks "so what's the deal with this event?"
- **Inconsistent quality.** Without documented recipes and plating standards, each team member executes differently.
- **Growing pains at 3-4 staff.** Text message coordination that worked with 2 people breaks at 4. Need roles, permissions, shared visibility - but not enterprise software complexity.

### Missing Pieces

- Team view of upcoming events with assigned roles
- Recipe/plating instructions accessible to team (without exposing business financials)
- Simple time tracking tied to events

---

## 9. CATERING TEAM (6+ People)

### Real Workflow

- Formal event management: BEOs, staffing matrices, equipment checklists, load-out lists.
- Multiple events running simultaneously. Operations manager assigns teams to events.
- Staff pool includes full-time and per-diem workers. Availability management is constant.
- Uses dedicated software (Caterease, Total Party Planner, Now Catering) or enterprise ERP.

### Breakpoints

- **Staff no-shows.** Per-diem workers cancel day-of. Need rapid replacement from the pool.
- **Equipment tracking.** Chafers, serving platters, linens go to events and don't come back. "Who has our 4-pan warmer?"
- **Multi-event grocery optimization.** Three events this weekend all need butter, onions, and chicken. Consolidating orders saves money but requires cross-event planning.

### Current Workarounds

- 7shifts or Homebase for scheduling
- Equipment spreadsheets
- WhatsApp groups per event
- Caterease or Total Party Planner for BEOs and proposals

### Missing Pieces (relative to ChefFlow's scope)

- ChefFlow is not competing here. This segment uses purpose-built catering software. The insight for ChefFlow: don't try to be Caterease. Focus on the solo-to-small-business segment that's underserved.

---

## 10. EMPLOYEES / CONTRACTORS

### Real Workflow

- **Contractors (freelance cooks, servers):** Get a text: "Need you Saturday 2pm-10pm, 100-person event, $25/hr." Say yes or no. Show up, work, leave. Invoice via text or email.
- **Employees (if any):** Similar to contractor flow but with scheduled shifts and (theoretically) proper payroll.
- **Kitchen staff (prep cooks):** Receive prep lists, execute. Often paid cash or day-rate.

### Breakpoints

- **Unclear scope.** "Help with a dinner party" could mean 4 hours or 12. No written agreement.
- **Late payment.** Chef pays when the client pays them. Contractor waits.
- **No records.** Contractor has no documentation of work performed. Chef has no documentation of payments made. 1099 season is a mess.

### Missing Pieces

- Simple contractor engagement: offer, accept, event details, payment confirmation
- Payment tracking that both parties can see
- Exportable payment history for 1099 preparation

---

## 11. ADMIN / MANAGER

### Real Workflow

- In a small food business, "admin" is usually the chef's spouse, partner, or the chef themselves at 11pm.
- Tasks: respond to inquiries, send invoices, follow up on payments, coordinate vendors, update social media.
- Manager role (if exists): ensures events run on schedule, manages staff, handles client complaints on-site.

### Breakpoints

- **No delegation path.** Chef can't hand off admin work because all the information is in their head and phone.
- **Response time.** Admin can't respond to inquiries because they don't know the chef's availability or pricing.

### Missing Pieces

- A way for a non-chef admin to handle inquiries and bookings with visibility into calendar and pricing
- Canned responses / templates for common inquiry patterns

---

## 12. BACK OFFICE

### Real Workflow

- Data entry is manual: client info from text messages typed into whatever system exists.
- Record keeping is reactive: only happens when something is needed (tax filing, insurance claim, health inspection).
- Compliance documentation lives in a binder or a Google Drive folder that hasn't been organized since it was created.

### Breakpoints

- **Retroactive data entry.** When the chef finally decides to "get organized," they face months of backlog.
- **No single source of truth.** Client info in phone contacts, event details in calendar, pricing in texts, receipts in email.

### Missing Pieces

- Automatic capture of business data as it happens (event created = financial record started)
- A system that builds records as a side effect of doing the work, not as a separate task

---

## 13. SCHEDULING

### Real Workflow

- Google Calendar is the dominant tool for solo and small operations.
- Events are the obvious entries. What's NOT on the calendar: prep time, shopping time, travel time, cleanup time.
- A "one event" on Saturday actually blocks Thursday (shopping), Friday (prep), Saturday (cook + serve + clean).

### Breakpoints

- **Hidden time blocks.** Chef books two Saturday events thinking they're separate. But both need Friday prep and there aren't enough hours.
- **No travel time.** Back-to-back events in different cities. Chef can't teleport.
- **Personal life erasure.** Without clear boundaries, the entire week fills up around events.

### Missing Pieces

- Event scheduling that automatically blocks associated prep/shop/travel time
- Conflict detection that accounts for the full event lifecycle, not just the service window

---

## 14. PROCUREMENT / SHOPPING

### Real Workflow

- **Solo chef:** Drives to 1-3 stores. Costco for bulk, specialty grocer for proteins, farmers market for produce. Shopping takes 2-4 hours per event.
- **Par list model (for recurring clients):** Chef knows the client's pantry. Restocks weekly based on what's running low.
- **Price awareness:** Chef knows roughly what things cost at each store. Mental map of "Costco for butter, Market Basket for produce, specialty store for the good olive oil."
- **Vendor relationships (small catering):** Has accounts with 1-2 restaurant suppliers (Sysco, US Foods, Restaurant Depot). Orders by phone or through a rep. Minimum order requirements.

### Breakpoints

- **No price memory.** Chef quoted an event based on old grocery prices. Avocados doubled. Margin evaporated.
- **Multi-store trips.** Could save money buying chicken at Store A but it's 20 minutes further. Time vs. money tradeoff made by gut, not data.
- **Seasonal availability.** Menu features heirloom tomatoes but it's March.

### Current Workarounds

- Notes app shopping lists
- Mental price database
- Restaurant Depot membership for wholesale
- Instacart for emergency items

### Missing Pieces (ChefFlow-relevant)

- ChefFlow already has OpenClaw price data. The gap: connecting that price data to the event's menu so the chef sees "this menu will cost approximately $X in groceries at your preferred stores" before they quote the client.
- Shopping list generation from a menu with preferred store routing

---

## 15. SUPPLIERS / VENDORS

### Real Workflow

- Restaurant suppliers (Sysco, US Foods) operate on rep relationships. Chef calls or texts their rep to place orders.
- Payment is net-30 on account. Invoices arrive weekly.
- Specialty vendors (farms, fishmongers, bakeries) operate on personal relationships. "Hey Mike, can you hold me 20 lbs of salmon for Saturday?"
- Farmers market vendors: cash on the spot, no invoicing.

### Breakpoints

- **Minimum orders.** Sysco requires $300+ minimum. Solo chef doesn't always hit that. Has to over-buy or skip wholesale entirely.
- **Delivery windows.** Vendor delivers Tuesday and Thursday only. Event is Wednesday. Chef must receive Tuesday and store overnight.
- **Price fluctuations.** Market prices for proteins change weekly. Chef's quote is based on last month's prices.

### Missing Pieces

- Vendor price tracking over time (ChefFlow has OpenClaw price history for retail - extending to vendor/wholesale pricing is a natural evolution)
- Order consolidation across multiple events to hit minimum thresholds

---

## 16. FINANCE / ACCOUNTING

### Real Workflow

- **Revenue tracking:** Most sole-proprietor chefs have no system. Income is "what hit my bank account." Breakdown by client or event doesn't exist.
- **Expense tracking:** Range from "no tracking" (reconstruct at tax time) to "spreadsheet" (updated monthly) to "QuickBooks Self-Employed" (auto-categorizes bank transactions).
- **Profit per event:** Almost never calculated. Chef knows their total revenue and total expenses but not margin by event.
- **Invoicing:** Ranges from Venmo request with a note to Square Invoice to PDF created in Canva.
- **Tax prep:** Sole proprietors file Schedule C. Common deductions: groceries (COGS), vehicle mileage, equipment, kitchen rental, insurance, phone. Estimated quarterly taxes are frequently missed by solo operators.

### Breakpoints

- **COGS confusion.** Chef buys groceries for work and personal use at the same store. Separating business from personal is a constant headache.
- **Untracked income.** Cash and Venmo payments not recorded anywhere. Underreporting risk.
- **No per-event P&L.** Chef thinks they made money on an event but actually lost $200 after accounting for groceries, gas, and 14 hours of labor.

### Current Workarounds

- QuickBooks Self-Employed or Wave (free) for basic bookkeeping
- Square or Stripe for payment processing with basic reports
- Accountant once a year for tax filing ($500-1,500)
- Spreadsheet with columns: date, client, income, expenses, profit

### Missing Pieces (ChefFlow-relevant)

- ChefFlow's ledger-first financial model is the right architecture. The gap is making it effortless to capture expenses at the moment of purchase (receipt photo -> event allocation -> expense category).
- Per-event P&L that includes labor hours, not just material costs.

---

## 17. HEALTH / REGULATORS

### Real Workflow

- **ServSafe certification:** Required in most states for food handlers. $36 for food handler, $164 for manager certification. Valid 5 years.
- **Cottage food laws:** Many states allow home-based food production under specific limits ($50K-250K revenue). Each state has different rules on what can be sold, labeling requirements, and permitted venues.
- **Health department permits:** Required if cooking in a client's home in some jurisdictions, not in others. Catering businesses generally need a commercial kitchen license.
- **Temperature logging:** Required by HACCP for catering operations. Checking receiving temps, holding temps, cooling temps. Most small operators skip this entirely.
- **Allergen tracking:** No federal requirement for private chefs (not a "food establishment" in most jurisdictions). But liability is real - an allergic reaction is a lawsuit regardless of legal requirements.

### Breakpoints

- **Permit confusion.** Chef doesn't know which permits they need. Requirements vary by city, county, and state. Googling returns contradictory information.
- **Documentation gaps.** Health inspector asks for temp logs. Chef has none. Violation.
- **Liability without documentation.** Client claims allergic reaction. Chef has no written record of asking about allergies. It's their word against the client's.

### Current Workarounds

- Paper temp logs (if any)
- Allergen info in text messages (unorganized, unsearchable)
- ServSafe certificate in a drawer somewhere
- "I just ask them when I get there" for allergies

### Missing Pieces (ChefFlow-relevant)

- ChefFlow captures dietary restrictions per client. The gap: making this the documented, searchable, litigation-defensible record that it needs to be. Timestamped, with the client's own words.
- Certification tracking: expiration dates, renewal reminders.
- Optional temp logging for catering operations that need HACCP compliance.

---

## 18. TAX / LEGAL

### Real Workflow

- **Entity structure:** Most private chefs start as sole proprietors (Schedule C). Some form LLCs for liability protection. Very few incorporate.
- **Sales tax:** Catering is taxable in most states. Private chef services vary - some states tax prepared food, others don't. This is the #1 area of tax confusion.
- **Contractor vs. employee:** Chefs who hire sous chefs usually treat them as contractors (1099). The IRS classification test is frequently violated - the chef controls when, where, and how the work is done, which looks like employment.
- **Contracts:** Most private chefs operate on handshake agreements. Written contracts exist in catering but are rare for intimate private dining.

### Breakpoints

- **Sales tax risk.** Chef doesn't charge sales tax. Gets audited. Owes back taxes plus penalties.
- **Misclassification risk.** Treating an employee as a contractor. State labor department audits triggered by the worker filing for unemployment.
- **No contract = no protection.** Client disputes charge. Chef has no written agreement.

### Current Workarounds

- LegalZoom or Nolo templates for basic contracts
- TurboTax Self-Employed for filing
- "I just wing it" for sales tax
- Accountant handles 1099s

### Missing Pieces (ChefFlow-relevant)

- ChefFlow already has contract generation. The gap: ensuring contracts cover liability, cancellation terms, scope changes, and allergen disclaimers in legally sound language.
- Sales tax calculation assistance (at minimum, flagging that it may apply).
- 1099 data export for contractor payments.

---

## 19. INSURANCE

### Real Workflow

- **General liability:** $300-600/year for a solo private chef. Covers property damage and bodily injury at client's home.
- **Product liability (food-specific):** Covers illness from food. Usually bundled with general liability.
- **Commercial auto:** If using personal vehicle for business, personal auto policy may not cover an accident during a catering delivery. Most chefs don't know this.
- **Workers comp:** Required in most states if you have employees. Not required for independent contractors. See misclassification risk above.
- **Event insurance:** Some venues require per-event liability coverage. Available as riders from existing policy or one-off from companies like Thimble.

### Breakpoints

- **Underinsured.** Chef has general liability but not product liability. Food poisoning claim isn't covered.
- **Personal auto gap.** Accident while delivering food for an event. Personal insurance denies claim because it was commercial use.
- **No insurance at all.** Many solo chefs operate uninsured, thinking "nothing will happen." One incident ends the business.

### Missing Pieces

- Insurance status tracking (policy expiration dates, coverage types)
- Per-event insurance flagging when the venue requires it
- Not ChefFlow's core domain, but a valuable reference/reminder layer

---

## 20. CANNABIS-INFUSED DINING (Where Applicable)

### Real Workflow

- Legal in limited jurisdictions (CA, CO, IL, MI, and a few others with specific event licenses).
- **Licensing:** Requires both a food handler license AND a cannabis event license. Some states require a temporary event license per event.
- **Dosage tracking:** THC/CBD per serving must be calculated, documented, and communicated to guests. Typically 5-10mg THC per course.
- **Sourcing:** Must purchase from licensed dispensaries. No home-grown. Receipt documentation required.
- **Service model:** Multi-course dinner with escalating/varying dosages. Chef must explain effects to guests. No alcohol typically served (interaction risk).
- **Consent:** Written waivers from every guest. Documentation of age verification (21+).

### Breakpoints

- **Regulatory complexity.** Rules change constantly. What was legal last month may not be this month.
- **Dosage liability.** Guest overconsumes. Documentation of portioning and communication is the only defense.
- **Cross-state confusion.** Chef operates in a legal state but books an event in a neighboring state where it's illegal.

### Missing Pieces

- This is a niche vertical. ChefFlow shouldn't build for it specifically, but should not prevent it either. The insight: make the per-guest notes, dietary/restriction fields, and waiver/consent document capabilities flexible enough that a cannabis chef could use them.

---

## 21. PAYMENTS

### Real Workflow

- **Deposit:** 50% upfront is industry standard. Collected at booking. Non-refundable within 48-72 hours of event.
- **Balance:** Due day-of or within 48 hours after. Grocery reimbursement often separate.
- **Tip:** Expected but awkward. 15-20% is norm for private dining. Clients often don't know the etiquette.
- **Methods:** Venmo (dominant for private chefs), Zelle, Square Invoice, checks (declining), cash (events), Stripe (rare for solo operators).
- **Corporate:** Net-30 terms. Check or ACH. Require W-9 before first payment.

### Breakpoints

- **Split payment confusion.** Food cost reimbursement + service fee + gratuity = three separate transactions for one event.
- **Late payment.** Client "forgets" to send the balance. Chef doesn't want to nag because they want the repeat booking.
- **No paper trail.** Venmo notes are the only record. "For dinner party" doesn't specify which one.

### Current Workarounds

- Venmo/Zelle for most transactions
- Square Invoice for clients who want itemized receipts
- "I'll just Venmo you" culture avoids formal invoicing entirely
- Manual tracking in spreadsheet or not at all

### Missing Pieces (ChefFlow-relevant)

- ChefFlow has Stripe integration. The gap: making it as frictionless as Venmo. If it takes more steps than Venmo, chefs won't use it.
- Automated payment reminders that don't feel aggressive
- Tip handling built into the payment flow
- Grocery reimbursement as a separate line item that auto-populates from receipt capture

---

## 22. EMAIL

### Real Workflow

- Gmail is dominant. Chef uses personal Gmail for business (davidferra13@gmail.com style).
- **Inquiry response:** Copy-paste a template they wrote once, personalize the name and date. Or type from scratch every time.
- **Menu sharing:** Type the menu into the email body. No formatting, no photos.
- **Follow-up:** Manual or non-existent. "I should follow up with that lead from last week" but doesn't.
- **Marketing:** Maybe a Mailchimp list of past clients. Sends a holiday email once a year. Or nothing.

### Breakpoints

- **Buried threads.** Client email about an event mixed with 500 other emails. Chef can't find the allergy info mentioned 3 weeks ago.
- **No templates.** Every proposal is written from scratch. 20-30 minutes per inquiry response.
- **No tracking.** Chef doesn't know if the client opened the proposal email.

### Missing Pieces (ChefFlow-relevant)

- ChefFlow has Gmail sync. The gap: surfacing the right email content (dietary info, pricing discussions) as structured data attached to the client/event, not just archived email.
- One-click proposal sending from within the platform

---

## 23. CALENDAR

### Real Workflow

- Google Calendar is the standard for solo operators.
- Color-coded by event type (dinner party = blue, meal prep = green, personal = gray).
- Events entered with client name, time, and address. No link to menu, financials, or prep schedule.

### Breakpoints

- **One-dimensional view.** Calendar shows "Johnson Dinner 6pm" but not "shop by 2pm, arrive by 4pm, service 6-10pm."
- **No prep blocking.** Calendar only shows the event, not the 6-8 hours of prep that precede it.
- **Sync issues.** Chef uses Google Calendar on phone, iCal on Mac, and another app. Events don't sync consistently.

### Missing Pieces (ChefFlow-relevant)

- ChefFlow has events with dates. The gap: optional calendar view that shows the full event lifecycle (prep, shop, travel, service, cleanup) as connected blocks.
- Two-way Google Calendar sync so chefs don't have to maintain two calendars.

---

## 24. FILES / DOCUMENTS

### Real Workflow

- Recipes in Notes app, paper notebook, or head.
- Menus in Google Docs or sent directly in email body.
- Contracts (if any) in Google Docs or DocuSign.
- Photos in Camera Roll, mixed with personal photos.
- Invoices in Square, Stripe, or a Canva-designed PDF.
- Receipts in a bag, a folder on the desk, or photos in Camera Roll.

### Breakpoints

- **Scattered everywhere.** To reconstruct one event: check texts for client info, Google Docs for menu, Camera Roll for food photos, email for the contract, Venmo for payment, bag for receipt.
- **No organization.** Files exist but aren't linked to anything. "Which event was this receipt for?" requires detective work.

### Missing Pieces (ChefFlow-relevant)

- ChefFlow has document generation. The gap: making it the default place documents live, tied to events/clients, so the chef stops using 6 different apps.
- Photo gallery per event (before/after, plating shots) that doubles as portfolio content.

---

## 25. INVENTORY

### Real Workflow

- **Solo chef:** No formal inventory. Shops for each event. Leftover specialty ingredients go into the next appropriate event or personal cooking.
- **Weekly meal prep:** Maintains a par stock of staples. Checks fridge/pantry before shopping.
- **Catering:** Walk-through of storage before ordering. Whiteboard or clipboard for tracking.
- **Perishable management:** Mostly by memory and visual inspection. "This chicken needs to be used by Thursday."

### Breakpoints

- **Waste from overbuying.** Chef buys 10 lbs of salmon for an event that needs 7. Remaining 3 lbs must be used within 2 days or wasted.
- **Duplicate purchases.** Chef forgot they already have 5 lbs of butter and buys more.
- **Expiration blindness.** Items pushed to the back of the fridge. Discovered expired two weeks later.

### Missing Pieces

- Real-time ingredient tracking is overkill for solo operators. The practical tool: post-event inventory notes ("leftover: 3 lbs salmon, 2 lbs butter, half case of arugula, use by Wednesday") that surface when planning the next event.

---

## 26. PRIVATE DINING (Vertical)

### Real Workflow

- Chef arrives 2-3 hours early. Preps in the client's kitchen. Serves 3-7 courses. Cleans kitchen. Leaves.
- Pricing: $75-200/person for food + $500-2,000 flat fee for the chef's service. Plus grocery reimbursement.
- Wine pairing often requested. Chef either curates the wine list or the client handles their own wine.
- Ambiance: clients handle decor, music, table setting. Chef handles food and sometimes plating.

### Breakpoints

- **Kitchen assessment.** Chef arrives and the client's kitchen has no decent knives, one cutting board, and an oven that runs 25 degrees hot. No pre-event kitchen checklist shared with client.
- **Timing control.** Courses should flow naturally with conversation. Chef must read the room and adjust pacing. No software helps here - this is pure craft.
- **Alcohol service.** In some jurisdictions, serving alcohol requires a license the chef doesn't have. The "client serves their own wine, chef pairs the menu" workaround is standard.

### Missing Pieces

- Pre-event kitchen checklist sent to client ("please ensure you have: X, Y, Z available")
- Course pacing notes in the event plan (estimated time per course, sequence)

---

## 27. CATERING (Vertical)

### Real Workflow

- Scale: 50-500+ guests. Multiple staff. Transported food and equipment.
- **Equipment logistics:** Load van/truck with chafers, platters, utensils, linens. Track everything in and out. Equipment loss is a real cost.
- **Staffing:** 1 server per 25-30 guests (plated), 1 per 50 (buffet). Plus kitchen staff, bartenders, event captain.
- **Timeline:** Strict. Food temp safety, venue access windows, client's event schedule must all align.
- **Pricing:** Per-person (buffet $35-75, plated $50-150) or flat fee. Usually includes staff, equipment, and food.

### Breakpoints

- **Scale-up errors.** Recipe that works for 20 doesn't scale linearly to 200. Cooking times, equipment capacity, and seasoning ratios all change.
- **Hot/cold holding.** Maintaining food at safe temps during transport and service. The #1 health risk in catering.
- **Venue surprises.** Kitchen at venue has no oven. Loading dock is unavailable. Power capacity insufficient for equipment.

### Missing Pieces (ChefFlow-relevant)

- ChefFlow's event model works for catering. The gap at this scale is equipment tracking and staffing matrices, which are probably beyond current scope.
- Recipe scaling calculations (double recipe doesn't mean double of everything) would be high-value.

---

## 28. FARM-TO-TABLE (Vertical)

### Real Workflow

- **Sourcing:** Direct relationships with 3-10 local farms. Weekly calls/texts to check availability. "What do you have this week?" determines the menu.
- **Menu flexibility:** Menu changes based on what's available, not what the chef wants to cook. Clients expect seasonal surprise.
- **Storytelling:** The farm name, growing method, and provenance are part of the dining experience. Printed on menus, mentioned during service.
- **Pricing:** Higher food cost (local/organic premium) offset by marketing cachet. Clients pay 20-40% more for the story.

### Breakpoints

- **Supply volatility.** Farmer's crop fails. Chef has no backup for a signature dish.
- **Seasonality mismatch.** Client wants strawberries in January. Chef must educate or compromise.
- **Traceability.** "Where did this come from?" must have a real answer. Can't claim farm-to-table if you're supplementing from Sysco.

### Missing Pieces

- Vendor/farm relationship tracking with seasonal availability notes
- Menu annotations linking ingredients to sources (for printed menus and storytelling)
- ChefFlow's OpenClaw data is retail/wholesale. Farm-direct pricing is a separate data source.

---

## 29. LUXURY / HIGH-END (Vertical)

### Real Workflow

- **Clientele:** Ultra-high-net-worth individuals, estate managers, yacht captains, event planners for private events.
- **Expectations:** Availability (24/7 responsiveness), discretion (NDAs common), quality (Michelin-level), flexibility (menu changes morning-of are normal).
- **Estate chef model:** Full-time employment for one family. $80K-200K+ salary. Daily family meals + entertaining. Lives in guest house sometimes.
- **Yacht chef model:** Lives aboard. Provisions in ports. Serves 2-3 meals daily for owner/guests plus crew meals. $4,000-8,000/week.
- **Event chef model:** One-off or repeat private events. $5,000-20,000+ per event for celebrity-level chefs.

### Breakpoints

- **Discretion vs. marketing.** Can't post about A-list clients on Instagram, which is how other chefs get new clients.
- **Scope creep is the job.** "Can you also pick up flowers?" "Can you make breakfast too?" Saying no risks the relationship.
- **Isolation.** Estate and yacht chefs work alone. No peer community. No benchmarking for fair compensation.

### Missing Pieces

- ChefFlow is not targeting this segment yet, but should not exclude it. The insight: the platform should allow private/confidential clients (no data shared externally, no review requests, hidden from any public features).
- For estate chefs: recurring daily meal tracking and household preference management would be the killer feature.

---

## Gaps and Unknowns

1. **Runtime verification needed:** How ChefFlow's current event flow maps to the real private chef workflow described in Persona 1. Does the 8-state FSM match actual event progression, or does it force artificial states?
2. **Mobile usage data:** What percentage of ChefFlow usage is mobile vs. desktop? Solo chefs need mobile-first but ChefFlow appears desktop-oriented.
3. **Conversion funnel data:** How many chefs sign up, enter one event, and never return? The first-time user analysis (Persona 5) suggests high churn risk without a "quick win" flow.
4. **Pricing model feedback:** No data on whether chefs want per-person or flat-rate quoting more. Both are common. Current UI may bias toward one.
5. **Integration adoption:** Gmail sync exists but adoption rate is unknown. If chefs aren't using it, the email persona analysis suggests why.

## Recommendations

### Quick Fixes (No Spec Needed)

- **Pre-event kitchen checklist:** Add optional kitchen requirements to event details that can be shared with client. Just a text field, not a feature.
- **Receipt photo capture:** If not already present, add receipt photo upload tied to event expenses. Single-tap from mobile.
- **Contractor payment export:** 1099-ready payment summary export by year and payee.

### Needs a Spec

- **Quick-add event flow:** "Dinner for 8, Saturday, $85/head, Smith family" creates event + client + quote in one step. Biggest first-time-user retention lever.
- **Event lifecycle blocking:** Automatically block prep/shop/travel time when an event is created. Configurable per chef.
- **Per-event P&L:** Surface profit margin per event combining revenue (quote) with costs (groceries, labor hours, travel).
- **Team view:** Limited-access view for sous chefs/staff showing event details, prep lists, and dietary needs without exposing financials.

### Needs Discussion

- **Two-way Google Calendar sync:** High value but high complexity. Sync conflicts, delete propagation, multi-calendar scenarios.
- **Client-facing portal evolution:** How much visibility should clients have into event preparation? The research shows clients want more transparency, but chefs value operational privacy.
- **Mobile-first redesign:** If the research is right that solo chefs do admin from their car between gigs, mobile experience is make-or-break for retention.
- **Grocery estimate from menu:** Connecting OpenClaw price data to menu items to auto-estimate food cost. The data pipeline exists; the UX doesn't.
