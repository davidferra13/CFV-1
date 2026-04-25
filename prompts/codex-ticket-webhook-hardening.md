# Codex Build: Ticket Webhook Guest Insert Fix

> **Scope:** Edit exactly 1 file: `lib/tickets/webhook-handler.ts`
> **Risk:** LOW. No schema changes. No new files. Existing try/catch already handles failures.
> **Parallel safety:** Does NOT touch event page or tickets tab (another agent handles those).

---

## RULES (read before doing ANYTHING)

1. Read `CLAUDE.md` first. Follow all rules there.
2. Edit ONLY `lib/tickets/webhook-handler.ts`. Do not create, delete, or edit any other file.
3. No em dashes anywhere (use hyphens, commas, or semicolons).
4. Do NOT run database migrations or `drizzle-kit push`.
5. After edits, run the verification commands.

---

## Problem

The guest insert in `handleTicketPurchaseCompleted` (step 3, around lines 122-152) has 3 bugs that cause it to ALWAYS fail silently:

1. **`source: 'ticket'`** - the `event_guests` table has no `source` column. Insert crashes.
2. **Missing `guest_token`** - `event_guests.guest_token` is `TEXT UNIQUE NOT NULL` with no DEFAULT. Insert crashes without it.
3. **`event_share_id` is NOT NULL** - ticket buyers don't come through RSVP, so there's no share link. A migration (`20260425000002`) will make this nullable, but until it runs, the insert crashes without it.

The try/catch around the insert means the ticket still gets marked as paid, but the guest record is never created. The chef sees ticket revenue but not the guest on the guest list.

---

## The Fix

Find this exact code block (around lines 122-152):

```tsx
// 3. Create event guest record
try {
  const { data: guest } = await db
    .from('event_guests')
    .insert({
      event_id,
      tenant_id,
      full_name: ticket.buyer_name,
      email: ticket.buyer_email,
      phone: ticket.buyer_phone ?? null,
      rsvp_status: 'attending',
      dietary_restrictions: ticket.dietary_restrictions ?? [],
      allergies: ticket.allergies ?? [],
      plus_one: !!ticket.plus_one_name,
      plus_one_name: ticket.plus_one_name ?? null,
      notes: ticket.notes ?? null,
      source: 'ticket',
    })
    .select('id')
    .single()

  if (guest) {
    await db.from('event_tickets').update({ event_guest_id: guest.id }).eq('id', ticket_id)
  }
} catch (guestErr) {
  // May fail if event_guests doesn't have a source column - non-blocking
  console.error(
    '[handleTicketPurchaseCompleted] Guest record creation failed (non-blocking):',
    guestErr
  )
}
```

REPLACE WITH:

```tsx
// 3. Create event guest record
try {
  // Generate a unique guest token (event_guests.guest_token is NOT NULL, no default)
  const guestToken = crypto.randomUUID()

  // Find an active event_share for FK (event_share_id may still be NOT NULL
  // until migration 20260425000002 runs)
  let eventShareId: string | null = null
  try {
    const { data: share } = await db
      .from('event_shares')
      .select('id')
      .eq('event_id', event_id)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle()
    eventShareId = share?.id ?? null
  } catch {
    // No share found; will try insert without it
  }

  const guestRecord: Record<string, unknown> = {
    event_id,
    tenant_id,
    guest_token: guestToken,
    full_name: ticket.buyer_name,
    email: ticket.buyer_email,
    phone: ticket.buyer_phone ?? null,
    rsvp_status: 'attending',
    dietary_restrictions: ticket.dietary_restrictions ?? [],
    allergies: ticket.allergies ?? [],
    plus_one: !!ticket.plus_one_name,
    plus_one_name: ticket.plus_one_name ?? null,
    notes: ticket.notes ?? null,
  }

  // Only include event_share_id if we found one (column may be nullable or NOT NULL)
  if (eventShareId) {
    guestRecord.event_share_id = eventShareId
  }

  const { data: guest } = await db.from('event_guests').insert(guestRecord).select('id').single()

  if (guest) {
    await db.from('event_tickets').update({ event_guest_id: guest.id }).eq('id', ticket_id)
  }
} catch (guestErr) {
  console.error(
    '[handleTicketPurchaseCompleted] Guest record creation failed (non-blocking):',
    guestErr
  )
}
```

---

## What changed and why

| Old code                     | New code                                   | Why                                                                |
| ---------------------------- | ------------------------------------------ | ------------------------------------------------------------------ |
| `source: 'ticket'`           | Removed                                    | Column does not exist on `event_guests` table                      |
| No `guest_token`             | `guest_token: crypto.randomUUID()`         | Column is `TEXT UNIQUE NOT NULL` with no default                   |
| No `event_share_id` handling | Lookup active share, include only if found | Column is NOT NULL until migration runs; after migration, nullable |

---

## Verification

Run these commands after the edit:

```bash
# Type check (focus on your file only)
npx tsc --noEmit --skipLibCheck 2>&1 | grep -i "webhook-handler" || echo "No type errors in webhook-handler.ts"

# Verify old bug is gone
grep -n "source: 'ticket'" "lib/tickets/webhook-handler.ts" && echo "FAIL: source column still present" || echo "OK: source removed"

# Verify new code is present
grep -n "guest_token" "lib/tickets/webhook-handler.ts" | head -3
grep -n "eventShareId" "lib/tickets/webhook-handler.ts" | head -3
grep -n "guestRecord" "lib/tickets/webhook-handler.ts" | head -3
```

Expected results:

- No type errors in `webhook-handler.ts`
- `source: 'ticket'` is gone
- `guest_token`, `eventShareId`, and `guestRecord` are present

---

## What NOT to do

- Do NOT edit `app/(chef)/events/[id]/page.tsx` (another agent handles that)
- Do NOT edit `app/(chef)/events/[id]/_components/event-detail-tickets-tab.tsx` (another agent handles that)
- Do NOT edit any migration files
- Do NOT create new files
- Do NOT add new imports (the file already imports everything needed; `crypto` is a Node.js global)
- Do NOT modify any code outside the "step 3" guest insert block (steps 1, 2, 4, 5, 6, 7 are correct)
- Do NOT run `drizzle-kit push`
