# Codex Spec: Collaborator-to-Circle Bridge

> **Status:** ready-to-build
> **Priority:** P0 (Andre Castillo persona: co-hosting entry ramp)
> **Scope:** 1 change in 1 file. Additive only. No new files. No new tables.
> **Risk:** LOW. Adds a non-blocking side effect after existing accepted flow. Failure in the new code does NOT affect collaboration acceptance.
> **Rule:** Touch ONLY the file and function listed. Follow existing code patterns exactly.

---

## Problem

When Chef B accepts a collaboration invite on Chef A's event, Chef B gains access via `event_collaborators`. But Chef B is NOT added to the event's Dinner Circle. This means:

- Chef B cannot see guest communication in the circle
- Guests don't know Chef B is involved
- Chef B has no presence in the shared planning space

This blocks the co-hosting entry ramp: a new chef who sous-chefs for an established chef gets zero exposure to the client/guest community through the circle.

## What To Build

After `respondToEventInvitation` successfully marks a collaboration invite as **accepted**, auto-add the accepting chef to the event's Dinner Circle with role `'chef'`. Non-blocking: circle failure must NOT break collaboration acceptance.

---

## Preparation: Read These Files First

Before writing ANY code, read and understand these files completely:

1. `lib/collaboration/actions.ts` -- see `respondToEventInvitation()` starting at line 242. This is the ONLY function you modify.
2. `lib/hub/circle-lookup.ts` -- see `getCircleForEvent()` at line 87 (returns `{ groupId, groupToken, tenantId } | null`) and `getChefHubProfileId()` at line 67
3. `lib/db/server.ts` -- see `createServerClient()` usage. You will call `createServerClient({ admin: true })` for system-level writes.

---

## Exact Change

**File:** `lib/collaboration/actions.ts`
**Function:** `respondToEventInvitation` (starts at line 242)

Find this block (around lines 268-276):

```ts
  if (error) {
    console.error('[respondToEventInvitation]', error)
    throw new Error('Failed to update invitation')
  }

  revalidatePath(`/events/${row.event_id}`)
  revalidatePath('/dashboard')
  return { success: true }
}
```

Replace with:

```ts
  if (error) {
    console.error('[respondToEventInvitation]', error)
    throw new Error('Failed to update invitation')
  }

  // Auto-join accepted collaborator to event's Dinner Circle (non-blocking)
  if (input.accepted) {
    try {
      const { getCircleForEvent } = await import('@/lib/hub/circle-lookup')

      const circleInfo = await getCircleForEvent(row.event_id)
      if (circleInfo) {
        const db2: any = createServerClient({ admin: true })

        // Find or create hub profile for the collaborator chef
        const { data: chef } = await db2
          .from('chefs')
          .select('auth_user_id, display_name, email, profile_image_url')
          .eq('id', user.entityId)
          .single()

        if (chef?.auth_user_id) {
          let hubProfileId: string | null = null

          const { data: existingProfile } = await db2
            .from('hub_guest_profiles')
            .select('id')
            .eq('auth_user_id', chef.auth_user_id)
            .maybeSingle()

          if (existingProfile) {
            hubProfileId = existingProfile.id
          } else {
            const crypto = require('crypto')
            const { data: newProfile } = await db2
              .from('hub_guest_profiles')
              .insert({
                display_name: chef.display_name || 'Collaborating Chef',
                email: chef.email,
                email_normalized: chef.email?.toLowerCase().trim() || null,
                auth_user_id: chef.auth_user_id,
                avatar_url: chef.profile_image_url || null,
                profile_token: crypto.randomUUID(),
              })
              .select('id')
              .single()
            if (newProfile) hubProfileId = newProfile.id
          }

          if (hubProfileId) {
            // Check not already a member
            const { data: existingMember } = await db2
              .from('hub_group_members')
              .select('id')
              .eq('group_id', circleInfo.groupId)
              .eq('profile_id', hubProfileId)
              .maybeSingle()

            if (!existingMember) {
              await db2.from('hub_group_members').insert({
                group_id: circleInfo.groupId,
                profile_id: hubProfileId,
                role: 'chef',
                can_post: true,
                can_invite: false,
                can_pin: true,
              })

              const chefName = chef.display_name || 'A collaborating chef'
              await db2.from('hub_messages').insert({
                group_id: circleInfo.groupId,
                author_profile_id: hubProfileId,
                message_type: 'system',
                system_event_type: 'member_joined',
                body: `${chefName} joined as a collaborating chef`,
                system_metadata: {
                  display_name: chefName,
                  source: 'collaboration_accepted',
                },
              })
            }
          }
        }
      }
    } catch (circleErr) {
      console.error(
        '[respondToEventInvitation] Circle join failed (non-blocking):',
        circleErr
      )
    }
  }

  revalidatePath(`/events/${row.event_id}`)
  revalidatePath('/dashboard')
  return { success: true }
}
```

---

## DO NOT

- Create any new files
- Modify any other function in this file (not `inviteChefToEvent`, not `updateCollaboratorRole`, not `removeCollaborator`)
- Add or modify database tables or migrations
- Change the existing update/error-check logic above the new block
- Move the `revalidatePath` calls
- Import at the top of the file (use dynamic `await import()` inside the try block)

## Verification

After making the change:

1. Run `npx tsc --noEmit --skipLibCheck` and confirm zero new type errors
2. Confirm the `createServerClient` import already exists at the top of the file (it does, line 15)
3. Confirm no em dashes in your code (use commas, semicolons, or separate sentences)
