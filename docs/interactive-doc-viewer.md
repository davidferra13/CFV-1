# Interactive Document Viewer

## What Was Built

Every PDF in ChefFlow now has a second access mode: an **interactive digital view** that the chef can work through on their phone or laptop during prep, shopping, and service.

Instead of opening a static PDF, the chef taps each item to cycle it through three states:

| State | Icon | Background | Text |
|---|---|---|---|
| 0 — Untouched | Empty square | White / stone border | Normal |
| 1 — Working on | → (amber arrow) | Amber-50 / amber border | Normal |
| 2 — Done | ✓ (green check) | Green-50 / green border | Strikethrough |

Tapping again cycles back to untouched. State is stored in `localStorage` — no server roundtrip per tap, works offline.

---

## Documents Covered

| Type | Label | Checkable items? |
|---|---|---|
| `summary` | Event Summary | No — reference only |
| `grocery` | Grocery List | Yes — by store aisle + stop |
| `foh` | Front-of-House Menu | No — reference only |
| `prep` | Prep Sheet | Yes — AT HOME Now / After Shopping / Before Leaving / On Site |
| `execution` | Execution Sheet | No — reference only |
| `checklist` | Non-Negotiables Checklist | Yes — Always / This Event / Learned |
| `reset` | Post-Service Reset Checklist | Yes — sections A–F |
| `shots` | Content Shot List | Yes — capture tasks by phase |
| `travel` | Travel Route | Partial — sourcing items checkable, legs informational |

**Packing list** (`packing`) is intentionally excluded. It has its own specialized page at `/events/[id]/pack` with a server-side `car_packed` flag and a "Mark Car Packed" confirmation action. No duplicate interactive page needed.

---

## Route

```
/events/[id]/interactive?type=grocery
/events/[id]/interactive?type=prep
/events/[id]/interactive?type=reset
... etc.
```

All 9 types share a single route. The server reads `searchParams.type`, calls the appropriate `fetch*Data()` function, and converts the result to a normalized `InteractiveDocSpec`.

---

## Files

| File | Purpose |
|---|---|
| `lib/documents/interactive-specs.ts` | Core types + 9 converter functions |
| `app/(chef)/events/[id]/interactive/page.tsx` | Server page: auth + fetch + convert + scaffold |
| `components/events/interactive-doc-client.tsx` | Client: 3-state items, localStorage, progress bar |
| `components/documents/document-section.tsx` | Modified: "Interactive" button added per doc |

---

## Architecture

### Data Flow

```
Server (page.tsx)
  requireChef()
  resolveSpec(eventId, type)
    → fetch*Data()           ← existing fetchers, zero new DB queries
    → *ToSpec(data)          ← converter in interactive-specs.ts
  → <InteractiveDocClient spec={spec} />

Client (interactive-doc-client.tsx)
  useState(() => buildInitialState(spec))   ← pre-sourced items start as ✓
  useEffect → merge localStorage            ← user's saved taps win
  toggle(id) → (state + 1) % 3             ← cycle 0 → 1 → 2 → 0
  localStorage.setItem per tap             ← instant, no network
```

### localStorage Schema

```
Key:   doc-${eventId}-${docType}
Value: Record<itemId, 0 | 1 | 2>
```

Item IDs are stable across renders (section-prefix + index). Example: `prep-now-1-0`, `grocery-s1-proteins-2`, `reset-e-0`.

### `InteractiveDocSpec` Type

```typescript
type ItemState = 0 | 1 | 2

type InteractiveItem = {
  id: string
  label: string
  sublabel?: string
  checkable: boolean      // false = informational text only, no tap target
  initialState?: ItemState  // pre-crossed items (pre-sourced groceries, paid payment item)
}

type InteractiveSection = {
  id: string
  title: string
  subtitle?: string
  warning?: string
  items: InteractiveItem[]
}

type InteractiveDocSpec = {
  title: string
  subtitle?: string
  headerPills: { label: string; value: string }[]
  alerts: string[]        // red safety/allergy banners
  sections: InteractiveSection[]
}
```

---

## Per-Document Behavior

### Grocery List
- Stop 1 (grocery store) — one section per aisle (Proteins, Produce, Dairy/Fats, Pantry, Specialty)
- Stop 2 (liquor store) — one section
- Pre-sourced items — all items arrive with `initialState: 2` (already crossed out)
- Unreciped components — `checkable: false` (informational "verify manually")

### Prep Sheet
- **AT HOME — Prep Now**: make-ahead components where all required recipe ingredients are staples
- **AT HOME — Prep After Shopping**: make-ahead components needing non-staple ingredients
- **Before Leaving**: 3 fixed items (pack components, non-negotiables check, depart by [time])
- **On Site**: non-make-ahead components, grouped by course

### Non-Negotiables Checklist
- **Always**: permanent checklist items
- **This Event**: event-specific items
- **Learned**: forgotten items from AARs — sublabel shows `forgotten Nx`

### Post-Service Reset Checklist
- Sections A–F matching the printed sheet exactly
- Payment item in Section E: `initialState: 2` if payment is already recorded
- Red alert banner: "Complete tonight or by noon tomorrow"

### Content Shot List
- Pre-Event (4), Active Cooking (5), Plating (5), Service & Wrap (4) — all checkable
- Brand Consistency (4) — checkable (habits, tracked across every event)
- Platform Specs (4) — `checkable: false` (reference info)
- Solo Setup (2) — `checkable: false` (reference info)

### Travel Route
- One section per travel leg
- Departure, stops, arrival items: `checkable: false`
- Specialty sourcing leg ingredients: checkable with `initialState: sourced ? 2 : 0`

### Event Summary / Execution Sheet / FOH Menu
- All items `checkable: false`
- Clean HTML reference view of the same data that powers the PDF
- Allergy/dietary alerts shown as red banners above sections

---

## DocumentSection Changes

Three areas of `components/documents/document-section.tsx` were modified:

1. **8-sheet docs loop** — added "Interactive" button between "Pack Now" and "View PDF":
   - Skip for `packing` (it has "Pack Now" instead)
   - Renders as enabled `<a>` when `doc.ready`, disabled `<Button>` when not

2. **Travel Route card** — added "Interactive" button (enabled when `travelRouteReady`)

3. **Content Shot List card** — added "Interactive" button (always enabled — static content)

---

## No Migration Required

All document data comes from existing `fetch*Data()` functions. Interactive state is localStorage-only. No new database tables, columns, or server actions were added.
