# Chef Communication Noise Simulation

Status: draft  
Created: 2026-04-29  
Purpose: Simulate the full communication noise a working private chef receives so ChefFlow can decide what to send, what to batch, what to suppress, and what to convert into action.

## Problem

A chef does not need more messages. A chef needs an operating filter that turns scattered life, client, staff, money, vendor, calendar, social, and system inputs into the smallest set of useful actions.

The raw noise matters because the system cannot organize what it has not modeled.

## Existing Attachment Points

This should extend existing ChefFlow surfaces, not create a separate messaging product.

- Notifications: `lib/notifications/types.ts`, `lib/notifications/tier-config.ts`
- Notification settings: `/settings/notifications`
- Built-in automations: `components/automations/built-in-settings.tsx`
- SMS and WhatsApp infrastructure: `lib/sms/*`
- Communication architecture: `docs/architecture/communication-platform-spec.md`
- Lifecycle intelligence: `docs/specs/service-lifecycle-intelligence.md`
- Replay and digest owner: canonical surface `chef-flow-replay`
- Scheduling and calendar: canonical surface `calendar`

## Core Principle

Every outbound message to the chef must be classified before delivery.

1. Interrupt: the chef must know now.
2. Decide: the chef must make a choice.
3. Do: the chef must take an action.
4. Review: the chef should understand a pattern.
5. Archive: useful context, but not worth a message.
6. Suppress: redundant, noisy, fake, stale, or already handled.

If a message does not clearly fit one of those classes, ChefFlow should not send it.

## Message Object

Every simulated item should be normalized into this shape before channel routing:

```ts
type ChefSignal = {
  id: string
  source: SignalSource
  actor: SignalActor
  subject: string
  body: string
  occurredAt: string
  eventId?: string
  clientId?: string
  inquiryId?: string
  staffId?: string
  vendorId?: string
  moneyAmountCents?: number
  risk: SignalRisk
  urgency: SignalUrgency
  cadence: SignalCadence
  requiredAction: string | null
  sourceOfTruth: string
  deliveryDecision: DeliveryDecision
  suppressReason?: string
}
```

## Sources To Simulate

### Client Sources

- New inquiry from website
- New inquiry from embedded widget
- Direct email inquiry
- SMS inquiry
- WhatsApp inquiry
- Missed call with voicemail
- Repeat client text
- Referral client email
- Client portal message
- Quote viewed
- Quote accepted
- Quote rejected
- Quote expired
- Proposal viewed
- Menu preference submitted
- Menu revision requested
- Contract signed
- Guest count changed
- Allergy changed
- Dietary restriction added
- Payment page viewed
- Deposit paid
- Payment failed
- Dispute opened
- Cancellation requested
- Review submitted
- Negative feedback received
- Rebooking interest
- Referral shared

### Event Sources

- Event created
- Event moved from draft to proposed
- Event accepted
- Event paid
- Event confirmed
- Event starts within 30 days
- Event starts within 14 days
- Event starts within 7 days
- Event starts within 48 hours
- Event starts tomorrow
- Event starts today
- Event in progress
- Event completed
- Event cancelled
- Prep incomplete
- Shopping incomplete
- Equipment checklist incomplete
- Staff briefing missing
- Venue access missing
- Parking or loading info missing
- Final guest count missing
- Final dietary confirmation missing
- Timeline missing
- Receipts missing after event
- Closeout overdue

### Money Sources

- New payment received
- Deposit overdue
- Final payment overdue
- Payment amount mismatch
- Refund pending
- Refund processed
- Dispute opened
- Gratuity received
- Gratuity not distributed
- Staff payout pending
- Vendor invoice due
- Expense logged
- Receipt missing
- Event profitability ready
- Monthly revenue summary
- Quarterly margin drift
- Yearly tax packet ready

### Staff Sources

- Staff assigned
- Staff declined
- Staff confirmed
- Staff no response
- Staff schedule changed
- Staff shift reminder
- Staff briefing opened
- Staff briefing not opened
- Staff task completed
- Staff task overdue
- Staff timecard missing
- Staff payout pending
- Staff certification expiring

### Vendor And Inventory Sources

- Low stock
- Price spike
- Recall alert matched
- Vendor order placed
- Vendor order delayed
- Vendor item unavailable
- Substitution needed
- Delivery scheduled
- Delivery missed
- Specialty order deadline
- Pantry count stale
- Equipment rental due
- Equipment return due

### Social And Reputation Sources

- New review
- Low rating
- Negative public mention
- Photo approval needed
- Post-event content opportunity
- Social post draft ready
- Social content scheduled
- Social message from lead
- Press or collaboration inquiry
- Public profile claim or verification update

### Personal And Capacity Sources

- Weekly event limit approaching
- Monthly event limit approaching
- Consecutive workdays too high
- Minimum rest violated
- Burnout risk high
- Protected time conflict
- Personal appointment conflict
- Education or license renewal due
- Quarterly check-in due
- Insurance expiring
- Certification expiring

### System Sources

- Account access alert
- Integration disconnected
- Email bounced
- SMS not configured
- Push subscription expired
- Scheduled job failed
- AI runtime offline
- Import failed
- Sync stale
- Background queue backed up
- Data conflict requires review

## Channel Routing Rules

### Personal Phone

Use only for critical, immediate, human-impacting items.

Allowed:

- New high-value inquiry if chef has opted into SMS
- Same-day client change
- Same-day allergy change
- Same-day guest count change
- Payment failed for imminent event
- Dispute or account access alert
- Staff no-show or day-of schedule change
- Recall alert matching an upcoming menu
- Leave-now or arrive-now alert
- Burnout or capacity risk only if it affects today or tomorrow

Not allowed:

- Weekly summaries
- Routine reviews
- Social prompts
- Generic reminders
- Non-urgent payments
- Long reports
- "Nice to know" metrics

### Business Phone

Use for client communication and urgent operational confirmations.

Allowed:

- Client replies
- Inquiry replies
- Event confirmations
- Payment nudges
- Staff day-of logistics
- Vendor delivery coordination

### Email

Use for structured briefs, records, receipts, summaries, and items the chef may need to search later.

Allowed:

- Daily operating brief
- Weekly command brief
- Monthly owner report
- Quarterly strategy report
- Yearly tax and business packet
- Rich transactional records
- Receipt and invoice records
- Long-form client summaries

### Push Or In-App

Use for real-time awareness that should not necessarily hit SMS.

Allowed:

- Quote viewed
- Proposal viewed
- Client portal visit
- Staff task completed
- Menu feedback submitted
- New message
- Review submitted
- Low stock
- Price watch alert

### Social Channels

ChefFlow should not post automatically by default.

Allowed:

- Prompt the chef to post real completed work
- Prompt the chef to approve a draft
- Capture inbound social lead
- Remind chef about photo consent
- Suggest reposting approved review text

Not allowed:

- Fake activity
- Invented dishes
- Invented reviews
- Invented availability
- Recipe generation
- Unapproved client stories

## Cadence Simulation

### Daily

#### 5:30 AM Personal Life Guard

Purpose: protect the chef before business pressure starts.

Inputs:

- Sleep or rest risk if known
- Personal calendar conflicts
- Protected time
- Commute risks
- Family or appointment blocks
- Capacity limits

Delivery:

- Suppress unless a conflict exists
- Personal phone only if today has a conflict
- Email never needed

Example:

> Today has a 4:00 PM client arrival window and a 3:30 PM personal appointment conflict. Decide which one moves before 10:00 AM.

#### 6:30 AM Daily Operating Brief

Purpose: one clear command brief for the day.

Inputs:

- Today's events
- Tomorrow's events
- Outstanding client replies
- Missing payment items
- Prep tasks
- Shopping tasks
- Staff tasks
- Vendor pickups
- Travel and access notes
- Allergy and dietary risk
- Highest risk item

Delivery:

- Email by default
- Push if there is at least one action due before noon
- SMS only if an event is today and a blocker exists

Message sections:

- Today
- Money
- Clients waiting
- Food and prep
- Staff and vendors
- Risk
- One next action

#### 8:30 AM Client And Lead Sweep

Purpose: prevent money loss from slow response.

Inputs:

- New inquiries
- Inquiry replies
- Quotes viewed
- Quotes waiting
- No-response alerts
- Stale marketplace leads
- Referral leads

Delivery:

- Push for active buying intent
- SMS for new high-value inquiry if enabled
- Email only in daily or weekly digest unless rich response record is needed

Suppression:

- If the chef already replied, suppress follow-up reminders
- If the client is actively on the portal, suppress duplicate email nudges
- If the quote was viewed multiple times in 15 minutes, group into one signal

#### 10:30 AM Procurement Sweep

Purpose: make sure service can actually happen.

Inputs:

- Shopping list
- Low stock
- Vendor orders
- Specialty deadlines
- Price spikes
- Substitutions
- Equipment rentals

Delivery:

- Push for same-day or tomorrow blockers
- Email for lists
- SMS only for same-day unavailable item or recall

#### 1:30 PM Admin Sweep

Purpose: keep the business current without interrupting service work.

Inputs:

- Invoices
- Receipts
- Time tracking
- Staff payouts
- Event closeout
- Review requests
- Thank-you notes
- Client profile updates

Delivery:

- In-app task list
- Email only if daily admin digest enabled
- No SMS

#### 3:00 PM Pre-Service Check

Purpose: catch the operational failure before the chef leaves.

Inputs:

- Arrival time
- Address
- Access
- Parking
- Final guest count
- Allergies
- Menu approval
- Payment state
- Staff confirmation
- Equipment
- Shopping complete

Delivery:

- Push for all event-day checks
- SMS for missing safety, money, address, access, or staff blocker

#### 6:00 PM Live Service Guard

Purpose: only interrupt for active-service threats.

Inputs:

- Client message
- Guest count change
- Allergy change
- Staff issue
- Payment issue
- Equipment issue
- Schedule slip

Delivery:

- SMS or push depending on criticality
- No long email
- Batch non-critical notes for post-service

#### 10:30 PM Closeout Capture

Purpose: capture truth while memory is fresh.

Inputs:

- Event completed
- Tip
- Gratuity split
- Receipts
- Leftovers
- Client notes
- Guest preferences
- Staff performance
- Incident notes
- Photos approved

Delivery:

- Push or in-app prompt
- Email only if closeout report is generated
- Suppress if chef already completed closeout

### Weekly

#### Monday Command Brief

Purpose: set the week.

Inputs:

- Events this week
- Events next week
- Leads waiting
- Proposals waiting
- Deposits due
- Payments overdue
- Shopping and vendor plan
- Staff gaps
- Prep blocks
- Personal protected time
- Expected revenue
- Expected costs
- Capacity risk

Delivery:

- Email
- In-app dashboard
- Push only if there are Monday actions
- No SMS unless Monday has a blocker

#### Wednesday Risk Sweep

Purpose: catch midweek drift.

Inputs:

- Events missing payment
- Events missing menu approval
- Events missing dietary confirmation
- Staff unconfirmed
- Vendor orders missing
- Client silence

Delivery:

- Push for blockers
- Email digest if more than three items

#### Friday Owner Sweep

Purpose: close loops before the weekend.

Inputs:

- Unanswered clients
- Weekend event readiness
- Unpaid balances
- Receipts missing
- Follow-up opportunities
- Social/content opportunity from completed work

Delivery:

- Email
- Push only for unresolved weekend risk

### Monthly

Purpose: help the chef operate like an owner.

Inputs:

- Revenue collected
- Revenue booked but unpaid
- Outstanding invoices
- Food costs
- Labor costs
- Vendor spend
- Mileage
- Fees
- Gross margin by event
- Worst-margin events
- Best clients
- Repeat bookings
- Referral sources
- Reviews received
- Social content used
- Client relationship cooling
- Subscription and tool costs
- Tax folder completeness

Delivery:

- Email report
- In-app report
- No SMS

Required decisions:

- Raise prices?
- Drop or change a service type?
- Follow up with specific clients?
- Fix a vendor issue?
- Add protected time?

### Every 3 Months

Purpose: strategic reset.

Inputs:

- Pricing drift
- Margin drift
- Capacity trend
- Best segment
- Worst segment
- Repeat client value
- Referral quality
- Vendor reliability
- Insurance and certification status
- Website and profile truth
- Public reviews
- Personal capacity
- Tool usage
- Manual work still happening outside ChefFlow

Delivery:

- Email report
- In-app owner review
- Optional calendar block
- No SMS

Required decisions:

- What should stop?
- What should scale?
- What should be delegated?
- What should be automated?
- What should become a package?
- What needs real-world validation before building?

### Yearly

Purpose: full business and life review.

Inputs:

- Annual revenue
- Annual profit estimate
- Taxes
- Best month
- Worst month
- Client lifetime value
- Service line performance
- Average response time
- Booking conversion
- Average event margin
- Refunds and disputes
- Review history
- Vendor history
- Staff history
- Insurance
- Licenses
- Certifications
- Burnout and rest pattern
- Personal schedule health

Delivery:

- Email packet
- Exportable accountant packet
- In-app annual review
- No SMS

Required decisions:

- Keep the current business model?
- Change minimums?
- Change deposit policy?
- Raise rates?
- Fire a bad-fit client segment?
- Change availability?
- Hire, delegate, or simplify?

## 24-Hour Noise Simulation

Persona: solo private chef with one dinner tonight, one proposal pending, one inquiry active, one vendor delivery, and two staff members.

### Raw Timeline

| Time     | Raw Input                                                          | System Classification | Delivery                                                 |
| -------- | ------------------------------------------------------------------ | --------------------- | -------------------------------------------------------- |
| 5:45 AM  | Calendar shows school drop-off and 2:00 PM grocery pickup conflict | Decide                | Push only                                                |
| 6:30 AM  | Daily brief generated                                              | Review                | Email                                                    |
| 7:05 AM  | New website inquiry for next month                                 | Interrupt             | SMS if enabled, push                                     |
| 7:08 AM  | Same inquiry also creates email record                             | Suppress              | No second message                                        |
| 7:30 AM  | Client viewed quote twice                                          | Do                    | Push grouped once                                        |
| 8:15 AM  | Staff member confirms tonight                                      | Archive               | In-app only                                              |
| 8:40 AM  | Vendor says fish delivery delayed                                  | Decide                | Push                                                     |
| 9:10 AM  | Guest adds shellfish allergy for tonight                           | Interrupt             | SMS, push                                                |
| 9:12 AM  | Same allergy appears in portal update email                        | Suppress              | No duplicate                                             |
| 10:00 AM | Payment received for next week                                     | Review                | Push, ledger record                                      |
| 10:35 AM | Low stock item unrelated to current events                         | Review                | In-app, later digest                                     |
| 11:20 AM | Social DM asks availability                                        | Do                    | Push if classified as lead                               |
| 12:15 PM | Staff has not opened briefing                                      | Decide                | Push                                                     |
| 1:00 PM  | Receipt from yesterday missing                                     | Do                    | In-app task                                              |
| 2:30 PM  | Tomorrow's event has missing address                               | Decide                | Push                                                     |
| 3:00 PM  | Tonight pre-service check finds access notes missing               | Interrupt             | SMS, push                                                |
| 4:15 PM  | Client sends gate code                                             | Archive               | Attach to event, no extra alert if chef is in event view |
| 5:00 PM  | Leave-now travel alert                                             | Interrupt             | Push or SMS                                              |
| 6:20 PM  | Client changes guest count from 10 to 12                           | Interrupt             | SMS, push                                                |
| 8:45 PM  | Guest says thank you in portal                                     | Archive               | In-app                                                   |
| 10:20 PM | Event completed                                                    | Do                    | Push closeout prompt                                     |
| 10:45 PM | Photo opportunity detected                                         | Review                | Add to tomorrow digest                                   |

### Filtered Chef Experience

The chef should not receive 21 separate interruptions.

Expected delivered messages:

1. 6:30 AM email daily brief
2. 7:05 AM new inquiry push or SMS
3. 7:30 AM quote viewed push
4. 8:40 AM vendor delay push
5. 9:10 AM allergy SMS
6. 12:15 PM staff briefing push
7. 2:30 PM missing address push
8. 3:00 PM missing access SMS
9. 5:00 PM leave-now alert
10. 6:20 PM guest count change SMS
11. 10:20 PM closeout prompt

Suppressed or batched:

- Duplicate inquiry email
- Duplicate allergy email
- Staff confirmation
- Payment received email if already visible in brief or ledger
- Low stock unrelated to active events
- Generic social prompt
- Thank-you note
- Photo/content opportunity

## Weekly Noise Simulation

Persona: chef has three events, eight leads, one overdue invoice, and one staff scheduling gap.

### Raw Weekly Inputs

- 3 events this week
- 2 events next week
- 8 lead or client messages
- 4 quote views
- 1 quote accepted
- 1 quote rejected
- 1 deposit overdue
- 1 final balance overdue
- 2 staff confirmations
- 1 staff gap
- 3 vendor orders
- 1 vendor substitution
- 2 receipts missing
- 1 review submitted
- 1 negative comment
- 1 capacity warning
- 4 social opportunities

### Expected ChefFlow Output

Monday email:

- This week has 3 events and 2 open money risks.
- One event is not execution-ready.
- One staff role is unfilled.
- One client has not paid a deposit.
- One final balance is overdue.
- Top action: resolve Friday staff gap.

Real-time interruptions:

- Quote accepted
- Deposit overdue if event is within 7 days
- Final balance overdue if event is within 7 days
- Staff gap
- Vendor substitution affecting this week
- Negative public mention
- Capacity warning if it affects a booking decision

Digest only:

- Quote rejected
- Staff confirmations
- Receipts missing
- Review submitted
- Social opportunities

## Monthly Noise Simulation

Persona: chef worked nine events, had thirty leads, accepted twelve bookings, and missed some admin work.

Expected monthly report:

- Revenue collected: from ledger only
- Revenue booked but unpaid: from events, quotes, and ledger state
- Food cost: from receipts and event expenses
- Labor cost: from staff time and payouts
- Best event by margin
- Worst event by margin
- Lead conversion
- Average response time
- Outstanding invoices
- Overdue closeouts
- Top repeat clients
- Clients cooling
- Referral sources
- Tax folder status
- Next month calendar fill
- One business decision: price, capacity, client segment, vendor, or admin process

No monthly item should hit SMS.

## Quarter Simulation

Expected quarterly report:

- Did the chef make more money or just stay busier?
- Which event types are profitable?
- Which clients caused low-margin or high-stress work?
- Which vendors failed or inflated cost?
- Which workflow still happens outside ChefFlow?
- Which notifications were ignored most often?
- Which alert type should be demoted?
- Which suppressed item later became a problem?
- Which life boundaries were violated?

This is where ChefFlow learns notification quality.

## Year Simulation

Expected yearly report:

- Annual revenue from ledger
- Annual collections by month
- Accounts receivable at year end
- Refunds and disputes
- Fees
- Staff payouts
- Vendor spend
- Receipts missing
- Tax packet completeness
- Average event margin
- Best client segment
- Worst client segment
- Repeat client rate
- Referral rate
- Review trend
- Response time trend
- Capacity trend
- Personal sustainability signal

The final yearly question:

> Is this business giving the chef the life they want, or just creating more obligations?

## Suppression Rules

ChefFlow should suppress a signal when:

- It duplicates a richer signal already sent.
- It is already visible in the current active event view.
- The chef already completed the action.
- The item is not connected to an upcoming event, active client, money risk, safety risk, or owner review.
- The signal is only a metric with no decision.
- The signal would be better grouped into the next digest.
- The source is stale.
- The system cannot prove the fact.

## Escalation Rules

ChefFlow should escalate when:

- A safety item affects an event within 14 days.
- A payment item affects an event within 7 days.
- A staff gap affects an event within 7 days.
- A vendor or ingredient issue affects an event within 3 days.
- A client message is about an event happening today or tomorrow.
- A system failure blocks outbound client communication.
- A capacity issue would create a double booking, protected time violation, or burnout risk.

## Anti-Noise Rules

- Never send both generic and rich email for the same event transition.
- Never SMS an informational digest.
- Never email a real-time intent signal like quote viewed or payment page viewed.
- Never notify the chef about an action that ChefFlow already handled unless review is needed.
- Never convert social reminders into fake activity.
- Never generate or suggest recipes.
- Never render a number that did not come from real data.
- Never hide failed data as zero.

## Product Shape

ChefFlow should have three levels of communication output:

### Command Brief

One concise brief for the next operating window.

Used for:

- Daily
- Weekly
- Pre-service
- Post-service

### Interrupt

One immediate alert with one clear action.

Used for:

- Safety
- Money
- Same-day logistics
- Staff gap
- Vendor failure
- Account security

### Owner Report

One structured report for pattern recognition and decisions.

Used for:

- Monthly
- Quarterly
- Yearly

## Data To Record For Learning

Every delivered message should record:

- Was it opened?
- Was it acted on?
- How long until action?
- Was it dismissed?
- Was it demoted by chef preference?
- Did a suppressed signal later become urgent?
- Did multiple raw signals collapse into one correct command?
- Did the chef reply from the message?
- Did the message save time, protect money, reduce risk, or just create noise?

This is how ChefFlow learns which messages deserve the chef's life attention.

## Minimum Viable Simulation Harness

Before building more notification logic, create a deterministic simulation set with these scenarios:

1. Single event day with allergy change, vendor delay, staff confirmation, and payment received.
2. Quiet week with leads but no event.
3. Overloaded week with three events, staff gap, unpaid balance, and capacity warning.
4. Month-end report with receipts missing and margin drift.
5. Quarterly review with pricing decision.
6. Year-end report with tax packet and business model review.

Each scenario should output:

- Raw signal count
- Delivered message count
- Suppressed count
- Batched count
- SMS count
- Email count
- Push count
- Required decisions
- Data sources used
- Any unproven claim blocked

## Verdict

ChefFlow should not be a notification machine. It should be a life-command filter.

The mundane data is the product. The chef's day is full of tiny signals, but only a few deserve interruption. The system must model all of them so it can confidently decide which ones matter now, which ones belong in a digest, and which ones should disappear.
