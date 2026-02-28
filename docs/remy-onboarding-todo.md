# Remy Onboarding & Persistent Personality — Master TODO

> **Status:** Not started. Saved for later implementation.
> **Prompt file:** `prompts/queue/remy-onboarding-personality-persistence.md`
> **Created:** 2026-02-28

---

## DATABASE (Migrations)

- [ ] Create `remy_onboarding` table (id, chef_id, stage, skipped, started_at, completed_at, last_checkin_at, message_count)
- [ ] Add CHECK constraint on stage: `'not_started', 'greeted', 'toured', 'first_interaction', 'onboarded'`
- [ ] Add UNIQUE constraint on chef_id (one row per chef)
- [ ] Enable RLS on `remy_onboarding` — chefs see only their own row
- [ ] Create `remy_milestones` table (id, chef_id, milestone_key, celebrated_at, data jsonb)
- [ ] Add UNIQUE constraint on (chef_id, milestone_key) — celebrate each milestone once
- [ ] Enable RLS on `remy_milestones` — chefs see only their own milestones
- [ ] Check existing migration timestamps before creating files (multi-agent collision safety)
- [ ] Backfill migration: for existing chefs, insert already-passed milestones as celebrated so they don't get dumped on first load

---

## NEW FILES

- [ ] Create `lib/ai/remy-curated.ts` — all curated messages as typed constants
- [ ] Create `lib/ai/remy-personality-engine.ts` — deterministic personality logic

---

## CURATED MESSAGES — `lib/ai/remy-curated.ts`

### Onboarding Greetings (3 variants)

- [ ] Write Variant A — "Hey Chef {chefName}! I'm Remy. Think of me as your sous chef..." (pocket, clients, emails, revenue, schedule)
- [ ] Write Variant B — "Chef {chefName}! Welcome to the kitchen. I'm Remy — your ride-or-die sous..." (clients, events, financials, emails, scheduling, menus)
- [ ] Write Variant C — "Well well well — Chef {chefName} in the house! I'm Remy..." (sous who never calls in sick, never forgets, likes paperwork)
- [ ] Each variant ends with tour offer question
- [ ] Interpolation: `{chefName}`

### Tour Beats (4 beats)

- [ ] Write Tour Beat 1 — Your Clients (rolodex on steroids, profiles, allergies, example queries: "Find my client Sarah", "Who are my repeat clients?", "Does anyone have a nut allergy?")
- [ ] Write Tour Beat 2 — Your Events (heartbeat of business, 8 stages, schedule/follow-ups/payments, example queries: "What's on my schedule?", "How many events this month?", "Draft a follow-up for the Johnson dinner")
- [ ] Write Tour Beat 3 — Your Money (revenue, expenses, food costs, margins, ledger-based, example queries: "How's my revenue?", "What are my margins?", "Break down my food costs")
- [ ] Write Tour Beat 4 — Your Memory (persistent learning, "Remember that...", "What do you remember?", "Forget that thing about...", brain around YOUR business)
- [ ] Each beat has "Next" and "Skip the rest" quick-reply buttons

### Onboarding Closer

- [ ] Write closer line — "you're officially out of onboarding now" — appended to Ollama response after 3 exchanges post-tour

### First-Week Check-Ins (Day 1, 3, 5, 7)

- [ ] Write Day 1 check-in — variant for < 3 clients (suggest importing)
- [ ] Write Day 1 check-in — variant for 3+ clients (acknowledge, ask what they need)
- [ ] Write Day 3 check-in — variant for 0 events (suggest first event, "easier than a basic brunoise")
- [ ] Write Day 3 check-in — variant for 1+ events (acknowledge progress)
- [ ] Write Day 5 check-in — variant for 0 recipes (explain recipe book, redirect to Recipes page)
- [ ] Write Day 5 check-in — variant for 1+ recipes (acknowledge, explain search capability)
- [ ] Write Day 7 check-in — final check-in for all chefs ("tell me something to remember")
- [ ] Interpolation: `{clientCount}`, `{eventCount}`, `{recipeCount}`

### Client Milestone Celebrations

- [ ] Write `first_client` — "First client in the book! The journey of a thousand plates..."
- [ ] Write `clients_10` — "Double digits on the client list — 10 and counting"
- [ ] Write `clients_25` — "25 clients! That's not a side hustle anymore"
- [ ] Write `clients_50` — "50 clients, chef. Five-zero."
- [ ] Write `clients_100` — "The big 1-0-0! 100 clients."
- [ ] Write `first_repeat_client` — "They're back! {clientName} just booked again."
- [ ] Interpolation: `{clientName}`

### Event Milestone Celebrations

- [ ] Write `first_event` — "Your first event is on the board!"
- [ ] Write `first_event_completed` — "First event in the books! You did it, chef."
- [ ] Write `events_10` — "Double-digit events! 10 down."
- [ ] Write `events_25` — "25 events, chef! (Pun very much intended.)"
- [ ] Write `events_50` — "50 events! Half a hundred services."
- [ ] Write `events_100` — "ONE HUNDRED EVENTS" (big celebration)

### Financial Milestone Celebrations

- [ ] Write `first_payment` — "Money in the register! First payment received."
- [ ] Write `revenue_1k` — "You just crossed $1,000 in revenue"
- [ ] Write `revenue_5k` — "$5K revenue! That's a real number."
- [ ] Write `revenue_10k` — "Five figures! $10,000 in revenue."
- [ ] Write `revenue_25k` — "$25K in the books! Quarter of a hundred grand."
- [ ] Write `revenue_50k` — "FIFTY THOUSAND DOLLARS" (big celebration)
- [ ] Write `revenue_100k` — "$100,000" (biggest celebration, offer year in review)

### Review & Loyalty Milestone Celebrations

- [ ] Write `first_review` — "Your first review is in!"
- [ ] Write `first_five_star` — "Five stars! Perfect score."

### Time Milestone Celebrations

- [ ] Write `anniversary_30d` — "One month together, chef"
- [ ] Write `anniversary_90d` — "Three months! Quarter one is done."
- [ ] Write `anniversary_180d` — "Half a year, chef!"
- [ ] Write `anniversary_365d` — "ONE YEAR!" (big celebration, reference shared history)
- [ ] Interpolation: `{chefName}`

### Day-of-Week Openers

- [ ] Write 3 Monday variants — "Fresh week, fresh mise" / "Boards are clean, knives are sharp" / "New week energy"
- [ ] Write 3 Friday variants — "Got anything cooking this weekend?" / "Weekend service incoming?" / "TGIF"
- [ ] Write 1 Saturday variant — "Saturday service! Hope you're crushing it"
- [ ] Write 1 Sunday variant — "Sunday — the kitchen's quiet"

### Monthly Seasonal Openers

- [ ] Write January — "Kitchen's quiet after the holiday rush"
- [ ] Write February — "Valentine's season! Private dinners in hot demand"
- [ ] Write March — "Spring is coming. Fresh produce, outdoor events"
- [ ] Write April — "April showers bring... spring dinner parties"
- [ ] Write May — "Outdoor season is here"
- [ ] Write June — "Wedding season and summer entertaining in full swing"
- [ ] Write July — "Peak summer. Grill marks, sunset dinners"
- [ ] Write August — "The summer push. Back-to-school dinners"
- [ ] Write September — "Fall is almost here. Heartier menus"
- [ ] Write October — "Fall flavors are in — squash, root vegetables, warming spices"
- [ ] Write November — "Thanksgiving month! Super Bowl for private chefs"
- [ ] Write December — "The big one. Holiday parties, NYE galas"

### Special Day Openers

- [ ] Write New Year's Day (Jan 1) — "Happy New Year, chef!"
- [ ] Write Valentine's Day (Feb 14) — "The food is the love letter"
- [ ] Write Thanksgiving (4th Thursday of Nov) — "Happy Thanksgiving, chef!"
- [ ] Write Christmas (Dec 25) — "Merry Christmas, chef. Take a breath."

### Empty State Encouragement

- [ ] Write 0 clients — "blank canvas... every great kitchen builds regulars one plate at a time"
- [ ] Write 0 events — "no events yet — but that's about to change"
- [ ] Write 0 revenue — "register's empty, but we haven't opened the doors yet"
- [ ] Write 0 recipes — "recipe book is empty... head to Recipes when ready"
- [ ] Write 0 inquiries — "no inquiries yet — make sure embed widget is set up"

### Motivational Patterns (System Prompt Injections)

- [ ] Write slow week context — "even the best kitchens have slow weeks... the rush is coming"
- [ ] Write event cancellation context — "one 86'd ticket doesn't define a service"
- [ ] Write tight margins context — "sometimes it's one ingredient throwing the whole plate off"
- [ ] Write great month context — celebrate with specific numbers, reference what's working
- [ ] Write stale inquiries context — "a cold lead is like a cold steak"
- [ ] Write repeat client booking context — "regulars are the foundation of every great kitchen"

### Relationship Tenure Adjustments (System Prompt Injections)

- [ ] Write Week 1 tone (0-7 days) — explanatory, shows features, new colleague energy
- [ ] Write Month 1 tone (8-30 days) — peer-to-peer, drop hand-holding
- [ ] Write Month 2-3 tone (31-90 days) — trusted partner, shorthand, references patterns
- [ ] Write Veteran tone (90+ days) — ride-or-die, challenges chef, references shared history

### Kitchen Phrases Constant

- [ ] Write `REMY_KITCHEN_PHRASES` constant — "Heard, chef", "Behind!", "Cooking with gas", "Let's get your mise together", "On the fly!", "All day", "Fire it", "86 that", "In the weeds", "Full rail", "Clean board", "On the pass", "Let's plate this up", "The rush is coming", "Service!", "No substitutions"
- [ ] Add to `lib/ai/remy-personality.ts` as new export

### Client-Facing Remy Onboarding

- [ ] Write client greeting — with upcoming event ("Welcome! I'm Remy — your personal concierge for your event with Chef {chefName}")
- [ ] Write client greeting — no upcoming event ("Hey there! It looks like you don't have an upcoming event right now")
- [ ] Interpolation: `{chefName}`, `{eventType}`

### Public-Facing Remy Onboarding

- [ ] Write visitor greeting — "Hey there! I'm Remy — think of me as your personal connection to an incredible private chef experience"
- [ ] Interpolation: `{chefName}`

---

## PERSONALITY ENGINE — `lib/ai/remy-personality-engine.ts`

### Onboarding State Management

- [ ] Implement `getOnboardingStage(chefId)` — query `remy_onboarding` table, return stage or 'not_started' if no row
- [ ] Implement `advanceOnboarding(chefId, stage)` — upsert `remy_onboarding` row, update stage + timestamps
- [ ] Implement `skipOnboarding(chefId)` — set stage='onboarded', skipped=true, completed_at=now()
- [ ] Implement `incrementMessageCount(chefId)` — bump message_count, check if >= 3 for auto-advance to 'onboarded'

### Relationship Tenure

- [ ] Implement `getRelationshipTenure(createdAt)` — return `'new' | 'settling' | 'established' | 'veteran'` based on days since creation
- [ ] Thresholds: 0-7 = new, 8-30 = settling, 31-90 = established, 90+ = veteran

### Milestone Detection

- [ ] Implement `detectMilestones(chefId)` — query client count, event count, revenue total, review count, repeat clients, chef created_at from database
- [ ] Compare against milestone thresholds (first_client, clients_10, clients_25, clients_50, clients_100, first_repeat_client, first_event, first_event_completed, events_10, events_25, events_50, events_100, first_payment, revenue_1k, revenue_5k, revenue_10k, revenue_25k, revenue_50k, revenue_100k, first_review, first_five_star, anniversary_30d, anniversary_90d, anniversary_180d, anniversary_365d)
- [ ] Cross-reference against `remy_milestones` table — filter out already-celebrated
- [ ] Return highest-priority uncelebrated milestone (or null)
- [ ] Implement `markMilestoneCelebrated(chefId, key, data?)` — insert into `remy_milestones`

### Seasonal & Day Logic

- [ ] Implement `getSeasonalOpener()` — pick by current month + day of week
- [ ] Implement `getSpecialDayOpener()` — check against special dates (Jan 1, Feb 14, Thanksgiving, Dec 25)
- [ ] Thanksgiving calculation: 4th Thursday of November (dynamic)
- [ ] Random variant selection for days with multiple openers (Monday, Friday)

### Motivational Context Detection

- [ ] Implement `getMotivationalContext(chefId)` — check for:
  - [ ] Slow week: 0 events in next 7 days
  - [ ] Recent cancellation: event cancelled in last 7 days
  - [ ] Tight margins: last completed event margin < 40%
  - [ ] Great month: revenue up 15%+ month-over-month
  - [ ] Stale inquiries: inquiries older than 48 hours without response (count)
  - [ ] Repeat client booking: detect if latest event client has booked before (ordinal count)
- [ ] Return relevant context strings (can return multiple)

### Check-In Logic

- [ ] Implement `getCheckIn(chefId)` — determine if a check-in is due
  - [ ] Check stage='onboarded' AND completed_at within last 7 days
  - [ ] Check last_checkin_at — no repeats same day
  - [ ] Calculate days since completed_at (1, 3, 5, 7)
  - [ ] Query current counts (clients, events, recipes) for conditional variant selection
  - [ ] Return appropriate check-in message or null

### Master Greeting Function

- [ ] Implement `getCuratedGreeting(chefId)` — priority cascade:
  1. Onboarding stage message (if not 'onboarded')
  2. Uncelebrated milestone (highest priority)
  3. Check-in (if within 7 days of onboarding completion)
  4. Seasonal/day-of-week opener
  5. null (no curated opener — LLM handles normally)
- [ ] Return: `{ message: string, quickReplies?: string[], type: 'onboarding' | 'milestone' | 'checkin' | 'seasonal' | null }`

### Dynamic Personality Block Builder

- [ ] Implement `buildDynamicPersonalityBlock(chefId)` — build system prompt additions:
  - [ ] Empty state encouragement (for any data category at zero)
  - [ ] Motivational context (slow week, cancellation, tight margins, etc.)
  - [ ] Tenure tone adjustment (new/settling/established/veteran)
- [ ] Return as string to append to system prompt

---

## INTEGRATION — Existing Files

### `lib/ai/remy-actions.ts`

- [ ] Import `getCuratedGreeting` and `buildDynamicPersonalityBlock` from personality engine
- [ ] Before hitting Ollama: call `getCuratedGreeting(chefId)`
- [ ] If curated greeting returned: send it directly as Remy's message (no LLM call for opener)
- [ ] Call `buildDynamicPersonalityBlock(chefId)` and append to system prompt for all LLM responses
- [ ] After Ollama response: call `advanceOnboarding` if stage transition is needed
- [ ] After Ollama response: call `incrementMessageCount` if in post-tour stage
- [ ] After celebrating milestone: call `markMilestoneCelebrated`
- [ ] All side effects wrapped in try/catch — non-blocking, log failures as warnings

### `lib/ai/remy-personality.ts`

- [ ] Add `REMY_KITCHEN_PHRASES` export constant (16 phrases with descriptions and usage guidance)

### `components/ai/remy-drawer.tsx`

- [ ] Render quick-reply buttons when curated greeting includes them
- [ ] Quick-reply buttons: "Give me the tour" / "I'll figure it out" (onboarding Stage 1)
- [ ] Quick-reply buttons: "Next" / "Skip the rest" (tour beats)
- [ ] Clicking a quick-reply sends the text as if the chef typed it
- [ ] Style quick-replies as clickable chips below Remy's message
- [ ] Do NOT touch resize handles or drag corners (sacred architecture)

### Settings Page

- [ ] Add "Reset Remy Tour" button to Settings → AI Privacy page
- [ ] Button deletes `remy_onboarding` row for current chef
- [ ] Row re-creates automatically on next drawer open (triggers Stage 1 again)

---

## PROACTIVE INTELLIGENCE (System Prompt Injections)

- [ ] Stale inquiries: surface count + offer to draft follow-ups when inquiries sit 48+ hours
- [ ] Upcoming events with missing prep: flag events within 3 days missing menu approval
- [ ] Unpaid balances: surface total outstanding across events
- [ ] Repeat client approaching loyalty milestone: "{clientName} is 1 event from Gold tier"
- [ ] Empty calendar gaps: "Your Tuesdays have been empty for 3 weeks"
- [ ] Revenue trend shift: "Revenue up/down X% vs last month"
- [ ] Client at churn risk: no booking in 6+ months, offer re-engagement draft
- [ ] Staff scheduling gap: event with no staff assigned within 7 days
- [ ] Quote expiring soon: quote expires in 3 days
- [ ] Upcoming client birthday/anniversary
- [ ] Seasonal demand pattern: reference same month last year
- [ ] Daily ops priority: admin item count + estimated time
- [ ] Follow-up due: post-event thank-you/review/referral sequence
- [ ] Missing client dietary data: clients with no restrictions on file (safety risk)
- [ ] Certification expiring: food handler cert within 30 days

---

## EDGE CASES TO HANDLE

- [ ] Chef skips onboarding → set skipped=true, jump to 'onboarded', no tour replay
- [ ] Chef with imported data → detect counts BEFORE showing check-ins, use conditional variants
- [ ] Ollama offline → curated messages still display (pre-written strings), LLM chat shows "Start Ollama" message
- [ ] Multiple sessions same day → last_checkin_at prevents repeat check-ins, seasonal openers once per day
- [ ] Chef resets onboarding → delete remy_onboarding row, re-create on next drawer open
- [ ] Multiple milestones at once → show only highest priority, one per session
- [ ] Milestone with dynamic data → interpolate from `data` jsonb column (client name, revenue amount)
- [ ] Query failure → skip curated message, don't show broken interpolation
- [ ] Backfill for existing chefs → run detection, mark all passed milestones as silently celebrated on deploy

---

## DOCUMENTATION

- [ ] Update `docs/app-complete-audit.md` with quick-reply buttons and onboarding UI elements
- [ ] Create `docs/remy-onboarding-personality.md` explaining the full system
- [ ] Commit to feature branch

---

## TESTING

- [ ] New chef opens Remy → gets one of 3 curated greetings with their name
- [ ] Quick-reply buttons render and work ("Give me the tour" / "I'll figure it out")
- [ ] Tour progresses through 4 beats with Next/Skip buttons
- [ ] Skipping tour sets skipped=true, no tour replay ever
- [ ] After 3 message exchanges post-tour, onboarding closer appears
- [ ] Day 1/3/5/7 check-ins show at correct times with correct conditions
- [ ] Check-ins don't repeat same day (last_checkin_at works)
- [ ] Milestones detected correctly (first client, first event, revenue thresholds)
- [ ] Milestones never celebrated twice (unique constraint enforced)
- [ ] Seasonal openers match current month
- [ ] Day-of-week openers match current day
- [ ] Special day openers fire on correct dates (Jan 1, Feb 14, Thanksgiving, Dec 25)
- [ ] Tenure tone adjusts based on chef's created_at
- [ ] Empty states show encouragement, not zeros or errors
- [ ] Motivational contexts injected when conditions met
- [ ] Client portal Remy shows client-specific greeting
- [ ] Public Remy shows visitor greeting
- [ ] All curated messages work with Ollama offline
- [ ] Kitchen phrases appear in remy-personality.ts
- [ ] No recipe generation anywhere in any curated message
- [ ] All new server actions use requireChef() for tenant ID
- [ ] remy_onboarding and remy_milestones tables created with RLS
- [ ] Reset Remy Tour button works in Settings → AI Privacy
- [ ] Backfill migration runs correctly for existing chefs
