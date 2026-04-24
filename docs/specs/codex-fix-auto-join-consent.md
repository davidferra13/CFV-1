# Fix: Add Consent Check Before Auto-Join on Group Pages (JBUG-015)

## Problem

`app/(client)/my-hub/g/[groupToken]/page.tsx` line 38 calls `joinHubGroup()` on every page load with zero user consent. Clicking any group link silently makes the client a permanent member.

## Approach

Check membership first. If already a member, proceed silently. If NOT a member, skip auto-join and let the existing guest join prompt at the bottom of `HubGroupView` handle it (it already exists for non-members).

## Exact Change

**File:** `app/(client)/my-hub/g/[groupToken]/page.tsx`

### Find this block (lines 37-38):

```tsx
// Auto-join if not already a member
await joinHubGroup({ groupToken, profileId: profile.id })
```

### Replace with:

```tsx
// Only auto-join if already a member (idempotent refresh).
// New visitors see the guest join prompt in HubGroupView instead.
const isMember = group.members?.some((m: { profile_id: string }) => m.profile_id === profile.id)
if (isMember) {
  await joinHubGroup({ groupToken, profileId: profile.id })
}
```

## Verification

1. Check that `group` (returned by `getGroupByToken`) includes a `members` array. Read `lib/hub/actions.ts` to confirm the shape. If `members` is not on the group object, check what field holds member data and adjust the `.some()` check accordingly.
2. If `group` does NOT have a `members` field, use this alternative approach instead:

```tsx
// Check membership before joining
const { isMember } = await checkHubMembership({ groupToken, profileId: profile.id })
if (isMember) {
  await joinHubGroup({ groupToken, profileId: profile.id })
}
```

If `checkHubMembership` does not exist, create a simple SQL check:

```tsx
const db: any = createServerClient()
const { data: membership } = await db
  .from('hub_members')
  .select('id')
  .eq('group_id', group.id)
  .eq('profile_id', profile.id)
  .maybeSingle()
if (membership) {
  await joinHubGroup({ groupToken, profileId: profile.id })
}
```

## Rules

- Do NOT remove the `joinHubGroup` import. It is still used conditionally.
- Do NOT change the `HubGroupView` component or any other file.
- The goal is: existing members re-join silently (idempotent). New visitors do NOT auto-join.
- If you need `createServerClient`, import it from `@/lib/db/server`.
- Run `npx tsc --noEmit --skipLibCheck` after the edit. It must pass.
