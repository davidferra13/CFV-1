# Codex Build Spec: Launch Stabilization - Agent 1 (Auto-Join Consent + Typecheck)

> **Priority:** P0. Last real bug in the JBUG tracker.
> **Risk:** LOW. 1 file edit + verification only.
> **Time estimate:** 5 minutes of actual work.

---

## CRITICAL RULES FOR CODEX

1. Touch ONLY the 1 file listed below. No other files.
2. Do NOT refactor surrounding code. Do NOT add comments to code you did not change.
3. Do NOT add imports unless the spec explicitly says to add them.
4. Do NOT modify any database, schema, or server action files.
5. After ALL changes, run: `node scripts/run-typecheck.mjs -p tsconfig.ci.json`
6. If typecheck fails on files YOU did not touch, that is a pre-existing issue. Report it but do NOT fix unrelated files.
7. Commit with message: `fix(hub): add membership check before auto-join on group pages`

---

## Task 1: Fix Silent Auto-Join on Hub Group Pages

**File:** `app/(client)/my-hub/g/[groupToken]/page.tsx`

**Problem:** Line 48 calls `joinHubGroup()` on every page load with zero user consent. Clicking any group link silently makes the client a permanent member of that group. This is a consent violation.

**How to fix:**

### Step 1: Read the file first

Read the full file. Find the line that says:

```tsx
await joinHubGroup({ groupToken, profileId: profile.id })
```

### Step 2: Check how `group` is structured

Look at what `getGroupByToken` returns earlier in the function. Check if the returned `group` object has a `members` array or similar field.

### Step 3: Add a membership check

Replace the unconditional `joinHubGroup` call with a conditional one. The exact code depends on Step 2:

**If `group` has a `members` array:**

```tsx
// Only refresh membership for existing members. New visitors see the join prompt in HubGroupView.
const isMember = group.members?.some((m: { profile_id: string }) => m.profile_id === profile.id)
if (isMember) {
  await joinHubGroup({ groupToken, profileId: profile.id })
}
```

**If `group` does NOT have a `members` field, use a direct DB check:**

Add this import at the top of the file (only if not already imported):

```tsx
import { createServerClient } from '@/lib/db/server'
```

Then replace the joinHubGroup call:

```tsx
// Check membership before joining. New visitors see the join prompt in HubGroupView.
const db: any = createServerClient()
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

### Step 4: Do NOT remove the `joinHubGroup` import

It is still used inside the conditional.

---

## Task 2: Run Typecheck

After the fix, run:

```bash
node scripts/run-typecheck.mjs -p tsconfig.ci.json
```

Report the result. If it passes, you are done. If it fails ONLY on files you did not touch, report the errors but do not fix them.

---

## What NOT to Do

- Do NOT change `HubGroupView` or any other component
- Do NOT change any hub server actions
- Do NOT add new pages or components
- Do NOT modify the join prompt UI
- Do NOT change any other file in the repo
