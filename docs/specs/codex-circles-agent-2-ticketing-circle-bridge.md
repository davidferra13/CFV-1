# Codex Agent 2: Ticketing-Circle Bridge

> **Scope:** 4 changes in 2 files. Connects ticket purchases to Dinner Circles.
> **Risk:** MEDIUM. Modifies ticket creation flows. All changes are additive (new code after existing code). No existing behavior removed.
> **Rule:** Touch ONLY the files listed. Follow existing code patterns exactly. No new files.

---

## Context

When a ticket buyer pays via Stripe, `lib/tickets/webhook-handler.ts` auto-joins them to the event's Dinner Circle. But THREE other ticket paths skip this:

1. **Comp tickets** (free VIP tickets added by chef) - `createCompTicket` in `lib/tickets/actions.ts`
2. **Walk-in tickets** (day-of cash/card) - `createWalkInTicket` in `lib/tickets/actions.ts`
3. **Ticketing enabled but no circle exists** - `toggleEventTicketing` in `lib/tickets/actions.ts`

Also: **Refunded tickets** leave the buyer as an active circle member.

---

## Change 1: Auto-create circle when ticketing is enabled

**File:** `lib/tickets/actions.ts`
**Function:** `toggleEventTicketing` (starts around line 419)

**Problem:** When a chef enables ticketing, no circle is created. If someone buys a ticket later, they can't auto-join a circle because none exists.

**Fix:** After the upsert of `event_share_settings`, when `input.enabled === true`, call `ensureCircleForEvent`. This function is idempotent (returns existing circle if one exists).

Add this AFTER the existing upsert block (after the `else` branch that inserts a new `event_share_settings` row), BEFORE the `revalidatePath`:

```ts
// Auto-create dinner circle when ticketing is enabled
if (input.enabled) {
  try {
    const { ensureCircleForEvent } = await import('@/lib/hub/chef-circle-actions')
    await ensureCircleForEvent(input.eventId, user.tenantId!)
  } catch (err) {
    // Non-blocking: circle creation failure should not prevent ticketing toggle
    console.error('[toggleEventTicketing] Circle auto-creation failed (non-blocking):', err)
  }
}
```

Place this code BEFORE the final `revalidatePath` call and BEFORE the `return { success: true }`.

**Do NOT** modify the existing upsert logic. Only ADD code after it.

---

## Change 2: Circle join for comp tickets

**File:** `lib/tickets/actions.ts`
**Function:** `createCompTicket` (starts around line 220)

**Problem:** Comp tickets insert a ticket record but never create a hub profile or join the circle.

**Fix:** Add circle-join logic AFTER the successful insert (after `if (error) throw ...`), BEFORE `revalidatePath`. Follow the exact same pattern as `webhook-handler.ts` lines 63-200.

Add this code block:

```ts
// Auto-join comp ticket buyer to dinner circle (non-blocking)
try {
  const normalizedEmail = input.buyerEmail.toLowerCase().trim()
  const db2: any = createServerClient({ admin: true })

  // Find or create hub profile
  let hubProfileId: string | null = null
  const { data: existingProfile } = await db2
    .from('hub_guest_profiles')
    .select('id')
    .eq('email_normalized', normalizedEmail)
    .maybeSingle()

  if (existingProfile) {
    hubProfileId = existingProfile.id
  } else {
    const crypto = require('crypto')
    const { data: newProfile } = await db2
      .from('hub_guest_profiles')
      .insert({
        email: input.buyerEmail,
        email_normalized: normalizedEmail,
        display_name: input.buyerName,
        profile_token: crypto.randomUUID(),
      })
      .select('id')
      .single()
    if (newProfile) hubProfileId = newProfile.id
  }

  if (hubProfileId) {
    // Find circle for event
    const { data: group } = await db2
      .from('hub_groups')
      .select('id, group_token')
      .eq('event_id', input.eventId)
      .eq('is_active', true)
      .maybeSingle()

    if (group) {
      // Check if already a member
      const { data: existingMember } = await db2
        .from('hub_group_members')
        .select('id')
        .eq('group_id', group.id)
        .eq('profile_id', hubProfileId)
        .maybeSingle()

      if (!existingMember) {
        await db2.from('hub_group_members').insert({
          group_id: group.id,
          profile_id: hubProfileId,
          role: 'member',
          can_post: true,
          can_invite: false,
          can_pin: false,
        })

        await db2.from('hub_messages').insert({
          group_id: group.id,
          author_profile_id: hubProfileId,
          message_type: 'system',
          system_event_type: 'member_joined',
          body: `${input.buyerName} was added as a guest`,
          system_metadata: { display_name: input.buyerName, source: 'comp_ticket' },
        })
      }
    }

    // Link profile to ticket
    await db2.from('event_tickets').update({ hub_profile_id: hubProfileId }).eq('id', data.id)
  }
} catch (circleErr) {
  console.error('[createCompTicket] Circle join failed (non-blocking):', circleErr)
}
```

**Important:** `data` refers to the ticket record returned by the insert. Make sure this code goes AFTER the `if (error) throw` check and BEFORE `revalidatePath`.

---

## Change 3: Circle join for walk-in tickets

**File:** `lib/tickets/actions.ts`
**Function:** `createWalkInTicket` (starts around line 282)

**Problem:** Same as comp tickets. Walk-in tickets never join the circle.

**Fix:** Add the same circle-join block from Change 2, but adapted for walk-in (email may be empty):

Add this AFTER the successful insert, BEFORE `revalidatePath`:

```ts
// Auto-join walk-in ticket buyer to dinner circle (non-blocking)
// Only if buyer has an email (walk-ins may not provide one)
if (input.buyerEmail && input.buyerEmail !== 'walkin@cheflowhq.com') {
  try {
    const normalizedEmail = input.buyerEmail.toLowerCase().trim()
    const db2: any = createServerClient({ admin: true })

    let hubProfileId: string | null = null
    const { data: existingProfile } = await db2
      .from('hub_guest_profiles')
      .select('id')
      .eq('email_normalized', normalizedEmail)
      .maybeSingle()

    if (existingProfile) {
      hubProfileId = existingProfile.id
    } else {
      const crypto = require('crypto')
      const { data: newProfile } = await db2
        .from('hub_guest_profiles')
        .insert({
          email: input.buyerEmail,
          email_normalized: normalizedEmail,
          display_name: input.buyerName,
          profile_token: crypto.randomUUID(),
        })
        .select('id')
        .single()
      if (newProfile) hubProfileId = newProfile.id
    }

    if (hubProfileId) {
      const { data: group } = await db2
        .from('hub_groups')
        .select('id')
        .eq('event_id', input.eventId)
        .eq('is_active', true)
        .maybeSingle()

      if (group) {
        const { data: existingMember } = await db2
          .from('hub_group_members')
          .select('id')
          .eq('group_id', group.id)
          .eq('profile_id', hubProfileId)
          .maybeSingle()

        if (!existingMember) {
          await db2.from('hub_group_members').insert({
            group_id: group.id,
            profile_id: hubProfileId,
            role: 'member',
            can_post: true,
            can_invite: false,
            can_pin: false,
          })

          await db2.from('hub_messages').insert({
            group_id: group.id,
            author_profile_id: hubProfileId,
            message_type: 'system',
            system_event_type: 'member_joined',
            body: `${input.buyerName} joined at the door`,
            system_metadata: { display_name: input.buyerName, source: 'walkin_ticket' },
          })
        }
      }

      await db2.from('event_tickets').update({ hub_profile_id: hubProfileId }).eq('id', data.id)
    }
  } catch (circleErr) {
    console.error('[createWalkInTicket] Circle join failed (non-blocking):', circleErr)
  }
}
```

---

## Change 4: Refund removes from circle

**File:** `lib/tickets/actions.ts`
**Function:** `refundTicket` (starts around line 349)

**Problem:** Refunding a ticket updates payment status and decrements capacity, but the buyer stays in the circle as an active member with "attending" RSVP.

**Fix:** Add circle cleanup AFTER the sold_count decrement block, BEFORE `revalidatePath`:

```ts
// Remove refunded buyer from circle (non-blocking)
try {
  const db2: any = createServerClient({ admin: true })

  // Get the hub_profile_id from the ticket
  const { data: ticketProfile } = await db2
    .from('event_tickets')
    .select('hub_profile_id, buyer_name, event_guest_id')
    .eq('id', input.ticketId)
    .single()

  if (ticketProfile?.hub_profile_id) {
    // Find circle for event
    const { data: group } = await db2
      .from('hub_groups')
      .select('id')
      .eq('event_id', input.eventId)
      .eq('is_active', true)
      .maybeSingle()

    if (group) {
      // Change role to viewer (can see history but not post)
      await db2
        .from('hub_group_members')
        .update({ role: 'viewer', can_post: false, can_invite: false, can_pin: false })
        .eq('group_id', group.id)
        .eq('profile_id', ticketProfile.hub_profile_id)

      // Post system message
      await db2.from('hub_messages').insert({
        group_id: group.id,
        author_profile_id: ticketProfile.hub_profile_id,
        message_type: 'system',
        system_event_type: 'member_left',
        body: `${ticketProfile.buyer_name || 'A guest'}'s ticket was refunded`,
        system_metadata: { source: 'ticket_refund' },
      })
    }

    // Update RSVP status if event_guest record exists
    if (ticketProfile.event_guest_id) {
      await db2
        .from('event_guests')
        .update({ rsvp_status: 'cancelled' })
        .eq('id', ticketProfile.event_guest_id)
    }
  }
} catch (circleErr) {
  console.error('[refundTicket] Circle cleanup failed (non-blocking):', circleErr)
}
```

---

## Verification Checklist

After all changes, run:

```bash
npx tsc --noEmit --skipLibCheck
```

Must exit 0. Do NOT run `next build`.

## Files Touched (ONLY these)

1. `lib/tickets/actions.ts` (Changes 1-4)

That's it. One file. Four additive blocks.

## DO NOT

- Create new files
- Modify `lib/tickets/webhook-handler.ts` (it already works correctly)
- Modify `lib/tickets/purchase-actions.ts`
- Modify any hub files
- Create database migrations
- Add new dependencies
- Remove or refactor existing code
- Run `drizzle-kit push`
