# Codex Build Spec: Circle Quick Actions

> **Purpose:** Add inline action buttons to each circle row so the chef can act (mark read, snooze, open chat, go to quote) directly from the list without navigating into each circle. High-volume chefs need to process 20+ circles without clicking into each one.
>
> **Complexity:** LOW (one new server action, UI-only additions to existing component)
>
> **Risk:** LOW (additive only, no existing behavior changed)

---

## STRICT RULES FOR THIS TASK

1. **DO NOT create any new database tables or migrations.**
2. **DO NOT modify any existing function signatures or return types.**
3. **DO NOT delete any existing code.**
4. **DO NOT modify any files not listed in the "Files to Modify" section.**
5. **DO NOT use em dashes anywhere.** Use commas, semicolons, or separate sentences.
6. **Every `startTransition` must have try/catch with rollback + toast on failure.**
7. **Test your changes by running `npx tsc --noEmit --skipLibCheck` before committing.** Fix any type errors.
8. **Follow the exact patterns in the existing code.** Look at how `archiveCircle` is called from `CirclesInbox` as the pattern for all new actions.

---

## What to Build

### 1. New server action: `markCircleRead`

**File:** `lib/hub/chef-circle-actions.ts`

Add this new exported function AFTER the existing `restoreCircle` function (after line 662):

```typescript
/**
 * Mark all messages in a circle as read for the current chef.
 * Updates the chef's hub_group_members.last_read_at to now.
 */
export async function markCircleRead(
  groupId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await requireChef()
    const db: any = createServerClient({ admin: true })

    // Get chef's hub profile
    const { data: chefProfile } = await db
      .from('hub_guest_profiles')
      .select('id')
      .eq('auth_user_id', user.userId)
      .maybeSingle()

    if (!chefProfile) return { success: false, error: 'No hub profile found' }

    // Update last_read_at
    const { error } = await db
      .from('hub_group_members')
      .update({ last_read_at: new Date().toISOString() })
      .eq('group_id', groupId)
      .eq('profile_id', chefProfile.id)

    if (error) return { success: false, error: error.message }
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}
```

### 2. Add the import for `markCircleRead`

**File:** `components/hub/circles-inbox.tsx`

Update the existing import from `chef-circle-actions` (line 7) to include `markCircleRead`:

Change:

```typescript
import { archiveCircle, createDinnerClub } from '@/lib/hub/chef-circle-actions'
```

To:

```typescript
import { archiveCircle, createDinnerClub, markCircleRead } from '@/lib/hub/chef-circle-actions'
```

### 3. Add snooze state management to `CirclesInbox`

**File:** `components/hub/circles-inbox.tsx`

Inside the `CirclesInbox` component (after the existing `useState` calls around line 44), add:

```typescript
// Snoozed circle IDs with expiry timestamps (client-side only, resets on page reload)
const [snoozedIds, setSnoozedIds] = useState<Set<string>>(new Set())
```

Update the `filtered` useMemo (around line 53) to exclude snoozed circles. Change:

```typescript
const filtered = useMemo(() => {
  switch (filter) {
    case 'attention':
      return items.filter((c) => c.needs_attention)
    case 'pipeline':
      return items.filter((c) => PIPELINE_ACTIVE_STAGES.includes(c.pipeline_stage))
    case 'completed':
      return items.filter((c) => PIPELINE_DONE_STAGES.includes(c.pipeline_stage))
    default:
      return items
  }
}, [items, filter])
```

To:

```typescript
const filtered = useMemo(() => {
  const base = items.filter((c) => !snoozedIds.has(c.id))
  switch (filter) {
    case 'attention':
      return base.filter((c) => c.needs_attention)
    case 'pipeline':
      return base.filter((c) => PIPELINE_ACTIVE_STAGES.includes(c.pipeline_stage))
    case 'completed':
      return base.filter((c) => PIPELINE_DONE_STAGES.includes(c.pipeline_stage))
    default:
      return base
  }
}, [items, filter, snoozedIds])
```

### 4. Add action handlers to `CirclesInbox`

**File:** `components/hub/circles-inbox.tsx`

Add these handler functions inside the `CirclesInbox` component, after `handleArchive` (after line 75):

```typescript
const handleMarkRead = async (groupId: string) => {
  const prev = items
  // Optimistic: set unread_count to 0
  setItems((items) => items.map((c) => (c.id === groupId ? { ...c, unread_count: 0 } : c)))
  try {
    const result = await markCircleRead(groupId)
    if (!result.success) {
      setItems(prev)
      toast.error(result.error ?? 'Failed to mark as read')
    }
  } catch {
    setItems(prev)
    toast.error('Failed to mark as read')
  }
}

const handleSnooze = (groupId: string) => {
  setSnoozedIds((prev) => {
    const next = new Set(prev)
    next.add(groupId)
    return next
  })
  toast('Snoozed for this session', {
    action: {
      label: 'Undo',
      onClick: () => {
        setSnoozedIds((prev) => {
          const next = new Set(prev)
          next.delete(groupId)
          return next
        })
      },
    },
  })
}
```

### 5. Pass action handlers to CircleRow

**File:** `components/hub/circles-inbox.tsx`

Update the `CircleRow` rendering in the filtered map (around line 150) to pass the new handlers:

Change:

```tsx
<CircleRow key={circle.id} circle={circle} onArchive={handleArchive} />
```

To:

```tsx
<CircleRow
  key={circle.id}
  circle={circle}
  onArchive={handleArchive}
  onMarkRead={handleMarkRead}
  onSnooze={handleSnooze}
/>
```

### 6. Update CircleRow props and add quick action buttons

**File:** `components/hub/circles-inbox.tsx`

Update the `CircleRow` component (around line 211). Change the destructured props:

From:

```typescript
const CircleRow = memo(function CircleRow({
  circle,
  onArchive,
}: {
  circle: ChefCircleSummary
  onArchive: (id: string) => void
}) {
```

To:

```typescript
const CircleRow = memo(function CircleRow({
  circle,
  onArchive,
  onMarkRead,
  onSnooze,
}: {
  circle: ChefCircleSummary
  onArchive: (id: string) => void
  onMarkRead: (id: string) => void
  onSnooze: (id: string) => void
}) {
```

Replace the existing archive button (the single button at the bottom of CircleRow, around line 308-322) with a quick actions bar:

Replace this block:

```tsx
{
  /* Archive button (hover) */
}
;<button
  type="button"
  onClick={(e) => {
    e.preventDefault()
    onArchive(circle.id)
  }}
  className="flex-shrink-0 rounded p-1 text-stone-600 opacity-0 transition-opacity hover:text-stone-300 group-hover:opacity-100"
  title="Archive circle"
>
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
    />
  </svg>
</button>
```

With this expanded quick actions bar:

```tsx
{
  /* Quick actions (visible on hover) */
}
;<div className="flex flex-shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
  {/* Open chat */}
  <a
    href={`/hub/g/${circle.group_token}`}
    target="_blank"
    rel="noopener noreferrer"
    onClick={(e) => e.stopPropagation()}
    className="rounded p-1.5 text-stone-500 hover:bg-stone-700 hover:text-stone-200"
    title="Open chat"
  >
    <svg
      className="h-3.5 w-3.5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
      />
    </svg>
  </a>

  {/* Mark read (only show if unread) */}
  {circle.unread_count > 0 && (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onMarkRead(circle.id)
      }}
      className="rounded p-1.5 text-stone-500 hover:bg-stone-700 hover:text-stone-200"
      title="Mark as read"
    >
      <svg
        className="h-3.5 w-3.5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    </button>
  )}

  {/* Snooze */}
  <button
    type="button"
    onClick={(e) => {
      e.preventDefault()
      e.stopPropagation()
      onSnooze(circle.id)
    }}
    className="rounded p-1.5 text-stone-500 hover:bg-stone-700 hover:text-stone-200"
    title="Snooze"
  >
    <svg
      className="h-3.5 w-3.5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  </button>

  {/* Archive */}
  <button
    type="button"
    onClick={(e) => {
      e.preventDefault()
      e.stopPropagation()
      onArchive(circle.id)
    }}
    className="rounded p-1.5 text-stone-500 hover:bg-stone-700 hover:text-red-400"
    title="Archive"
  >
    <svg
      className="h-3.5 w-3.5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
      />
    </svg>
  </button>
</div>
```

### 7. Add snoozed count indicator to filter bar

**File:** `components/hub/circles-inbox.tsx`

In the `CirclesInbox` component, after the filter pills div and before the Browse/+ Circle buttons (around line 110), add a snoozed indicator:

```tsx
{
  snoozedIds.size > 0 && (
    <button
      type="button"
      onClick={() => setSnoozedIds(new Set())}
      className="text-xs text-stone-500 hover:text-stone-300"
    >
      {snoozedIds.size} snoozed (show)
    </button>
  )
}
```

Place this inside the flex container that holds the Browse and + Circle buttons, BEFORE the Browse link.

---

## Files to Modify (Complete List)

| File                               | Change Type                                                                                         |
| ---------------------------------- | --------------------------------------------------------------------------------------------------- |
| `lib/hub/chef-circle-actions.ts`   | Add `markCircleRead()` server action                                                                |
| `components/hub/circles-inbox.tsx` | Add import, snooze state, handlers, update CircleRow props, quick action buttons, snoozed indicator |

**NO OTHER FILES should be modified.**

---

## Done Criteria

1. `npx tsc --noEmit --skipLibCheck` passes with zero errors
2. Each circle row shows 4 quick action icons on hover: Open Chat, Mark Read (if unread), Snooze, Archive
3. "Mark as Read" optimistically clears the unread badge and persists via `markCircleRead()` server action
4. "Snooze" hides the circle from the list for the current session with an "Undo" toast
5. Snoozed count shows in the filter bar with a "show" button to reveal them
6. "Open Chat" opens the public circle view in a new tab
7. Archive still works exactly as before
8. All click handlers use `e.stopPropagation()` to prevent navigation to circle detail
9. No em dashes in any file
10. No existing functionality broken
