# Chef as Consumer: Reusing Producer Infrastructure

> Status: SPEC-READY
> Priority: P1 (cohesion multiplier, zero new backend)
> Author: Claude + David
> Date: 2026-05-16

---

## The Insight

ChefFlow has a hard producer/consumer wall. A chef IS also a consumer. The platform already has discovery infrastructure (lib/discover/, ticketing, public menus) but no portal door that says "tonight I'm eating, not cooking."

Chefs eat out more than most people (industry culture, research, inspiration). Every feature built for clients can serve chefs too. This is not new work - it is new access to existing work.

### What Explore Is

Good infrastructure for browsing food, menus, chefs, and events. That's it. We don't frame what the user does with it. Some will find dinner. Some will browse menus. Some will book a chef. Some will just scroll. The infrastructure is the same regardless of intent.

Explore surfaces what ChefFlow already knows: menus, dishes, seasonal ingredients, chef profiles, pop-ups, events, local food. Users decide what that means to them.

---

## New Chef Portal Domains

### 1. `/discover` - Find Food Tonight

**Reuses:** `lib/discover/` (18 files), `lib/public-consumer/` (2 files), `lib/directory/` (7 files)

Browse other chefs' public menus, events, pop-ups nearby. Chef wants dinner, not to cook it. Same discovery engine that powers public pages, but inside the authenticated chef experience with:

- Personalized recommendations (knows your dietary prefs, location, cuisine expertise)
- Peer context ("this chef specializes in X, you specialize in Y")
- Professional curiosity signals ("trending in your area", "new technique")

### 2. `/book` - Hire Another Chef

**Reuses:** `lib/booking/` (9 files), `lib/events/` (68 files), `lib/quotes/` (9 files), `lib/clients/` (71 files)

Actually hire another chef for your night off, your kid's birthday, your anniversary. The cobbler's children get shoes. Full booking flow but from the OTHER side:

- Browse available chefs (reuses directory)
- Request quotes (reuses quote engine from client perspective)
- Manage your bookings AS a client (reuses event lifecycle)
- Leave reviews (reuses reviews system)

### 3. `/community-events` - Attend, Don't Host

**Reuses:** `lib/tickets/` (14 files), `lib/dinner-circles/` (6 files), `lib/popups/` (5 files)

Find ticketed dinners, pop-ups, farm dinners from peers. Not managing them - attending them.

- Browse upcoming ticketed events in your area
- Join dinner circles as a GUEST, not a host
- RSVP to pop-ups from your network
- See what your chef network is hosting
- Professional development angle: "attend to learn new styles"

### 4. `/local-food` - Chef's Night Off

**Reuses:** `lib/discover/` (18 files), `lib/ingredients/` (5 files), PIE pricing data

Farmers markets, food trucks, restaurants, specialty shops. The food landscape a chef lives in but rarely browses as a consumer.

- Nearby food experiences (markets, trucks, pop-ups, restaurants)
- Seasonal produce availability (reuses the produce calendar)
- Ingredient sourcing spots (where to buy that one thing)
- "What's good right now" based on PIE seasonal data

---

## Why This Works (Zero New Backend)

| New Route           | Existing lib/ domains it consumes                 | New code needed            |
| ------------------- | ------------------------------------------------- | -------------------------- |
| `/discover`         | discover (18), public-consumer (2), directory (7) | Page + filters only        |
| `/book`             | booking (9), events (68), quotes (9)              | Client-perspective wrapper |
| `/community-events` | tickets (14), dinner-circles (6), popups (5)      | Attendee view components   |
| `/local-food`       | discover (18), ingredients (5), pricing (65)      | Consumer lens components   |

**Total new backend logic: near zero.** These are new VIEWS on existing data and actions.

---

## Cohesion Multiplier Effect

Every feature David has built now serves double duty:

| Existing Feature | Producer Use               | Consumer Use (NEW)                |
| ---------------- | -------------------------- | --------------------------------- |
| Discovery engine | "Get found by clients"     | "Find food tonight"               |
| Booking system   | "Accept bookings"          | "Book another chef"               |
| Ticketing        | "Sell tickets to my event" | "Buy tickets to peer events"      |
| Dinner circles   | "Host my circle"           | "Join someone else's circle"      |
| Reviews          | "Collect feedback"         | "Leave feedback as a diner"       |
| Directory        | "Be listed"                | "Browse who's near me"            |
| Pricing/PIE      | "Price my services"        | "See what things cost as a buyer" |
| Produce calendar | "Plan seasonal menus"      | "What's fresh at the market?"     |
| Pop-ups          | "Create pop-up events"     | "Find pop-ups to attend"          |
| Availability     | "Set my schedule"          | "See who's available tonight"     |

---

## Architecture: Nav Section, Not Separate Mode

### The Problem

89 domains already live in the chef portal. Consumer features can't clutter operational space. But they also shouldn't feel like a gimmick or a separate app.

### The Solution: "Explore" Nav Section

No mode switch. No toggle. No different "feel." Just another section in the existing nav, like Events or Finance. The content naturally uses `browsing` surface grammar because that's what browsing IS, the same way a calendar page naturally looks different from a dashboard without needing a "mode."

```
Nav sections (existing)
├── Dashboard
├── Events
├── Clients
├── Menus & Recipes
├── Finance
├── ...
│
├── Explore          ← new section, same nav
│   ├── Discover     (browse food, chefs, experiences)
│   ├── Book         (hire a chef for yourself)
│   ├── Events       (attend peer dinners, pop-ups)
│   └── Local        (markets, trucks, shops near you)
```

### Why a Section, Not a Mode

- Chefs don't "switch modes." They scroll down the nav and see Explore.
- No cognitive overhead. No "am I in the right mode?" confusion.
- Same app, same shell, same density system. Pages use `browsing` grammar naturally.
- If Explore pages feel different, it's because browsing content IS different, not because we forced a visual split.
- No gimmicks. Just more of the app.

### Keeping It Clean

| Concern                           | Answer                                                              |
| --------------------------------- | ------------------------------------------------------------------- |
| Nav clutter                       | Explore is ONE collapsible section with 4 items                     |
| Operational noise on browse pages | These pages don't show ops alerts because they're not ops pages     |
| Feature bloat                     | Bounded scope: only consumer-perspective reuse of existing features |
| Route isolation                   | Routes live under `app/(chef)/explore/` for clean grouping          |

## Implementation Notes

- Routes under `app/(chef)/explore/` with shared `layout.tsx`
- Explore section in nav, collapsible, below operational sections
- Pages declare surface grammar mode: `browsing`
- Chef's own listings excluded from results
- Network-aware: prioritize chefs you know, events from connections
- Location-aware: uses account-anchored location (already built)

---

## Connection to Existing Vision

- **Dinner Circles** already support guest membership - this gives it a UI
- **Ticketed Events** spec already has purchase flow - this surfaces it to chefs
- **Account-Anchored Location** (built 2026-05-11) powers all proximity features
- **Discovery engine** is fully built but only accessible via public routes
- **Network/connections** domain exists but is underutilized

---

## Exit Criteria

- [ ] Chef can browse food experiences without leaving the portal
- [ ] Chef can book another chef through the same system clients use
- [ ] Chef can buy tickets to peer events
- [ ] Chef can join dinner circles as a guest
- [ ] All features reuse existing lib/ domains (no new tables, no new APIs)
- [ ] Consumer routes excluded from chef's own listings
- [ ] Location-aware results using account-anchored zip
