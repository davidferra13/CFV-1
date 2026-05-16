# Day-Of Timeline Auto-Generation

> **Status:** SPEC-READY
> **Priority:** P1
> **Origin:** "Picky Client" persona stress test, edge case: 5-course dinner for 20, vegan variants, beach mansion 2 hours away, needs auto-built timeline (2026-05-16)
> **Depends On:** Menu Variant Accommodations, Equipment Packing List, Event Total Recall (venue memory)

---

## Problem Statement

20-person dinner. 5 courses. 2 vegan variants per course. Beach mansion 2 hours from home. Service time: 7pm.

Chef needs to know: What time do I leave the house? When do I arrive? How long for setup? When does prep start per course? When do variants prep? When does each course fire? When does service end? When do I pack up and leave?

Right now: chef does this math in their head or scribbles on paper. For complex events, this is error-prone. Miss one timing and the whole dinner cascades.

ChefFlow has the data to auto-generate this: menu (courses, complexity), guest count (portion scale), venue (travel time, kitchen constraints), variants (parallel prep), and service time (anchor point). Reverse-engineer the entire day from service time backward.

---

## Solution

### 1. Anchor Point: Service Time

Everything builds backward from the client's stated service time:

- "Dinner at 7pm" = first course plates at 7:00
- System works backward: if first course takes 20 min to fire, firing starts at 6:40
- If setup takes 30 min, arrive by 5:40 (with buffer)
- If travel is 2 hours, depart by 3:30 (with traffic buffer)

### 2. Course Timing Engine

Each course gets estimated prep and fire times based on:

- Dish complexity (technique type, component count)
- Guest count (scaling factor)
- Number of variants (parallel prep slots)
- Kitchen constraints (burner count, oven space from venue profile)
- Chef's historical data (if they've made this dish before, use actual times)

**Default estimates (adjustable by chef):**

| Factor                                         | Default                   |
| ---------------------------------------------- | ------------------------- |
| Simple dish prep                               | 15 min per course         |
| Complex dish prep (sous vide, multi-component) | 30-45 min                 |
| Scaling factor (per 10 guests above 10)        | +10 min                   |
| Variant parallel prep                          | +10 min per variant track |
| Fire/plate time                                | 10-15 min per course      |
| Between courses                                | 15-20 min (client pacing) |

### 3. Auto-Generated Timeline

System produces a complete day-of schedule:

```
3:30 PM - Depart home (2h drive + 10min buffer)
5:30 PM - Arrive at venue
5:30 PM - Unload and setup (30 min)
6:00 PM - Begin prep
         - Course 1 prep: Burrata/cashew ricotta (15 min)
         - Course 2 prep: Soup (20 min, can simmer)
         - Vegan variants: prep beet steaks (15 min parallel)
         - Course 3 prep: Salad components (10 min)
         - Course 4 prep: Beef sous vide (started 4h prior at home)
         - Course 5 prep: Dessert components (20 min)
6:40 PM - Fire course 1 (10 min)
6:50 PM - Plate and serve course 1 (10 min)
7:00 PM - FIRST COURSE SERVED (anchor)
7:15 PM - Clear, fire course 2
7:25 PM - Serve course 2
7:40 PM - Clear, fire course 3
...
9:30 PM - Dessert served
10:00 PM - Begin cleanup (30 min)
10:30 PM - Pack and depart
12:30 AM - Arrive home
```

### 4. Advance Prep Detection

Some items need advance prep (hours or days before):

- Sous vide: started hours before departure (at home)
- Marination: started night before
- Dough proofing: started morning of
- Stock/braise: started day before

System detects these from menu/recipe data and inserts pre-event prep items:

```
DAY BEFORE:
- Braise short ribs (4h cook + cool overnight)
- Make stock for jus

MORNING OF:
- Start sous vide beef (4h before departure, bag and immerse at home)
- Prep dessert base (refrigerate, transport cold)
```

### 5. Travel Integration

- Travel time estimated from chef's home address to venue address
- Traffic buffer: configurable (default +15 min for 1h+ drives)
- Arrival buffer: 10 min before setup starts (parking, unload assessment)
- Return trip shown at end of timeline (chef knows when they'll be home)

### 6. Chef Adjustments

Timeline is a STARTING POINT, not gospel:

- Chef can drag/adjust any time block
- Override estimates with actuals: "This dish takes me 25 min, not 15"
- Add custom blocks: "Meet with event planner at 5:45"
- Lock service time (client-set) vs flex everything else
- Save adjustments as templates for future similar events

### 7. Live Timeline on Event Day

On service day, timeline becomes a live tracker:

- Current task highlighted
- Running ahead/behind indicator
- "Next up" always visible
- If behind: system adjusts remaining timeline (cascades the delay)
- Integrates with Day-Of Live Client Status (client sees "prep starting" when timeline hits that block)

---

## Files Likely Touched

- `lib/events/timeline-generator.ts` (new, reverse-engineer from service time + menu + venue + guests)
- `lib/events/course-timing-engine.ts` (new, estimate prep/fire/plate per course)
- `lib/events/advance-prep-detector.ts` (new, identify items needing pre-event prep)
- `lib/events/travel-estimator.ts` (new, home -> venue with buffer)
- `components/events/day-of-timeline.tsx` (new, visual timeline with drag-adjust)
- `components/events/advance-prep-checklist.tsx` (new, pre-event items)
- `components/events/live-timeline-tracker.tsx` (new, day-of real-time view)
- `app/(chef)/events/[id]/timeline/page.tsx` (new, full timeline view)
- `lib/events/venue-memory.ts` (extend, kitchen constraint data feeds timing)
- Database: `event_timelines` table (event_id, blocks[], adjustments[], template_id)

---

## Verification

- [ ] Timeline auto-generates from service time + menu + venue + guest count
- [ ] Departure time accounts for travel + traffic buffer
- [ ] Each course gets prep + fire + plate time estimates
- [ ] Variant prep appears as parallel blocks
- [ ] Advance prep items detected and shown as pre-event tasks
- [ ] Chef can adjust any time block
- [ ] Service time remains locked unless chef overrides
- [ ] Live timeline highlights current task on event day
- [ ] Running behind/ahead indicator works
- [ ] Travel time uses actual addresses
