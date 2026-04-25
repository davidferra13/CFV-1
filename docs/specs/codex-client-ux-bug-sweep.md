# Codex Build Spec: Client UX Bug Sweep (3 Fixes)

> **Status:** ready-to-build
> **Priority:** P1
> **Risk:** LOW. 3 isolated text/logic changes across 3 files. No DB, no migrations, no imports added.
> **Estimated changes:** ~15 lines across 3 files. All independent.

---

## CRITICAL RULES FOR CODEX

1. Touch ONLY the 3 files listed below. No other files.
2. Do NOT refactor surrounding code. Do NOT add comments to code you did not change.
3. Do NOT add imports unless the spec explicitly says to.
4. Do NOT modify any database, schema, or server action files.
5. Each fix is independent. If one fix is unclear or the code does not match what is described, SKIP that fix and do the others.
6. After ALL changes, run: `npx tsc --noEmit --skipLibCheck`. It must exit 0.
7. Commit with message: `fix(client-ux): fix chat empty state, remove dev note, add join consent check`

---

## Fix 1: Chat Empty State Shows Wrong Copy to Clients (JBUG-005)

**File:** `components/chat/chat-inbox.tsx`

**Problem:** The empty state says "start chatting with a client" but this component is shared between chef and client views. Clients see incorrect copy.

**How to identify the viewer:** The component already receives a `basePath` prop. When `basePath === '/my-chat'`, the viewer is a client. When `basePath === '/chat'`, the viewer is a chef.

### Find this block (around lines 53-62):

```tsx
if (conversations.length === 0) {
  return (
    <div className="text-center py-16">
      <MessageCircle className="w-12 h-12 text-stone-300 mx-auto mb-3" />
      <p className="text-stone-500 text-sm">No conversations yet</p>
      <p className="text-stone-400 text-xs mt-1">
        Click &quot;+ New Conversation&quot; above to start chatting with a client
      </p>
    </div>
  )
}
```

### Replace with:

```tsx
if (conversations.length === 0) {
  const isClient = basePath === '/my-chat'
  return (
    <div className="text-center py-16">
      <MessageCircle className="w-12 h-12 text-stone-300 mx-auto mb-3" />
      <p className="text-stone-500 text-sm">No conversations yet</p>
      <p className="text-stone-400 text-xs mt-1">
        {isClient
          ? 'Your chef will start a conversation when your booking is confirmed.'
          : 'Click \u201c+ New Conversation\u201d above to start chatting with a client'}
      </p>
    </div>
  )
}
```

**Do NOT add imports. Do NOT rename variables. The `basePath` prop already exists.**

---

## Fix 2: Remove Dev Note from Public Circles Page (JBUG-013)

**File:** `app/(public)/hub/circles/page.tsx`

**Problem:** An internal developer note is visible to all public users: "This entry point moved here so community and shared guest pages live together instead of competing for the homepage hook."

### Find this block (around lines 75-79):

```tsx
<p className="mt-3 text-sm leading-7 text-stone-300 sm:text-base">
  Guests can use Dinner Circles to stay aligned on dinner details, chat, and come back to the same
  page before the event. This entry point moved here so community and shared guest pages live
  together instead of competing for the homepage hook.
</p>
```

### Replace with:

```tsx
<p className="mt-3 text-sm leading-7 text-stone-300 sm:text-base">
  Guests can use Dinner Circles to stay aligned on dinner details, chat, and come back to the same
  page before the event.
</p>
```

**This is a text-only edit. Remove the second sentence, keep the first. Preserve existing indentation.**

---

## Fix 3: Add Consent Check Before Auto-Join on Group Pages (JBUG-015)

**File:** `app/(client)/my-hub/g/[groupToken]/page.tsx`

**Problem:** Line 38 calls `joinHubGroup()` on every page load with zero user consent. Clicking any group link silently makes the client a permanent member.

**Approach:** Check membership first. If already a member, proceed silently (idempotent refresh). If NOT a member, skip auto-join and let the existing guest join prompt handle it.

### Find this block (around lines 37-38):

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

### IMPORTANT: Verify the data shape first

Before committing this change, read the `group` object returned by the function call above line 37. Check if it has a `members` array. If `group` does NOT have a `members` field, use this alternative approach instead:

```tsx
// Check membership before auto-joining
const db: any = (await import('@/lib/db/server')).createServerClient()
const { data: existingMembership } = await db
  .from('hub_members')
  .select('id')
  .eq('group_id', group.id)
  .eq('profile_id', profile.id)
  .maybeSingle()
if (existingMembership) {
  await joinHubGroup({ groupToken, profileId: profile.id })
}
```

If you use the alternative approach and need to add `createServerClient`, add the import at the top of the file: `import { createServerClient } from '@/lib/db/server'`.

**Do NOT remove the `joinHubGroup` import. It is still used conditionally.**
**Do NOT change the `HubGroupView` component or any other file.**

---

## Verification

After all 3 fixes, run:

```bash
npx tsc --noEmit --skipLibCheck
```

It must exit 0. If it does not, fix the type error. If you cannot fix it, revert the change that caused it and commit the other fixes.
