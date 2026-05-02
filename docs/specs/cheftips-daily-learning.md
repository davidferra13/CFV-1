# ChefTips - Daily Learning Log

> **Status:** Queued for build (2026-05-02)
> **Priority:** Default dashboard widget
> **Tier:** Free (personal journal) / Paid (shared library, future)

---

## Core Concept

"What did you learn today?" - a quiet daily reflection widget for chefs. Turns daily learning into structured memory. Private by default. Foundation for a platform-wide chef knowledge library.

---

## V1 Scope (Build Tomorrow)

### 1. Database

New table: `chef_tips`

| Column     | Type        | Notes                   |
| ---------- | ----------- | ----------------------- |
| id         | uuid        | PK                      |
| chef_id    | uuid        | FK -> chefs(id)         |
| content    | text        | The lesson/tip          |
| tags       | text[]      | Optional categories     |
| created_at | timestamptz | Entry date              |
| shared     | boolean     | Default false (private) |

Index on `(chef_id, created_at DESC)`.

### 2. Dashboard Widget

- Small, non-intrusive card on chef dashboard
- Default widget (ships with ChefFlow, not generated from onboarding)
- Shows: "What did you learn today?"
- Single text input + optional tag selector
- Submit adds entry, shows brief confirmation
- Easy to skip (no nag, no streak counter, no gamification)
- If entries exist today, show them with option to add more
- Collapsible/dismissable like other widgets

### 3. Personal Archive Page

- Route: `/culinary/cheftips` or `/learning` (TBD)
- Reverse-chronological list of all entries
- Filter by tag, search by text
- Monthly/weekly grouping for browsing
- "You've captured X lessons" - simple count, not gamified

### 4. Tags/Categories (Light)

Predefined tag set (chef can also free-type):

- Prep, Technique, Timing, Plating, Ingredients, Equipment
- Client Management, Dietary, Service, Mistakes, Discovery

### 5. Server Actions

- `addChefTip(content, tags?)` - auth-gated, tenant-scoped
- `getChefTips(filters?)` - paginated, own tips only
- `deleteChefTip(id)` - soft delete or hard delete (own only)

### 6. Privacy

- All entries private by default (`shared = false`)
- No shared library in V1
- No aggregation, no cross-chef visibility
- Future: explicit opt-in to share (anonymized or attributed, chef's choice)

---

## Architecture Notes (Future-Ready, Not Built Yet)

- `shared` column ready for future opt-in sharing
- Tags stored as array for future categorization/search
- Schema supports future: AI summarization, trend detection, tip ranking
- Future aggregation: 1,000 chefs x daily = 10,000 entries/10 days
- Future categories: cuisine, service type, season, skill level
- Future: Remy integration ("Based on your tips, you've been focused on plating this month")
- Future: **Chef Networking via Shared Learning** - find other chefs learning same things, opt-in peer connections. "3 chefs near you are also exploring fermentation this week." Only if chef opts in. Privacy-first.

---

## What NOT To Build in V1

- No shared tip library
- No AI categorization
- No streak/gamification
- No notifications/reminders
- No social features
- No voting/ranking
- No mandatory prompts

---

## Why This Matters

The culinary world is built on constant learning. Every day a chef learns: a better prep method, a mistake to avoid, a client preference, a plating detail, a timing adjustment, a new ingredient behavior, a service insight.

ChefTips turns that daily learning into structured memory. At minimum: a personal journal. At scale: one of the most valuable knowledge libraries in ChefFlow.

---

## Definition of Done

1. Widget renders on dashboard (default, not onboarding-generated)
2. Chef can add tip with optional tags
3. Chef can view/search past tips on archive page
4. All entries private, tenant-scoped
5. No nag, no gamification, easy to skip
6. Schema supports future sharing/aggregation without migration
