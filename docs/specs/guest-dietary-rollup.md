# Guest Dietary Rollup Panel

## Status: READY TO BUILD

## Problem

Guest RSVP data captures dietary restrictions, allergies, and severity per guest (including plus-ones). This data is stored in two places:

1. `event_guests` table: `dietary_restrictions text[]`, `allergies text[]`, `dietary_notes text`, `plus_one_dietary text[]`, `plus_one_allergies text[]`
2. `event_guest_dietary_items` table: structured per-item records with `subject`, `item_type`, `label`, `severity`, `notes`
3. `event_rsvp_summary` database view: pre-aggregated `all_dietary_restrictions` and `all_allergies` arrays (distinct values from attending/maybe guests)

The `ClientRSVPSummary` component at `components/sharing/client-rsvp-summary.tsx` receives dietary data in its `Guest` interface but **never renders it**. The client host cannot see an aggregated dietary picture for their event.

## What to Build

Add a "Table Dietary Needs" section to the `ClientRSVPSummary` component that surfaces dietary data already available in the component's props.

## Exact Changes Required

### File: `components/sharing/client-rsvp-summary.tsx`

This is the ONLY file to modify. Do NOT create new files. Do NOT modify any server actions. All data is already passed to this component.

#### Step 1: Extract dietary data from existing `guests` prop

After the `effectiveAttending` calculation (currently line 45), add a function that aggregates dietary info from the `guests` array:

```typescript
// Aggregate dietary needs from all attending/maybe guests
const dietaryMap = new Map<string, string[]>()
const allergyMap = new Map<string, string[]>()

for (const guest of guests) {
  const isRelevant = guest.rsvp_status === 'attending' || guest.rsvp_status === 'maybe'
  if (!isRelevant) continue

  if (guest.dietary_restrictions) {
    for (const restriction of guest.dietary_restrictions) {
      if (!restriction || restriction.trim() === '') continue
      const key = restriction.trim().toLowerCase()
      if (!dietaryMap.has(key)) dietaryMap.set(key, [])
      dietaryMap.get(key)!.push(guest.full_name)
    }
  }

  if (guest.allergies) {
    for (const allergy of guest.allergies) {
      if (!allergy || allergy.trim() === '') continue
      const key = allergy.trim().toLowerCase()
      if (!allergyMap.has(key)) allergyMap.set(key, [])
      allergyMap.get(key)!.push(guest.full_name)
    }
  }
}

const hasDietaryData = dietaryMap.size > 0 || allergyMap.size > 0
```

#### Step 2: Add dietary summary section

After the "Effective count vs original estimate" section (currently ending around line 82) and BEFORE the "Guest List" section (currently starting around line 84), add:

```tsx
{
  /* Table Dietary Needs */
}
{
  hasDietaryData && (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-stone-300">Table Dietary Needs</h4>

      {allergyMap.size > 0 && (
        <div className="rounded-lg border border-red-900/50 bg-red-950/30 p-3 space-y-2">
          <p className="text-xs font-semibold text-red-400 uppercase tracking-wide">Allergies</p>
          <div className="flex flex-wrap gap-2">
            {Array.from(allergyMap.entries()).map(([allergy, names]) => (
              <div
                key={allergy}
                className="rounded-md bg-red-950/50 border border-red-900/30 px-2.5 py-1.5"
              >
                <span className="text-sm font-medium text-red-300 capitalize">{allergy}</span>
                <span className="text-xs text-red-400/70 ml-1.5">
                  ({names.length === 1 ? names[0] : `${names.length} guests`})
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {dietaryMap.size > 0 && (
        <div className="rounded-lg border border-amber-900/50 bg-amber-950/30 p-3 space-y-2">
          <p className="text-xs font-semibold text-amber-400 uppercase tracking-wide">
            Dietary Restrictions
          </p>
          <div className="flex flex-wrap gap-2">
            {Array.from(dietaryMap.entries()).map(([restriction, names]) => (
              <div
                key={restriction}
                className="rounded-md bg-amber-950/50 border border-amber-900/30 px-2.5 py-1.5"
              >
                <span className="text-sm font-medium text-amber-300 capitalize">{restriction}</span>
                <span className="text-xs text-amber-400/70 ml-1.5">
                  ({names.length === 1 ? names[0] : `${names.length} guests`})
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
```

## Visual Design

- Allergies: red-tinted card (border-red-900, bg-red-950) because allergies are safety-critical
- Dietary restrictions: amber-tinted card (border-amber-900, bg-amber-950) because restrictions are preferences/requirements
- Each item shows the restriction/allergy name + who has it (name if 1 guest, count if multiple)
- Uses existing Tailwind classes only (stone, red, amber color families already in use)
- Matches the dark theme of the existing component

## What NOT to Do

- Do NOT create new files or components
- Do NOT modify any server actions or database queries
- Do NOT add new imports (no new dependencies needed)
- Do NOT modify the Guest interface or RSVPSummary interface
- Do NOT touch the guest list section or the status grid section
- Do NOT add any `'use server'` directives
- Do NOT rename or reorganize existing code
- Do NOT use em dashes anywhere
- Do NOT add comments beyond what is shown above

## Testing

After building, verify:

1. Component still compiles: `npx tsc --noEmit --skipLibCheck`
2. The dietary section only appears when guests have dietary data
3. Empty dietary_restrictions arrays (containing only `""`) are filtered out
4. The existing RSVP status grid and guest list are unchanged

## File Map

| File                                         | Action             |
| -------------------------------------------- | ------------------ |
| `components/sharing/client-rsvp-summary.tsx` | MODIFY (only file) |

## Risk Assessment

- **Regression risk:** Zero. Additive-only change to a leaf component. No props change. No server-side changes.
- **Data risk:** Zero. Read-only. Uses data already in props.
- **Build risk:** Low. Pure TSX, no new imports, existing Tailwind classes.
