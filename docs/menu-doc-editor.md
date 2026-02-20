# Menu Doc Editor

## What This Is

A Google Doc-style menu editor for chefs. Instead of the existing form-based `MenuEditor.tsx` (which is powerful but feels like filling out a database), this editor looks and feels like writing an actual menu document — clean white page, inline editing, no save button.

The editor lives at `/menus/[id]/editor` and is the primary way chefs will build and refine menus.

---

## Layout

Two-column layout: document on the left, sticky context sidebar on the right.

```
┌─────────────────────────────────┬──────────────────┐
│ ← Back   [Menu name]  Saved ✓  │ [Status] [Simple] │
├─────────────────────────────────┴──────────────────┤
│                                                     │
│  ┌───────────────────────────────┐  ┌────────────┐ │
│  │  Menu Title                   │  │ EVENT      │ │
│  │  Italian · Plated · 8 guests  │  │ Mar 15     │ │
│  │  ───────────────────────────  │  │ 8 guests   │ │
│  │                               │  ├────────────┤ │
│  │  STARTER                      │  │ CLIENT     │ │
│  │  ─────────────────────────    │  │ Sarah Chen │ │
│  │  Autumn Beet Salad            │  │ ⚠ GF       │ │
│  │  goat cheese, walnuts…        │  ├────────────┤ │
│  │  GF  V   + tag                │  │ SEASON     │ │
│  │  [chef notes amber box]       │  │ 🌿 Spring  │ │
│  │                               │  ├────────────┤ │
│  │  MAIN                         │  │ PRICING    │ │
│  │  ─────────────────────────    │  │ $195/person│ │
│  │  Grass-fed Filet Mignon       │  ├────────────┤ │
│  │  truffle jus, pommes purée…   │  │ PREVIOUS   │ │
│  │                               │  │ Nov menus  │ │
│  │  + Add Course                 │  └────────────┘ │
│  └───────────────────────────────┘                  │
└─────────────────────────────────────────────────────┘
```

---

## Files Changed

| File | What |
|---|---|
| `supabase/migrations/20260305000008_menu_doc_editor_fields.sql` | Adds `dishes.name`, `menus.price_per_person_cents`, `menus.simple_mode`, `menus.simple_mode_content` |
| `lib/menus/editor-actions.ts` | Server actions: `getEditorContext`, `updateMenuMeta`, `updateDishEditorContent`, `addEditorCourse`, `deleteEditorCourse`, `reorderEditorCourse` |
| `lib/menus/actions.ts` | Added `name` field to `CreateDishSchema` and `UpdateDishSchema`; passes `name` in the Supabase insert |
| `app/(chef)/menus/[id]/editor/page.tsx` | Route — server component that loads editor context and renders `<MenuDocEditor>` |
| `components/menus/menu-doc-editor.tsx` | Full editor component with all improvements (see v2 changelog below) |
| `app/(chef)/menus/[id]/menu-detail-client.tsx` | Added "Open Editor" primary button |
| `app/(chef)/events/[id]/page.tsx` | `getEventMenusForCheck` now returns menu ID string (not just boolean); "Edit Menu" button added to Menu Approval card |

---

## New Database Columns

### `dishes.name TEXT`
The actual dish title within the course. Separate from `course_name` (which is the section heading like "STARTER"). Example: `course_name = "FIRST COURSE"`, `name = "Autumn Beet Salad"`.

### `menus.price_per_person_cents INTEGER`
Per-person pricing for this menu, in cents. Stored on the menu itself (not derived from the quote). Useful for template menus and for cross-checking event quotes.

### `menus.simple_mode BOOLEAN DEFAULT false`
When true, the structured course editor is hidden and replaced by a single freeform textarea. The chef's structured courses are preserved and accessible when toggled back.

### `menus.simple_mode_content TEXT`
The freeform text content when simple mode is active.

---

## Key UX Decisions

### Auto-save
Every field change schedules a debounced save (1.5s delay). Separate timers per field so typing in the dish name doesn't conflict with saving the description. Status shown in the top bar: `All changes saved` / `Unsaved…` / `Saving…` / `Save failed`.

### Inline editing
All text fields are transparent textareas or inputs that look like static text when not focused. No separate "edit mode" needed. Clicking anywhere in a field activates it.

### Course label suggestions
Suggestions dropdown appears only when the course label field is **empty** on focus. Once the chef starts typing, the dropdown is hidden. The 12 predefined options (Amuse-Bouche, Canapés, First Course, etc.) can be selected with a click or typed over with any custom name.

### Course reordering

Each course block shows ↑ / ↓ / × controls on hover (positioned to the right of the block). Up/down buttons swap `sort_order` values in the database via `reorderEditorCourse`. The UI optimistically reorders immediately; the server action fires in the background. First course disables ↑; last course disables ↓.

### Dietary tags (green — Accommodates)

Chips below each dish. `+ tag` opens a picker labelled "Accommodates" with: GF, DF, V, VG, NF, SF, EF, KO, HA. Active tags have green pill styling; hover shows red (visual cue it can be removed by clicking).

### Allergen flags (orange — Contains)

Second tag row below dietary tags. `+ allergen` opens a picker labelled "Contains" with: Shellfish (SH), Dairy (DA), Eggs (EG), Tree Nuts (TN), Peanuts (PN), Soy (SY), Fish (FI), Gluten (GL), Sesame (SE). Active flags show as `⚠ SH` in orange pills. Stored in the existing `allergen_flags` column on `dishes`.

### Chef notes (amber box)

Per-course internal notes with a small "Internal notes" label above the amber-tinted textarea. Not shown to clients. Meant for allergens to watch, timing notes, technique reminders.

### Simple Mode / Freeform text

Top bar button shows **"Freeform text"** when structured mode is active; **"Exit freeform"** when in freeform mode. The info banner inside the editor reads "Freeform text mode". The chef's structured courses are preserved in the database and reappear when toggled back.

### Context sidebar (right panel)

Sticky at `top-16` (below the top bar). Shows:

- **Event**: date, time, guest count, venue + a "View →" link to the event page
- **Send for approval**: button below event details that calls `sendMenuForApproval(eventId)` directly from the sidebar. Shows success/error inline without leaving the editor.
- **Client**: name + dietary restrictions/allergies (amber warning box if present)
- **Season**: detected from event date with Northern Hemisphere seasonal ingredients
- **Pricing**: editable `$XX / person` field (auto-saves)
- **Previous menus**: up to 3 prior menus for this client, linking to their editors

### Event → Editor navigation

On the event detail page, the Menu Approval card now has an **"Edit Menu"** button (top-right) that links directly to `/menus/[menuId]/editor`. `getEventMenusForCheck()` was changed to return the menu ID string (or `false`) instead of a plain boolean. All existing boolean checks (`if (eventMenus)`) continue to work unchanged since a non-empty string is truthy.

### Locked menus
When `status === 'locked'`, all inputs render as static text. No editing possible. The top bar shows an amber "Locked" badge. This matches the existing FSM constraint.

---

## How It Connects

The editor is a separate route from the existing detail page (`/menus/[id]`). The detail page gains an "Open Editor" primary button. Both routes show the same menu data; the editor just provides a much richer authoring experience.

The editor uses its own slim server actions (`editor-actions.ts`) rather than going through the full `actions.ts` stack, because:
1. It needs to load additional context (event, client, previous menus) in one shot
2. The auto-save mutations are simpler — no status machine logic, no activity logging overhead
3. The `name` column on dishes is new and not yet in the generated types

---

## Migration Apply

```bash
supabase db push --linked
```

Run after deploying — no data is at risk. All new columns are nullable or have safe defaults.
