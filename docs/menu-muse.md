# Menu Muse — Creative Catalyst for Private Chefs

## What Is It

Menu Muse is a creative resource tool that helps private chefs break through menu writer's block. It surfaces the chef's **own data** — recipes, seasonal intelligence, favorite culinary heroes, client preferences, past menus, culinary vocabulary, and backlogged ideas — in one focused view.

**The hard rule:** Menu Muse never generates recipes, never suggests what to cook, and never delivers AI-generated creative content. It only shows real data and real references so the chef can make the creative leap themselves.

## Why It Exists

Private chefs live and die by their menus. When a chef has 12 options to write for a four-course dinner — or multiple menus stacked up — writer's block is the #1 bottleneck. The chef needs to deliver beautiful, brilliant menus, and sometimes the creative well runs dry.

Menu Muse is the best teacher in the room: it shows you exactly the resources you need so _you_ can be creative.

## Where It Lives

- **Primary:** `/games/menu-muse` — standalone page linked from Chef Arcade hub
- **Event shortcut:** `/games/menu-muse?eventId=xxx` — opens with client context pre-loaded
- **Games hub:** First card in the Chef Arcade grid (lightbulb emoji, "Get inspired" CTA)

## The 7 Resource Panels

### 1. Your Recipe Bible

- **Source:** `recipes` table (tenant-scoped, non-archived)
- **Views:** Forgotten Gems (not cooked in 6+ months), Most Trusted (by times_cooked), By Category
- **Shuffleable:** Yes (Forgotten Gems view)
- Links to full recipe detail

### 2. What's In Season

- **Sources:** `lib/calendar/seasonal-produce.ts` (curated US data) + `seasonal_palettes` table (chef's custom strategies)
- Shows: sensory anchor, closing micro-windows (urgent), active micro-windows, proven wins, peak produce
- **Shuffleable:** Yes (peak produce)

### 3. Your Culinary Heroes

- **Source:** `favorite_chefs` table
- Shows: chef name, personal note on why inspiring, "Visit" button linking to external website
- Empty state links to settings

### 4. Client Intelligence (Event-Contextual)

- **Only shown when** `?eventId=xxx` is present
- **Source:** Event → client profile
- Shows: allergies (safety-first, red), dietary restrictions, favorite dishes/cuisines, dislikes (struck through), special requests, past menus for this client

### 5. Your Idea Pipeline

- **Sources:** `chef_journey_ideas` + `chef_journey_entries`
- Shows: ideas currently being tested, backlog ideas (by priority), dishes to explore from journeys

### 6. Your Flavor Language

- **Source:** `chef_culinary_words` table
- Shows: chef's personal culinary vocabulary as color-coded chips by category (texture, flavor, temperature, mouthfeel, aroma, technique, visual, composition, emotion)
- **Shuffleable:** Yes
- Purpose: "What should this dish _feel_ like?"

### 7. Menu Patterns & Templates

- **Source:** `menus` table
- Shows: saved templates, same-season-last-year menus, recent menus
- Links to menu editor

## Architecture

### Files Created

| File                                  | Purpose                                                                         |
| ------------------------------------- | ------------------------------------------------------------------------------- |
| `lib/games/menu-muse-actions.ts`      | Server action: `getMuseData(eventId?)` — fetches all 7 data sources in parallel |
| `app/(chef)/games/menu-muse/page.tsx` | Client component: renders all 7 panels                                          |

### Files Modified

| File                        | Change                                            |
| --------------------------- | ------------------------------------------------- |
| `app/(chef)/games/page.tsx` | Added Menu Muse card as first entry in games grid |

### Data Flow

```
Menu Muse Page (client component)
  → getMuseData(eventId?) (server action)
    → requireChef() (auth + tenant scoping)
    → Promise.all([8 parallel Supabase queries])
    → getSeasonalProduceGrouped(month) (pure data)
    → getCurrentSeason() / getActiveMicroWindows() / getEndingMicroWindows() (palette helpers)
    → Return MuseData to client
```

### What It Does NOT Use

- No Ollama / no AI generation
- No parseWithOllama, no parseWithAI
- No external API calls
- No recipe generation or creative suggestions
- No Remy branding

## Design Decisions

1. **No AI** — The entire tool is data surfacing. Zero AI involvement ensures we never cross the line into "creepy AI-generated recipes."

2. **Client component** — Uses `'use client'` to support shuffle interactions and collapsible panels without full page reloads.

3. **Single server action** — One `getMuseData()` call fetches everything via `Promise.all` for performance. No waterfall queries.

4. **First in arcade** — Menu Muse is the first card in the games hub because it's the most directly useful tool for a working chef.

5. **Event context is optional** — Works standalone for general browsing, or with `?eventId` for targeted client context.

6. **Shuffle, don't generate** — "Forgotten Gems" and produce items shuffle randomly from the chef's existing data. This feels fresh without any AI.
