# Packing List System

**Branch:** `feature/packing-list-system`
**Date:** 2026-03-01

---

## What Was Built

The Packing List system is the bridge between the Prep Sheet (what was cooked at home) and the Non-Negotiables Checklist (personal/operational items). It answers: "What prepped food goes in what container, and can I verify I got everything by course?"

Two surfaces were built:
1. **PDF Generator** — a printable packing list (`?type=packing`)
2. **Interactive UI** — an in-app check-off page at `/events/[id]/pack`

---

## The Document System (Updated)

The system now generates **6 printed sheets** per event:

| # | Document | Purpose |
|---|---|---|
| 1 | Grocery List | Ingredients by store section — shopping |
| 2 | Front-of-House Menu | Client-facing table menu |
| 3 | Prep Sheet | At-home tasks + on-site execution |
| 4 | Execution Sheet | Clean execution guide + dietary warnings |
| 5 | Non-Negotiables Checklist | Personal + operational items — door check |
| 6 | **Packing List** | Food by transport zone + equipment + counts |

---

## Database Change

**Migration:** `supabase/migrations/20260301000001_packing_list_transport_categories.sql`

Added `transport_category` column to `components`:

```sql
ALTER TABLE components
  ADD COLUMN IF NOT EXISTS transport_category TEXT
  CHECK (transport_category IN ('cold', 'frozen', 'room_temp', 'fragile', 'liquid'))
  DEFAULT 'room_temp';
```

**Transport zones:**
- `cold` — cooler, perishable (proteins, dairy, sauces)
- `frozen` — cooler, pack last, on top of ice packs
- `room_temp` — dry goods bag, no refrigeration
- `fragile` — own padded container, nothing stacked on top
- `liquid` — cooler, lidded, upright (treated same as cold in the cooler section)

This column is only meaningful for components where `is_make_ahead = true`. The default of `room_temp` is the safest assumption for unmigrated data.

**How to assign:** Chefs set `transport_category` when building menu components. Existing components default to `room_temp` until manually updated.

---

## Files Created / Modified

### New Files

| File | Purpose |
|---|---|
| `supabase/migrations/20260301000001_packing_list_transport_categories.sql` | DB migration |
| `lib/packing/actions.ts` | Server actions: `markCarPacked`, `resetPackingStatus`, `getPackingStatus` |
| `lib/documents/generate-packing-list.ts` | PDF generator (same pattern as other document generators) |
| `app/(chef)/events/[id]/pack/page.tsx` | Interactive packing page (server component) |
| `components/events/packing-list-client.tsx` | Interactive check-off UI (client component) |

### Modified Files

| File | Change |
|---|---|
| `app/api/documents/[eventId]/route.ts` | Added `packing` case + Page 6 in `all` mode |
| `lib/documents/actions.ts` | Added `packingList` to `DocumentReadiness` type and return |
| `components/documents/document-section.tsx` | Added Packing List row with "Pack Now" + "View PDF" buttons |

---

## PDF Generator — How It Works

`lib/documents/generate-packing-list.ts` follows the established 3-function pattern:

```
fetchPackingListData(eventId) → PackingListData
renderPackingList(pdf, data)  → void (writes to PDFLayout)
generatePackingList(eventId)  → Buffer
```

**Data fetched:**
- Event: dates, times, location, access instructions, service style
- Client: name, `equipment_must_bring[]`, `kitchen_notes`, `house_rules`, `visit_count`
- Components: only `is_make_ahead = true`, sorted into 4 transport zones

**PDF sections:**
1. Header (event, client, depart time, location, access)
2. First-time location warning (if `visit_count === 0`)
3. COOLER — COLD ITEMS (cold + liquid zones)
4. COOLER — FROZEN, pack last (frozen zone)
5. DRY BAG — ROOM TEMP (room_temp zone)
6. FRAGILE — own container (fragile zone)
7. EQUIPMENT (standard kit + client overrides + event triggers)
8. COMPONENT VERIFICATION (counts per course)
9. Site notes (kitchen notes + house rules)
10. Footer (depart time + location + access)

Empty sections are omitted. If no `transport_category` has been assigned yet, all components fall into `room_temp` (the default), so everything still appears — nothing is silently dropped.

---

## Interactive UI — How It Works

**Page:** `/events/[id]/pack`

**Architecture:**
- Server component (`pack/page.tsx`) fetches `PackingListData` and `PackingStatus` in parallel
- Client component (`packing-list-client.tsx`) handles all check-off interaction

**Why localStorage (not server state) for checkbox tracking:**

Packing happens at home, often in the last 15–30 minutes before departure. This means:
- Time pressure is real — network latency is unacceptable per checkbox
- The chef is the only user — no collaboration needed
- If the session is lost, the data is easily re-entered (visual check)
- The only server write that matters is the final "Car Packed" confirmation

State is stored in localStorage under key `packing-{eventId}`. The client component hydrates from localStorage on mount.

**Check-off flow:**
1. Chef opens `/events/[id]/pack` on their phone
2. Items appear in sections (cooler cold, cooler frozen, dry, fragile, equipment)
3. Tap any item to check it off — immediately persisted to localStorage
4. Progress bar shows overall completion
5. When all items checked: "Mark Car Packed" button activates
6. Button calls `markCarPacked(eventId)` → sets `car_packed = true` + `car_packed_at = now()` on the event
7. "Reset checklist" clears localStorage + optionally resets server state

---

## Equipment Logic

Equipment on the packing list comes from three sources, in priority order:

1. **Standard kit** (defined in `PACKING_STANDARD_KIT`, included in `PackingListData.standardKitItems` — single source of truth, passed to both the PDF renderer and the interactive UI): Knife roll, cutting board, apron, towels, trash bags, sheet pans, mixing bowls
2. **Client overrides** (`clients.equipment_must_bring[]`): Chef-marked items specific to this client
3. **Event triggers** (from `service_style` + `special_requests`):
   - `sous_vide` in special_requests → Sous vide circulator, Vacuum seal bags
   - `grill`/`bbq` in special_requests → Long tongs, Grill brush, Meat thermometer
   - `service_style = buffet` → Chafing dishes, Sterno fuel cans
   - `service_style = cocktail` → Cocktail shaker, Jigger, Bar spoon
   - Any frozen component exists → Ice cream machine

This mirrors the trigger map in `lib/checklist/actions.ts` for the Non-Negotiables Checklist. The two lists serve different purposes: the checklist covers personal/operational items, the packing list covers equipment and food.

---

## Connection to the Non-Negotiables Checklist

These two documents are **distinct** and designed to be checked separately:

| Packing List | Non-Negotiables Checklist |
|---|---|
| Food prepped at home (from prep list) | Gloves, gum, uniform, shoes |
| Equipment kit | Salt, oil, pepper, butter |
| Component verification counts | Learned items from AARs |
| Site-specific equipment | Access instructions |
| Checked during packing | Checked at the door (last step) |

The Prep Sheet (Printed Sheet #1) has a "BEFORE LEAVING" section that prompts both checks in sequence: "Pack all components" and "Non-negotiables check."

---

## Verification

1. **PDF**: `GET /api/documents/[eventId]?type=packing` — verify sections appear, transport zones sort correctly, equipment section populates
2. **All-in-one PDF**: `GET /api/documents/[eventId]?type=all` — verify 6-page combined PDF, packing list is page 6
3. **Interactive UI**: `/events/[id]/pack` — check items, verify localStorage persists on refresh, verify "Mark Car Packed" only activates when all items checked, verify server action writes `car_packed = true`
4. **Document section**: Event detail page → Documents card → Packing List row shows "Pack Now" + "View PDF" buttons
5. **Migration**: Apply `20260301000001`, verify `transport_category` column exists with `room_temp` default

---

## Future Improvements

- **First-time location warning**: `clients.visit_count` doesn't exist in the current schema. Once a visit count is tracked (or derived from event history), the first-time location warning can be re-added to both the PDF and the interactive UI.
- **Per-location site profiles**: Separate `client_locations` table for clients with multiple cooking locations
- **Prep completion gating**: Only show packing list as ready after all AT HOME prep tasks are checked off
- **Compounding reset alerts**: Warn when multiple events have incomplete post-service resets
- **Type regeneration**: Run `npx supabase gen types typescript --local > types/database.ts` (or `--linked`) once local/remote schemas are confirmed current. This will allow removing the `.returns<RawComp[]>()` workaround in `lib/documents/generate-packing-list.ts` (lines 145–159) and the `as any` cast in `getAllComponents()`.

## Done

- **Transport category assignment in UI**: ✅ Implemented in `components/culinary/MenuEditor.tsx` — the "Transport zone" dropdown appears under the "Make ahead" checkbox in the component form. The `getAllComponents()` function now returns `transport_category` and the `/culinary/components` overview page shows a "Transport Zone" column for make-ahead items.
