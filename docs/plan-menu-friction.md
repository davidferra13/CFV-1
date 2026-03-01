# Plan: Menu Friction Reduction — "What do you want to eat?" ↔ "What do you like to make?"

> Kill the back-and-forth. Give clients multiple paths to a menu. Give chefs instant access to their library. Make the whole flow feel effortless.

---

## The Problem (in the developer's words)

Dinners are usually custom. But the conversation always starts the same way:

- Client: "What do you like to make?"
- Chef: "What do you like to eat?"

Neither side has a starting point. The fix: **show the chef's past work as a showcase** so clients can browse, steal ideas, pick a base, or go fully custom — all before the chef lifts a finger.

Clients need **four paths** to a menu:

1. **Pick one** — browse showcase menus, select as-is
2. **Start from one** — pick a showcase menu as a base, customize it
3. **Build from scratch** — submit preferences (cuisine, dietary, loves/hates) and let the chef craft something
4. **Tell me exactly** — "I know what I want" free text

Chefs need:

- **One-click access** to their menu library from the event detail page
- **Client preferences visible** before they start building
- **Quick apply** — grab a template or past menu → attach to event → done

---

## Database Changes

### New table: `menu_preferences` (client's "brief" for the chef)

```sql
CREATE TABLE menu_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES auth.users(id),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,

  -- What they want
  cuisine_preferences TEXT[],        -- ['Italian', 'Mediterranean', 'Surprise me']
  service_style_pref TEXT,           -- 'plated', 'buffet', 'family_style', 'no_preference'
  foods_love TEXT,                   -- free text: "I love truffle, pasta, anything mushroom"
  foods_avoid TEXT,                  -- free text: "No olives, no blue cheese"
  special_requests TEXT,             -- free text: any other notes
  adventurousness TEXT DEFAULT 'balanced', -- 'classic', 'balanced', 'adventurous'

  -- Which path they chose
  selection_mode TEXT NOT NULL,      -- 'picked', 'customized', 'custom_request', 'exact_request'
  selected_menu_id UUID REFERENCES menus(id) ON DELETE SET NULL, -- if they picked/customized from a showcase
  customization_notes TEXT,          -- if they modified a showcase menu, what they want changed

  -- Meta
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  chef_viewed_at TIMESTAMPTZ,       -- when chef first saw it
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(event_id)                  -- one preference set per event
);
```

### New column on `menus`: `is_showcase`

```sql
ALTER TABLE menus ADD COLUMN is_showcase BOOLEAN NOT NULL DEFAULT false;
```

Showcase menus are the chef's "portfolio" — visible to their clients. Different from templates (internal reuse). A menu can be both template AND showcase.

### New column on `menus`: `times_used`

```sql
ALTER TABLE menus ADD COLUMN times_used INTEGER NOT NULL DEFAULT 0;
```

Track how many events used this menu (incremented by `applyMenuToEvent`). Helps chefs see their most popular menus.

### Migration file

One migration: `20260310000001_menu_preferences_and_showcase.sql`

- Creates `menu_preferences` table with RLS
- Adds `is_showcase` and `times_used` to `menus`
- RLS: clients can INSERT/SELECT their own preferences; chefs can SELECT preferences for their events
- RLS: clients can SELECT showcase menus for their chef (new policy)

---

## Server Actions

### `lib/menus/preference-actions.ts` (new file)

| Action                                 | Who         | What                           |
| -------------------------------------- | ----------- | ------------------------------ |
| `submitMenuPreferences(eventId, data)` | Client      | Save their menu brief          |
| `getMenuPreferences(eventId)`          | Chef/Client | Fetch preferences for an event |
| `markPreferencesViewed(eventId)`       | Chef        | Set `chef_viewed_at`           |

### `lib/menus/showcase-actions.ts` (new file)

| Action                               | Who    | What                                                   |
| ------------------------------------ | ------ | ------------------------------------------------------ |
| `toggleShowcase(menuId, isShowcase)` | Chef   | Mark/unmark menu as showcase                           |
| `getShowcaseMenus(chefId)`           | Client | Browse chef's showcase menus (public to their clients) |
| `getShowcaseMenuWithDishes(menuId)`  | Client | Full menu detail for preview                           |

### Modify `lib/menus/actions.ts`

| Change                            | What                                                                                                                       |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `applyMenuToEvent`                | Increment `times_used` on the source menu                                                                                  |
| `getMenuLibraryForEvent(eventId)` | New — returns templates + recent menus + showcase menus, with client preferences summary if available, sorted by relevance |

### Modify `lib/events/menu-approval-actions.ts`

| Change                | What                                                                                                            |
| --------------------- | --------------------------------------------------------------------------------------------------------------- |
| `sendMenuForApproval` | Include full dish details in snapshot (descriptions, dietary_tags, allergen_flags, chef_notes) — not just names |

---

## UI Components

### 1. Client: Menu Selection Page

**Route:** `app/(client)/my-events/[id]/choose-menu/page.tsx`

**What it shows:**

- Header: "Let's plan your menu" with the event name/date
- **Four path cards:**
  1. **"Browse [Chef]'s Menus"** → expands to showcase menu gallery (grid of cards with name, cuisine, dish count, description snippet)
  2. **"I have some ideas"** → preferences form (cuisine multi-select, loves/hates, dietary, service style, adventurousness slider)
  3. **"I know exactly what I want"** → free text box for specific dishes/instructions
  4. **"Surprise me!"** → one-click submit with just dietary restrictions

- If they pick a showcase menu: preview modal with full menu → "Use This Menu" or "Use as Starting Point" (adds customization notes field)
- Submit → saves to `menu_preferences` → chef gets notified → redirect back to event detail with "Preferences submitted" status

**New component:** `components/menus/showcase-menu-card.tsx` — card showing menu name, cuisine type, dish count, description preview. Reusable.

**New component:** `components/menus/showcase-menu-preview.tsx` — modal/drawer showing full menu with courses, dishes, descriptions, dietary badges.

**New component:** `components/menus/menu-preferences-form.tsx` — the preferences form (cuisine, loves/hates, dietary, service style, adventurousness).

### 2. Chef: Menu Library Picker (on Event Detail)

**Where:** New panel on event detail page (`app/(chef)/events/[id]/page.tsx`), shown when no menu is attached yet (or as an option to swap).

**New component:** `components/events/menu-library-picker.tsx`

**What it shows:**

- If client submitted preferences: **highlighted summary card** at top ("Sarah wants Italian/Mediterranean, loves truffle & mushroom, avoids olives. Adventurous.")
- Search/filter bar (by name, cuisine type)
- Tabs: "Templates" | "Showcase" | "Recent" | "All"
- Each menu: name, cuisine, service style, dish count, times used, last used date
- Click to expand → see dishes inline
- **"Use This Menu"** button → calls `applyMenuToEvent` → refreshes page
- **"Create New"** link → goes to menu editor

### 3. Client: Improved Menu Approval Page

**Modify:** `app/(client)/my-events/[id]/approve-menu/page.tsx` + `menu-approval-client.tsx`

**Current:** Plain text list of dish names + approve/revise buttons.

**Upgraded:**

- Course-grouped layout with cards per dish
- Each dish: name, description, dietary tags (badges), allergen warnings
- Per-course feedback: small "Note" icon per course → expands inline text field
- Approve button stays the same
- "Request Changes" → collects per-course notes + overall note → sends to chef
- Menu snapshot in `menu_approval_requests` already stores JSONB — enrich it with full dish data

### 4. Chef: Showcase Toggle

**Where:** Menu detail page (`app/(chef)/menus/[id]/menu-detail-client.tsx`)

**What:** Toggle switch labeled "Showcase — visible to clients" next to the existing Template badge. Simple on/off.

### 5. Client Event Detail: Menu Status

**Modify:** `app/(client)/my-events/[id]/page.tsx`

Add a "Menu" section that shows:

- If no preferences submitted and no menu attached: **"Choose Your Menu"** CTA → links to `/choose-menu`
- If preferences submitted but no menu yet: "Your preferences have been sent to [Chef]. They're working on your menu."
- If menu attached but not sent for approval: "Your chef is preparing a menu for you."
- If menu sent for approval: existing approval flow
- If menu approved: "Menu confirmed" with view link

---

## User Flows

### Flow A: Client browses and picks

1. Client opens event → sees "Choose Your Menu" card
2. Clicks → lands on menu selection page
3. Browses chef's showcase menus → clicks one → sees full preview
4. "Use This Menu" → preference saved with `selection_mode: 'picked'`, `selected_menu_id` set
5. Chef sees on event detail: "Sarah picked your 'Summer Mediterranean Feast' menu"
6. Chef clicks "Apply" → menu attached to event → sends for formal approval if needed

### Flow B: Client customizes from a showcase

1. Same as A, but client clicks "Use as Starting Point"
2. Adds customization notes: "Love everything but could we swap the olives for sun-dried tomatoes?"
3. Saved with `selection_mode: 'customized'`
4. Chef sees the base menu + customization requests → modifies and attaches

### Flow C: Client submits preferences

1. Client clicks "I have some ideas"
2. Fills preferences form: Italian + Mediterranean, loves truffle/pasta, avoids blue cheese, adventurous
3. Saved with `selection_mode: 'custom_request'`
4. Chef sees preferences summary → builds menu from scratch (or finds a matching template)

### Flow D: Client knows exactly what they want

1. Client clicks "I know exactly what I want"
2. Types: "Burrata salad, hand-made pappardelle with wild boar ragu, tiramisu"
3. Saved with `selection_mode: 'exact_request'`
4. Chef sees the exact request → builds menu to match

### Flow E: Chef grabs a menu proactively

1. Chef opens event detail → no client preferences yet
2. Opens Menu Library Picker → searches "Italian"
3. Previews a template → "Use This Menu"
4. Menu duplicated and attached → chef sends for approval
5. Client gets the rich approval page with full dish details

---

## Files to Create

| File                                                                   | Purpose                             |
| ---------------------------------------------------------------------- | ----------------------------------- |
| `supabase/migrations/20260310000001_menu_preferences_and_showcase.sql` | DB changes                          |
| `lib/menus/preference-actions.ts`                                      | Client preference CRUD              |
| `lib/menus/showcase-actions.ts`                                        | Showcase menu queries               |
| `app/(client)/my-events/[id]/choose-menu/page.tsx`                     | Client menu selection page          |
| `app/(client)/my-events/[id]/choose-menu/choose-menu-client.tsx`       | Client component                    |
| `components/menus/showcase-menu-card.tsx`                              | Reusable menu card                  |
| `components/menus/showcase-menu-preview.tsx`                           | Full menu preview modal             |
| `components/menus/menu-preferences-form.tsx`                           | Preferences form                    |
| `components/events/menu-library-picker.tsx`                            | Chef's quick picker on event detail |
| `components/events/client-menu-status.tsx`                             | Client-side menu status card        |

## Files to Modify

| File                                                                | Change                                                                            |
| ------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `lib/menus/actions.ts`                                              | Add `getMenuLibraryForEvent`, update `applyMenuToEvent` to increment `times_used` |
| `lib/events/menu-approval-actions.ts`                               | Enrich snapshot with full dish data                                               |
| `app/(chef)/events/[id]/page.tsx`                                   | Add Menu Library Picker panel + client preferences summary                        |
| `app/(chef)/menus/[id]/menu-detail-client.tsx`                      | Add showcase toggle                                                               |
| `app/(client)/my-events/[id]/page.tsx`                              | Add menu status section with CTA                                                  |
| `app/(client)/my-events/[id]/approve-menu/menu-approval-client.tsx` | Rich menu display with per-course feedback                                        |
| `docs/app-complete-audit.md`                                        | Document all new pages/components                                                 |

---

## Implementation Order

1. **Migration** — create table + columns (enables everything else)
2. **Server actions** — preference-actions.ts, showcase-actions.ts, modify actions.ts
3. **Showcase toggle** — quick win, lets chef mark menus as showcase
4. **Client menu selection page** — the "choose your menu" experience
5. **Chef menu library picker** — on event detail, with preferences display
6. **Improved approval page** — rich menu display + per-course feedback
7. **Client event detail menu status** — the CTA and status cards
8. **Follow-up doc** — document what changed

## What This Does NOT Include (out of scope)

- AI-powered menu suggestions based on preferences (future — uses Ollama)
- Client-to-client menu sharing ("my friend had a great dinner")
- Public menu gallery (non-authenticated visitors)
- Menu pricing/cost display to clients
