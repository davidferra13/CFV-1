# UX6: Daily Action Dashboard Research

## The "Today View" for Private Chefs

**Research Date:** 2026-03-15
**Purpose:** Inform the design of a single morning briefing screen that shows everything a chef needs for the day in a linear, actionable format.
**Target User:** Private chefs working from their phone between clients.

---

## 1. Field Service "Today" Views

### 1.1 Jobber (Field Service Management)

Jobber provides a drag-and-drop calendar with day, week, month, list, and map views. The mobile app gives technicians access to their schedules, work order information, quotes, and turn-by-turn directions to their next job.

**Key patterns for ChefFlow:**

- **Map-first daily view:** Jobber shows a technician's daily visits on a map, letting dispatchers assign last-minute work based on location. For chefs with multiple clients in a day, a map view showing the day's route with time estimates is directly relevant.
- **Push notifications for schedule changes:** When a dispatcher modifies a technician's current workday, the tech gets a notification with all the details. ChefFlow equivalent: if a client changes guest count or adds a dietary restriction, the chef gets a push notification immediately.
- **Route optimization:** Jobber's 2026 route optimization engine allows re-optimization on the fly as plans change. For chefs doing grocery runs between services, this is relevant.
- **Color-coded job types:** Different job types get different colors on the calendar, making it easy to scan the day at a glance.

**Source:** [Jobber Field Service Management App](https://www.getjobber.com/features/field-service-management-app/), [Jobber Scheduling](https://www.getjobber.com/features/scheduling/)

### 1.2 Housecall Pro (Home Service)

Housecall Pro's mobile app offers two schedule views: **List view** (vertical timeline) and **Day view** (calendar blocks). Technicians tap into a job to see the Job Details page with customer info, service address, and notes.

**Key patterns for ChefFlow:**

- **Dashboard widgets:** The home screen displays widgets for scheduled service visits, jobs, and quick actions (create estimates, invoices, track time). This "widget dashboard" pattern is directly applicable to a chef's morning briefing.
- **Morning schedule push:** The software sends technicians their daily schedules through mobile apps each morning, with real-time updates when dispatchers make changes. This is the exact "morning briefing" pattern ChefFlow needs.
- **Integrated map:** Technicians see customer addresses on a map and get routes via Google Maps. A chef's version: see today's client locations, grocery stores along the route, and estimated travel times.
- **In-app status updates:** Technicians update job statuses (en route, arrived, in progress, completed) directly from the app. Chefs could similarly update event statuses (prepping, shopping, en route, cooking, cleaning up).

**Source:** [Housecall Pro Mobile App](https://www.housecallpro.com/features/mobile-app/), [Viewing Your Schedule in the Field](https://help.housecallpro.com/en/articles/1029139-viewing-your-schedule-in-the-field)

### 1.3 ServiceTitan (Home/Commercial Service)

ServiceTitan's dispatch board provides a comprehensive daily view with drag-and-drop scheduling, real-time GPS tracking, and rich job detail. The mobile app gives technicians access to all customer information: contact details, property data, job histories, previous invoices, membership statuses, notes, and more.

**Key patterns for ChefFlow:**

- **Customer history at the point of service:** Technicians see full history before arriving. A chef should see: last menu served, client preferences, dietary notes, past feedback, and any outstanding notes from previous events.
- **Offline data sync:** ServiceTitan's mobile app works offline and syncs when connectivity returns. Critical for chefs working in client kitchens without reliable wifi.
- **Real-time dispatcher-to-tech communication:** The dispatch board lets office staff communicate with field workers in real time. For solo chefs, this maps to real-time notifications from the system (new inquiry, payment received, schedule change).

**Source:** [ServiceTitan Dispatch Board](https://help.servicetitan.com/how-to/using-dispatch-board), [ServiceTitan Field Mobile App](https://help.servicetitan.com/how-to/dispatch-and-arrive-at-a-job-in-the-servicetitan-field-mobile-app)

### 1.4 Delivery Driver Apps (DoorDash Dasher, Uber Driver)

These apps are optimized for split-second decisions on a phone, which makes their UX patterns especially relevant for busy chefs.

**DoorDash Dasher:**

- **Homescreen information density:** Key information (earnings, scheduling options, incentives, zone wait times) displayed right on the homescreen. Single glance tells you where and when to work, and how much you're earning.
- **Earnings pill:** A dynamic earnings display at the top shows the latest dash earnings when online, or weekly total when offline. Always visible, always current.
- **Reduced tap count:** The redesigned app removes clutter and brings most-used tools to the front with clear labels and larger buttons. Start dashing requires fewer taps.
- **Dark mode:** Many deliveries happen at night. Dark mode reduces eye strain and saves battery on OLED screens. Chefs often work in dim kitchen environments or early mornings.

**Source:** [New DoorDash Dasher App](https://dasher.doordash.com/en-us/blog/new-doordash-dasher-app)

**Uber Driver:**

- **Three display modes:** Status (compact, on home screen), Browse (detailed daily/weekly summaries), and Bulletin (milestone celebrations). This layered information architecture lets drivers get a quick glance or dig deeper.
- **Privacy mode:** Drivers can hide real-time earnings on the home screen. Learned from MVP feedback. Chefs might similarly want to hide financial data when their phone is visible to clients.
- **86% daily usage:** 86% of drivers use the earnings tracker on active days, proving the value of always-visible financial data.
- **Interactive earnings cards:** Swipeable cards showing daily and weekly earnings at a glance.

**Source:** [Uber Real-time Earnings Tracker](https://www.uber.com/blog/real-time-earnings-tracker/), [Tracking Your Earnings](https://www.uber.com/us/en/drive/basics/tracking-your-earnings/)

### 1.5 Salesforce Field Service (Enterprise)

Salesforce Field Service Lightning provides a mobile app where workers tap a calendar to view daily appointments, access a map with driving directions, and see full work order details. The app is built offline-first.

**Key patterns for ChefFlow:**

- **Calendar + map dual view:** Workers toggle between a calendar view (when) and map view (where) of the same appointments. Both perspectives are valuable.
- **Offline-first architecture:** Field workers often lack connectivity. The app stores everything locally and syncs when possible. Critical for chefs in client homes.
- **In-day optimization:** Salesforce's optimization module handles in-day schedule changes, automatically re-optimizing remaining appointments when disruptions occur.

**Source:** [Salesforce Field Service Mobile](https://trailhead.salesforce.com/content/learn/modules/field-service-mobile/work-from-anywhere), [Optimizing Daily Schedules](https://trailhead.salesforce.com/content/learn/modules/field-service-lightning-optimization/handle-inday-changes)

---

## 2. Personal Productivity "Today" Patterns

### 2.1 Todoist "Today" View

Todoist's Today view is the app's most-used screen. It shows every task scheduled for today across all projects.

**Structure:**

- **Priority ordering:** Priority 1 tasks appear at the top in red. The system encourages users to mark their three most important tasks as P1.
- **Layout options:** List view (simple vertical list) and Calendar view (time-blocked daily view with sidebar).
- **Time blocking:** Users drag tasks to specific hours in the calendar, which automatically creates a time slot. Duration is adjusted by pulling the task's bottom edge.
- **Grouping and sorting:** Tasks can be grouped by project or sorted by date/priority. This lets users see "everything for Client A" or "everything by urgency."
- **Postpone gesture:** In list layout, dragging a task to the bottom postpones it to tomorrow. Clean, fast, no modal dialogs.
- **Drag affordance:** Six dots next to each task create a "grippy surface" visual, encouraging reordering. Hovering shows a four-sided arrow cursor.

**Relevance to ChefFlow:** The priority system maps directly to a chef's day: P1 = active events (cooking for clients), P2 = prep and shopping, P3 = admin (invoices, follow-ups). Time blocking shows exactly when each block of work happens.

**Source:** [Plan Your Day with the Todoist Today View](https://www.todoist.com/help/articles/plan-your-day-with-the-todoist-today-view-UVUXaiSs), [Todoist Features](https://www.todoist.com/features)

### 2.2 Apple Reminders (Today Smart List)

Apple Reminders' Today smart list pulls reminders from all lists that are due today, plus any overdue items.

**Structure:**

- **Time-based sections:** Automatically splits reminders into morning, afternoon, and evening sections. No manual categorization needed.
- **Smart categorization (Apple Intelligence):** Tap "Auto-Categorize" to let Apple Intelligence organize reminders into sections by related categories.
- **Tags:** Cross-cutting organization via hashtags (#Errands, #Shopping, #Prep). Tags work across all lists.
- **Subtasks:** Reminders can have subtasks, useful for multi-step prep items ("Make dessert" > "Temper chocolate" > "Prepare ganache" > "Assemble").
- **Location-based reminders:** "Remind me when I arrive at [grocery store]" triggers alerts based on GPS. Relevant for chefs who shop at specific stores.

**Relevance to ChefFlow:** The time-based sectioning (morning/afternoon/evening) is a natural fit for a chef's day: morning = prep and shop, afternoon = travel and cook, evening = service and cleanup. Location-based triggers could remind chefs to check their grocery list when they're near the store.

**Source:** [Use Reminders on iPhone](https://support.apple.com/en-us/102484), [Organize Reminders](https://support.apple.com/en-us/119953)

### 2.3 Google Calendar Schedule View (Mobile)

Google Calendar's Schedule view presents a vertical, scrollable list of events and tasks by day. It is intentionally linear and minimal.

**Structure:**

- **Continuous scroll:** Events appear as cards in a vertical timeline. Empty time shows as white space. You scroll through the day naturally.
- **Swipe to delete:** From Schedule view, swiping any event or reminder right deletes it in a single gesture.
- **Peek while creating:** When adding a new event on mobile, swiping down shows the existing agenda around that time. The creation interface minimizes to a small panel while you browse the calendar.
- **Daily agenda email:** An optional morning email summarizes the day's meetings. This is the simplest form of a "morning briefing."

**Relevance to ChefFlow:** The continuous vertical scroll is the simplest possible daily view. It works because it mirrors how time actually flows. A chef's "today" could be a simple scrollable timeline: 7am prep, 9am grocery run, 11am travel, 12pm service, 4pm cleanup, 5pm admin.

**Source:** [Google Calendar Views](https://support.google.com/calendar/answer/6110849), [Google Calendar Hacks](https://www.productiveblogging.com/google-calendar-hacks/)

### 2.4 Notion Daily Dashboard Templates

Notion's daily dashboard templates are the most customizable of any productivity tool, built from composable blocks.

**Common template patterns:**

- **Daily Dashboard with Habit Tracker:** Clean dashboard + notes page with inbox system + habit tracker. Everything on one page.
- **Planner Dashboard:** Organizes days, weeks, and months. Tracks habits and tasks. Shows both the granular (today) and the macro (this week/month).
- **All-in-1 Life Dashboard:** Integrates daily tasks, plans, goals, habits, journal, notes, bookmarks, and reading. Automated calculations and real-time number updates.

**Key insight:** Notion's power comes from combining different database views (table, calendar, board, gallery) on a single page, filtered to "today." A chef's Notion-style dashboard might show: today's events (calendar view), today's tasks (list view), today's financials (number widgets), and today's notes (text block).

**Source:** [Notion Daily Dashboard Templates](https://www.notion.com/templates/daily-dashboard-with-notes-and-habit-tracker), [Notion Personal Dashboards](https://www.notion.com/templates/category/personal-dashboards)

### 2.5 The "Solo Standup" Pattern

Daily standup meetings (from agile development) have been adapted for solo workers through async tools like Geekbot and Friday.

**Pattern:**

- **Three questions every morning:** What did I accomplish yesterday? What am I working on today? Any blockers?
- **Scheduled notification:** The tool sends a notification at a configured time (e.g., 7am) prompting the user to fill out their standup.
- **Snooze capability:** If the user is busy, they can snooze the notification and respond later.
- **DayStart AI:** A morning briefing app that creates intelligent, audio-format morning routines. Users can listen to their briefing while getting ready.

**Relevance to ChefFlow:** A chef's morning briefing could follow the standup pattern: "Yesterday: served the Johnsons (feedback: loved the risotto). Today: 2 events (Miller lunch 12pm, Chen dinner 7pm). Blockers: still need to buy sea bass for the Chen dinner, invoice #1024 overdue from Garcia event." This could be delivered as a push notification, an in-app summary, or even an audio briefing via Remy.

**Source:** [Best Daily Standup Apps](https://www.questmate.com/blog/the-best-5-daily-standup-apps-right-now-in-2023), [DayStart AI](https://apps.apple.com/us/app/daystart-ai-morning-briefing/id6751055528)

---

## 3. What Chefs Need in a Morning Briefing

Based on research into private chef daily workflows and field service best practices, here is the information architecture for a chef's morning briefing, ordered by urgency.

### 3.1 Today's Events (Primary)

| Data Point       | Why It Matters                      | Source          |
| ---------------- | ----------------------------------- | --------------- |
| Client name      | Who you're cooking for              | events table    |
| Event time       | When you need to be there           | events table    |
| Location/address | Where you're going (with map link)  | events table    |
| Guest count      | How much food to prepare            | events table    |
| Menu planned     | What you're cooking                 | menus table     |
| Event status     | Confirmed? Paid? Still in proposal? | event FSM state |
| Contact phone    | One-tap call if running late        | clients table   |

**Design insight from field service:** ServiceTitan's most-praised feature is showing the full customer history before arrival. A chef's "client card" should show: last menu served, dietary notes, past feedback, payment history, and any open notes.

### 3.2 Dietary Alerts (Critical Safety)

This section must be visually prominent and impossible to miss. Allergies can be life-threatening.

| Alert Type                                  | Display                            |
| ------------------------------------------- | ---------------------------------- |
| Severe allergies                            | Red badge, listed first, bold text |
| Dietary restrictions (vegan, kosher, halal) | Orange badge                       |
| Preferences (dislikes, low-carb)            | Gray badge                         |
| New/changed since last event                | Yellow "UPDATED" tag               |

**Design rule:** Dietary alerts should appear both in the morning briefing AND on the individual event card. Redundancy is intentional here. A missed allergy is the worst possible failure mode for a private chef.

### 3.3 Prep Checklist (Per Event)

Private chefs rely heavily on mise en place: having everything prepped, chopped, marinated, and organized before cooking begins. The morning briefing should show prep status per event.

**Typical chef morning workflow (from research):**

1. Review the day's menu
2. Check pantry/fridge for what's already available
3. Build grocery list for what's missing
4. Go to the grocery store early (fewest people, fastest checkout)
5. Return home, unload, set up cutting boards and tools
6. Prep proteins, vegetables, sauces, grains
7. Pack equipment and prepped items
8. Travel to client location

**Checklist structure:**

- [ ] Menu finalized
- [ ] Grocery list complete
- [ ] Shopping done
- [ ] Proteins prepped
- [ ] Vegetables prepped
- [ ] Sauces/dressings made
- [ ] Equipment packed
- [ ] Travel route checked

**Source:** [Private Chef Tips](https://girlandthekitchen.com/blog/private-chef-tips/), [Step by Step Cook Day](https://www.chefshelley.co/042024-2/), [Day in the Life of a Personal Chef](https://www.goodwinrecruiting.com/a-day-in-the-life-of-a-personal-chef)

### 3.4 Grocery Status

| Status                  | Display                           |
| ----------------------- | --------------------------------- |
| Items still needed      | Count badge + expandable list     |
| Items already purchased | Checked off, collapsed by default |
| Items already prepped   | Green checkmark                   |
| Suggested store         | Based on item type and location   |

### 3.5 Outstanding Admin

Tasks that aren't urgent but need attention, shown at the bottom of the briefing.

- **Overdue invoices:** Client name, amount, days overdue
- **Unanswered inquiries:** Lead name, date received, lead score
- **Follow-ups due:** Client name, reason, due date
- **Expiring quotes:** Client name, expiration date

### 3.6 Financial Snapshot

- **Today's expected earnings:** Sum of today's event values
- **Outstanding balance:** Total unpaid invoices
- **This week's earnings:** Running total for context

The Uber/DoorDash pattern of always-visible earnings is directly applicable. 86% of Uber drivers use the earnings tracker daily. Chefs will similarly benefit from seeing "today you'll earn $X" at the top of their morning view.

**Privacy consideration:** Following Uber's lead, include a "hide financials" toggle so chefs can obscure this data when their phone is visible to clients or staff.

### 3.7 Timeline (Travel-Aware)

A linear timeline showing the day's blocks with travel time between them:

```
7:00 AM  - Prep at home (est. 2 hours)
9:00 AM  - Grocery run - Whole Foods (est. 45 min)
10:00 AM - Travel to Miller residence (22 min drive)
10:30 AM - Setup and cook (Miller lunch, 6 guests)
1:00 PM  - Cleanup and pack
1:45 PM  - Travel to Chen residence (35 min drive)
2:30 PM  - Prep on-site (Chen dinner, 12 guests)
6:00 PM  - Service begins
9:00 PM  - Cleanup, head home
```

This mirrors Google Calendar's Schedule view but adds travel estimates and context.

---

## 4. Mobile-First Daily Dashboard Design Patterns

### 4.1 Layout Approaches

**Card-based (recommended for ChefFlow):**

Cards are the dominant mobile pattern for daily dashboards. Each card represents one unit of information (an event, a task list, a financial summary). Cards can be expanded/collapsed, reordered, and swiped.

- PatternFly recommends limiting visible cards to approximately five to prevent overload
- Group related data into cards to improve scannability
- Cards should have a clear visual hierarchy: title, key metric, detail (progressive disclosure)

**Timeline (vertical scroll):**

Google Calendar's approach. Events and tasks flow vertically by time. White space between items shows free time. Simple, intuitive, mirrors the flow of time.

- Best for schedules with clear time boundaries
- Less effective for unstructured tasks (admin, follow-ups)

**Checklist (task list):**

Todoist's approach. A flat list of tasks with checkboxes, sorted by priority or time.

- Best for action-oriented views ("what do I need to do?")
- Less effective for schedule visualization ("when does each thing happen?")

**Recommended hybrid:** A card-based layout where the primary card is a timeline of today's events, followed by cards for dietary alerts, prep checklist, admin tasks, and financial snapshot. Each card is collapsible.

### 4.2 Swipe Gestures for Task Completion

Mobile gesture patterns from Apple HIG and field service apps:

| Gesture     | Action                                       | Feedback                           |
| ----------- | -------------------------------------------- | ---------------------------------- |
| Swipe right | Mark task complete                           | Green checkmark animation + haptic |
| Swipe left  | Snooze/postpone to tomorrow                  | Orange clock icon                  |
| Long press  | Show context menu (edit, delete, reschedule) | Haptic + menu overlay              |
| Pull down   | Refresh today's data                         | Standard pull-to-refresh spinner   |
| Tap         | Expand card / navigate to detail             | Standard navigation transition     |

**Key principle from Apple HIG:** Always provide visual cues and feedback for gesture interactions. Users need to see that their action registered. Haptic feedback (subtle vibration) significantly enhances perceived responsiveness.

**Performance data:** Mobile workers using gesture-optimized applications complete tasks up to 20% faster than those using traditional button-based interfaces.

**Source:** [Apple Gestures HIG](https://developer.apple.com/design/human-interface-guidelines/gestures), [Gestures in Mobile App](https://www.hakunamatatatech.com/our-resources/blog/gestures-in-mobile-app)

### 4.3 Expandable/Collapsible Sections

Progressive disclosure is essential on mobile. Show the minimum needed to make a decision; let users expand for detail.

**Pattern:**

- **Collapsed state:** Icon + title + count/badge (e.g., "Dietary Alerts (3)")
- **Expanded state:** Full detail (e.g., list of all allergens per guest)
- **Smart defaults:** Expand the most urgent section automatically. If there's a severe allergy, expand dietary alerts by default. If there's an overdue invoice, expand admin tasks.

### 4.4 Notification Integration

**Morning push notification pattern:**

```
"Good morning! You have 2 services today:
- Miller lunch (12pm, 6 guests)
- Chen dinner (7pm, 12 guests)
Tap to see your full briefing."
```

This mirrors Housecall Pro's pattern of pushing the daily schedule to technicians each morning. The notification serves as the entry point to the full Today view.

**Timing:** Configurable by the chef (default: 6:30 AM). Should fire even if the app isn't open.

**In-day notifications:**

- "Leave in 15 minutes for the Miller residence (22 min drive)"
- "Guest count updated: Chen dinner is now 14 guests (was 12)"
- "Payment received: Garcia invoice #1024 ($2,400)"

### 4.5 Home Screen Widgets

**iOS widget sizes and content:**

| Size         | Content                                           |
| ------------ | ------------------------------------------------- |
| Small (2x2)  | Next event: client name, time, guest count        |
| Medium (4x2) | Today's timeline: up to 3 events with times       |
| Large (4x4)  | Full briefing: events + dietary alerts + earnings |

**Android widget:** Similar sizing with a Glance-based implementation.

The widget should update throughout the day, always showing the most relevant upcoming information (next event, current event status, or "day complete" summary).

---

## 5. Proactive Intelligence in Daily Views

### 5.1 Weather Alerts

Relevant for outdoor events (garden parties, rooftop dinners, patio services).

- Show weather icon and temperature on each event card
- Alert if rain is forecast for an outdoor event (trigger: 6 hours before)
- Suggest contingency: "Rain expected at 4pm. The Chen dinner is planned for the terrace. Consider discussing indoor backup."

**Industry precedent:** AccuWeather for Business provides site-specific weather alerts. Hyperlocal weather alerts are generated in real time along routes. For chefs, weather affects: outdoor event viability, grocery freshness during transport, and travel conditions.

**Source:** [AccuWeather Site-Specific Alerts](https://business.accuweather.com/products/site-specific-alerts-warnings/), [Trimble Hyperlocal Weather](https://transportation.trimble.com/en/transportation-management/blog/predictive-hyperlocal-weather-helps-fleets-adapt-to-bad-weather-in-real-time)

### 5.2 Traffic and Travel Time Warnings

- Show estimated travel time between events, updated in real-time
- Alert if traffic conditions change the expected arrival time
- "Traffic is heavier than usual on I-95. Leave 15 minutes earlier for the Chen dinner."

**Industry precedent:** Field service platforms use AI-driven route optimization that factors in live traffic, technician location, and job urgency. When last-minute changes happen, AI instantly reroutes.

### 5.3 "Running Behind" Notifications

If a chef's current event is running past the expected end time and there's another event after:

- Passive alert at 80% of expected duration: "You've been at the Miller residence for 2 hours (expected: 2.5 hours). On track."
- Active alert when overlap is likely: "Your current event may run 30 minutes late. Chen dinner starts in 2 hours, with 35 minutes of travel time."

### 5.4 Prep Time Estimates

Based on menu complexity and guest count, estimate how long prep will take:

- Simple menu (3 courses, 4 guests): ~1.5 hours prep
- Complex menu (5 courses, 12 guests, dietary splits): ~3.5 hours prep
- Factor in: number of courses, guest count, dietary variations, complexity of techniques

This is a deterministic calculation (Formula > AI principle). No LLM needed. Use course count, guest count, and technique complexity to compute an estimate.

### 5.5 Client Context Reminders

Before each event, show relevant context from past interactions:

- "Last time with the Johnsons (Feb 8): served braised short ribs. Feedback: 'Best meal we've ever had at home.'"
- "The Millers prefer wine pairings. They asked about a Mediterranean theme last time."
- "New client: first event with the Chens. No history yet."

This mirrors ServiceTitan showing full customer history to technicians before arrival. The difference: a chef's "customer history" includes food preferences, past menus, feedback, and relationship notes, not repair history.

**Source:** [ServiceTitan Mobile App](https://help.servicetitan.com/how-to/dispatch-and-arrive-at-a-job-in-the-servicetitan-field-mobile-app)

---

## 6. Impact on Efficiency

### 6.1 Time Savings from Optimized Daily Views

Field service management software provides concrete, measurable time savings:

| Metric                  | Before FSM Software         | After FSM Software   | Improvement      |
| ----------------------- | --------------------------- | -------------------- | ---------------- |
| Wasted drive time       | ~2 hours/day per technician | ~30 minutes/day      | 75% reduction    |
| Paperwork time          | 1 hour/day                  | ~15 minutes/day      | 75% reduction    |
| Callbacks/return visits | 2-3 per week                | Less than 1 per week | 60-70% reduction |
| Missed appointments     | 5-10 per month              | 1-2 per month        | 70-80% reduction |
| Invoice delays          | 7-14 days                   | 1-2 days             | 80-85% reduction |

Most contractors see ROI within six months. A typical $15K-$25K investment delivers $50K-$100K+ in annual operational value.

**Source:** [FieldEdge FSM ROI](https://fieldedge.com/blog/field-service-management-software-roi/)

### 6.2 Broader ROI Data

- **300-400% ROI** in the first year is common for well-implemented field service platforms
- **40% lower admin time** and doubled productivity reported by teams modernizing FSM
- **Technician utilization** increases from 50-65% to 75-85% with FSM tools. A 5% boost often means 1-2 more jobs per week per technician
- **First-time fix rate** improvements: one HVAC company went from 70% to 82%, cutting 440 unnecessary truck rolls per year and saving $52,800
- **Revenue increase** of 10-25% from better upsell prompts, faster quoting, and mobile access to work history
- **Fuel savings** of 15-25% from optimized routing

Nearly 50% of field service organizations currently use FSM software, with the market approaching $9B in global value by 2031.

**Source:** [ServicePower Field Service Trends 2025](https://www.servicepower.com/blog/top-field-service-trends-for-2025-roi), [Fieldproxy ROI Guide](https://www.fieldproxy.com/blog/roi-field-service-software-analysis), [LionOBytes FSM KPIs](https://www.lionobytes.com/blog/field-service-management-kpis-2025)

### 6.3 Cognitive Load Reduction

Research on context switching and cognitive load provides strong justification for a single daily view:

- **1,200 app switches per day:** The average digital worker toggles between applications and websites nearly 1,200 times per day (Harvard Business Review, 2022)
- **40% productivity loss:** Chronic multitasking and frequent context switching can consume up to 40% of productive time
- **10 IQ point drop:** Heavy multitasking can lead to a drop of up to 10 IQ points from cognitive overload
- **45% of workers** say toggling between too many apps makes them less productive
- **43% of workers** report that constantly switching between tools is mentally exhausting

**Application to chefs:** A chef currently checks: their calendar (schedule), a note-taking app (menus and prep lists), a messaging app (client communication), their bank app (payments), their email (inquiries), and maybe a recipe app. That's 6+ apps before they even start cooking. A single "Today" view that consolidates all of this eliminates context switching entirely.

**Source:** [Context Switching Productivity](https://conclude.io/blog/context-switching-is-killing-your-productivity/), [Atlassian Cognitive Overload](https://www.atlassian.com/blog/productivity/cognitive-overload), [NNGroup Minimize Cognitive Load](https://www.nngroup.com/articles/minimize-cognitive-load/)

### 6.4 Client Satisfaction from Better Preparation

Salesforce Snapshot Research found that customers list these qualities as most important for service providers:

1. Expertise
2. Speed
3. Empathy
4. Flexibility
5. Communication
6. **Preparedness**
7. **Proactivity**

A daily action dashboard directly improves #6 (preparedness: the chef reviewed the client's dietary needs, past menus, and preferences before arriving) and #7 (proactivity: the chef noticed a potential issue with the menu and reached out before the event).

74% of mobile workers say customer expectations are higher than they used to be, making proactive capabilities essential.

**Source:** [Salesforce Customer Experience](https://www.salesforce.com/service/field-service-management/customer-experience/), [Salesforce Proactive Field Service](https://www.salesforce.com/service/field-service-management/proactive-field-service/)

---

## 7. Synthesis: ChefFlow "Today" View Design Recommendations

### 7.1 Information Architecture (Top to Bottom)

```
+------------------------------------------+
| GOOD MORNING, CHEF                       |
| Saturday, March 15 - 2 events today      |
| Expected earnings: $3,200                |
+------------------------------------------+

+------------------------------------------+
| TIMELINE                                 |
| 7:00  Prep at home (est. 2h)            |
| 9:00  Grocery run - Whole Foods (45m)    |
| 10:00 Travel to Millers (22 min)         |
| 10:30 MILLER LUNCH - 6 guests    [PAID] |
|       > 2 dietary alerts                 |
| 1:45  Travel to Chens (35 min)           |
| 2:30  CHEN DINNER - 12 guests [CONFIRMED]|
|       > 1 dietary alert                  |
| 9:00  Day complete                       |
+------------------------------------------+

+------------------------------------------+
| DIETARY ALERTS (3)              [expand] |
| Miller: Sarah (nut allergy - SEVERE)     |
| Miller: Tom (gluten-free)                |
| Chen: Guest #4 (vegan)                   |
+------------------------------------------+

+------------------------------------------+
| PREP STATUS                     [expand] |
| Miller lunch: 4/6 items prepped          |
| Chen dinner: 2/8 items prepped           |
| Still need to buy: 5 items               |
+------------------------------------------+

+------------------------------------------+
| ADMIN (2 items)                 [expand] |
| Invoice #1024 overdue (Garcia, $2,400)   |
| New inquiry: Williams (3 days ago)       |
+------------------------------------------+
```

### 7.2 Core Design Principles

1. **Linear flow, not a dashboard grid.** The view reads top-to-bottom like a timeline, not a grid of widgets. This matches how a chef's day actually flows and works perfectly on a phone screen.

2. **Progressive disclosure everywhere.** Show counts and summaries by default. Expand for detail. Dietary alerts show "3 alerts" collapsed; tapping reveals the full list with severity indicators.

3. **Earnings always visible.** Following DoorDash and Uber's pattern, today's expected earnings appear at the top of the view. Include a privacy toggle.

4. **Dietary alerts are never hidden.** Even when collapsed, the count and severity level are visible. Severe allergies should auto-expand. This is a safety feature, not just UX polish.

5. **Swipe to complete, tap to detail.** Tasks in the prep checklist complete with a right swipe (green check + haptic). Tapping an event card navigates to the full event detail page.

6. **Morning push notification as entry point.** A configurable morning notification summarizes the day and links directly to the Today view.

7. **Offline-first.** The Today view must work without internet. Cache all data needed for the day locally. Sync when connectivity returns.

8. **Formula over AI.** Prep time estimates, travel time calculations, and financial summaries are deterministic. No Ollama dependency for the Today view.

### 7.3 Key Differentiators from Generic Field Service Apps

| Generic Field Service                 | ChefFlow "Today"                                                         |
| ------------------------------------- | ------------------------------------------------------------------------ |
| Shows job address and customer name   | Shows client name, dietary alerts, past menu history, relationship notes |
| Route optimization for multiple stops | Route that includes grocery stores along the way                         |
| Parts inventory check                 | Ingredient/grocery status per event                                      |
| Invoice after service                 | Financial snapshot (earned today, outstanding, this week)                |
| Job completion checklist              | Prep checklist (mise en place status per event)                          |
| Customer feedback request             | Client context ("last time they loved the risotto")                      |

### 7.4 Implementation Priority

**Phase 1 (MVP):**

- Timeline with today's events (time, client, guest count, status)
- Dietary alerts section (auto-expanded for severe allergies)
- Financial snapshot (today's earnings, outstanding)
- Morning push notification

**Phase 2:**

- Prep checklist per event
- Grocery status integration
- Admin tasks section (overdue invoices, unanswered inquiries)
- Travel time estimates between events

**Phase 3:**

- Client context reminders (past menus, feedback, notes)
- Weather alerts for outdoor events
- Home screen widget (iOS/Android)
- "Running behind" notifications
- Prep time estimates based on menu complexity

---

## Sources

- [Jobber Field Service Management App](https://www.getjobber.com/features/field-service-management-app/)
- [Jobber Scheduling Software](https://www.getjobber.com/features/scheduling/)
- [Housecall Pro Mobile App](https://www.housecallpro.com/features/mobile-app/)
- [Housecall Pro - Viewing Your Schedule in the Field](https://help.housecallpro.com/en/articles/1029139-viewing-your-schedule-in-the-field)
- [ServiceTitan Dispatch Board](https://help.servicetitan.com/how-to/using-dispatch-board)
- [ServiceTitan Field Mobile App](https://help.servicetitan.com/how-to/dispatch-and-arrive-at-a-job-in-the-servicetitan-field-mobile-app)
- [New DoorDash Dasher App](https://dasher.doordash.com/en-us/blog/new-doordash-dasher-app)
- [Uber Real-time Earnings Tracker](https://www.uber.com/blog/real-time-earnings-tracker/)
- [Uber Tracking Your Earnings](https://www.uber.com/us/en/drive/basics/tracking-your-earnings/)
- [Salesforce Field Service Mobile](https://trailhead.salesforce.com/content/learn/modules/field-service-mobile/work-from-anywhere)
- [Salesforce Proactive Field Service](https://www.salesforce.com/service/field-service-management/proactive-field-service/)
- [Todoist Today View](https://www.todoist.com/help/articles/plan-your-day-with-the-todoist-today-view-UVUXaiSs)
- [Todoist Features](https://www.todoist.com/features)
- [Apple Reminders](https://support.apple.com/en-us/102484)
- [Google Calendar Views](https://support.google.com/calendar/answer/6110849)
- [Notion Daily Dashboard Templates](https://www.notion.com/templates/daily-dashboard-with-notes-and-habit-tracker)
- [DayStart AI Morning Briefing App](https://apps.apple.com/us/app/daystart-ai-morning-briefing/id6751055528)
- [FieldEdge FSM ROI](https://fieldedge.com/blog/field-service-management-software-roi/)
- [ServicePower Field Service Trends 2025](https://www.servicepower.com/blog/top-field-service-trends-for-2025-roi)
- [Fieldproxy ROI Guide](https://www.fieldproxy.com/blog/roi-field-service-software-analysis)
- [AccuWeather Site-Specific Alerts](https://business.accuweather.com/products/site-specific-alerts-warnings/)
- [Apple Gestures HIG](https://developer.apple.com/design/human-interface-guidelines/gestures)
- [Context Switching Productivity](https://conclude.io/blog/context-switching-is-killing-your-productivity/)
- [Atlassian Cognitive Overload](https://www.atlassian.com/blog/productivity/cognitive-overload)
- [NNGroup Minimize Cognitive Load](https://www.nngroup.com/articles/minimize-cognitive-load/)
- [Salesforce Customer Experience](https://www.salesforce.com/service/field-service-management/customer-experience/)
- [Private Chef Tips](https://girlandthekitchen.com/blog/private-chef-tips/)
- [Day in the Life of a Personal Chef](https://www.goodwinrecruiting.com/a-day-in-the-life-of-a-personal-chef)
- [PatternFly Dashboard Patterns](https://www.patternfly.org/patterns/dashboard/design-guidelines/)
- [Smashing Magazine Real-Time Dashboards](https://www.smashingmagazine.com/2025/09/ux-strategies-real-time-dashboards/)
- [LionOBytes FSM KPIs 2025](https://www.lionobytes.com/blog/field-service-management-kpis-2025)
