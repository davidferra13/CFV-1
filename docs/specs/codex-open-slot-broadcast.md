# Codex Task: Open Slot Broadcast for Dinner Circles

## Problem

Emergency/last-minute chefs need to push availability TO their circle members instead of waiting for inquiries. Currently there is no "I'm free tonight, who wants in?" mechanism. The existing `broadcastEventToCircleMembers` only works for ticketed events that already exist. This feature flips the model: chef broadcasts availability, clients claim it.

## What to Build

3 changes total. 2 new files, 2 small modifications to existing files.

---

### Change 1: Add `open_slot` to HubNotificationType

**File:** `lib/hub/types.ts`

Find this exact block (around line 134):

```ts
export type HubNotificationType =
  | 'quote_sent'
  | 'quote_accepted'
  | 'payment_received'
  | 'event_confirmed'
  | 'event_completed'
  | 'menu_shared'
  | 'photos_ready'
  | 'contract_ready'
  | 'invoice_sent'
  | 'guest_count_updated'
  | 'dietary_updated'
  | 'running_late'
  | 'repeat_booking_request'
  | 'event_reminder'
```

Add ONE new line at the end, BEFORE the final entry or after `event_reminder`:

```ts
  | 'event_reminder'
  | 'open_slot'
```

Then in `lib/hub/circle-first-notify.ts`, find `NOTIFICATION_LABELS` (line 20) and add ONE entry:

```ts
  event_reminder: 'Event Reminder',
  open_slot: 'Open Slot',
}
```

**That is the full extent of changes to existing files. Do NOT change anything else in these files.**

---

### Change 2: New server action file

**Create:** `lib/hub/open-slot-actions.ts`

```ts
'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import type { Json } from '@/types/database'
import { getChefHubProfileId } from './circle-lookup'
import type { HubNotificationType } from './types'

// ---------------------------------------------------------------------------
// Open Slot Broadcast
// Chef pushes "I'm available on [date]" to a Dinner Circle.
// Posts a notification message + emails all members.
// ---------------------------------------------------------------------------

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://cheflowhq.com'
const NOTIFY_COOLDOWN_MS = 5 * 60 * 1000

interface OpenSlotInput {
  circleId: string
  date: string // ISO date string, e.g. "2026-04-25"
  time: string // Display time, e.g. "7:00 PM"
  menuName: string // Name of the menu (display only)
  menuId?: string // Optional menu ID for linking
  pricePerHead: number // Price per head in dollars (display only)
  maxGuests: number // How many spots available
  message?: string // Optional personal note from chef
}

export async function broadcastOpenSlot(
  input: OpenSlotInput
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await requireChef()
    const db: any = createServerClient({ admin: true })

    // Verify chef owns this circle
    const { data: group } = await db
      .from('hub_groups')
      .select('id, name, group_token, tenant_id')
      .eq('id', input.circleId)
      .single()

    if (!group || group.tenant_id !== user.tenantId) {
      return { success: false, error: 'Circle not found' }
    }

    const chefProfileId = await getChefHubProfileId(user.tenantId!)
    if (!chefProfileId) {
      return { success: false, error: 'No hub profile found' }
    }

    // Build the notification body
    const body = [
      `Open slot: ${input.date} at ${input.time}`,
      `Menu: ${input.menuName}`,
      `$${input.pricePerHead}/person, ${input.maxGuests} spots`,
      input.message ? `\n${input.message}` : '',
    ]
      .filter(Boolean)
      .join('\n')

    const metadata: Record<string, unknown> = {
      slot_date: input.date,
      slot_time: input.time,
      menu_name: input.menuName,
      menu_id: input.menuId ?? null,
      price_per_head_dollars: input.pricePerHead,
      max_guests: input.maxGuests,
    }

    // 1. Post notification message to circle
    const notificationType: HubNotificationType = 'open_slot'

    await db.from('hub_messages').insert({
      group_id: input.circleId,
      author_profile_id: chefProfileId,
      message_type: 'notification',
      notification_type: notificationType,
      body,
      source: 'system',
      action_url: null,
      action_label: null,
      system_metadata: metadata as Json,
    })

    // 2. Email all circle members (reuse same pattern as broadcastEventToCircleMembers)
    const { data: members } = await db
      .from('hub_group_members')
      .select(
        'profile_id, notifications_muted, notify_email, hub_guest_profiles(id, email, display_name, notifications_enabled)'
      )
      .eq('group_id', input.circleId)

    if (members && members.length > 0) {
      const { sendEmail } = await import('@/lib/email/send')
      const { createElement } = await import('react')
      const { CircleUpdateNotificationEmail } =
        await import('@/lib/email/templates/circle-update-notification')

      const chefName = user.displayName || user.businessName || 'Your Chef'

      for (const member of members) {
        if (member.profile_id === chefProfileId) continue
        if (member.notifications_muted) continue

        const profile = member.hub_guest_profiles as unknown as {
          id: string
          email: string | null
          display_name: string
          notifications_enabled: boolean
        } | null

        if (!profile || !profile.notifications_enabled || !profile.email) continue

        const emailEnabled = (member as any).notify_email !== false
        if (!emailEnabled) continue

        try {
          await sendEmail({
            to: profile.email,
            subject: `${chefName} has an open slot on ${input.date}!`,
            react: createElement(CircleUpdateNotificationEmail, {
              recipientName: profile.display_name,
              chefName,
              groupName: group.name,
              updateLabel: 'Open Slot',
              updatePreview: body.slice(0, 200),
              circleUrl: `${APP_URL}/hub/g/${group.group_token}`,
            }),
          })
        } catch (err) {
          console.error('[non-blocking] Open slot email failed for', profile.email, err)
        }
      }
    }

    return { success: true }
  } catch (err) {
    console.error('[open-slot-broadcast] Failed:', err)
    return { success: false, error: 'Failed to broadcast open slot' }
  }
}
```

---

### Change 3: New UI component + button in circle detail

**Create:** `components/hub/open-slot-form.tsx`

```tsx
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { broadcastOpenSlot } from '@/lib/hub/open-slot-actions'

interface OpenSlotFormProps {
  circleId: string
  menus: Array<{ id: string; name: string }>
  onClose: () => void
}

export function OpenSlotForm({ circleId, menus, onClose }: OpenSlotFormProps) {
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [menuId, setMenuId] = useState('')
  const [menuName, setMenuName] = useState('')
  const [pricePerHead, setPricePerHead] = useState('')
  const [maxGuests, setMaxGuests] = useState('')
  const [message, setMessage] = useState('')
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const handleMenuChange = (selectedId: string) => {
    setMenuId(selectedId)
    const menu = menus.find((m) => m.id === selectedId)
    if (menu) setMenuName(menu.name)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!date || !time || !menuName || !pricePerHead || !maxGuests) {
      toast.error('Fill in all required fields')
      return
    }

    startTransition(async () => {
      try {
        const result = await broadcastOpenSlot({
          circleId,
          date,
          time,
          menuName: menuName,
          menuId: menuId || undefined,
          pricePerHead: parseFloat(pricePerHead),
          maxGuests: parseInt(maxGuests, 10),
          message: message || undefined,
        })

        if (result.success) {
          toast.success('Open slot broadcast sent!')
          onClose()
          router.refresh()
        } else {
          toast.error(result.error || 'Failed to broadcast')
        }
      } catch {
        toast.error('Failed to broadcast open slot')
      }
    })
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-xl border border-stone-600 bg-stone-800 p-4"
    >
      <h3 className="text-sm font-semibold text-stone-200">Broadcast Open Slot</h3>
      <p className="text-xs text-stone-400">
        Let your circle know you're available. They'll get an email + in-circle notification.
      </p>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-300">Date *</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            className="w-full rounded-lg border border-stone-600 bg-stone-700 px-3 py-2 text-sm text-stone-100"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-300">Time *</label>
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            required
            className="w-full rounded-lg border border-stone-600 bg-stone-700 px-3 py-2 text-sm text-stone-100"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-stone-300">Menu *</label>
        {menus.length > 0 ? (
          <select
            value={menuId}
            onChange={(e) => handleMenuChange(e.target.value)}
            className="w-full rounded-lg border border-stone-600 bg-stone-700 px-3 py-2 text-sm text-stone-100"
          >
            <option value="">Select a menu...</option>
            {menus.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        ) : (
          <input
            type="text"
            value={menuName}
            onChange={(e) => setMenuName(e.target.value)}
            placeholder="Menu name"
            required
            className="w-full rounded-lg border border-stone-600 bg-stone-700 px-3 py-2 text-sm text-stone-100"
          />
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-300">Price/head ($) *</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={pricePerHead}
            onChange={(e) => setPricePerHead(e.target.value)}
            required
            className="w-full rounded-lg border border-stone-600 bg-stone-700 px-3 py-2 text-sm text-stone-100"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-300">Max guests *</label>
          <input
            type="number"
            min="1"
            value={maxGuests}
            onChange={(e) => setMaxGuests(e.target.value)}
            required
            className="w-full rounded-lg border border-stone-600 bg-stone-700 px-3 py-2 text-sm text-stone-100"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-stone-300">
          Personal note (optional)
        </label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={2}
          placeholder="Hey everyone, I just got some amazing ingredients..."
          className="w-full rounded-lg border border-stone-600 bg-stone-700 px-3 py-2 text-sm text-stone-100"
        />
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="flex-1 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
        >
          {isPending ? 'Sending...' : 'Broadcast to Circle'}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg bg-stone-700 px-4 py-2 text-sm text-stone-300 hover:bg-stone-600"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
```

---

### Change 4: Add broadcast button to circle detail page

**File:** `app/(chef)/circles/[id]/circle-detail-client.tsx`

**Step A:** Add import at the top of the file (after existing imports, around line 6):

```ts
import { OpenSlotForm } from '@/components/hub/open-slot-form'
```

**Step B:** Inside the `CircleDetailClient` component (after line 19 `const router = useRouter()`), add:

```ts
const [showSlotForm, setShowSlotForm] = useState(false)
```

**Step C:** In the header area, find the `<div className="flex items-center gap-2">` block that contains the "Public View" link (around line 44). Add a new button BEFORE the Public View link:

```tsx
<button
  type="button"
  onClick={() => setShowSlotForm(!showSlotForm)}
  className="rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-600"
>
  Open Slot
</button>
```

**Step D:** Right after the closing `</div>` of the header block (after line 56), add:

```tsx
{
  showSlotForm && (
    <OpenSlotForm circleId={circle.id} menus={[]} onClose={() => setShowSlotForm(false)} />
  )
}
```

NOTE: `menus={[]}` is intentional for now. The form has a text input fallback when the menus array is empty. Wiring menu fetching is a separate task.

---

## DO NOT

- Do NOT create any database migrations
- Do NOT modify `circle-first-notify.ts` EXCEPT adding one entry to `NOTIFICATION_LABELS`
- Do NOT modify `circle-notification-actions.ts`
- Do NOT modify `types.ts` EXCEPT adding `| 'open_slot'` to the `HubNotificationType` union
- Do NOT change the existing tabs or layout structure in `circle-detail-client.tsx`
- Do NOT add any new dependencies or npm packages
- Do NOT rename or move any existing files

## Verification

After building, verify:

1. `npx tsc --noEmit --skipLibCheck` passes (no type errors)
2. The `HubNotificationType` union includes `'open_slot'`
3. The `OpenSlotForm` component renders inside the circle detail page
4. The `broadcastOpenSlot` server action is importable and typed correctly
5. No em dashes in any file (use commas, semicolons, or separate sentences)
