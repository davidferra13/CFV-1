# Codex Agent 3: Missing Lifecycle Notifications

> **Scope:** 5 new notification hooks. All additive. Uses existing `circleFirstNotify` pattern.
> **Risk:** LOW. Adding non-blocking try/catch blocks to existing functions. No behavior changes to existing code.
> **Rule:** Touch ONLY the files listed. Every new block is wrapped in try/catch. Every call is non-blocking. Follow the EXACT pattern shown below.

---

## The Pattern (MANDATORY)

Every notification follows this exact pattern. Copy it precisely:

```ts
// Non-blocking circle notification
try {
  const { circleFirstNotify } = await import('@/lib/hub/circle-first-notify')
  await circleFirstNotify({
    eventId: eventId, // the event UUID
    inquiryId: null, // or the inquiry UUID if no event
    notificationType: 'TYPE', // must be a valid HubNotificationType
    body: 'Human-readable message',
    metadata: {
      /* optional structured data */
    },
  })
} catch (err) {
  console.error('[functionName] Circle notification failed (non-blocking):', err)
}
```

**Valid HubNotificationType values (from `lib/hub/types.ts`):**
`quote_sent`, `quote_accepted`, `payment_received`, `event_confirmed`, `event_completed`, `menu_shared`, `photos_ready`, `contract_ready`, `invoice_sent`, `guest_count_updated`, `dietary_updated`, `running_late`, `repeat_booking_request`

---

## Notification 1: Event Cancellation

**File:** `lib/events/transitions.ts`

**Where:** Find the transition handler for the `cancelled` state. There should be a function or switch case that handles the event transitioning to `cancelled`. Look for `cancelled` in the file.

**What to add:** AFTER the existing cancellation logic (status update, any existing side effects), add:

```ts
// Notify circle about cancellation
try {
  const { circleFirstNotify } = await import('@/lib/hub/circle-first-notify')
  await circleFirstNotify({
    eventId: eventId,
    inquiryId: null,
    notificationType: 'event_confirmed', // reuse closest type
    body: 'This event has been cancelled. Your chef will reach out with more details.',
    metadata: { cancelled: true, reason: reason ?? null },
  })
} catch (err) {
  console.error('[cancelEvent] Circle notification failed (non-blocking):', err)
}
```

**Variable names:** Check what the event ID variable is called in context. It might be `eventId`, `event.id`, `id`, etc. Use whatever the surrounding code uses. Same for `reason` - if no reason variable exists, omit the metadata field.

**Do NOT** modify the existing transition logic. Only ADD the try/catch block.

---

## Notification 2: Event Date Changed

**File:** `lib/events/actions.ts` (or wherever `updateEvent` / event editing lives)

**Where:** Find the function that updates event details (date, time, location). Look for `updateEvent` or similar.

**What to add:** After the event update succeeds, detect if the date or time changed, then notify:

```ts
// If date or time changed, notify the circle
if (
  existingEvent &&
  (existingEvent.event_date !== updatedDate || existingEvent.serve_time !== updatedTime)
) {
  try {
    const { circleFirstNotify } = await import('@/lib/hub/circle-first-notify')
    const dateStr = updatedDate
      ? new Date(updatedDate + 'T00:00:00').toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
        })
      : 'TBD'
    await circleFirstNotify({
      eventId: eventId,
      inquiryId: null,
      notificationType: 'guest_count_updated', // reuse closest type
      body: `The event date has been updated to ${dateStr}${updatedTime ? ` at ${updatedTime}` : ''}.`,
      metadata: {
        type: 'date_changed',
        old_date: existingEvent.event_date,
        new_date: updatedDate,
        old_time: existingEvent.serve_time,
        new_time: updatedTime,
      },
    })
  } catch (err) {
    console.error('[updateEvent] Circle date-change notification failed (non-blocking):', err)
  }
}
```

**IMPORTANT:** You need to fetch the existing event BEFORE the update to compare old vs new dates. If the function already does this (e.g., for validation), use that existing data. If not, add a select before the update:

```ts
const { data: existingEvent } = await db
  .from('events')
  .select('event_date, serve_time')
  .eq('id', eventId)
  .single()
```

**Do NOT** refactor the update function. Only add the comparison and notification.

---

## Notification 3: New Member Joined Circle

**File:** `lib/hub/group-actions.ts`

**Where:** Find the `joinHubGroup` function (the function that adds a member to a circle).

**What to add:** AFTER the successful member insert and system message post, notify other members:

```ts
// Notify existing members about new member (non-blocking)
try {
  const { notifyCircleMembers } = await import('./circle-notification-actions')
  await notifyCircleMembers({
    groupId: groupId,
    excludeProfileId: profileId, // don't notify the person who just joined
    title: `${displayName} joined the circle`,
    body: `${displayName} just joined. Say hello!`,
    url: `/hub/g/${groupToken}`,
  })
} catch (err) {
  console.error('[joinHubGroup] Member join notification failed (non-blocking):', err)
}
```

**Variable names:** Check what variables are available in scope. `groupId`, `profileId`, `displayName`, and `groupToken` should all be available from the function parameters or the data that was just inserted. Use whatever the surrounding code uses.

**Check:** Does `notifyCircleMembers` exist and accept these params? Read `lib/hub/circle-notification-actions.ts` to confirm the function signature. If it takes different params, match them exactly.

**Do NOT** modify the existing join logic. Only ADD the notification block after it.

---

## Notification 4: Dietary Change Alert

**File:** `lib/hub/household-actions.ts`

**Where:** Find the function(s) that update a guest's dietary info (allergies, dietary restrictions). There may be multiple: one for the guest profile itself, one for household members.

**What to add:** After a dietary update succeeds, notify circle members with `role: 'chef'`:

```ts
// Alert chef about dietary change (non-blocking)
try {
  // Find all circles this profile belongs to
  const { data: memberships } = await db
    .from('hub_group_members')
    .select('group_id')
    .eq('profile_id', profileId)

  if (memberships?.length) {
    const { circleFirstNotify } = await import('@/lib/hub/circle-first-notify')
    // Get group details to find event_id
    for (const m of memberships) {
      const { data: group } = await db
        .from('hub_groups')
        .select('event_id')
        .eq('id', m.group_id)
        .eq('is_active', true)
        .maybeSingle()

      if (group?.event_id) {
        await circleFirstNotify({
          eventId: group.event_id,
          inquiryId: null,
          notificationType: 'dietary_updated',
          body: `${displayName} updated their dietary information.`,
          metadata: { profile_id: profileId },
        })
        break // Only notify once (most relevant circle)
      }
    }
  }
} catch (err) {
  console.error('[updateDietary] Circle dietary notification failed (non-blocking):', err)
}
```

**Variable names:** `profileId` and `displayName` must come from the surrounding function context. Check what's available.

**Do NOT** modify the existing update logic. Only ADD the notification block.

---

## Notification 5: Contract Signed

**Where:** Find the server action that handles contract signing. Search for files containing "contract" AND "sign" in `lib/`:

- Likely in `lib/contracts/actions.ts` or `lib/documents/actions.ts`
- Look for a function like `signContract`, `submitContractSignature`, or similar

**What to add:** After the contract is marked as signed, add:

```ts
// Notify circle about contract signing (non-blocking)
try {
  const { circleFirstNotify } = await import('@/lib/hub/circle-first-notify')
  await circleFirstNotify({
    eventId: eventId,
    inquiryId: null,
    notificationType: 'contract_ready', // closest existing type
    body: 'The contract has been signed.',
    metadata: { signed: true },
  })
} catch (err) {
  console.error('[signContract] Circle notification failed (non-blocking):', err)
}
```

**If you cannot find the contract signing function:** Skip this notification entirely. Do NOT create a new contract signing function.

---

## Verification Checklist

After all changes, run:

```bash
npx tsc --noEmit --skipLibCheck
```

Must exit 0.

## How to Find the Right Files

If the exact file names above are wrong, use these search strategies:

1. `grep -r "cancelled" lib/events/ --include="*.ts" -l` to find the cancellation handler
2. `grep -r "updateEvent\|update_event" lib/events/ --include="*.ts" -l` to find the event update function
3. `grep -r "joinHubGroup\|join_hub_group" lib/hub/ --include="*.ts" -l` to find the join function
4. `grep -r "signContract\|contract.*sign" lib/ --include="*.ts" -l` to find contract signing

## Files Touched (estimated)

1. `lib/events/transitions.ts` (Notification 1)
2. `lib/events/actions.ts` or equivalent (Notification 2)
3. `lib/hub/group-actions.ts` (Notification 3)
4. `lib/hub/household-actions.ts` (Notification 4)
5. Contract signing file TBD (Notification 5 - skip if not found)

## DO NOT

- Create new files
- Create database migrations
- Add new notification types to the HubNotificationType enum (reuse existing types)
- Modify existing notification logic
- Modify `lib/hub/circle-first-notify.ts` itself
- Modify `lib/hub/types.ts`
- Remove or refactor any existing code
- Add dependencies
