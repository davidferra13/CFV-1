# Codex Agent 4: Public Event Page Polish

> **Scope:** 5 improvements to the public ticketed event page at `/e/[shareToken]`.
> **Risk:** LOW. All changes are in 2 UI files. No server actions modified. No database changes.
> **Rule:** Touch ONLY the files listed. Match existing code style exactly. Use ONLY existing UI primitives (no new component imports from `@/components/ui/`).

---

## Context

The public event page at `app/(public)/e/[shareToken]/` has two files:

- `page.tsx` - Server component. Fetches data, generates metadata.
- `public-event-view.tsx` - Client component. Renders the purchase form and confirmation.

The page uses a dark theme: `bg-stone-950`, `bg-stone-900` cards, `text-stone-100`/`text-stone-300`, `bg-emerald-600` buttons. It intentionally does NOT import `@/components/ui/*` (lightweight, standalone). Keep it that way.

---

## Improvement 1: Social Sharing Buttons on Confirmation

**File:** `app/(public)/e/[shareToken]/public-event-view.tsx`

**Where:** Find the confirmation view (rendered when `purchased === 'true'`). It currently shows "You're in!" with a circle link.

**What to add:** After the "Join the Dinner Circle" button, add a sharing section:

```tsx
{
  /* Share with friends */
}
;<div className="mt-6 pt-6 border-t border-stone-700">
  <p className="text-sm text-stone-400 mb-3">Share with friends</p>
  <div className="flex gap-3">
    <button
      onClick={() => {
        const url = window.location.origin + window.location.pathname
        const text = `I'm going to ${eventName}! Get your tickets:`
        if (navigator.share) {
          navigator.share({ title: eventName, text, url }).catch(() => {})
        } else {
          navigator.clipboard.writeText(`${text} ${url}`)
          // Could show a toast here but keeping it simple
          alert('Link copied!')
        }
      }}
      className="flex-1 px-4 py-2 bg-stone-700 hover:bg-stone-600 text-stone-200 rounded-lg text-sm transition-colors"
    >
      Share
    </button>
    <a
      href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`I'm going to ${eventName}! Get your tickets:`)}&url=${encodeURIComponent(window.location.origin + window.location.pathname)}`}
      target="_blank"
      rel="noopener noreferrer"
      className="px-4 py-2 bg-stone-700 hover:bg-stone-600 text-stone-200 rounded-lg text-sm transition-colors"
    >
      Post on X
    </a>
  </div>
</div>
```

**Variable:** `eventName` should already be available in the component (check the props or derived from the event data). Use whatever the component uses for the event title.

---

## Improvement 2: Attendee Count (Social Proof)

**File:** `app/(public)/e/[shareToken]/public-event-view.tsx`

**Where:** Find where ticket types are displayed (the ticket selection cards). Add an attendee count ABOVE the ticket type cards.

**What to add:** The component receives ticket data. Calculate total sold:

```tsx
{
  /* Social proof - attendee count */
}
{
  ;(() => {
    const totalSold =
      ticketTypes?.reduce((sum: number, tt: any) => sum + (tt.sold_count ?? 0), 0) ?? 0
    if (totalSold === 0) return null
    return (
      <div className="mb-4 text-center">
        <p className="text-stone-400 text-sm">
          <span className="text-emerald-400 font-medium">{totalSold}</span>
          {totalSold === 1 ? ' person' : ' people'} going
        </p>
      </div>
    )
  })()
}
```

**Where exactly:** Place this right before the ticket type cards section. Look for the map over ticket types (something like `ticketTypes.map(...)`) and put this above it.

**Important:** Check what the ticket type data structure looks like in the component. The field might be called `sold_count`, `soldCount`, or something else. Match the actual field name.

---

## Improvement 3: Calendar Add on Confirmation

**File:** `app/(public)/e/[shareToken]/public-event-view.tsx`

**Where:** In the confirmation view (same area as Improvement 1), add calendar buttons AFTER the circle link button but BEFORE the share section.

**What to add:**

```tsx
{
  /* Add to calendar */
}
{
  eventDate && (
    <div className="mt-4 flex gap-3">
      <a
        href={`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(eventName)}&dates=${formatGoogleCalDate(eventDate, eventTime)}/${formatGoogleCalDate(eventDate, eventTime, 3)}&location=${encodeURIComponent(eventLocation || '')}&details=${encodeURIComponent(`Dinner Circle: ${circleUrl || ''}`)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex-1 px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-lg text-sm text-center transition-colors"
      >
        Google Calendar
      </a>
      <button
        onClick={() => {
          const icsDate = eventDate.replace(/-/g, '')
          const ics = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'BEGIN:VEVENT',
            `DTSTART:${icsDate}T${(eventTime || '18:00').replace(':', '')}00`,
            `SUMMARY:${eventName}`,
            eventLocation ? `LOCATION:${eventLocation}` : '',
            circleUrl ? `DESCRIPTION:Dinner Circle: ${circleUrl}` : '',
            'END:VEVENT',
            'END:VCALENDAR',
          ]
            .filter(Boolean)
            .join('\r\n')
          const blob = new Blob([ics], { type: 'text/calendar' })
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `${eventName || 'event'}.ics`
          a.click()
          URL.revokeObjectURL(url)
        }}
        className="flex-1 px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-lg text-sm transition-colors"
      >
        Apple / Outlook
      </button>
    </div>
  )
}
```

**Also add this helper function** at the top of the component (inside the component function, before the return):

```ts
function formatGoogleCalDate(date: string, time?: string | null, hoursToAdd = 0): string {
  const d = new Date(`${date}T${time || '18:00'}:00`)
  d.setHours(d.getHours() + hoursToAdd)
  return d
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '')
}
```

**Variables:** `eventDate`, `eventTime`, `eventName`, `eventLocation`, `circleUrl` should be available from the component's props or derived data. Check what names the component actually uses and substitute accordingly.

---

## Improvement 4: Show Circle Preview Before Purchase

**File:** `app/(public)/e/[shareToken]/page.tsx`

**Where:** Currently, `circleUrl` is only fetched when `searchParams.purchased === 'true'` (around line 116). The circle link is invisible to buyers who haven't purchased yet.

**Fix:** Move the circle URL fetch to ALWAYS run, not just on purchase confirmation.

Find this pattern (approximately):

```ts
// Currently something like:
let circleUrl = null
if (searchParams.purchased === 'true') {
  // fetch circle...
}
```

Change to:

```ts
// Always fetch circle URL (for social proof before purchase, and CTA after)
let circleUrl: string | null = null
try {
  const { data: circleGroup } = await db
    .from('hub_groups')
    .select('group_token, message_count')
    .eq('event_id', event.event_id)
    .eq('is_active', true)
    .maybeSingle()

  if (circleGroup?.group_token) {
    circleUrl = `${appUrl}/hub/g/${circleGroup.group_token}`
  }
} catch {
  // Non-blocking
}
```

Then pass `circleUrl` as a prop to `PublicEventView`.

**File:** `app/(public)/e/[shareToken]/public-event-view.tsx`

In the purchase mode (not confirmation), add a small note near the ticket selection:

```tsx
{
  circleUrl && (
    <p className="text-xs text-stone-500 mt-2">
      Ticket holders join the Dinner Circle for event updates and guest coordination.
    </p>
  )
}
```

Place this after the ticket type cards, before the purchase form fields.

---

## Improvement 5: Structured Dietary Input

**File:** `app/(public)/e/[shareToken]/public-event-view.tsx`

**Where:** The dietary restrictions and allergies fields are currently plain text inputs (comma-separated). Replace with a more structured approach.

**Find:** The `dietary_restrictions` and `allergies` input fields in the purchase form.

**Replace with** tag-style inputs using checkboxes for common values + a text field for "other":

```tsx
{
  /* Dietary Restrictions */
}
;<div>
  <label className="block text-sm text-stone-400 mb-2">Dietary restrictions</label>
  <div className="flex flex-wrap gap-2 mb-2">
    {['Vegetarian', 'Vegan', 'Gluten-free', 'Dairy-free', 'Kosher', 'Halal'].map((diet) => (
      <button
        key={diet}
        type="button"
        onClick={() => {
          setDietary((prev: string[]) =>
            prev.includes(diet) ? prev.filter((d: string) => d !== diet) : [...prev, diet]
          )
        }}
        className={`px-3 py-1 rounded-full text-xs border transition-colors ${
          dietary.includes(diet)
            ? 'bg-emerald-600/20 border-emerald-600 text-emerald-400'
            : 'bg-stone-800 border-stone-700 text-stone-400 hover:border-stone-500'
        }`}
      >
        {diet}
      </button>
    ))}
  </div>
  <input
    type="text"
    placeholder="Other restrictions..."
    value={dietaryOther}
    onChange={(e) => setDietaryOther(e.target.value)}
    className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-stone-100 text-sm placeholder-stone-500"
  />
</div>

{
  /* Allergies */
}
;<div>
  <label className="block text-sm text-stone-400 mb-2">Allergies</label>
  <div className="flex flex-wrap gap-2 mb-2">
    {['Peanuts', 'Tree nuts', 'Shellfish', 'Fish', 'Milk', 'Eggs', 'Wheat', 'Soy', 'Sesame'].map(
      (allergy) => (
        <button
          key={allergy}
          type="button"
          onClick={() => {
            setAllergies((prev: string[]) =>
              prev.includes(allergy)
                ? prev.filter((a: string) => a !== allergy)
                : [...prev, allergy]
            )
          }}
          className={`px-3 py-1 rounded-full text-xs border transition-colors ${
            allergies.includes(allergy)
              ? 'bg-red-600/20 border-red-600 text-red-400'
              : 'bg-stone-800 border-stone-700 text-stone-400 hover:border-stone-500'
          }`}
        >
          {allergy}
        </button>
      )
    )}
  </div>
  <input
    type="text"
    placeholder="Other allergies..."
    value={allergiesOther}
    onChange={(e) => setAllergiesOther(e.target.value)}
    className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-stone-100 text-sm placeholder-stone-500"
  />
</div>
```

**State changes needed:** Replace the existing string state for dietary/allergies with arrays:

```ts
const [dietary, setDietary] = useState<string[]>([])
const [dietaryOther, setDietaryOther] = useState('')
const [allergies, setAllergies] = useState<string[]>([])
const [allergiesOther, setAllergiesOther] = useState('')
```

**When submitting**, combine the arrays with the text field:

```ts
// In the submit handler, combine:
const allDietary = [
  ...dietary,
  ...dietaryOther
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
]
const allAllergies = [
  ...allergies,
  ...allergiesOther
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
]
```

Then pass `allDietary` and `allAllergies` to `purchaseTicket` instead of the old comma-separated strings.

**Check:** How does the existing `purchaseTicket` action expect dietary data? It should accept `string[]` arrays (check `lib/tickets/purchase-actions.ts`). If it expects comma-separated strings, convert: `allDietary.join(', ')`.

---

## Verification Checklist

After all changes, run:

```bash
npx tsc --noEmit --skipLibCheck
```

Must exit 0.

## Files Touched (ONLY these)

1. `app/(public)/e/[shareToken]/page.tsx` (Improvement 4 - server component)
2. `app/(public)/e/[shareToken]/public-event-view.tsx` (Improvements 1-5 - client component)

## DO NOT

- Import from `@/components/ui/` (this page is intentionally standalone)
- Add new dependencies or packages
- Modify server actions in `lib/tickets/`
- Create new files
- Add Tailwind classes that don't exist in the project (stick to stone, emerald, red color scales)
- Modify the Stripe checkout flow
- Change the purchase form's submit logic beyond the dietary array change
