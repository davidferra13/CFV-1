# Dashboard Rail Architecture Spec

> Status: APPROVED FOR BUILD
> Date: 2026-05-16
> Context: Planning session with developer. Rail is the nervous system. Ambient layer is state awareness.

---

## Core Principle

The Rail is not a widget. It is the operating system of ChefFlow's dashboard. Everything a chef needs to know, do, be aware of, or be reminded about surfaces through the Rail.

The Rail is:

- Time-aware (urgent at 6am, subtle at 10pm)
- Priority-scored (critical stays visible, nice-to-know scrolls)
- Comprehensive (settings half-done, new leads, friend's dinner, TakeAChef message, overdue quote, expiring cream, staff conflict - ALL of it)
- Multi-rail (horizontal scrolling rows within a vertical stack, not one cramped list)

---

## Dashboard Architecture

```
+--------------------------------------------------------------+
| RAIL SYSTEM (always top, always visible, always smart)        |
|                                                               |
| +-- Critical Rail (PINNED, never scrolls off) --------------+|
| | Overdue payment . Client waiting . Leave in 30min          ||
| +------------------------------------------------------------+|
|                                                               |
| +-- Action Rail ----------- < scroll horizontally > ---------+|
| | Quote to send . Menu to approve . Contract unsigned        ||
| +------------------------------------------------------------+|
|                                                               |
| +-- Awareness Rail -------- < scroll horizontally > ---------+|
| | New lead . Friend's dinner . Setting incomplete            ||
| +------------------------------------------------------------+|
|                                                               |
| +-- Opportunity Rail ------ < scroll horizontally > ---------+|
| | Price drop on salmon . Client birthday Fri . Referral      ||
| +------------------------------------------------------------+|
+--------------------------------------------------------------+
+--------------------------------------------------------------+
| AMBIENT LAYER (static, glanceable state - not actions)        |
|                                                               |
| Hero . Schedule . Staff . Metrics . Notes . Etc.              |
+--------------------------------------------------------------+
```

---

## Rail Tiers

### Critical (Pinned, always visible)

- Items that expire within hours or have immediate revenue/safety impact
- Never scrolls off screen
- Red/urgent visual treatment
- Examples: "Leave in 30 min", "Payment 7 days overdue", "Client waiting for response 48h"

### Action (Horizontal scroll)

- Items requiring chef decision or action today
- Amber/brand visual treatment
- Examples: "Quote to send", "Menu awaiting approval", "Contract unsigned 5 days", "Prep not started for tomorrow"

### Awareness (Horizontal scroll)

- Items the chef should know about but can defer
- Subtle/neutral treatment
- Examples: "New lead from TakeAChef", "Friend posted a dinner", "Onboarding step incomplete", "Autopilot handled 3 messages"

### Opportunity (Horizontal scroll)

- Proactive suggestions, relationship moves, market intelligence
- Green/opportunity treatment
- Examples: "Salmon price dropped 12%", "Sarah's birthday Friday", "Referral from Jake", "Revenue goal 89% reached"

---

## Rail Edge Case Catalog (All Item Types)

Every one of these must surface in the appropriate tier:

### Pipeline/Revenue

- New inquiry from any source (website, TakeAChef, Wix, email)
- Quote awaiting your response (you haven't drafted it)
- Quote sent but client hasn't responded (aging timer)
- Contract unsigned (yours or client's)
- Menu awaiting client approval
- Payment overdue (client owes you)
- Payment due (you owe vendor)
- Recurring invoice due to generate
- Revenue goal milestone approaching

### Communication

- Unread messages (inbox, circles, chat)
- Client portal activity (viewed menu, opened quote)
- Follow-up not sent (post-event)
- Dormant client (no contact in X weeks)
- Client birthday/milestone approaching
- Review request pending

### Operations/Events

- Event approaching (day-of, day-before, week-out)
- Drive time alert ("leave in 45min")
- Staff not confirmed for upcoming event
- Staff conflict detected
- Prep not started for imminent event
- Shopping list not finalized
- Gear/car not packed (day-before)
- Receipt not captured (post-event)
- Hours not logged (post-event)

### Culinary/Supply

- Ingredient expiring soon
- Price spike on key ingredient
- Price drop opportunity
- Vendor order deadline approaching
- Low stock alert

### Intelligence/System

- Remy alert (AI noticed something)
- CIL signal (pattern detected)
- Automation ran (autopilot summary)
- Certification expiring
- Insurance renewal approaching

### Setup/Onboarding

- Incomplete settings
- Half-done onboarding steps
- Profile missing bio/tagline
- Feature not yet configured

### Network/Social

- Friend/network dinner happening
- Referral opportunity
- Chef network activity relevant to you

---

## Ambient Layer (Below Rail)

### Scoring Formula

Each ambient widget scored by:

```
Score = (Temporal x 3) + (Revenue x 2) + (Physical x 2) + (Frequency x 1) + ((6 - Cognitive) x 1) + (Delegation x 1)
```

| Axis             | Question                   | Weight |
| ---------------- | -------------------------- | ------ |
| Temporal Urgency | Expires within hours?      | 3x     |
| Revenue Impact   | Ignoring costs money?      | 2x     |
| Physical Action  | Body needs to move?        | 2x     |
| Frequency        | Relevant every day?        | 1x     |
| Cognitive Load   | Glance vs. read? (inverse) | 1x     |
| Delegation Risk  | Only YOU can do this?      | 1x     |

### Ambient Layer Test

Every widget below the Rail must pass:

> "Can I get this information's VALUE by glancing for 2 seconds, without tapping anything?"

- YES = ambient widget (state awareness)
- NO = belongs in the Rail (action routing)

### Default Order (by formula score, highest first)

1. Dashboard Hero (greeting + 4 headline metrics)
2. Today's Schedule (hour-by-hour timeline) - WIRE EXISTING COMPONENT
3. Alert Grid (counts: messages, quotes, payments, shopping)
4. Staff Today - NEW WIDGET
5. Prep Pressure (workload visualization)
6. This Week section (schedule cards, saturation, pipeline, financial)
7. Quick Notes (scratchpad)
8. Revenue Goal Progress - NEW WIDGET (one number)
9. ChefTips (passive learning)
10. Business Health (collapsed, one score)

### Widget Behavior Types

| Behavior        | Description                        | Examples                       |
| --------------- | ---------------------------------- | ------------------------------ |
| Persistent      | Always visible, always same spot   | Hero, Rail                     |
| Data-gated      | Visible only when data exists      | Alert Grid items, Staff Today  |
| Threshold-gated | Appears when metric crosses a line | Revenue Goal (only when close) |
| Dismissible     | Chef can close for the day         | ChefTips, Reminders            |
| Collapsed       | Header visible, expand on click    | Business Health, Intelligence  |

---

## Widgets REMOVED from Dashboard (Absorbed by Rail)

These action-widgets are redundant with the Rail system:

- Priority Actions widget -> Rail Critical tier
- God Mode Rail -> BECOMES the Rail system
- Operator Rail -> BECOMES the Rail system
- Universal Rail -> BECOMES the Rail system
- Resolve Next card -> Rail Action tier
- Decision Queue widget -> Rail Action tier
- Lifecycle Actions (13 cards) -> Rail Action tier
- Relationship Actions -> Rail Opportunity tier
- Post-Event Actions -> Rail Action tier
- Smart Suggestions -> Rail Awareness tier

---

## Nav Bar Change

Add Phone icon to Action Bar (persistent across all pages):

- File: `components/navigation/nav-config.tsx`
- Add: `{ href: '/culinary/call-sheet', label: 'Phone', icon: Phone }` to `actionBarItems`
- Remove: `SourcingPhoneButton` FAB from dashboard page

---

## Build Tasks (Ordered)

### Task 1: Rail System Redesign

Refactor existing God Mode + Operator + Universal rails into the tiered horizontal rail system (Critical/Action/Awareness/Opportunity). Each tier is a horizontal scrolling row. Critical tier is pinned (position: sticky or equivalent).

Key files:

- `components/rail/rail-full.tsx` (current God Mode rail)
- `app/(chef)/dashboard/_sections/chef-operator-rail.tsx`
- `app/(chef)/dashboard/_sections/universal-rail-section.tsx`
- `lib/discovery/universal-rail-actions.ts`

### Task 2: Rail Edge Case Coverage

Audit current rail data sources. Expand to cover the full edge case catalog above. Each item type needs: data source, scoring weight, tier assignment, display component.

Key files:

- `lib/discovery/universal-rail-actions.ts`
- `lib/queue/actions.ts`
- `lib/interface/action-layer.ts`

### Task 3: Dashboard Cleanup

Remove action-widgets absorbed by Rail. Reorder remaining ambient widgets by formula score.

Key file: `app/(chef)/dashboard/page.tsx`

### Task 4: Ambient Additions

- Wire `components/dashboard/todays-schedule-widget.tsx` (exists, not rendered)
- Build `components/dashboard/staff-today-widget.tsx` (new)
- Build `components/dashboard/revenue-goal-widget.tsx` (new)
- Build server actions for each

### Task 5: Nav Phone Icon

- Add to `actionBarItems` in `components/navigation/nav-config.tsx`
- Remove `SourcingPhoneButton` from `app/(chef)/dashboard/page.tsx`

---

## Dead Imports to Clean Up

- `DashboardHeartbeat` (imported, never rendered)
- `DashboardSecondaryInsights` (imported, never rendered)

---

## NOT Building (Deferred)

- Weather widget (needs external API, $0 rule conflict)
- Drive time widget (needs geocoding/routing API)
- Client portal activity tracking (infrastructure may not exist)
- Vendor order deadline alerts (needs new DB field on vendors)
- Phase-gating (hiding widgets by time-of-day; Rail handles this internally)
