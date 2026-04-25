# Spec: Chef Gear Check (Pre-Event Personal Readiness)

> Builder prompt. This is a complete specification. Read CLAUDE.md first, then build exactly what's described here.

## What This Is

A pre-event personal readiness checklist for the chef. Not food, not kitchen equipment. This is: "Are YOU ready to walk in the door looking and feeling professional?"

The existing pack page (`/events/[id]/pack`) handles food transport and cooking equipment ("is the car ready"). The pre-service checklist handles on-site safety/prep. **Nothing currently checks the chef themselves.** This feature fills that gap.

## Inspiration

Culinary school lineup inspections. Every morning, the instructor walks down the line checking each student: jacket clean? Hat on? Shoes polished? Watch? Notebook? Private chefs need this even more because there's no institution enforcing it. Show up without your chef jacket or without gloves, and you look unprofessional or violate health codes.

---

## The Gear List (Default Items)

These are the default items every chef gets on first use. Chef can add, remove, and reorder later.

### Uniform

- Chef jacket
- Chef pants
- Apron
- Hat / skull cap
- Cravat / neckerchief
- Non-slip shoes

### On-Person Tools

- Watch
- Instant-read thermometer
- Tasting spoons
- Sharpie / marker
- Lighter / torch
- Knife roll

### Carry Bag

- Notebook + pen
- Business cards
- Phone charger
- Extra apron

### Grooming Kit

- Lint roller
- Stain remover pen
- Hair ties / bobby pins
- Travel deodorant

### Safety / Compliance

- Disposable gloves (box)
- Hand sanitizer
- First aid kit (bandages, burn cream)
- Cut gloves

---

## Database

### Migration

Next migration timestamp must be strictly higher than `20260422002000`. Use `20260423000001`.

**File: `database/migrations/20260423000001_chef_gear_defaults.sql`**

```sql
-- Chef Gear Defaults: per-chef personal readiness template
-- NOT kitchen equipment. This is uniform, personal tools, grooming, safety items.

CREATE TABLE IF NOT EXISTS chef_gear_defaults (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('uniform', 'tools', 'carry', 'grooming', 'safety')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(chef_id, item_name)
);

CREATE INDEX idx_chef_gear_defaults_chef ON chef_gear_defaults(chef_id);

-- Gear check status on events (mirrors car_packed / car_packed_at pattern)
ALTER TABLE events ADD COLUMN IF NOT EXISTS gear_checked BOOLEAN DEFAULT false;
ALTER TABLE events ADD COLUMN IF NOT EXISTS gear_checked_at TIMESTAMPTZ;
```

**Per-event check-off state:** Reuse the existing `packing_confirmations` table. Item keys prefixed with `gear:` (e.g., `gear:chef-jacket`, `gear:lint-roller`). The table already has `event_id`, `tenant_id`, `item_key`, `confirmed_at` with a unique constraint on `(event_id, item_key)`. No new table needed for check-off state.

---

## Server Actions

**File: `lib/gear/actions.ts`** (`'use server'`)

Functions to build:

1. `getGearDefaults(chefId: string)` - Fetch chef's gear template, ordered by category then sort_order. If zero rows exist, call `seedGearDefaults` first (auto-seed on first access).

2. `seedGearDefaults(chefId: string)` - Insert the default gear list (from `lib/gear/defaults.ts`) into `chef_gear_defaults`. Only if chef has zero rows. Uses a single bulk insert.

3. `addGearDefault(chefId: string, item: { item_name: string, category: string, notes?: string })` - Add a custom item. Assign sort_order = max existing + 1 within category.

4. `removeGearDefault(id: string)` - Soft-remove: set `is_active = false`. Don't delete (chef might want it back).

5. `reactivateGearDefault(id: string)` - Set `is_active = true`.

6. `getEventGearStatus(eventId: string)` - Returns `{ gearChecked: boolean, gearCheckedAt: string | null, confirmedCount: number }`. Query events for `gear_checked`/`gear_checked_at`, query `packing_confirmations` count where `item_key LIKE 'gear:%'`.

7. `markGearChecked(eventId: string)` - Set `gear_checked = true`, `gear_checked_at = now()`. Revalidate event path. Auth-gated, tenant-scoped.

8. `resetGearCheck(eventId: string)` - Set `gear_checked = false`, `gear_checked_at = null`. Delete all `packing_confirmations` where `item_key LIKE 'gear:%'` for this event. Revalidate.

**Per-item toggles:** Reuse the existing `togglePackingConfirmation` from `lib/packing/actions.ts`. Pass item keys like `gear:chef-jacket`. No new function needed.

**Pattern to follow:** Read `lib/packing/actions.ts` for the exact pattern (auth gate, tenant scoping, compat layer usage, revalidation). Mirror it exactly.

---

## Default Items Constant

**File: `lib/gear/defaults.ts`** (NOT a `'use server'` file)

```ts
export type GearCategory = 'uniform' | 'tools' | 'carry' | 'grooming' | 'safety'

export type DefaultGearItem = {
  item_name: string
  category: GearCategory
}

export const DEFAULT_GEAR_ITEMS: DefaultGearItem[] = [
  // Uniform
  { item_name: 'Chef jacket', category: 'uniform' },
  { item_name: 'Chef pants', category: 'uniform' },
  { item_name: 'Apron', category: 'uniform' },
  { item_name: 'Hat / skull cap', category: 'uniform' },
  { item_name: 'Cravat / neckerchief', category: 'uniform' },
  { item_name: 'Non-slip shoes', category: 'uniform' },
  // On-Person Tools
  { item_name: 'Watch', category: 'tools' },
  { item_name: 'Instant-read thermometer', category: 'tools' },
  { item_name: 'Tasting spoons', category: 'tools' },
  { item_name: 'Sharpie / marker', category: 'tools' },
  { item_name: 'Lighter / torch', category: 'tools' },
  { item_name: 'Knife roll', category: 'tools' },
  // Carry Bag
  { item_name: 'Notebook + pen', category: 'carry' },
  { item_name: 'Business cards', category: 'carry' },
  { item_name: 'Phone charger', category: 'carry' },
  { item_name: 'Extra apron', category: 'carry' },
  // Grooming Kit
  { item_name: 'Lint roller', category: 'grooming' },
  { item_name: 'Stain remover pen', category: 'grooming' },
  { item_name: 'Hair ties / bobby pins', category: 'grooming' },
  { item_name: 'Travel deodorant', category: 'grooming' },
  // Safety / Compliance
  { item_name: 'Disposable gloves (box)', category: 'safety' },
  { item_name: 'Hand sanitizer', category: 'safety' },
  { item_name: 'First aid kit', category: 'safety' },
  { item_name: 'Cut gloves', category: 'safety' },
]

export const GEAR_CATEGORY_LABELS: Record<GearCategory, string> = {
  uniform: 'Uniform',
  tools: 'On-Person Tools',
  carry: 'Carry Bag',
  grooming: 'Grooming Kit',
  safety: 'Safety / Compliance',
}

export const GEAR_CATEGORY_ORDER: GearCategory[] = [
  'uniform',
  'tools',
  'carry',
  'grooming',
  'safety',
]
```

---

## UI

### New Route: `app/(chef)/events/[id]/gear/page.tsx`

Server component. Fetches:

1. Event basic info (id, status, event_date, occasion, client name) for header
2. `getGearDefaults(chefId)` for the item list
3. Existing `packing_confirmations` where `item_key LIKE 'gear:%'` for pre-checked state
4. `gear_checked` / `gear_checked_at` from events table

Passes everything to client component.

### New Component: `components/events/gear-check-client.tsx`

**Follow the exact same architecture as `components/events/packing-list-client.tsx`:**

- localStorage is primary state (`gear-{eventId}` key)
- Each checkbox toggle calls `togglePackingConfirmation(eventId, 'gear:' + slugify(itemName), checked)` in fire-and-forget mode
- Items grouped by category (uniform, tools, carry, grooming, safety) with section headers
- Touch-friendly checkboxes (7x7 rounded, same as pack page)
- Progress bar: "14/22 items confirmed"
- Checked items get `line-through` text decoration
- "Mark Gear Ready" button at bottom (disabled until all active items checked)
- Calls `markGearChecked(eventId)` on confirm
- Reset button clears localStorage + calls `resetGearCheck(eventId)`
- If already checked: show green "Gear Ready" state with reset option

**Additional feature the pack page doesn't have:**

- Small "+ Add item" button per category section, letting chef add custom items inline. Calls `addGearDefault`. The new item immediately appears in the checklist.

### Event Detail Integration: `app/(chef)/events/[id]/page.tsx`

Add a "Gear Check" card on the Overview tab, positioned BEFORE the existing "Packing Progress" card (lines 821-853). Same card pattern:

```tsx
{
  /* Gear Check - for confirmed/in_progress events */
}
{
  ;['confirmed', 'in_progress'].includes(event.status) && (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <h3 className="text-sm font-semibold text-stone-300">Gear Check</h3>
            <Link
              href={`/events/${event.id}/gear`}
              className="text-xs text-brand-500 hover:text-brand-400"
            >
              Open gear check &rarr;
            </Link>
          </div>
          {/* Status text based on gear_checked and gearConfirmedCount */}
        </div>
        {/* Green badge when gear_checked = true */}
      </div>
    </Card>
  )
}
```

This requires fetching `gear_checked` and gear confirmation count in the page's data fetch. Add `getEventGearStatus(eventId)` to the existing `Promise.all` on the event detail page.

---

## What NOT to Build

- No notification/reminder system (night-before alerts are a separate, future feature)
- No photo verification
- No connection to equipment inventory tables (gear != kitchen equipment)
- No new tab on event detail mobile nav (the card on overview with link to `/gear` route is enough)
- No drag-and-drop reordering (sort_order exists for future use, but add items append to end for now)
- No PDF generation

---

## Verification

After building:

1. `npx tsc --noEmit --skipLibCheck` must pass
2. `npx next build --no-lint` must pass
3. Navigate to any event in confirmed status, verify the Gear Check card appears on overview
4. Click through to `/events/[id]/gear`, verify all 22 default items render in 5 categories
5. Check items off, verify localStorage persistence (refresh page, items still checked)
6. Check all items, verify "Mark Gear Ready" enables
7. Mark gear ready, go back to event overview, verify green badge
8. Reset, verify everything clears

---

## Files to Create

| File                                                        | Purpose                                         |
| ----------------------------------------------------------- | ----------------------------------------------- |
| `database/migrations/20260423000001_chef_gear_defaults.sql` | Table + event columns                           |
| `lib/gear/defaults.ts`                                      | Default items constant + types                  |
| `lib/gear/actions.ts`                                       | Server actions (seed, CRUD, status, mark/reset) |
| `app/(chef)/events/[id]/gear/page.tsx`                      | Server component for gear check route           |
| `components/events/gear-check-client.tsx`                   | Client component (localStorage + sync)          |

## Files to Modify

| File                              | Change                                                  |
| --------------------------------- | ------------------------------------------------------- |
| `app/(chef)/events/[id]/page.tsx` | Add Gear Check card before Packing card, add data fetch |
