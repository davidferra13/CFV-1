# ChefFlow — Complete Feature Inventory

> **Purpose:** Exhaustive catalog of every function, feature, operation, and capability in ChefFlow.
> **By "function":** Every page, tab, button, form, action, filter, sort, state change, calculation, modal, integration.
> **Last Updated:** March 2, 2026

---

## 1. DASHBOARD

**Route:** `/dashboard`

### Header & Quick Access

- Display time-of-day greeting (morning/afternoon/evening)
- **Layout button** → Opens widget configuration panel (reorder, show/hide, collapse/expand)
- **Full Queue link** → Navigate to `/queue`
- **New Event button** → Quick create `/events/new`
- **Cmd+K Global Search** → Search + quick actions (New Event, Client, Quote, Inquiry, Expense, Recipe)

### Conditional Banners

- **Daily Ops Banner** (if tasks exist)
  - Show task counts by lane (admin/prep/creative/relationship)
  - Show estimated time to completion
  - Link to `/daily` for full task view
  - "Go cook" success banner when all cleared
- **Priority Action Banner** (always shown)
  - Display next action from queue with color-coded urgency (red=critical, amber=high, brand=normal)
  - Link to action detail
  - Show "All caught up" when empty
- **Scheduling Gap Banner** (if gaps exist)
  - Show warning count
  - Link to `/calendar/week` to plan
- **Response Time SLA Banner** (if open inquiries)
  - Count overdue (24h+), urgent (4h+), fresh inquiries
  - Show average response time
  - Link to `/inquiries?status=new`
- **Pending Follow-Ups Banner** (if stale inquiries)
  - List inquiries quiet for 3+ days
  - Show client name, occasion, days quiet badge
  - Link to inquiry detail
  - Max 5 shown
- **Holiday Outreach Panel** (if holidays upcoming)
  - Per holiday: expandable row with AI-suggested outreach text
  - Copy button for text
  - Create promo code form (code, discount%, expiry)
  - Per client: Send button → compose email/SMS

### Configurable Widgets (show/hide/reorder via Layout button)

#### Onboarding Checklist

- Show if not all 5 setup phases complete
- 5 steps with links:
  - Complete Profile → `/settings/profile`
  - Add Client → `/onboarding/clients`
  - Configure Loyalty → `/onboarding/loyalty`
  - First Recipe → `/onboarding/recipes`
  - Add Team Member → `/onboarding/staff`
- Green checkmark + strikethrough for completed steps
- "Open setup guide" → `/onboarding`

#### Onboarding Accelerator

- Show if (no events) AND (≤10 clients OR ≤10 inquiries)
- 4 accelerator steps with "Start" links:
  - Import contacts → `/import?mode=csv`
  - Log past events → `/import?mode=past-events`
  - Capture inquiry → `/inquiries/new`
  - Send quote → `/quotes/new`
- Bottom action buttons: Next Step, Upload CSV, Log Past Events, Brain Dump

#### Upcoming Calls Widget

- Show if calls exist
- "Schedule" link → `/calls/new`
- Per call row:
  - Link to `/calls/${id}`
  - Date, time, contact name
  - Call type badge
  - Duration, agenda progress bar
- "View all calls" → `/calls`

#### Collaboration Invitations

- Show if pending invitations exist
- Per invitation:
  - Event name
  - Chef name
  - Role badge
  - Accept button
  - Decline button

#### Pending Recipe Shares

- Show if pending shares exist
- Per share:
  - Recipe name
  - Chef name
  - "Accept & Copy" button
  - "Decline" button

#### Collaborating On Events

- Show if collaborating on events
- Per event:
  - Link to `/events/${id}`
  - Event occasion, date, client
  - Role badge

#### Recipe Debt Widget

- If debt = 0: Green checkmark "Recipe Book up to date" + "View all" → `/recipes`
- If debt > 0: Show breakdown by time period (overdue/this week/next week/later)
  - "Capture Now" → `/recipes/sprint`

#### Today's Schedule Widget

- If event today:
  - Event name, full schedule link → `/events/${id}/schedule`
  - Client name, guest count, city
  - Hour-by-hour timeline with NOW indicator
  - Route plan showing all stops
- If no event today:
  - "No dinners today"
  - "Next up" link to next event

#### Next Action Card

- Full card is a link to `item.href`
- Show urgency label, domain icon, action title
- Show description, context labels
- "Take action →" CTA

#### Week Strip Widget

- 7-day grid showing events, prep days, free days
- Color-coded prep-status dots (green/amber/grey)
- "Full Schedule" → `/schedule`
- Burnout warnings (amber boxes)

#### Priority Queue Widget

- **QueueSummaryBar:** 4 stat cards (Total Items, Critical, High Priority, Domains Active)
- Domain filter pills (click to toggle filter)
- Urgency filter pills (click to toggle filter)
- Up to 20 QueueItemRow entries (each a link to item detail)
  - Colored left border (by domain)
  - Urgency badge
  - Domain label
  - Action title & context
- "View all" → `/queue`

#### Follow-Ups Overdue Widget

- Show if overdue follow-ups exist
- Per row:
  - Event link → `/events/${id}`
  - Time overdue badge
  - "Send message" → `/clients/${id}#messages`
- "All Events" → `/events?status=completed`

#### DOP Task Digest Widget

- Show incomplete Day-of-Plan tasks grouped by event
- Per task:
  - Checkbox toggle (calls `toggleDOPTaskCompletion`)
  - Category emoji
  - Task label, deadline
- Event header links to event detail
- "+X more → Full schedule" → event schedule

#### Preparation Prompts Widget

- Show prompts grouped by status (Overdue/Today/Upcoming)
- Per prompt: link to `prompt.actionUrl`
- Show prompt title, deadline
- Color-coded by status

---

## 2. EVENTS

**Routes:** `/events`, `/events/[id]`, `/events/[id]/[tab]`, `/events/new`

### Events List Page

**Route:** `/events`

#### Header

- H1 "Events"
- Status filter pills (All, Draft, Proposed, Accepted, Paid, Confirmed, In Progress, Completed, Cancelled)
- Sort dropdown (Date, Client, Revenue, Status)
- Search by event name/client
- "New Event" button → `/events/new`

#### Events Table/Grid

- Per event row:
  - Event name (link to detail)
  - Client name (link to client profile)
  - Date & time
  - Occasion/event type
  - Status badge (color-coded by state)
  - Guest count
  - Revenue (or "Draft" if unpaid)
  - Menu status (approved/pending/draft)
  - Actions menu:
    - Edit → Form
    - View detail → `/events/[id]`
    - Duplicate → Create new event from this template
    - Archive → Hide from list
    - Delete → Permanently remove (if allowed)

#### Bulk Actions

- Select multiple events
- Bulk archive
- Bulk delete
- Bulk export to CSV

#### Pagination

- Show X-Y of Z events
- Previous/Next buttons
- Jump to page

---

### Event Detail Page

**Route:** `/events/[id]`

#### Sidebar (always visible)

- Event name (editable inline)
- Client name & avatar (link to client)
- Occasion/event type
- Date & time (editable)
- Guest count (editable)
- Location/address (editable)
- Status badge with state machine buttons:
  - Draft → Proposed (send quote)
  - Proposed → Accepted (client accepts)
  - Accepted → Paid (payment received)
  - Paid → Confirmed (chef confirms)
  - Confirmed → In Progress (event starts)
  - In Progress → Completed (event ends)
  - Any → Cancelled
- Total revenue (computed from ledger)
- Next action card (linked from queue)

#### Tab: Overview

- **Event Details Section**
  - Event name, occasion, date, time, location
  - Guest count, dietary notes
  - Event description / special requests
  - Edit button → Open form

- **Financial Summary** (computed)
  - Quoted amount
  - Paid amount
  - Balance due
  - Food cost (from recipes)
  - Gross profit
  - Link to `/events/[id]/financials` for detail

- **Client Info**
  - Client name, email, phone
  - Contact person
  - Past events count
  - Link to full client profile

- **Attendees**
  - Guest list with names, dietary restrictions, allergies
  - Add/remove guest buttons
  - Export guest list

- **Files & Documents**
  - List of uploaded documents (menus, contracts, photos)
  - Upload button
  - Download button per file
  - Delete button per file

- **Activity Feed**
  - Timeline of all changes (status updates, quotes sent, payments, messages)
  - Per entry: timestamp, who did it, what changed

#### Tab: Schedule

- **Day-of Timeline**
  - Hour-by-hour view with color-coded phases (prep/execution/service/cleanup)
  - Current time indicator (when on day of event)
  - Per hour:
    - Scheduled tasks/notes
    - Add task button
    - Edit task button
    - Delete task button

- **Prep Schedule** (days before event)
  - Per day leading up to event:
    - Prep tasks and duration estimates
    - Add/edit/delete prep tasks
    - Mark complete/incomplete
    - Assign to staff member (if team)

- **Staff & Stations** (if team event)
  - Per station: assigned staff, tasks
  - Per staff member: assigned stations, tasks
  - Swap staff between stations
  - Mark ready/not ready

- **Route Plan** (if travel required)
  - Map showing home → event location → home
  - Estimated travel time each direction
  - Parking notes
  - Edit route button

- **Full Schedule View** → `/events/[id]/schedule`

#### Tab: Menu

- **Menu Status Badge**
  - Draft, Pending Approval, Approved (color-coded)

- **Courses**
  - Per course (appetizer/soup/salad/main/dessert/etc.):
    - Course name, description
    - Dishes in course with count
    - Edit course button
    - Delete course button
    - Reorder (drag/drop)

- **Dishes**
  - Per dish:
    - Dish name (link to recipe)
    - Ingredients count
    - Prep time
    - Cost per serving
    - Edit button → Form
    - Delete button
    - Reorder within course

- **Recipe Details** (inline or modal)
  - Full recipe text, ingredients, method, yield
  - Cost breakdown (per ingredient)
  - Dietary info (allergens, vegan/vegetarian/GF markers)
  - Substitution options

- **Approval Flow** (if client approval required)
  - Menu approval status
  - "Request Approval" button → Send to client
  - "Approve" button (if awaiting staff approval)
  - Comments from client/approvers

- **Edit Menu** button → `/events/[id]/menu/edit`

- **Export Menu** button → PDF for printing or emailing

#### Tab: Staff

- **Staff Assignment**
  - Per staff member:
    - Name, role (sous chef/assistant/plating/bar)
    - Assigned stations (if applicable)
    - Tasks assigned
    - Contact info
    - Availability status

- **Invite Staff** button
  - Email invite form
  - Staff directory search
  - Bulk invite

- **Attendance Tracking**
  - Per staff: confirmed/declined/no response
  - Send reminder button

- **Assignments Panel** (click staff to edit)
  - Reorder staff priority
  - Change role
  - Assign to stations
  - Assign specific tasks
  - Remove from event

#### Tab: Financials

- **Quote Summary**
  - Quoted total
  - Discount/promo code applied (if any)
  - Tax (if applicable)
  - Total due

- **Payment Tracking**
  - Amount paid, date paid, payment method
  - Balance due
  - Payment schedule (if multi-payment)
  - Past due indicator (if late)

- **Cost Breakdown**
  - Food cost (by course/component)
  - Labor cost (estimated)
  - Venue/rental costs
  - Other expenses
  - Total cost

- **Profit Summary**
  - Gross revenue
  - Total expenses
  - Gross profit
  - Profit margin %

- **Ledger Entries** (immutable transaction log)
  - Per entry: date, description, debit/credit, running balance
  - Link to view full ledger

- **Send Invoice** button → Email/SMS to client
- **Export Invoice** button → PDF

#### Tab: Notes & Messages

- **Internal Notes** (chef-only)
  - Text field with rich formatting
  - Save/edit/delete notes
  - Timestamp & author

- **Messages with Client** (separate from notes)
  - Chat-style conversation
  - Compose message field
  - Send button
  - SMS toggle (send via SMS instead of email)
  - Message history with timestamps

- **Attachments**
  - Drag/drop upload
  - Link files from library
  - Delete attachment

#### Sub-Pages (linked from Event Detail)

**Schedule:** `/events/[id]/schedule`

- Full-page day timeline
- Edit mode for all tasks
- Print-friendly view
- Export to PDF

**Menu:** `/events/[id]/menu`

- Full-page menu editor
- Drag/drop reorder courses
- Add/edit/delete dishes
- Link recipes
- Edit recipe inline or full page

**Menu Approval:** `/events/[id]/menu/approval`

- Send menu to client for approval
- Track approval status
- Comments/feedback from client
- Approve/reject/request changes

**Grocery Quote:** `/events/[id]/grocery-quote`

- AI-generated shopping list from recipes
- Per item: quantity, unit, estimated cost
- Link to Instacart/MealMe for pricing
- Bulk price update button
- Export shopping list

**Financial Detail:** `/events/[id]/financials`

- Full ledger view (all transactions)
- Chart of revenue/expenses over time
- Download ledger as CSV

**MenuApprovalStatus:** `/events/[id]/menu-approval-status`

- Current approval state
- Approver list & status (approved/pending/declined)
- Send reminders

**Staff Panel:** `/events/[id]/staff`

- Manage staff assignments
- View availability
- Message staff

**Temperature Logs:** `/events/[id]/temp-logs`

- Record temperature checks (if HACCP required)
- Per log: food item, temperature, timestamp, checked by
- Flag unsafe temps
- Print logs

**Contingency Plans:** `/events/[id]/contingency`

- Create backup plans for failures
- Per plan: scenario, backup option, who to contact
- Activate contingency plan button

---

## 3. CLIENTS

**Routes:** `/clients`, `/clients/[id]`, `/clients/[id]/[tab]`

### Clients Directory Page

**Route:** `/clients`

#### Header

- H1 "Clients"
- Status filter pills (All, Active, Inactive, Do Not Contact)
- Segment filter (Repeat client, VIP, New, Churned)
- Sort (Name, Last Event, Next Event, Loyalty Tier, Lifetime Value)
- Search by name, email, phone
- "New Client" button → Form

#### Clients Table

- Per client row:
  - Name & avatar (link to detail)
  - Email, phone
  - Last event date
  - Next event date (if scheduled)
  - Lifetime value
  - Loyalty tier badge (if enrolled)
  - Status badge (active/inactive/DNC)
  - Actions menu (view, edit, message, add event, delete)

#### Bulk Actions

- Select multiple clients
- Bulk email
- Bulk SMS
- Bulk add to campaign
- Bulk export to CSV

#### Pagination

---

### Client Detail Page

**Route:** `/clients/[id]`

#### Sidebar

- Client name (editable)
- Avatar (editable)
- Email, phone, address (editable)
- Segment tags (VIP, repeat, etc.)
- Status (Active/Inactive/Do Not Contact) toggle
- Loyalty tier badge + points balance
- Lifetime value (total spent)
- Event count
- Last event date
- Next event date

#### Tab: Overview

- **Contact Information**
  - Name, email, phone, address
  - Additional contacts (spouse, assistant, etc.)
  - Preferred contact method
  - Do Not Contact reason (if applicable)
  - Edit button

- **Events**
  - List of past events (link to detail)
  - List of upcoming events (link to detail)
  - "Schedule new event" button → `/events/new?client_id=X`

- **Loyalty Program** (if enrolled)
  - Current tier & badge
  - Points balance
  - Points history (transactions)
  - Redeemable rewards list
  - Upcoming tier milestone

- **Preferences & Notes**
  - Dietary restrictions (allergies, vegan, etc.)
  - Food preferences
  - Disliked foods
  - Service style preferences
  - Internal notes (chef-only)
  - Edit button

#### Tab: Events

- Timeline of all past events (newest first)
- Per event: link to detail, occasion, date, revenue, status
- "Schedule new event" button

#### Tab: Financials

- Total lifetime revenue
- List of invoices with amounts, dates, payment status
- Outstanding balance
- Payment history (successful & failed)
- Chart: revenue over time

#### Tab: Loyalty Program

- Current tier, points balance
- Points earning breakdown (events, referrals, special)
- Redeemable rewards catalog
- Points history ledger
- Upgrade path to next tier (X more points needed)
- Manage loyalty (admin tools to add/remove points, change tier)

#### Tab: Messages & Communication

- Chat history with client
- Compose new message
- Send button, SMS toggle
- Message history by date
- Search past messages
- Attach files

#### Tab: Documents

- List of uploaded files (contracts, photos, notes)
- Upload new document button
- Download/delete per document

#### Tab: Quotes & Proposals

- List of quotes sent to this client
- Per quote: link to detail, date, amount, status (open/accepted/expired/declined)
- "New Quote" button → Form

#### Tab: Account Settings (if client has portal access)

- Client email address
- Change password button
- Two-factor authentication toggle
- Delete account button
- Download data export button

---

## 4. INQUIRY PIPELINE

### 4A. Inquiries

**Routes:** `/inquiries`, `/inquiries/[id]`, `/inquiries/new`

#### Inquiries List

**Route:** `/inquiries`

- Status filter (All, New, Contacted, Quoted, Closed, Declined, No-Show)
- Lead score filter (hot/warm/cold)
- Date range filter
- Search by client name/email
- Sort (date, lead score, follow-up due)
- "New Inquiry" button → Form

Per inquiry row:

- Client name (link to inquiry detail)
- Occasion/event type
- Date of event
- Guest count
- Lead score badge (color: hot=red, warm=amber, cold=grey)
- Status badge
- Follow-up due date (with overdue warning)
- Last contact date
- Actions menu (view, message, create quote, archive, delete)

#### Inquiry Detail Page

**Route:** `/inquiries/[id]`

- Client name, email, phone (editable)
- Occasion/event type (editable)
- Event date (editable)
- Guest count (editable)
- Budget range (editable)
- Dietary notes (editable)
- Lead score (computed from GOLDMINE extraction)
  - Breakdown: budget match, occasion type, repeat likelihood, etc.
- Status (editable dropdown)
- Follow-up due date (editable)

Tabs:

- **Overview:** Basic info above + internal notes + activity feed
- **Communications:** Message history with timestamps
- **Quotes:** List of quotes sent + link to create new quote
- **Notes:** Internal-only notes (rich text, timestamps)

Actions:

- Send message button
- Create quote button → `/quotes/new?inquiry_id=X`
- Change status button
- Archive button
- Delete button

---

### 4B. Quotes

**Routes:** `/quotes`, `/quotes/[id]`, `/quotes/new`

#### Quotes List

**Route:** `/quotes`

- Status filter (All, Draft, Sent, Accepted, Expired, Declined)
- Date range filter
- Search by client/quote number
- Sort (date, amount, status)
- "New Quote" button → Form

Per quote row:

- Quote number (link to detail)
- Client name (link to client)
- Occasion/event type
- Event date
- Total amount
- Status badge
- Quote date
- Expiration date (with warning if expired)
- Actions menu (view, edit, send, duplicate, archive, delete)

#### Quote Detail Page

**Route:** `/quotes/[id]`

- Quote number (system-generated)
- Quote date
- Expiration date
- Client name, email, phone
- Event details (date, location, occasion, guest count)

Sections:

- **Menu** (if specified)
  - Per course/dish with description
- **Pricing**
  - Per-person rate
  - Number of guests
  - Subtotal
  - Discount ($ or %)
  - Tax
  - Total
- **Payment Terms**
  - Due date
  - Accepted payment methods
  - Cancellation policy
  - Terms & conditions
- **Notes to Client**
  - Custom message (e.g., "Looking forward to...")

Tabs:

- **Overview:** Details above
- **History:** All versions of quote (if modified)
- **Communication:** Messages about this quote

Actions:

- Edit button → Form
- Mark as sent button
- Resend button
- Mark as accepted button (if client accepts)
- Mark as declined button
- Duplicate button → Create new quote from template
- Archive button
- Delete button

#### Quote Creation Form

**Route:** `/quotes/new`

- Select client (search/create new)
- Select event (if existing) or create new event details
- Menu selection (link to existing menu or create new)
- Pricing setup:
  - Per-person rate input
  - Guest count input
  - Discount ($ or %)
  - Tax rate
  - Auto-calculated total
- Payment terms
- Notes to client
- Preview button → Shows how quote looks to client
- Send button → Email to client
- Save as draft button

---

### 4C. Leads

**Routes:** `/leads`, `/leads/[id]`

(Lead records are inquiries with explicit lead scoring. Same structure as Inquiries but with lead-specific fields.)

- Lead score (0-100)
- Score breakdown (budget fit, occasion relevance, repeat probability, urgency)
- Conversion probability
- Estimated lifetime value
- Contact attempts count + dates
- Last contact method
- Next follow-up due
- Reason for score (if low: not in season, out of budget, etc.)

---

### 4D. Calls & Meetings

**Routes:** `/calls`, `/calls/[id]`, `/calls/new`

#### Calls List

**Route:** `/calls`

- Filter by status (scheduled, completed, missed, cancelled)
- Filter by type (discovery call, consultation, follow-up)
- Date range
- "Schedule call" button

Per call:

- Date & time
- Contact name
- Call type
- Duration (if completed)
- Agenda items count
- Notes preview
- Status badge
- Actions (view, edit, reschedule, cancel, delete)

#### Call Detail Page

**Route:** `/calls/[id]`

- Contact name, email, phone
- Call date & time
- Call type (discovery/consultation/follow-up)
- Duration (if completed)
- Agenda items (checkbox list, edit items)
- Call notes (rich text)
- Recording link (if recorded)
- Attendees list
- Add to calendar button
- Reschedule button
- Mark complete button
- Cancel call button

---

### 4E. Partners

**Routes:** `/partners`, `/partners/[id]`

(Similar structure to clients but for vendor partnerships)

- Partner name, company, contact info
- Services offered
- Pricing terms
- Contract dates
- Communications history

---

### 4F. Prospecting

**Routes:** `/prospecting`, `/prospecting/campaigns`, `/prospecting/[id]`

#### Prospecting List

**Route:** `/prospecting`

(Admin-only feature)

- Search prospects
- Filter by source, status, score
- "New prospect" button

Per prospect:

- Name, contact info
- Lead source
- Lead score
- Status (not contacted, contacted, prospect, qualified, rejected)
- Last contact date
- Actions (view, contact, qualify, reject)

#### Prospecting Detail

**Route:** `/prospecting/[id]`

- Contact info
- Lead source & date
- Lead score breakdown
- Contact history
- Status timeline
- Notes & internal comments
- Qualify/reject buttons

#### Prospecting Campaigns

**Route:** `/prospecting/campaigns`

- List of outreach campaigns
- Per campaign: name, target count, contacted count, responses count, conversion rate
- "New campaign" button
- Edit/view campaign button

---

### 4G. Guest Leads

**Routes:** `/guest-leads`, `/guest-leads/[id]`

(Leads from existing clients — guests who attended events)

- Guest name, contact info
- Referring client (link)
- Event attended
- Lead score
- Contact history
- Status
- Follow-up due

---

### 4H. Proposals

**Routes:** `/proposals`, `/proposals/[id]`

(Formal proposals for larger/complex events)

- Similar to quotes but more detailed
- Multi-section proposal template
- Approval workflow
- Signature capture

---

### 4I. Testimonials & Reviews

**Routes:** `/testimonials`, `/testimonials/[id]`

- Collect client testimonials post-event
- Star rating
- Review text
- Permission to share on website
- Publish button
- Display on portfolio

---

## 5. FINANCIALS

### 5A. Financial Hub

**Routes:** `/finance`, `/finance/dashboard`

- **Overview Cards:**
  - Monthly revenue (this month vs. last month, trend %)
  - Monthly expenses (same metrics)
  - Net profit (same metrics)
  - Profit margin %
  - Outstanding receivables (total + count)

- **Charts:**
  - Revenue over last 12 months (line chart)
  - Expenses vs. revenue (stacked bar chart)
  - Profit margin trend (line chart)
  - Revenue by event type (pie chart)

- **Quick Actions:**
  - Log expense button → Form
  - View ledger button → `/finance/ledger`
  - Run tax report button → `/finance/tax`
  - View payroll button → `/finance/payroll`

---

### 5B. Expenses

**Routes:** `/expenses`, `/expenses/[id]`, `/expenses/new`

#### Expenses List

**Route:** `/expenses`

- Date range filter
- Category filter (groceries, supplies, labor, venue, travel, equipment, utilities, insurance, other)
- Vendor filter
- Recurring filter (show recurring expenses)
- Search by description
- "New expense" button → Form

Per expense:

- Date
- Description/vendor
- Category badge
- Amount
- Recurring indicator (if applicable)
- Payment status (paid/pending)
- Actions (edit, duplicate, delete)

#### Expense Detail

**Route:** `/expenses/[id]`

- Date
- Vendor/description
- Category
- Amount
- Receipt (upload/link)
- Notes
- Recurring toggle (+ frequency if recurring)
- Payment method
- Edit/delete buttons

#### New/Edit Expense Form

- Date picker
- Description field
- Category dropdown
- Amount input
- Vendor search/create
- Receipt upload (photo or document)
- Notes
- Mark as recurring toggle (+ frequency options)
- Save button

---

### 5C. Invoices

**Routes:** `/invoices`, `/invoices/[id]`, `/invoices/new`

#### Invoices List

**Route:** `/invoices`

- Status filter (draft, sent, viewed, partially paid, paid, overdue)
- Date range
- Search by client
- "New invoice" button

Per invoice:

- Invoice number (link to detail)
- Client name
- Event date
- Amount
- Status badge
- Due date
- Days overdue (if applicable)
- Actions (view, edit, send, print, duplicate, delete)

#### Invoice Detail

**Route:** `/invoices/[id]`

- Invoice number, date, due date
- Client name, address
- Event date/description
- Line items:
  - Per item: description, quantity, unit price, total
  - Ability to add/edit/remove items
- Subtotal
- Discount ($ or %)
- Tax (computed)
- Total due
- Payment status:
  - Amount due
  - Amount paid (with payment history)
  - Balance
  - Payment link (Stripe)
  - Payment schedule (if multi-payment)
- Notes to client
- PDF preview

Actions:

- Edit button
- Send button → Email to client
- Print button → PDF
- Mark as sent button
- Record payment button → Form
- Duplicate button
- Delete button (if not sent)

#### Invoice Payment

- Payment method selector (Stripe, bank transfer, check, cash)
- Amount input
- Date picker
- Reference/note
- Record payment button

---

### 5D. Payments

**Routes:** `/payments`, `/payments/[id]`

#### Payments List

**Route:** `/payments`

- Filter by status (completed, pending, failed, refunded)
- Filter by method (Stripe, ACH, check, cash)
- Date range
- Search by client

Per payment:

- Date
- Client name
- Amount
- Method badge
- Status badge
- Related invoice (link)
- Actions (view, edit, refund)

#### Payment Detail

**Route:** `/payments/[id]`

- Date
- Client name & email
- Amount
- Method
- Status (completed/pending/failed/refunded)
- Stripe reference ID (if applicable)
- Invoice link
- Refund button (if applicable)
- Edit button (notes only)

---

### 5E. Ledger

**Routes:** `/finance/ledger`, `/finance/ledger/[id]`

#### Ledger View

**Route:** `/finance/ledger`

(Immutable, append-only transaction log)

- Date range filter
- Type filter (revenue, expense, adjustment, refund, transfer)
- Search by description

Per entry:

- Date
- Description (what transaction is for)
- Category (if applicable)
- Debit amount (if money in)
- Credit amount (if money out)
- Running balance
- Related invoice/expense (link)
- Type badge

Actions:

- View detail button
- Export as CSV button (entire ledger)

#### Ledger Entry Detail

**Route:** `/finance/ledger/[id]`

- All fields above
- Auto-generated from transaction (cannot edit)
- Related records (invoice, expense, payment, etc.)
- Audit trail (created date, by whom)

---

### 5F. Payouts

**Routes:** `/finance/payouts`, `/finance/payouts/[id]`

(If using Stripe Connect for team member payments or subcontractor payouts)

- List of payouts scheduled/completed
- Per payout: date, amount, method, status
- Schedule new payout form

---

### 5G. Reporting & Analytics

**Routes:** `/finance/reports`, `/finance/reports/[type]`

#### Reports Dashboard

**Route:** `/finance/reports`

- **Profit & Loss** → `/finance/reports/pl`
  - Revenue by month/quarter/year
  - Expenses by category
  - Net profit
  - Download as PDF/CSV

- **Cash Flow** → `/finance/reports/cashflow`
  - Projected vs. actual cash in/out
  - Burn rate
  - Runway estimate

- **Tax Report** → `/finance/reports/tax`
  - Categorized income (by event type, client, etc.)
  - Categorized deductions
  - Total taxable income
  - Download for accountant (PDF)

- **Client Financial Trends** → `/finance/reports/client-trends`
  - Per client: lifetime value, average event value, profit margin, repeat rate
  - Sortable, exportable

- **Custom Report Builder**
  - Select date range
  - Select metrics (revenue, expenses, profit, etc.)
  - Select grouping (by date, event type, client, category)
  - View & export

---

### 5H. Tax Center

**Routes:** `/finance/tax`, `/finance/tax/settings`

- Tax summary (estimated tax liability)
- Tax-deductible expense categories (expense categorization)
- Quarterly tax estimates
- Tax filing reminders
- Download tax package (for accountant)
- Tax settings (business entity type, EIN, etc.)

---

### 5I. Payroll (if team)

**Routes:** `/finance/payroll`, `/finance/payroll/[staffId]`, `/finance/payroll/submit`

- List of staff
- Per staff: hourly rate, salary, payment schedule
- Timesheet entry (hours worked per event)
- Auto-calculate payroll
- Run payroll button → Submit to payment processor
- Payroll history
- Tax withholding setup

---

### 5J. Other Financial Tools

- Budget planner (set revenue/expense targets)
- Break-even calculator
- Pricing analyzer (by event type, client segment)

---

## 6. CULINARY

### 6A. Menus

**Routes:** `/menus`, `/menus/[id]`, `/menus/new`

#### Menus List

**Route:** `/menus`

- Filter by status (draft, approved, archived)
- Filter by event type (wedding, corporate, intimate, etc.)
- Search by name
- "New menu" button

Per menu:

- Name (link to detail)
- Occasion type
- Creation date
- Dish count
- Status badge
- Allergies covered badge (yes/no)
- Actions (view, edit, duplicate, approve, archive, delete)

#### Menu Detail

**Route:** `/menus/[id]`

- Menu name, occasion type, description
- Courses (appetizers, soup, salad, main, dessert, etc.)
  - Per course: dish list with costs
- Dietary coverage (vegan options, GF options, allergen-free, etc.)
- Total estimated cost per serving
- Approval status (if approval required)

Tabs:

- **Overview:** Details above
- **Dishes:** All dishes with full details
- **Nutrition:** Summary nutrition info (if available)
- **Approval:** Approval workflow & history
- **Events Using:** Events that have used this menu

Actions:

- Edit button
- Duplicate button → Create new menu from this
- Approve button (if pending)
- Archive button
- Delete button
- Link to event button (if editing within event context)

#### Menu Editor

**Route:** `/menus/[id]/edit`

- Menu name, occasion, description
- Add course button
- Per course (drag/drop to reorder):
  - Course name, description
  - Add dish button
  - Per dish (drag/drop to reorder):
    - Link to recipe dropdown (search existing recipes)
    - Or create new inline recipe
    - Edit dish button (toggle inline editor)
    - Remove from menu button
- Save draft button
- Publish/approve button

---

### 6B. Recipes

**Routes:** `/recipes`, `/recipes/[id]`, `/recipes/new`, `/recipes/sprint`

#### Recipes List

**Route:** `/recipes`

- Filter by cuisine, skill level, prep time, dietary
- Search by name/ingredient
- "New recipe" button
- "Capture recipes" button → Sprint capture mode (`/recipes/sprint`)

Per recipe:

- Name (link to detail)
- Cuisine/category
- Dietary badges (vegan, GF, etc.)
- Prep time, cook time
- Yield
- Cost per serving
- Times used (in events)
- Actions (view, edit, use in menu, duplicate, archive, delete)

#### Recipe Detail

**Route:** `/recipes/[id]`

- Recipe name, description, yield
- Cuisine, skill level, dietary notes
- Timing (prep, cook, chill, rest, total)
- **Ingredients** (scale-able by yield)
  - Per ingredient: quantity, unit, name, cost per unit, subtotal
  - Ingredient sourcing (linked to vendors)
  - Substitution notes
- **Method** (steps with timing)
  - Per step: description, duration, notes
  - Can include photos
- **Notes** (chef's personal notes)
- **Nutritional Info** (if calculated)
- **Allergen warnings** (prominently displayed)
- **Uses** (list of events that have used this recipe)
- Cost per serving (computed)

Tabs:

- **Overview:** Details above
- **Scaling:** Adjust yield and see ingredient/time adjustments
- **Shopping:** Generate shopping list
- **Nutrition:** Detailed nutrition breakdown
- **Costing:** Cost breakdown by ingredient
- **Notes:** Version history & chef notes

Actions:

- Edit button → Form
- Duplicate button
- Share with chefs button (collaboration)
- Use in menu button
- Print button → Recipe card
- Export button → PDF
- Archive button
- Delete button

#### Recipe Editor

**Route:** `/recipes/[id]/edit`

- Name, description, cuisine, skill level
- Dietary flags (vegan, GF, DF, etc.)
- Prep/cook/chill/rest time inputs
- Yield input (with unit)
- **Ingredients section:**
  - Add ingredient button
  - Per ingredient: quantity, unit, ingredient search/create, cost/unit, notes
  - Delete ingredient button
  - Reorder (drag/drop)
- **Method section:**
  - Add step button
  - Per step: text editor, duration, photo upload button
  - Delete step button
  - Reorder (drag/drop)
- **Allergen notes** text field
- **Chef notes** text field
- Save draft button
- Publish button

#### Recipe Sprint Capture

**Route:** `/recipes/sprint`

(Bulk rapid-capture mode for entering recipes quickly)

- Brain dump text area (paste recipes or type multiple)
- Process button → AI parses multiple recipes
- Review parsed recipes (one per screen)
- Per recipe: edit fields as needed
- Save button → adds to recipe book
- Skip button → next recipe
- Finish button → all done

---

### 6C. Ingredients

**Routes:** `/ingredients`

(Master list of ingredients with sourcing & pricing)

- Search by name
- Filter by category (proteins, vegetables, pantry, etc.)
- "New ingredient" button

Per ingredient:

- Name (link to detail)
- Category
- Default unit (lb, oz, each, etc.)
- Cost per unit (with vendor)
- Allergen info
- Sourcing options count

#### Ingredient Detail

- Name, category, unit
- **Vendor options** (list of where to buy + price per unit)
  - Add vendor button
  - Per vendor: vendor name, price/unit, lead time, notes
- Allergen info (nuts, dairy, gluten, shellfish, etc.)
- Substitutes (link to other ingredients)
- Used in recipes (list)

---

### 6D. Components

**Routes:** `/components`

(Pre-made components/stocks/bases to reuse across recipes)

- List of components
- Per component: name, ingredients, yield, cost
- "New component" button

Component Detail:

- Name, description
- Ingredients list (with costs)
- Method (how to make)
- Yield & cost per unit
- Used in recipes (list)
- Used in menus (list)

---

### 6E. Costing

**Routes:** `/costing`, `/costing/analysis`, `/costing/trends`

#### Costing Overview

**Route:** `/costing`

- Total recipe cost vs. quoted price (margin analysis)
- Most expensive recipes (by component cost)
- Cost trend (over time)
- Food cost % (total food cost / revenue)

#### Costing Analysis

**Route:** `/costing/analysis`

- Per event: food cost vs. revenue
- Per recipe: actual cost vs. estimated cost
- Variance analysis (where estimates were wrong)
- Ingredient price volatility

#### Cost Trends

**Route:** `/costing/trends`

- Ingredient price trends (over last 12 months)
- Recipe cost trends
- Seasonal variations
- Vendor price comparisons

---

### 6F. Prep

**Routes:** `/prep`, `/prep/[eventId]`

(Prep planning & execution tracking for days before event)

#### Prep Board

**Route:** `/prep`

- Week view of all events
- Per event: prep items, completion %, lead person
- "Add prep task" button

#### Event Prep

**Route:** `/prep/[eventId]`

- List of all prep tasks for event (organized by day/priority)
- Per task: description, assigned person, due date, duration, status, notes
- "Add prep task" button
- Check complete button per task
- Mark all complete button
- Print prep sheet button

---

### 6G. Vendors

**Routes:** `/vendors`, `/vendors/[id]`, `/vendors/new`

#### Vendors List

**Route:** `/vendors`

- Filter by category (produce, proteins, pantry, specialty, etc.)
- Search by name
- "New vendor" button

Per vendor:

- Name (link to detail)
- Category
- Products carried count
- Last order date
- Total spent (lifetime)
- Actions (view, edit, message, order, delete)

#### Vendor Detail

**Route:** `/vendors/[id]`

- Name, category, contact info (email, phone, address)
- Products they supply (list with pricing)
- Pricing history (how prices have changed)
- Order history (past orders with dates/amounts)
- Notes (e.g., minimum orders, lead times, specialties)
- "Place order" button
- "Send message" button
- Edit button
- Delete button

---

### 6H. Inventory

**Routes:** `/inventory`, `/inventory/[id]`

(Track ingredients & supplies on hand)

#### Inventory Overview

**Route:** `/inventory`

- List of inventory items
- Per item: name, quantity on hand, par level, last updated date
- Low-stock alerts (items below par)
- "Count inventory" button → Bulk update quantities
- "Order supplies" button → Generate order from par levels

#### Inventory Management

- Per item: current quantity, par level, unit cost, last updated by/when
- Adjust quantity button (log consumption or new stock)
- Set par level button
- Delete item button (when zero)

---

### 6I. Culinary Board

**Routes:** `/culinary/board`

(Dashboard for recipe/menu/prep management)

- Recipes needing capture (recipe debt)
- Recipes needing updates (flagged as outdated)
- Menus needing approval
- Prep tasks for upcoming events
- Ingredient price alerts
- Vendor deals/specials

---

### 6J. Seasonal Palettes

**Routes:** `/seasonal`

(Collections of recipes/ingredients by season for inspiration)

- Spring recipes, summer recipes, fall recipes, winter recipes
- Per season: featured ingredients, recipe ideas, menu templates
- Link to recipe when season is near

---

## 7. CALENDAR

**Routes:** `/schedule`, `/schedule/week`, `/schedule/month`, `/schedule/day`

### Calendar Views

#### Month View

**Route:** `/schedule/month` or `/schedule?view=month`

- Full month calendar (6-week grid)
- Per event on day: event name (linked to detail), guest count, time
- Different colors per event type or status
- Click on day → view that day's events
- Click on event → open detail
- "New event" button
- Navigate prev/next month

#### Week View

**Route:** `/schedule/week` or `/schedule?view=week`

- Monday-Sunday week grid
- Per day (column):
  - Date, day of week
  - All events in that day (with times, colors, guest count)
  - Per event: click to view detail or edit
  - "New event" button on any day
- "Scheduling gap" banner if any gaps found
- Navigate prev/next week

#### Day View

**Route:** `/schedule/day` or `/schedule?view=day`

- Full-day timeline (6am-midnight, hourly slots)
- Per event: time block with name, location, prep notes
- Click to view/edit event
- "New event" button
- Travel time blocks (home → event → home)

#### Agenda View

**Route:** `/schedule?view=agenda`

- List of upcoming events (chronological)
- Per event: date, time, location, client, guests, next action
- Click to view detail
- Multi-day filter

---

## 8. INBOX & MESSAGING

**Routes:** `/inbox`, `/inbox/[clientId]`, `/inbox/search`

### Inbox

**Route:** `/inbox`

- Conversation list (all active chats with clients)
- Filter by status (active, archived)
- Search by client name
- Per conversation:
  - Client name & avatar
  - Last message preview (truncated)
  - Last message date
  - Unread indicator (if unread)
  - Click to open conversation
  - Archive button (swipe or menu)

### Conversation Detail

**Route:** `/inbox/[clientId]`

- Client name, email, phone at top
- Message history (chronological, oldest first)
- Per message: timestamp, sender, message text
- Compose field at bottom
- Send button, emoji picker
- Attach file button
- SMS vs. email toggle (send via SMS instead of email)
- Call button (if phone number available)

### Search

**Route:** `/inbox/search`

- Search across all messages
- Per result: client name, message snippet, date
- Click to jump to message in conversation

---

## 9. STAFF

**Routes:** `/staff`, `/staff/[id]`, `/staff/new`

### 9A. Staff Directory

#### Staff List

**Route:** `/staff`

- Filter by role (sous chef, assistant, plating, bar, logistics, etc.)
- Filter by status (active, inactive)
- Search by name
- "Add staff member" button

Per staff:

- Name & avatar (link to detail)
- Role/title
- Email, phone
- Hourly rate (if applicable)
- Last event date
- Upcoming events count
- Actions (view, edit, message, schedule, archive, delete)

#### Staff Detail

**Route:** `/staff/[id]`

- Name, avatar, contact info
- Role/title
- Hourly rate / salary
- Availability (calendar of available days)
- Past events (list with dates)
- Upcoming events (list)
- Specialties (tags: plating, prep, pastry, etc.)
- Emergency contact info
- Notes (dietary restrictions of own, certifications, etc.)
- Edit button
- Message button
- Schedule for event button
- Archive/delete buttons

#### Add Staff Form

**Route:** `/staff/new`

- Name
- Email, phone
- Role dropdown
- Hourly rate
- Availability (calendar picker for days available)
- Specialties (multi-select tags)
- Emergency contact
- Notes
- Send invitation button (if email provided)

### 9B. Stations (Kitchen Clipboard System)

**Routes:** `/stations`, `/stations/[eventId]`

(For restaurants, food trucks, bakeries — kitchen operations)

#### Stations Overview

**Route:** `/stations`

- List of events with kitchen operations (upcoming)
- Per event: name, date, guest count, stations count, prep status
- "View stations" link → `/stations/[eventId]`

#### Event Stations Board

**Route:** `/stations/[eventId]`

- Event name, date, guest count at top
- Per station (app/plating/sauces/proteins/dessert/bar):
  - Station name (card)
  - Assigned staff (if multiple, can assign one lead)
  - Tasks for this station (prep + service)
  - Per task: status (pending/in-progress/done), assigned to, duration estimate
  - Check-mark to mark task done
  - Ticket queue (if orders coming through):
    - Per order/table: items needed from this station, time received, time ready
    - Mark ready button
  - Station status indicator (ready/not-ready/overwhelmed)
  - Notes/alerts (e.g., "Low on basil")

#### Station Configuration

- For event: edit which stations are needed
- Per station: edit name, assign lead, list tasks
- Delete station button

### 9C. Vendors & Food Cost (Staff View)

(Staff can log food arrivals, temperatures, inventory counts)

#### Receiving Log

**Route:** `/staff/receiving`

- Log food deliveries
- Per delivery: vendor, date/time, items received, count verification
- Temperature check for perishables
- Signature/confirmation button

#### Temperature Logs

**Route:** `/staff/temperature`

- Record temperature checks (HACCP compliance)
- Per log: food item, temperature, timestamp, checked by
- Flag unsafe temps (auto-alert)

---

### 9D. Guest CRM

**Routes:** `/guests`, `/guests/[id]`

(Track individual guests across events for VIP service)

#### Guests List

**Route:** `/guests`

- Filter by status (active, inactive, VIP)
- Search by name
- Per guest: name, affiliated client, events attended, last event date, VIP indicator

#### Guest Detail

**Route:** `/guests/[id]`

- Name, email, phone
- Affiliated client (link)
- Events attended (list with dates)
- Dietary restrictions / allergies
- Preferences (seating, dietary, etc.)
- Notes (VIP observations, likes/dislikes, stories)
- VIP flag toggle

### 9E. Notifications

**Routes:** `/notifications`, `/notifications/settings`

#### Notifications List

**Route:** `/notifications`

- All notifications (chronological, newest first)
- Per notification: timestamp, type badge (event update, message, payment, reminder), message, CTA link
- Mark as read button
- Delete button
- Filter by type

#### Notification Settings

**Route:** `/notifications/settings`

- Toggle notifications ON/OFF by type:
  - Event changes
  - New messages
  - Payment received
  - Reminder notifications
  - Staff updates
  - AI suggestions
- Toggle email vs. in-app for each
- Do Not Disturb hours (start/end time)
- Save button

### 9F. Staff Portal (Staff-Facing)

**Routes:** `/staff-portal`, `/staff-portal/events`, `/staff-portal/pay`

(Read-only access for staff to see events, pay, and receive instructions)

#### Staff Dashboard

**Route:** `/staff-portal`

- Upcoming events (next 7 days)
- Per event: date, time, location, role, prep start time
- "View event" button → event detail (read-only)
- "View pay" button → payroll detail (read-only)

#### My Events

**Route:** `/staff-portal/events`

- List of all past & upcoming events
- Per event: date, chef, location, role, hours worked (if completed), paid status
- Click to view details

#### My Pay

**Route:** `/staff-portal/pay`

- Current pay period info
- Hours logged for this period
- Estimated pay
- Past pay periods (with amounts paid)

---

## 10. ANALYTICS

**Routes:** `/analytics`, `/analytics/business`, `/analytics/events`, `/analytics/clients`

### Analytics Hub

**Route:** `/analytics`

Quick stat cards:

- Events this month
- Revenue this month
- Avg. event value
- Client count
- Repeat client %
- Profit margin %

Navigation to detailed analytics:

- Business analytics → `/analytics/business`
- Event analytics → `/analytics/events`
- Client analytics → `/analytics/clients`
- Reporting → `/finance/reports`

### Business Analytics

**Route:** `/analytics/business`

- **Growth Metrics:**
  - Revenue trend (line chart over 12 months)
  - Event count trend
  - Client count growth
  - Repeat client %

- **Profitability:**
  - Revenue vs. expenses (stacked bar chart)
  - Profit margin trend
  - Highest/lowest margin event types

- **Efficiency:**
  - Avg. revenue per event
  - Cost per guest
  - Events per month (actual vs. target)

- **Forecasting:**
  - Projected revenue (next 3/6/12 months based on historical trend)
  - Capacity utilization

### Event Analytics

**Route:** `/analytics/events`

- **Event Performance:**
  - Events by type (pie chart with count & revenue)
  - Avg. event value by type
  - Most profitable event types
  - Least profitable event types

- **Event Metrics:**
  - Avg. prep time
  - Avg. guest count
  - Revenue distribution (histogram)
  - Guest satisfaction (if collecting reviews)

- **Seasonality:**
  - Events by season
  - Revenue by season
  - Busiest months

### Client Analytics

**Route:** `/analytics/clients`

- **Client Segments:**
  - New vs. repeat clients (pie chart)
  - Client count by repeat rate
  - Avg. client lifetime value
  - Churn rate

- **Client Quality:**
  - Revenue by client (ranked list)
  - Profitability by client
  - Repeat rate per client
  - Average events per client

- **Client Acquisition:**
  - New clients per month
  - Client acquisition cost (total marketing spend / new clients)
  - Time from inquiry to first event

---

## 11. DAILY OPS

**Routes:** `/daily`, `/daily/tasks`

(Day-of-planning and execution tracking)

### Daily Ops Board

**Route:** `/daily`

- Today's event (if applicable) at top
- 4 task lanes (drag/drop between lanes):
  - **Admin:** contracts, payments, confirmations, reservations
  - **Prep:** recipe prep, shopping, equipment setup
  - **Creative:** menu refinement, plating design, presentation
  - **Relationship:** client calls, staff updates, guest communication

- Per task card:
  - Title, deadline
  - Assigned to (if team)
  - Duration estimate
  - Drag to lane
  - Mark complete button
  - Delete button
  - Expand for notes button

- Stats bar:
  - Total tasks, completed, % done
  - Estimated time remaining
  - "Go cook" message when all done

- "New task" button → Form

### Task Management

**Route:** `/daily/tasks`

- Create task form
- Task list (all tasks, past & present)
- Filter by status, lane, date range
- Sort by deadline, priority, lane

---

## 12. ACTIVITY & QUEUE

**Routes:** `/queue`, `/queue/[id]`, `/activity`

### Queue System

#### Queue Overview

**Route:** `/queue`

- **Queue Stats:**
  - Total items
  - By urgency (critical/high/normal/low)
  - By domain (events/clients/finance/culinary/ops)
  - By age (new/this week/older)

- **Filter/Sort:**
  - Filter by urgency
  - Filter by domain
  - Sort by urgency (desc), by age (oldest first), by due date
  - Search by title

- **Queue Items:**
  - Per item: link to detail, domain icon, urgency badge, title, description, due date, age, assignee
  - Star/favorite button (for priority)
  - Snooze button (postpone to later date)
  - Archive button (mark done)

#### Queue Item Detail

**Route:** `/queue/[id]`

- Full title & description
- Urgency level (with reasoning)
- Domain (events/clients/finance/culinary/ops)
- Related record (event/client/quote/etc., linked)
- Due date
- Created date, last updated
- Action button (what to do)
  - Opens relevant form/page (e.g., "Send quote" → quotes form)
  - Or marks complete if it's just a notification
- Archive button
- Snooze button
- Notes field

### Activity Log

**Route:** `/activity`

(Audit trail of all changes in the system)

- Filter by type (created/updated/deleted)
- Filter by entity type (events/clients/invoices/etc.)
- Filter by date range
- Search by description

Per activity entry:

- Timestamp
- What changed (e.g., "Event status changed from draft to proposed")
- Who made change (user)
- Related record (link)

---

## 13. TRAVEL & OPERATIONS

**Routes:** `/travel`, `/travel/[eventId]`

(Route planning for events, travel logistics)

### Travel Overview

**Route:** `/travel`

- List of upcoming events requiring travel
- Per event: date, location, travel time estimate
- "View routes" button → detail

### Event Travel Detail

**Route:** `/travel/[eventId]`

- Event location (address)
- Route from home to venue (map with directions, distance, time estimate)
- Route from venue to home (map, distance, time)
- Parking info (if applicable)
- Traffic alerts (real-time, if configured)
- Toll info
- Travel checklist (equipment, notes, etc.)
- Edit location/route button
- Share route with staff button

---

## 14. REVIEWS & AAR (After-Action Reports)

**Routes:** `/aar`, `/aar/[eventId]`, `/reviews`, `/reviews/[eventId]`

### AAR List

**Route:** `/aar`

- Filter by completion status (draft, completed)
- Filter by event date range
- Per AAR: link to event, date completed, rating (1-5 stars), key insights

#### AAR Detail / Template

**Route:** `/aar/[eventId]`

Questions to answer:

- What went well? (text)
- What could improve? (text)
- What will you do differently next time? (text)
- Unexpected challenges? (text)
- Staff performance? (per staff member: rating + feedback)
- Client satisfaction? (rating + comments)
- Profitability reflection? (margin OK? pricing OK? costs OK?)
- Key learnings? (text)
- Photo gallery (upload event photos)

Sections:

- Metrics (auto-filled):
  - Event date, location, client, guests
  - Quoted vs. actual costs
  - Revenue, profit, margin %
  - Event duration, prep time
- Questions (fill-in)
- Photos (upload)

Save draft, submit button

### Reviews / Client Testimonials

**Route:** `/reviews`

- Testimonials collected from clients post-event
- Per review: client name, date, star rating, text, permission to share (public/private)

#### Collect Review

**Route:** `/reviews/[eventId]`

- Send to client button → Email/SMS form
- Client receives link to review form
- Form: star rating (1-5), text feedback, permission to share on website
- Submit button → adds to reviews list

#### Reviews Display

- Show on public portfolio / website
- Mark as featured (displays prominently)
- Filter by rating, date
- Export reviews for testimonials page

---

## 15. SETTINGS

**Routes:** `/settings`, `/settings/[section]`, `/settings/profile`, `/settings/dashboard`, `/settings/modules`, `/settings/navigation`, `/settings/billing`, `/settings/integrations`, `/settings/embed`, `/settings/privacy`

(This is 50 pages total per audit doc, so summarizing key sections)

### Settings Overview

**Route:** `/settings`

Navigation menu (sidebar or tabs):

- Profile
- Dashboard
- Modules & Billing
- Navigation
- Integrations
- Embed Widget
- Notifications
- Privacy & Security
- Account & Danger Zone

### Profile Settings

**Route:** `/settings/profile`

- Name, email, phone (editable)
- Business name (editable)
- Business logo (upload)
- Bio/description (editable)
- Business address (editable)
- Website URL (editable)
- Social media links (editable)
- Business entity type (sole prop/LLC/S-corp)
- Tax ID / EIN
- Banking info (for payouts)
- Save button

### Dashboard Settings

**Route:** `/settings/dashboard`

- Widget configuration (which widgets to show)
- Per widget: visibility toggle, position (drag/drop reorder)
- Widget-specific settings (some widgets have options)
- Reset to default layout button
- Save button

### Modules & Billing

**Route:** `/settings/modules`

- Current plan (free/pro)
- Enabled modules (based on archetype preset)
- Module toggle (pro modules can be enabled/disabled)
- Upgrade CTA (if free user)
- Billing info (payment method, next billing date)
- Subscription management (pause/cancel)

### Navigation Settings

**Route:** `/settings/navigation`

- Sidebar nav configuration
- Per nav item: visibility toggle, drag/drop reorder
- Option to reset to archetype default
- Save button

### Integrations

**Route:** `/settings/integrations`

- Stripe (connected/not connected)
  - Connect button
  - Disconnect button
  - View API keys button
- Supabase (display-only, connected via app)
- Gmail (connected/not connected)
  - Connect button
  - Disconnect button
  - Sync history
- Calendar (Google Calendar / Apple Calendar)
  - Connect button
  - Toggle sync ON/OFF
  - Disconnect button
- Ollama (local LLM)
  - Status display (running/offline)
  - Test connection button
  - Model selector (if multiple models available)
- Gemini (Google AI)
  - Status display
  - API key (hidden, set button)

### Embed Widget Settings

**Route:** `/settings/embed`

- Show/hide embed code (copy button)
- Configure embed appearance (colors, text, etc.)
- Test embed button (opens preview)
- Domain whitelist (which domains can embed the widget)
- Add domain button
- Analytics (embed submission count)

### Notifications Settings

**Route:** `/settings/notifications`

(See Staff section 9E above)

### Privacy & Security

**Route:** `/settings/privacy`

- Two-factor authentication (enable/disable)
- Session management (list active sessions, sign out of any)
- API keys (for integrations)
  - Create key button
  - Revoke key button
  - View usage stats
- Data retention policies (how long to keep deleted data)
- Download my data button (GDPR export)
- Delete account button (with confirmation & backup prompt)

### Account & Danger Zone

**Route:** `/settings/account`

- Display archive account button
- Display delete account button (final warning)
- Both require confirmation

---

## 16. MARKETING & SOCIAL

**Routes:** `/marketing`, `/marketing/campaigns`, `/marketing/social`, `/marketing/portfolio`, `/marketing/content`

### Marketing Hub

**Route:** `/marketing`

- Campaigns link → `/marketing/campaigns`
- Social media link → `/marketing/social`
- Portfolio link → `/marketing/portfolio`
- Content library link → `/marketing/content`

### Campaigns

**Route:** `/marketing/campaigns`

- Create campaign button → Form
- List of campaigns
- Per campaign:
  - Name (link to detail)
  - Type (email, SMS, special offer)
  - Status (draft, scheduled, active, completed)
  - Audience size
  - Conversion rate (if completed)
  - Actions (view, edit, launch, pause, archive, delete)

Campaign Detail:

- Name, description, type
- Target audience (all clients, repeat clients, VIP, etc.)
- Message/content (template)
- Schedule (if not active)
- Preview button (how it looks to clients)
- Launch button
- Performance stats (if active/completed): opens, clicks, conversions, revenue attributed

### Social Media

**Route:** `/marketing/social`

- Social media accounts (connected platforms)
- Per platform (Instagram/Facebook/TikTok/Pinterest):
  - Connected button (or connect button)
  - Recent posts (thumbnail preview)
  - Schedule post button → Form
  - Analytics (follows, engagement, etc.)
  - Disconnect button

Schedule Post Form:

- Image upload
- Caption (text with @ mentions, hashtags)
- Hashtag suggestions (AI)
- Schedule date/time picker
- Post now vs. schedule button

### Portfolio

**Route:** `/marketing/portfolio`

(Showcase events & client testimonials)

- Portfolio gallery (grid of event photos + info)
- Filter by event type
- Add event to portfolio button (per event)
- Reorder portfolio (drag/drop)
- Per portfolio item:
  - Event name, date, photo
  - Event description (editable)
  - Client testimonial (link, if available)
  - "Featured" toggle
  - Delete from portfolio button

### Content Library

**Route:** `/marketing/content`

(Blogs, guides, recipes shared publicly)

- Articles (chef blog posts)
- Recipes (published recipes)
- Guides (e.g., planning a dinner party, dietary accommodation)
- Per item: title (link), date published, category, view count
- "New article" button → Editor
- Publish button (for drafts)
- Unpublish button

---

## 17. NETWORK & COMMUNITY

**Routes:** `/network`, `/network/chefs`, `/network/community`

### Network Hub

**Route:** `/network`

- Connected chefs (list with avatars, specialties, link to profiles)
- Community forum (link to `/network/community`)
- Collaboration invitations (pending & accepted)

### Chef Profiles / Directory

**Route:** `/network/chefs`

- Search by name/location/specialty
- Filter by specialty (pastry, international, plant-based, etc.)
- Per chef: name, avatar, location, specialties, "View profile" → `/network/chefs/[id]`

#### Chef Profile

**Route:** `/network/chefs/[id]`

- Name, location, bio, avatar
- Specialties (tags)
- Share recipes button (if friends)
- Send message button
- Add as friend / Remove friend button
- Public portfolio (if shared)

### Community Forum

**Route:** `/network/community`

- Discussion topics
- Per topic: title (link), category (tips, troubleshooting, ideas), post count, last post date
- "New topic" button → Form

Topic Detail:

- Title, description, category
- Posts (chronological)
- Per post: user name, avatar, content, date, like count
- Reply button → Form
- Delete post button (own posts only)

---

## 18. LOYALTY PROGRAM

**Routes:** `/loyalty`, `/loyalty/tiers`, `/loyalty/points`, `/loyalty/rewards`

### Loyalty Overview

**Route:** `/loyalty`

- Loyalty program stats:
  - Total members
  - Points issued (this month)
  - Rewards redeemed
  - Program health (engagement %)

- Navigation to sections:
  - Tiers → `/loyalty/tiers`
  - Points & Earning Rules → `/loyalty/points`
  - Rewards Catalog → `/loyalty/rewards`

### Loyalty Tiers

**Route:** `/loyalty/tiers`

- Configure tier structure (Bronze/Silver/Gold/Platinum)
- Per tier:
  - Name, benefits, unlock requirement ($ spent or points)
  - Bonus multiplier (earn 2x points, etc.)
  - Exclusive perks (% discount, free item, etc.)
  - Edit button, delete button (if not in use)

### Points & Earning Rules

**Route:** `/loyalty/points`

- Earning rate (base points per $)
- Bonus points for event types (wedding = 2x, corporate = 1.5x)
- Referral points (when client refers a friend)
- Birthday points (bonus on birthday month)
- Anniversary points (bonus on anniversary of first event)
- Special bonuses (holiday, seasonal)

Per rule: toggle ON/OFF, edit button

### Rewards Catalog

**Route:** `/loyalty/rewards`

- "New reward" button
- Per reward: name, points cost, redemption rate (% redeemed), "Edit" button, "Archive" button
  - Example rewards: $50 off, free dessert upgrade, exclusive menu access, priority booking

---

## 19. SAFETY & PROTECTION

**Routes:** `/safety`, `/safety/allergies`, `/safety/haccp`, `/safety/waivers`

### Safety Overview

**Route:** `/safety`

- Navigate to sections (links to pages below)

### Allergen & Dietary Management

**Route:** `/safety/allergies`

- Allergen master list (mark which allergens in each recipe/ingredient)
- Per client: dietary restrictions & allergies (prominently displayed)
- Allergen alerts (recipes/menus with client allergies)
- Menu allergy verification before sending

### HACCP & Food Safety

**Route:** `/safety/haccp`

(Food safety compliance tracking)

- Temperature log tracking (for events)
- Food handling checklists (per event type)
- Supplier audit logs (vendor compliance checks)
- Staff certification tracker (food safety certs)
- Reports/compliance documents

### Waivers & Liability

**Route:** `/safety/waivers`

- Waiver/liability form templates
- Send to client for signature
- Track signed waivers
- Archive signed documents

---

## 20. REMY (AI CONCIERGE)

**Routes:** `/chat`, `/chat/[conversationId]` (drawer or full-page)

### Remy Drawer / Chat Interface

- **Conversation list** (sidebar, if full-page view)
  - Recent conversations (list with titles)
  - "New chat" button
  - Search past conversations
  - Per conversation: open button, archive button, pin button

- **Chat Interface**
  - Conversation title (auto-generated from first message)
  - Message history (chronological, oldest first)
  - Per message: from (Remy or user), timestamp, message text, copy button
  - Compose field at bottom
  - Send button, emoji picker, attach file button
  - Typing indicator (while Remy responds)

### Remy Capabilities

(See `docs/remy-complete-reference.md` for full reference)

- Advise on menu planning
- Suggest recipes based on client constraints
- Estimate prep time, costs
- Help with client communication (draft emails)
- Answer culinary questions
- Brainstorm event themes
- Provide business advice (pricing, scaling, etc.)
- Draft outreach messages
- Help with contingency planning
- Assist with dietary accommodation ideas

---

## 21. ONBOARDING & IMPORT

**Routes:** `/onboarding`, `/onboarding/[step]`, `/import`, `/import?mode=X`

### Onboarding Flow

**Route:** `/onboarding`

- Interactive setup wizard (5 steps)
- Per step: form with progress indicator, CTA button to next step
  1. Complete profile (name, business, location)
  2. Add first client
  3. Configure loyalty program
  4. Create first recipe
  5. Add team member

- Each step has a description & CTA button
- Can skip steps, come back later via dashboard widget

### Import Features

**Route:** `/import`

#### CSV Import

**Route:** `/import?mode=csv`

- Upload CSV file (contacts, events, etc.)
- Column mapping (let user map CSV columns to app fields)
- Preview imported data
- Import button
- Success confirmation + count of imported items

#### Past Events Import

**Route:** `/import?mode=past-events`

- Form to manually enter past events
- Per event: date, client, guests, occasion, revenue (optional)
- Add event button (per event)
- Import all button
- Success confirmation

#### Brain Dump

**Route:** `/import?mode=brain-dump`

- Text area to paste recipes, notes, or unstructured text
- Process button → AI parses text
- Review parsed items (recipes, clients, events)
- Edit/correct items
- Import button

---

## 22. CANNABIS VERTICAL

**Routes:** `/cannabis`, `/cannabis/menus`, `/cannabis/pairing`

(Specialized for cannabis-infused culinary events)

- Cannabis menu templates (recipes designed with cannabis dosing)
- Pairing suggestions (which cannabis products pair with which dishes)
- Dosing calculator (help ensure correct THC/CBD content)
- Compliance documentation (if required by jurisdiction)

---

## 23. HELP CENTER

**Routes:** `/help`, `/help/[topic]`, `/help/search`

### Help Hub

**Route:** `/help`

- Help categories (links):
  - Getting started
  - Events
  - Clients & inquiries
  - Financials
  - Culinary
  - Integrations
  - Troubleshooting
- Search articles
- Contact support button

### Help Articles

**Route:** `/help/[topic]`

- Article title, last updated date
- Article content (formatted text, images, videos)
- Related articles (links)
- Was this helpful? (thumbs up/down)
- Contact support button

### Search

**Route:** `/help/search`

- Search results for help articles
- Per result: title (link), excerpt, category

---

## 24. GAMES / GAMIFICATION

**Routes:** `/games`, `/games/achievements`, `/games/leaderboard`

(Motivational features)

### Games Hub

**Route:** `/games`

- List of challenges (e.g., "7-day dinner streak", "5 client reviews", "Perfect menu approval rate")
- Per challenge: progress bar, reward (points or badge), "Play" button → detail

### Achievements

**Route:** `/games/achievements`

- List of all achievements unlocked (badges, trophies)
- Progress toward next achievement
- Share achievement button (social)

### Leaderboard

**Route:** `/games/leaderboard`

(Optional: if multi-user/community)

- Rank of chefs by points/completions
- Filter by timeframe (this month, this year, all-time)

---

## 25. DEV TOOLS

**Routes:** `/dev`, `/dev/debug`, `/dev/logs`, `/dev/schema`

(Admin/developer-only features)

### Dev Dashboard

**Route:** `/dev`

- Links to debug tools
- System health status
- Recent error logs

### Debug Tools

**Route:** `/dev/debug`

- Clear cache button
- Reset local storage button
- Force re-sync button
- View session info button
- Test Ollama connection button

### Logs Viewer

**Route:** `/dev/logs`

- System logs (console output)
- Filter by level (info, warning, error)
- Filter by module
- Clear logs button

### Schema Viewer

**Route:** `/dev/schema`

- View database schema (tables, columns, types)
- View current types/database.ts
- Refresh from remote button

---

## 26. BLOG / PUBLIC PAGES

**Routes:** `/blog`, `/blog/[slug]`, `/articles`

- Blog article list
- Article detail (published content)
- Comments (if enabled)
- Share buttons (social)

---

---

## SUMMARY STATISTICS

- **Total Major Sections:** 26
- **Total Pages (estimated):** ~265
- **Total Routes (estimated):** ~500+
- **Major Features:** Events, Clients, Inquiries, Quotes, Financials, Culinary (Menus/Recipes), Calendar, Messaging, Staff, Analytics, Daily Ops, Queue, Travel, Reviews/AAR, Settings (50 pages), Marketing, Network, Loyalty, Safety, Remy AI, Onboarding, Help, Games, Dev Tools, Blog
- **Integrations:** Stripe, Supabase, Gmail, Google Calendar, Ollama, Gemini, Spoonacular (recipes)
- **User Types:** Chefs (6 archetypes), Clients (limited portal access), Staff (portal access)

---

## NEXT STEP

Now that the complete feature inventory is documented, the next phase is:

1. **Map archetype → required features** — which features does each of the 6 archetypes actually NEED vs. NICE-TO-HAVE
2. **Identify MVP for beta** — which features must ship by spring vs. which can be phase 2
3. **Audit by archetype** — for each beta tester (pizzeria, café, catering, private chef), which pages/features are critical vs. polish-able
4. **Build launch checklist** — what tests, bug fixes, and polish are needed before beta launch
