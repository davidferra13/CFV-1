# Codex Task: Handoff Context Enrichment from Dinner Circle

**Status:** ready-to-build
**Scope:** 1 server action edit, 1 UI component edit, 0 new files
**Risk:** LOW (enriches existing jsonb field, no schema changes)
**Dependencies:** None (uses existing known_allergies/known_dietary on hub_guest_profiles)

---

## Problem

When a chef creates a handoff (referring a client/event to another chef), the `chef_handoffs.client_context` jsonb field exists but is sparsely populated. If the event has a Dinner Circle with members who have dietary data, that context is not included. The receiving chef gets a handoff with minimal information and has to rebuild guest context from scratch.

## What to Build

Enrich `getHandoffDataFromInquiry` to pull Dinner Circle member preferences into `client_context`. Display the preference summary in the handoff inbox.

---

## Task 1: Enrich Handoff Data from Circle

**File to edit:** `lib/network/collab-actions.ts`

Find the `getHandoffDataFromInquiry` function. It takes an `inquiryId` and returns pre-populated handoff data. Currently it pulls event details (date, guest count, location, budget) from the inquiry/event.

**Add a new section AFTER the existing data population, BEFORE the return statement:**

```typescript
// Enrich with Dinner Circle member preferences (if circle exists)
let guestPreferences: Array<{
  name: string
  allergies: string[] | null
  dietary: string[] | null
}> = []

try {
  // Find circle for this inquiry's event (or the inquiry itself)
  const eventId = inquiry.event_id // adjust field name to match what the function already queries
  const circleQuery = eventId
    ? await db
        .from('hub_groups')
        .select('id')
        .eq('event_id', eventId)
        .eq('is_active', true)
        .limit(1)
        .single()
    : await db
        .from('hub_groups')
        .select('id')
        .eq('inquiry_id', inquiryId)
        .eq('is_active', true)
        .limit(1)
        .single()

  if (circleQuery.data) {
    const { data: members } = await db
      .from('hub_group_members')
      .select('profile:hub_guest_profiles(display_name, known_allergies, known_dietary)')
      .eq('group_id', circleQuery.data.id)

    if (members) {
      guestPreferences = members
        .filter((m: any) => m.profile)
        .map((m: any) => ({
          name: m.profile.display_name,
          allergies: m.profile.known_allergies,
          dietary: m.profile.known_dietary,
        }))
        .filter(
          (p: any) => (p.allergies && p.allergies.length > 0) || (p.dietary && p.dietary.length > 0)
        )
    }
  }
} catch {
  // Non-blocking: if circle lookup fails, handoff still works without preferences
}
```

**Then modify the return value.** Find where `client_context` is built in the return object. It is a jsonb object. Add the `guestPreferences` array to it:

```typescript
clientContext: {
  ...existingContext, // keep whatever is already there
  guestPreferences: guestPreferences.length > 0 ? guestPreferences : undefined,
},
```

**IMPORTANT:** The exact field names (`inquiry.event_id`, `clientContext`, etc.) may differ from what I've written. Read the existing function carefully and match its patterns. The key logic is:

1. Look up `hub_groups` by event_id or inquiry_id
2. If found, query `hub_group_members` joined to `hub_guest_profiles`
3. Extract name + allergies + dietary from each member
4. Filter to only members who have at least one allergy or dietary item
5. Add to client_context

---

## Task 2: Display Preferences in Handoff Inbox

**File to find:** Search for the handoff inbox UI component. It renders items from `getCollabInbox()`. It will be in one of these locations:

- `app/(chef)/network/` directory
- `components/network/` directory

Look for a component that renders `handoff` items with fields like `title`, `handoff_type`, `client_context`, `event_date`, `guest_count`.

**What to add:** Inside the handoff card/item component, after the existing details (date, guest count, location), add a conditional preferences section:

```tsx
{
  /* Guest dietary context from Dinner Circle */
}
{
  handoff.client_context?.guestPreferences?.length > 0 && (
    <div className="mt-2 border-t border-stone-800 pt-2">
      <p className="text-xs font-medium uppercase tracking-wide text-stone-500">
        Guest Dietary Notes
      </p>
      <div className="mt-1 space-y-1">
        {handoff.client_context.guestPreferences.map(
          (
            guest: { name: string; allergies: string[] | null; dietary: string[] | null },
            i: number
          ) => (
            <div key={i} className="text-xs text-stone-400">
              <span className="font-medium text-stone-300">{guest.name}:</span>{' '}
              {[
                ...(guest.allergies || []).map((a: string) => `${a} (allergy)`),
                ...(guest.dietary || []),
              ].join(', ') || 'None noted'}
            </div>
          )
        )}
      </div>
    </div>
  )
}
```

**Rules for finding the right component:**

- Search for `client_context` in files under `app/(chef)/network/` and `components/network/`
- The component will reference `getCollabInbox` or `chef_handoffs` or render handoff cards
- If `client_context` is typed as `unknown` or `any` or `Json`, cast it inline: `(handoff.client_context as any)?.guestPreferences`

---

## What NOT to Do

- Do NOT create any new database tables or columns
- Do NOT create any new files
- Do NOT modify the `chef_handoffs` table schema
- Do NOT modify `createCollabHandoff` (only modify `getHandoffDataFromInquiry`)
- Do NOT make the circle lookup blocking (always wrap in try/catch)
- Do NOT use em dashes anywhere
- Do NOT import from `@/lib/dinner-circles/` (use direct DB queries to hub_groups and hub_group_members)

---

## Verification

After making changes:

1. Run `npx tsc --noEmit --skipLibCheck` and fix any type errors
2. Confirm `getHandoffDataFromInquiry` now includes a circle member query
3. Confirm the circle lookup is wrapped in try/catch
4. Confirm the handoff inbox component conditionally renders guest preferences
5. Confirm no new files were created
