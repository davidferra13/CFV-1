# Widget Intelligence Roadmap - Top 10 Dashboard Widgets

> 2-month sprint to make ChefFlow's core dashboard widgets the smartest in the private chef industry.
> Every improvement is deterministic (Formula > AI). Ollama only where human judgment is genuinely needed.

---

## 1. TODAY'S SCHEDULE

**Current state:** Hour-by-hour timeline, route plan, event details. Static once loaded.

**What makes it world-class:**

### 1a. Contextual countdown timers

- Live countdown to next milestone ("Leaving in 1h 42m", "Service starts in 3h 15m")
- Auto-shift focus as milestones pass (shopping phase -> travel phase -> prep phase -> service)
- Color shift: green (plenty of time) -> amber (getting tight) -> red (behind schedule)

### 1b. Weather-aware alerts

- Pull weather for event location at event time (already have Maps integration)
- Surface warnings that affect the job: "Rain at 4pm - outdoor event" or "95F - pack extra ice"
- Trigger 24h before AND morning-of

### 1c. Traffic-adjusted departure time

- Calculate drive time to venue using current traffic (Google Maps API, already integrated)
- "Leave by 2:15pm to arrive on time" that updates in real-time
- Account for stops (grocery pickup, dry ice, rental pickup) in the route

### 1d. Client context card

- Inline: dietary restrictions, allergies (red highlight), past events count, last event date
- "Sarah is pescatarian, severe shellfish allergy, 3rd event with you, last was Nov 2025"
- No clicks needed. The info you'd flip through 3 pages to find, right there.

### 1e. Prep completion gate

- Visual progress bar: what's done vs what's still open for today's event
- Red items = hard blocks (nothing can happen until these are done)
- One-tap "mark done" directly from the schedule widget

### 1f. Smart packing checklist summary

- "12/15 items packed" with the 3 missing items shown inline
- Highlight forgettable items based on AAR history ("You forgot tongs on 3 of last 5 events")

### 1g. Post-event lookahead

- If there's a next-day event: "Tomorrow: Johnson dinner (6 guests). Shared ingredients: olive oil, lemons, garlic - buy extra today"
- Cross-event ingredient consolidation surfaced at decision time, not after

---

## 2. PRIORITY QUEUE

**Current state:** Filterable list of actions ranked by urgency. Links to detail pages.

**What makes it world-class:**

### 2a. Inline actions (zero-navigation completions)

- "Send follow-up to Sarah" -> expand inline -> pre-drafted message -> one click send
- "Record deposit for Johnson event" -> expand inline -> amount pre-filled from quote -> confirm
- "Respond to inquiry from Mike" -> expand inline -> suggested response based on inquiry type -> send
- Goal: 50%+ of queue items completable without leaving the dashboard

### 2b. Revenue-weighted priority scoring

- Current: urgency-based (critical/high/normal)
- Add: dollar value weighting. A $8,000 event follow-up outranks a $200 expense receipt
- Show the dollar context: "Respond to inquiry - $4,500 potential"
- Formula: `urgency_score * 0.6 + revenue_weight * 0.3 + time_decay * 0.1`

### 2c. Time-decay escalation

- Items that sit in the queue get progressively more urgent
- Inquiry unanswered 2h = normal. 12h = high. 24h = critical.
- Visual: items physically move up the list as they age, with a "waiting X hours" badge that turns red

### 2d. Batching suggestions

- "You have 3 follow-up emails to send. Batch them now? (est. 8 min)"
- "2 expenses need receipts. Open camera for quick capture?"
- Group similar actions so the chef can knock them out in flow state

### 2e. Completion streaks and velocity

- "You've cleared 4 items today. 3 remaining."
- Weekly velocity: "You clear ~18 items/week. This week: 12 so far, 6 to go."
- Not gamification for its own sake. It's "am I keeping up or falling behind?"

### 2f. Stale item auto-escalation with snooze

- Items older than 72h without action get flagged: "This has been here 5 days. Still relevant?"
- Options: Snooze (1d/3d/1w), Dismiss, Do it now
- Prevents the queue from becoming a graveyard of ignored items

---

## 3. BUSINESS SNAPSHOT

**Current state:** Revenue, profit, events, inquiries, pipeline, food cost trend. All backward-looking.

**What makes it world-class:**

### 3a. Forward-looking projections

- "At current pace, you'll hit $X this month" (linear projection from booked + pipeline)
- "You need 2 more events to hit your monthly goal" (gap analysis)
- "Pipeline has $12k potential, historically 40% converts = ~$4,800 expected"
- All deterministic math from existing data

### 3b. Comparative periods

- "Revenue is 23% higher than same month last year"
- "You've done 2 more events than last March"
- "Average event value is up $150 from Q4"
- Toggle: vs last month / vs same month last year / vs trailing 3-month average

### 3c. Margin alerts

- If food cost % is trending above the chef's target: amber warning with the specific events dragging it up
- "Food cost is 38% this month (target: 30%). Event #1042 was 52% - review pricing?"
- Clickable drill-down to the offending event's expense breakdown

### 3d. Cash flow timing

- "You have $4,200 in outstanding invoices. $2,800 due this week."
- "Upcoming expenses (est.): $1,400 in grocery for 2 events"
- Net: "Expected cash position end of week: +$1,400"
- Deterministic from invoice due dates + event dates + historical avg grocery spend per guest

### 3e. Client concentration risk

- "60% of your revenue comes from 2 clients" (amber warning)
- "Top client (Johnson family) = $18,000 YTD. If they stopped booking, monthly revenue drops 35%"
- Nudge toward diversification when concentration > 40% from a single client

### 3f. Seasonality intelligence

- "Based on your history, bookings drop 40% in January. Consider: holiday outreach in November"
- "Your busiest month is typically June (avg 8 events). You have 3 booked so far."
- Pure historical pattern matching, no AI needed

### 3g. Effective hourly rate per event type

- "Intimate dinners (2-4 guests): $185/hr effective"
- "Large parties (15+ guests): $95/hr effective"
- "Cooking classes: $220/hr effective"
- Helps the chef see which event types are most profitable per hour of their time

---

## 4. WEEK STRIP

**Current state:** 7-day grid with events, prep days, free days, prep-status dots, burnout warnings.

**What makes it world-class:**

### 4a. Drag-to-block prep time

- Click an empty day -> "Block for prep" with event association
- Drag from event to prior day -> auto-creates prep block linked to that event
- Visual: prep blocks show which event they serve (color-coded match)

### 4b. Capacity scoring per day

- Each day gets a workload score: light / moderate / heavy / overloaded
- Based on: number of events + guest count + travel distance + prep complexity
- Overloaded days pulse red. Chef can rebalance before it's too late.

### 4c. Grocery shopping windows

- "Best shopping window: Tuesday 9am-12pm (no events, stores less busy)"
- Based on: which days are free, which events need shopping, store hours
- Consolidate: "Buy for Wednesday AND Friday events in one trip"

### 4d. Revenue per day overlay

- Toggle to see daily revenue: "$0 / $0 / $2,400 / $0 / $3,800 / $0 / $0"
- Weekly total prominently displayed
- Empty days with available capacity highlighted: "Open - could book ~$2,500"

### 4e. Rest day enforcement

- If chef has 5+ consecutive working days: red "No rest day this week" warning
- If chef is working 6+ days for 2+ weeks: escalated warning about burnout
- Suggests: "Block [day] as rest? You have no events."

### 4f. Multi-week peek

- Expandable: show next week and the week after as faded rows
- Chef can see "I have 3 events next week, 0 the week after" without navigating away
- Helps with prep planning that spans the current week boundary

---

## 5. NEXT ACTION CARD

**Current state:** Single card linking to the most important action. Static priority.

**What makes it world-class:**

### 5a. Time-aware action selection

- Morning: prioritize prep and shopping tasks
- Afternoon: prioritize client communication and admin
- Evening: prioritize next-day prep and planning
- During an event: suppress everything except event-critical items

### 5b. Estimated completion time

- "Reply to inquiry from Sarah (~3 min)"
- "Complete grocery list for Friday event (~8 min)"
- "File AAR for last night's dinner (~5 min)"
- Chef knows if they can knock it out between tasks or need to sit down

### 5c. Skip with reason tracking

- "Not now" button with quick reasons: "Waiting on client", "Will do later", "Not relevant"
- Skipped items don't disappear - they drop in priority temporarily
- If an item is skipped 3x, it escalates with a note: "You've deferred this 3 times"

### 5d. Contextual "why this matters"

- Not just "Send follow-up to Johnson" but "Johnson's event was 5 days ago. Average follow-up converts to rebooking 35% of the time. This client has booked 4x."
- Dollar context: "This follow-up protects ~$3,200/year in recurring revenue"
- All from existing data, no AI

### 5e. Completion celebration + chain

- Complete action -> brief confirmation -> immediately show next action (no page reload)
- "Done. Next: [action]" flow keeps momentum
- Track daily completions: "4th action completed today"

---

## 6. DOP TASK DIGEST

**Current state:** Incomplete Day-of-Plan tasks with checkboxes grouped by event.

**What makes it world-class:**

### 6a. Time-sequenced display

- Sort tasks by when they need to happen, not by category
- "NOW: Start marinating chicken (2:00 PM)" at top
- "NEXT: Pack cooler bags (3:30 PM)"
- "LATER: Load car (4:45 PM)"
- Gray out past tasks, highlight current window

### 6b. Duration estimates and running clock

- Each task shows estimated duration: "Prep salad dressing (10 min)"
- Running total: "3h 20m of tasks remaining today"
- If total exceeds available time: red warning "You're 45 min over capacity - consider delegating"

### 6c. Dependency chains

- "Can't pack cooler until ice is purchased" - visual dependency
- Completing "buy ice" automatically highlights "pack cooler" as unblocked
- Prevents the chef from doing tasks out of order and hitting a wall

### 6d. Staff delegation

- If chef has staff assigned to the event: "Assign to [name]" button on each task
- Delegated tasks show assignee avatar + completion status
- Staff gets a push notification / text with their task list

### 6e. Smart defaults from history

- Auto-populate DOP tasks based on similar past events
- "Last 4-person dinner had these 12 tasks. Apply as template?"
- Chef just tweaks instead of building from scratch every time

### 6f. Photo verification prompts

- For food safety tasks: "Log temp photo" button opens camera
- For plating: "Capture plating photo" for the chef's records/social media
- Photos auto-attach to the event gallery

---

## 7. RESPONSE TIME SLA

**Current state:** Count of overdue/urgent/fresh inquiries with avg response time.

**What makes it world-class:**

### 7a. Per-inquiry countdown timers

- Each inquiry shows its own timer: "Sarah's inquiry: 3h 12m (respond by 6pm)"
- Timers accelerate visually as deadline approaches
- Sorted by urgency: closest to SLA breach at top

### 7b. Revenue-at-risk display

- "3 unanswered inquiries representing ~$9,400 in potential revenue"
- Per inquiry: estimated event value based on guest count, occasion type, historical pricing
- Makes the cost of slow responses visceral and concrete

### 7c. Response rate tracking with trend

- "Your average response time: 2.4 hours (improving - was 4.1h last month)"
- "Response rate: 94% within 24h"
- Industry benchmark comparison: "Top chefs respond in under 2 hours"

### 7d. Quick-reply templates

- Expand inquiry -> see 3 pre-written response options based on inquiry type
- "Interested - schedule call", "Need more details", "Unavailable for this date (suggest alternatives)"
- One click to send, personalized with client name and event details automatically

### 7e. Auto-decline suggestions

- If the chef is already booked on the requested date: "You're booked. Send 'unavailable + suggest alternate date' response?"
- If the event is outside the chef's service area: flag it immediately
- Don't let inquiries sit unanswered just because the answer is "no"

### 7f. Win/loss correlation

- "Inquiries responded to within 2h: 68% conversion"
- "Inquiries responded to after 24h: 12% conversion"
- Show this stat monthly. Let the data change behavior.

---

## 8. FOLLOW-UPS OVERDUE

**Current state:** List of overdue post-event follow-ups with "send message" links.

**What makes it world-class:**

### 8a. Tiered follow-up sequences

- Day 1-2: Thank you + photos
- Day 5-7: "How was everything?" feedback request
- Day 14: Subtle rebooking nudge
- Day 30: Check-in + seasonal menu mention
- Day 90: "Haven't seen you in a while" re-engagement
- Widget shows which stage each client is in and what's overdue

### 8b. Pre-drafted messages with personalization

- Pull from event data: occasion, menu highlights, guest count, any special moments noted in AAR
- "Hi Sarah, hope you're still thinking about that seared duck from your anniversary dinner last week!"
- Chef reviews and sends, not writes from scratch. Editing is faster than composing.

### 8c. Rebooking probability score

- Based on: past booking frequency, event satisfaction (AAR scores), loyalty tier, days since last event
- "Johnson family: 85% likely to rebook (quarterly pattern, 4 past events, all 5-star)"
- "New client Mike: 40% likely (first event, no feedback received yet)"
- Prioritize follow-ups by rebooking probability, not just by days overdue

### 8d. Revenue impact of follow-up delay

- "Average rebooking rate drops 15% for every week you delay follow-up"
- Per client: "Sarah's events average $3,200. Each day of delay = ~$68 in expected value lost"
- Make procrastination feel expensive (because it is)

### 8e. Batch send capability

- "Send all Day-1 thank yous (4 clients)" -> review all 4 drafts -> send all
- Track: "Sent 12 follow-ups this week (best week: 15, worst: 3)"
- Batch by follow-up type so the chef gets in the right headspace once

### 8f. Outcome tracking

- After follow-up is sent: track if client responded, if they rebooked, if they left a review
- Feed this back into rebooking probability scores
- "Your follow-ups have generated 8 rebookings worth $24,600 this quarter"

---

## 9. TO DO LIST

**Current state:** Simple add/toggle/delete task list.

**What makes it world-class:**

### 9a. Smart categorization

- Auto-detect category from task text: "buy new knives" -> Equipment, "renew insurance" -> Admin, "call venue" -> Event Prep
- Color-coded by category for visual scanning
- Filter by category when the list gets long

### 9b. Due dates with smart defaults

- Optional due date per task
- If task mentions a day ("before Friday's event"), auto-suggest due date
- Overdue tasks float to top with red indicator
- Today's tasks highlighted

### 9c. Event linking

- "Link to event" option on any task
- Linked tasks appear in both the To Do widget AND the event detail page
- When event is completed, linked tasks auto-prompt: "Still needed? Mark done or keep?"

### 9d. Recurring tasks

- "Sharpen knives" -> set as weekly/monthly recurring
- "Renew ServSafe" -> annual, with 30-day advance reminder
- "Inventory check" -> bi-weekly
- Recurring tasks auto-regenerate after completion

### 9e. Quick capture from anywhere

- Global hotkey (Cmd+T) to add a to-do from any page
- If on an event page, auto-link to that event
- Voice note capture (transcribe to text task) - leverages existing voice input

### 9f. Priority drag reordering

- Drag tasks to reorder by importance
- Top 3 tasks get visual emphasis (larger, bolder)
- "Focus mode" toggle: show only top 3, hide the rest

---

## 10. PREPARATION PROMPTS

**Current state:** Prep reminders in Overdue/Today/Upcoming groups, each linking to an action URL.

**What makes it world-class:**

### 10a. Reverse-scheduled from event time

- "Event at 7pm Saturday. Service starts at 7pm, arrive at 5pm, leave at 4pm, pack at 2pm, finish prep by 1pm, start prep at 9am"
- Auto-generate the prep timeline backwards from service time
- Each milestone becomes a prompt at the right time

### 10b. Ingredient-aware prep sequencing

- "Marinate lamb (minimum 8 hours)" -> prompt triggers 10+ hours before service
- "Make stock (3 hours)" -> prompt at appropriate time
- Pull prep times from recipe data when available, or use sensible defaults by technique

### 10c. Shopping deadline alerts

- "Grocery shopping must happen by Thursday 6pm for Saturday's event"
- Based on: store hours, perishability of ingredients, prep start time
- "Farmers market is Saturday morning - but your event prep starts at 8am. Shop Friday instead."

### 10d. Cross-event prep consolidation

- "You have events Friday AND Saturday. Both need chicken stock. Make a double batch Wednesday."
- "Shared ingredients across 2 events: buy together, prep together, save 2 hours"
- Surfaces overlaps automatically from menu/ingredient data

### 10e. Completion cascades

- Completing "buy groceries" auto-triggers "begin marination" prompt
- Completing "marinate protein" auto-triggers "start sauce reduction" at the right time
- The prep list isn't static, it flows as tasks complete

### 10f. Missed prompt recovery

- If a prep prompt is missed (not completed by deadline): immediate escalation
- "Marination was due 2 hours ago. Options: (1) Start now (compressed time), (2) Change protein to something that doesn't need marination, (3) Push event start 2 hours"
- Don't just show red. Show what to do about it.

### 10g. Historical prep time calibration

- Track how long the chef actually takes vs estimates
- "You usually spend 45 min on salad prep (estimated: 30 min). Adjusting future prompts."
- Prompts get more accurate over time, personalized to this chef's pace

---

## Implementation Priority

### Month 1: Foundation intelligence (highest ROI, least complexity)

| Week | Widget              | Improvements                                                            | Why first                                                                                   |
| ---- | ------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| 1    | Today's Schedule    | 1a (countdowns), 1d (client context), 1e (prep gate)                    | Chef opens this every morning. Immediate daily value.                                       |
| 1    | Priority Queue      | 2a (inline actions), 2b (revenue weighting)                             | Inline actions = fewer clicks = more items completed. Revenue weighting = better decisions. |
| 2    | Next Action Card    | 5a (time-aware), 5b (time estimates), 5e (completion chain)             | Low complexity, high behavior change.                                                       |
| 2    | Response Time SLA   | 7a (per-inquiry timers), 7b (revenue at risk), 7d (quick replies)       | Directly drives revenue. Faster responses = more bookings.                                  |
| 3    | DOP Task Digest     | 6a (time-sequenced), 6b (duration + running clock), 6e (smart defaults) | Event-day reliability. Prevents forgotten tasks.                                            |
| 3    | Follow-Ups Overdue  | 8a (tiered sequences), 8b (pre-drafted messages), 8e (batch send)       | Repeat business is the #1 revenue driver for private chefs.                                 |
| 4    | To Do List          | 9b (due dates), 9d (recurring), 9c (event linking)                      | Low effort, high daily utility.                                                             |
| 4    | Preparation Prompts | 10a (reverse scheduling), 10c (shopping deadlines)                      | Prevents day-of disasters.                                                                  |

### Month 2: Advanced intelligence (compounding value)

| Week | Widget              | Improvements                                                                                 | Why second                                                               |
| ---- | ------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| 5    | Business Snapshot   | 3a (projections), 3d (cash flow timing), 3e (client concentration)                           | Strategic value, but chef needs the tactical widgets working first.      |
| 5    | Week Strip          | 4b (capacity scoring), 4c (grocery windows), 4e (rest enforcement)                           | Planning layer on top of the daily execution layer built in month 1.     |
| 6    | Today's Schedule    | 1b (weather), 1c (traffic departure), 1f (packing summary), 1g (lookahead)                   | External API integrations, slightly more complex.                        |
| 6    | Priority Queue      | 2c (time decay), 2d (batching), 2f (stale auto-escalation)                                   | Queue behavior refinement after inline actions are proven.               |
| 7    | Business Snapshot   | 3b (comparisons), 3c (margin alerts), 3f (seasonality), 3g (hourly rate)                     | Deeper business intelligence once the chef trusts the basic projections. |
| 7    | Follow-Ups Overdue  | 8c (rebooking probability), 8d (delay cost), 8f (outcome tracking)                           | Requires data accumulation from month 1's follow-up improvements.        |
| 8    | DOP Task Digest     | 6c (dependencies), 6d (staff delegation), 6f (photo verification)                            | Multi-user complexity, needs staff system integration.                   |
| 8    | Preparation Prompts | 10b (ingredient-aware), 10d (cross-event), 10e (cascades), 10f (recovery), 10g (calibration) | Most sophisticated prep logic, needs recipe/ingredient data maturity.    |

---

## Principles

1. **Every number comes from real data.** No estimates without a source. No projections without showing the math.
2. **Formula > AI, always.** Countdowns, revenue weighting, time decay, projections, historical averages - all deterministic. Ollama only for pre-drafting follow-up messages (8b) where natural language generation genuinely helps.
3. **Inline > navigate.** Every click away from the dashboard is friction. If the chef can complete an action without leaving, they will.
4. **Show the money.** Chefs are business owners. Every widget should connect actions to dollars when possible. "Send follow-up" is ignorable. "Send follow-up (protects ~$3,200/year)" is not.
5. **Learn from history.** The chef's own past data is the best predictor. Prep times, response rates, rebooking patterns, food cost trends - all improve with use.
6. **Fail loud, not silent.** Missed prep? Show recovery options. Overdue follow-up? Show the cost of delay. Don't just turn things red - tell the chef what to do about it.
