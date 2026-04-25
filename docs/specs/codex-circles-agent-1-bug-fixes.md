# Codex Agent 1: Dinner Circle Bug Fixes

> **Scope:** 9 surgical fixes across 7 files. No new features. No architecture changes.
> **Risk:** LOW. Each fix is isolated. No database changes. No new dependencies.
> **Rule:** Touch ONLY the files listed. Do NOT refactor surrounding code. Do NOT add comments, docstrings, or type annotations to code you did not change.

---

## Fix 1: email_normalized not set during RSVP profile creation

**File:** `lib/hub/integration-actions.ts`
**Line:** ~67-78 (the `if (!profileId)` block where a new profile is created)

**Problem:** When creating a new `hub_guest_profiles` row, `email_normalized` is not set. Later lookups use `email_normalized`, so these profiles become unfindable, causing duplicate profiles.

**Fix:** Add `email_normalized` to the insert:

```ts
// In the insert call around line 68-76, add email_normalized:
const { data: newProfile } = await db
  .from('hub_guest_profiles')
  .insert({
    display_name: input.displayName,
    email: input.email,
    email_normalized: input.email ? input.email.toLowerCase().trim() : null,
    known_allergies: input.allergies ?? [],
    known_dietary: input.dietaryRestrictions ?? [],
  })
  .select('id')
  .single()
```

**Verify:** Search ALL profile creation sites in `lib/hub/` for missing `email_normalized`. The webhook handler at `lib/tickets/webhook-handler.ts:96` already sets it correctly. `integration-actions.ts` is the only broken one.

---

## Fix 2: typing indicator drops displayName

**File:** `lib/hub/realtime.ts`
**Line:** ~78-86 (the `sendTyping` function body)

**Problem:** `sendTyping` accepts `displayName` parameter but only sends `userId` and `isTyping` in the POST body. The display name is lost.

**Fix:** Add `displayName` to the POST body:

```ts
sendTyping: (profileId: string, displayName: string) => {
  fetch('/api/realtime/typing', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      channel: `hub:${groupId}`,
      userId: profileId,
      displayName,       // <-- ADD THIS LINE
      isTyping: true,
    }),
  }).catch(() => {
    // Non-blocking side effect
  })
},
```

**Do NOT** modify any other function in this file.

---

## Fix 3: push subscription failed_count never increments

**File:** `lib/hub/hub-push-subscriptions.ts`

**Problem:** `getHubPushSubscriptions` filters on `failed_count < 5` but no function ever increments `failed_count`. Failed subscriptions stay active forever.

**Fix:** Add a new exported function after `deactivateHubPushSubscription`:

```ts
/**
 * Increment failed_count on a push subscription.
 * Auto-deactivates after 5 failures.
 */
export async function incrementPushFailedCount(endpoint: string): Promise<void> {
  const db: any = createServerClient({ admin: true })

  // Get current count
  const { data } = await db
    .from('hub_push_subscriptions')
    .select('id, failed_count')
    .eq('endpoint', endpoint)
    .maybeSingle()

  if (!data) return

  const newCount = (data.failed_count ?? 0) + 1

  if (newCount >= 5) {
    await db
      .from('hub_push_subscriptions')
      .update({ is_active: false, failed_count: newCount })
      .eq('id', data.id)
  } else {
    await db.from('hub_push_subscriptions').update({ failed_count: newCount }).eq('id', data.id)
  }
}
```

**Do NOT** modify the existing three functions.

---

## Fix 4: SeenByIndicator positioning bug

**File:** `components/hub/hub-message.tsx`

**Problem:** The SeenByIndicator dropdown uses `position: absolute` but its parent container lacks `position: relative`, causing the dropdown to render in unexpected positions.

**Fix:** Find the wrapper div around the SeenByIndicator component. Add `relative` to its className. Example:

```tsx
// Find the div that wraps <SeenByIndicator ... />
// Add "relative" to its className
<div className="... relative">
  <SeenByIndicator ... />
</div>
```

**How to find it:** Search for `SeenByIndicator` in the file. Look at its immediate parent `<div>`. Add `relative` to that div's className string.

**Do NOT** modify the SeenByIndicator component itself.

---

## Fix 5: Member list "Leave" redirects to wrong route

**File:** `components/hub/hub-member-list.tsx`

**Problem:** The Leave button always redirects to `/my-hub` (client route). Chef users who leave should go to `/circles`.

**Fix:** Find the Leave button's onClick handler. It should call `router.push('/my-hub')` or similar. Change it to conditionally redirect:

The component receives members data which includes roles. Check if the current user's role is `'chef'`:

```ts
// Find the router.push after the leave action
// Replace the hardcoded '/my-hub' with:
const isChefRole = currentMember?.role === 'chef' || currentMember?.role === 'owner'
router.push(isChefRole ? '/circles' : '/my-hub')
```

Look for how `currentMember` or the current user's membership is identified in the component (likely by matching `profileId` or `profileToken` against the members list). Use that existing logic.

**Do NOT** add new props to the component.

---

## Fix 6: Photo delete not scoped to uploader

**File:** `components/hub/hub-photo-gallery.tsx`

**Problem:** The delete button in the lightbox is visible to any authenticated user, not just the uploader or admin.

**Fix:** Find the delete button in the lightbox section. It likely renders unconditionally. Wrap it in a condition:

```tsx
// The delete button should only show for the uploader or admin/owner/chef roles
// Find the existing delete button and wrap it:
{(isOwnerOrAdmin || isUploader) && (
  <button onClick={handleDelete} ...>Delete</button>
)}
```

To determine `isOwnerOrAdmin`: check if the component receives a `role` or `canManage` prop, or look at how other permission checks are done in the component. If no role prop exists, the simplest safe fix is to hide the delete button entirely and add a comment: `// TODO: scope delete to uploader or admin`.

**Do NOT** add new server actions or API calls.

---

## Fix 7: Availability poll close not scoped to creator

**File:** `components/hub/hub-availability-grid.tsx`

**Problem:** The close-poll button is available to any member, not just the poll creator or admin.

**Fix:** Find the close-poll button. It likely renders unconditionally. Wrap it in a condition that checks if the current user created the poll or is an admin/owner:

```tsx
// Only show close button for poll creator or admin/owner
{(poll.created_by === currentProfileId || isOwnerOrAdmin) && (
  <button onClick={handleClose} ...>Close Poll</button>
)}
```

Check how the component identifies the current user (likely via a `profileId` or `profileToken` prop). Check what fields are available on the poll object for `created_by` or similar.

If the poll object does not have a `created_by` field, the simplest safe fix is to restrict close to owner/admin roles only.

---

## Fix 8: searchPeople friend discovery is a stub

**File:** `lib/hub/friend-actions.ts`
**Lines:** ~303-310

**Problem:** `searchPeople` ignores the query parameter and returns empty arrays. Friend discovery is non-functional.

**Current code:**

```ts
export async function searchPeople(query: string): Promise<{
  profiles: HubGuestProfile[]
  existing_friend_ids: string[]
  pending_request_ids: string[]
}> {
  void query
  return { profiles: [], existing_friend_ids: [], pending_request_ids: [] }
}
```

**Fix:** Replace with a real implementation. The function requires `requireClient()` auth (check the imports at the top of the file). Search `hub_guest_profiles` by display_name using ilike. Exclude the current user. Check existing friends and pending requests.

```ts
export async function searchPeople(query: string): Promise<{
  profiles: HubGuestProfile[]
  existing_friend_ids: string[]
  pending_request_ids: string[]
}> {
  const user = await requireClient()
  const db: any = createServerClient({ admin: true })

  if (!query || query.trim().length < 2) {
    return { profiles: [], existing_friend_ids: [], pending_request_ids: [] }
  }

  const searchTerm = query.trim()

  // Get current user's hub profile
  const { data: myProfile } = await db
    .from('hub_guest_profiles')
    .select('id')
    .eq('auth_user_id', user.userId)
    .maybeSingle()

  if (!myProfile) {
    return { profiles: [], existing_friend_ids: [], pending_request_ids: [] }
  }

  // Search profiles by display_name (case-insensitive)
  const { data: profiles } = await db
    .from('hub_guest_profiles')
    .select(
      'id, display_name, avatar_url, bio, email, profile_token, known_allergies, known_dietary'
    )
    .ilike('display_name', `%${searchTerm}%`)
    .neq('id', myProfile.id)
    .limit(20)

  if (!profiles?.length) {
    return { profiles: [], existing_friend_ids: [], pending_request_ids: [] }
  }

  const profileIds = profiles.map((p: any) => p.id)

  // Get existing friends among results
  const { data: friends } = await db
    .from('hub_guest_friends')
    .select('requester_id, addressee_id')
    .eq('status', 'accepted')
    .or(`requester_id.eq.${myProfile.id},addressee_id.eq.${myProfile.id}`)

  const friendIds = new Set<string>()
  for (const f of friends ?? []) {
    if (f.requester_id === myProfile.id) friendIds.add(f.addressee_id)
    else friendIds.add(f.requester_id)
  }

  // Get pending requests among results
  const { data: pending } = await db
    .from('hub_guest_friends')
    .select('requester_id, addressee_id')
    .eq('status', 'pending')
    .or(`requester_id.eq.${myProfile.id},addressee_id.eq.${myProfile.id}`)

  const pendingIds = new Set<string>()
  for (const p of pending ?? []) {
    if (p.requester_id === myProfile.id) pendingIds.add(p.addressee_id)
    else pendingIds.add(p.requester_id)
  }

  return {
    profiles: profiles as HubGuestProfile[],
    existing_friend_ids: profileIds.filter((id: string) => friendIds.has(id)),
    pending_request_ids: profileIds.filter((id: string) => pendingIds.has(id)),
  }
}
```

**Important:** Check the existing imports at the top of `friend-actions.ts`. It should already import `requireClient`, `createServerClient`, and `HubGuestProfile`. If not, add only what's missing.

---

## Fix 9: Meal board message_count increment uses invalid API

**File:** `lib/hub/meal-board-actions.ts`
**Line:** ~339 (search for `message_count`)

**Problem:** Code uses `db.raw('message_count + 1')` which is not a valid postgres.js/Drizzle method. The message_count never increments.

**Fix:** Replace the broken increment with a separate raw SQL update. Find the line that tries to increment `message_count` on `hub_groups`. Replace it with:

```ts
// Replace the broken db.raw() call with a working increment:
// Instead of trying to increment inline, do a separate query:
await db.rpc('increment_group_message_count', { group_id_input: groupId })
```

**If `rpc` is not available or there's no such function**, use this pattern instead (find the update call and replace it):

```ts
// Remove the broken update that uses db.raw()
// Replace with a select-then-update:
const { data: currentGroup } = await db
  .from('hub_groups')
  .select('message_count')
  .eq('id', groupId)
  .single()

if (currentGroup) {
  await db
    .from('hub_groups')
    .update({
      message_count: (currentGroup.message_count ?? 0) + 1,
      last_message_at: new Date().toISOString(),
    })
    .eq('id', groupId)
}
```

**Look at how other files increment message_count** (search for `message_count` in `lib/hub/message-actions.ts`) and use the same pattern.

---

## Verification Checklist

After all fixes, run:

```bash
npx tsc --noEmit --skipLibCheck
```

All 9 fixes must not introduce type errors. Do NOT run `next build` (too slow for Codex). The type check is sufficient.

## Files Touched (ONLY these)

1. `lib/hub/integration-actions.ts` (Fix 1)
2. `lib/hub/realtime.ts` (Fix 2)
3. `lib/hub/hub-push-subscriptions.ts` (Fix 3)
4. `components/hub/hub-message.tsx` (Fix 4)
5. `components/hub/hub-member-list.tsx` (Fix 5)
6. `components/hub/hub-photo-gallery.tsx` (Fix 6)
7. `components/hub/hub-availability-grid.tsx` (Fix 7)
8. `lib/hub/friend-actions.ts` (Fix 8)
9. `lib/hub/meal-board-actions.ts` (Fix 9)

## DO NOT

- Add new files
- Add new dependencies
- Create migrations
- Modify any file not listed above
- Refactor surrounding code
- Add comments to code you did not change
- Run `drizzle-kit push` or any database command
