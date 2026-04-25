# Codex Spec: Circle One-Pass Approval Flow

> **Status:** ready-to-build
> **Priority:** P0
> **Agent type:** Codex (surgical, additive-only)
> **Estimated scope:** 1 new component, 1 new server action file, 1 small edit to existing component
> **Depends on:** Nothing (uses existing quote accept flow)

---

## Problem

Today, clients approve quotes by navigating to `/my-quotes/[id]` or `/client/[token]/quotes/[quoteId]` and clicking Accept. This requires the client to leave the Dinner Circle, find the quote, and interact with a separate UI.

For delegation-first clients, the approval must happen **inside the circle** with a single button. The circle is the only surface they (or their assistant) visit. If the approval is not there, it does not exist for them.

---

## What To Build

### Part 1: Circle Quote Approval Server Action

A new server action that accepts a quote from within a circle context. It reuses the existing `acceptQuote` function from `lib/quotes/client-actions.ts` internally but adds circle-specific behavior: posting a notification to the circle when approved.

### Part 2: Circle Approval Banner Component

A banner that appears at the top of the circle chat tab when there is a pending quote. Shows: total price, one "Approve" button, one "View Details" link. Disappears after approval.

### Part 3: Wire Banner Into Circle View

Add the banner to `hub-group-view.tsx` in the chat tab area, above the feed.

---

## Exact Changes

### 1. Circle Approval Server Action

**File:** `lib/hub/circle-approval-actions.ts` (NEW FILE)

```typescript
'use server'

import { createServerClient } from '@/lib/db/server'
import { requireAuth } from '@/lib/auth/get-user'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { circleFirstNotify } from './circle-first-notify'

// ---------------------------------------------------------------------------
// Circle Approval: accept a quote from within a Dinner Circle
// ---------------------------------------------------------------------------

const ApproveFromCircleSchema = z.object({
  quoteId: z.string().uuid(),
  groupToken: z.string().min(1),
})

/**
 * Get pending quote for a circle (if any).
 * Returns the quote that is in 'sent' status linked to this circle's event or inquiry.
 */
export async function getPendingQuoteForCircle(groupToken: string): Promise<{
  quoteId: string
  quoteName: string
  totalCents: number
  eventId: string | null
  validUntil: string | null
} | null> {
  const db = createServerClient({ admin: true })

  // Find the group by token
  const { data: group } = await db
    .from('hub_groups')
    .select('id, event_id, inquiry_id, tenant_id')
    .eq('group_token', groupToken)
    .eq('is_active', true)
    .maybeSingle()

  if (!group) return null

  // Look for a pending quote linked to this circle's event or inquiry
  let quoteQuery = db
    .from('quotes')
    .select('id, quote_name, total_quoted_cents, effective_total_cents, event_id, valid_until')
    .eq('status', 'sent')
    .eq('tenant_id', group.tenant_id)

  if (group.event_id) {
    quoteQuery = quoteQuery.eq('event_id', group.event_id)
  } else if (group.inquiry_id) {
    quoteQuery = quoteQuery.eq('inquiry_id', group.inquiry_id)
  } else {
    return null
  }

  const { data: quotes } = await quoteQuery.order('created_at', { ascending: false }).limit(1)

  if (!quotes || quotes.length === 0) return null

  const quote = quotes[0]
  return {
    quoteId: quote.id,
    quoteName: quote.quote_name || 'Quote',
    totalCents: quote.effective_total_cents ?? quote.total_quoted_cents ?? 0,
    eventId: quote.event_id,
    validUntil: quote.valid_until,
  }
}

/**
 * Approve a quote from within a Dinner Circle.
 *
 * This calls the existing quote acceptance logic (same DB updates),
 * then posts a notification to the circle confirming the approval.
 */
export async function approveQuoteFromCircle(
  input: z.infer<typeof ApproveFromCircleSchema>
): Promise<{
  success: boolean
  error?: string
  eventId?: string
}> {
  const user = await requireAuth()
  const validated = ApproveFromCircleSchema.parse(input)
  const db = createServerClient({ admin: true })

  // 1. Load the quote and verify it is still pending
  const { data: quote } = await db
    .from('quotes')
    .select(
      'id, status, event_id, inquiry_id, tenant_id, total_quoted_cents, effective_total_cents, valid_until, client_id'
    )
    .eq('id', validated.quoteId)
    .eq('status', 'sent')
    .single()

  if (!quote) {
    return { success: false, error: 'Quote not found or already responded to' }
  }

  // 2. Check expiry
  if (quote.valid_until && new Date(quote.valid_until) < new Date()) {
    return { success: false, error: 'This quote has expired' }
  }

  // 3. Accept the quote (same logic as existing acceptQuote)
  const { error: updateError } = await db
    .from('quotes')
    .update({
      status: 'accepted',
      accepted_at: new Date().toISOString(),
    })
    .eq('id', quote.id)
    .eq('status', 'sent')

  if (updateError) {
    return { success: false, error: 'Failed to accept quote' }
  }

  // 4. If linked to an inquiry, update inquiry status
  if (quote.inquiry_id) {
    await db
      .from('inquiries')
      .update({ status: 'confirmed' })
      .eq('id', quote.inquiry_id)
      .in('status', ['quoted', 'responded'])
  }

  // 5. If linked to an event, update event pricing fields
  if (quote.event_id) {
    const totalCents = quote.effective_total_cents ?? quote.total_quoted_cents
    await db
      .from('events')
      .update({
        quoted_total_cents: totalCents,
        status: 'accepted',
      })
      .eq('id', quote.event_id)
      .in('status', ['draft', 'proposed'])
  }

  // 6. Post approval notification to the circle
  try {
    await circleFirstNotify({
      eventId: quote.event_id,
      inquiryId: quote.inquiry_id,
      notificationType: 'quote_accepted',
      body: 'Quote approved! The dinner is confirmed.',
      actionUrl: quote.event_id ? `/my-events/${quote.event_id}` : undefined,
      actionLabel: quote.event_id ? 'View Event' : undefined,
    })
  } catch (err) {
    // Non-blocking: circle notification failure should not roll back approval
    console.error('[approveQuoteFromCircle] Circle notify failed:', err)
  }

  // 7. Revalidate relevant paths
  revalidatePath(`/hub/g/${validated.groupToken}`)
  if (quote.event_id) {
    revalidatePath(`/my-events/${quote.event_id}`)
  }

  return { success: true, eventId: quote.event_id ?? undefined }
}
```

### 2. Circle Approval Banner Component

**File:** `components/hub/circle-approval-banner.tsx` (NEW FILE)

```tsx
'use client'

import { useState } from 'react'
import { approveQuoteFromCircle } from '@/lib/hub/circle-approval-actions'
import { formatCurrency } from '@/lib/utils/currency'

interface CircleApprovalBannerProps {
  quoteId: string
  quoteName: string
  totalCents: number
  groupToken: string
  validUntil: string | null
  /** Link to full quote detail view */
  detailHref?: string
}

export function CircleApprovalBanner({
  quoteId,
  quoteName,
  totalCents,
  groupToken,
  validUntil,
  detailHref,
}: CircleApprovalBannerProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [approved, setApproved] = useState(false)

  // Check if expired
  const isExpired = validUntil ? new Date(validUntil) < new Date() : false

  if (approved) {
    return (
      <div className="mx-4 mt-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-center">
        <p className="text-sm font-medium text-emerald-300">Approved! Your dinner is confirmed.</p>
      </div>
    )
  }

  if (isExpired) {
    return (
      <div className="mx-4 mt-3 rounded-lg border border-stone-700 bg-stone-800/50 p-4 text-center">
        <p className="text-sm text-stone-400">This quote has expired.</p>
      </div>
    )
  }

  const handleApprove = async () => {
    setLoading(true)
    setError(null)

    try {
      const result = await approveQuoteFromCircle({ quoteId, groupToken })
      if (result.success) {
        setApproved(true)
      } else {
        setError(result.error || 'Failed to approve')
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-4 mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
      {error && <p className="mb-2 text-xs text-red-400">{error}</p>}

      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-stone-200 truncate">{quoteName}</p>
          <p className="text-lg font-bold text-stone-100">{formatCurrency(totalCents)}</p>
          {validUntil && (
            <p className="text-xs text-stone-400">
              Valid until {new Date(validUntil).toLocaleDateString()}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {detailHref && (
            <a
              href={detailHref}
              className="rounded-lg border border-stone-600 px-3 py-2 text-sm text-stone-300 hover:bg-stone-700 transition-colors"
            >
              Details
            </a>
          )}
          <button
            onClick={handleApprove}
            disabled={loading}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Approving...' : 'Approve'}
          </button>
        </div>
      </div>
    </div>
  )
}
```

### 3. Wire Into Hub Group View

**File:** `app/(public)/hub/g/[groupToken]/hub-group-view.tsx`

**EDIT:** Find the section where the chat tab content is rendered. Look for the `HubFeed` component render inside the chat tab. Add the `CircleApprovalBanner` ABOVE the `HubFeed` component.

You need to:

**Step 3a:** Add import at the top of the file (with the other imports):

```typescript
import { CircleApprovalBanner } from '@/components/hub/circle-approval-banner'
```

**Step 3b:** Add a new prop to `HubGroupViewProps` interface:

```typescript
  pendingQuote?: {
    quoteId: string
    quoteName: string
    totalCents: number
    validUntil: string | null
  } | null
```

**Step 3c:** In the chat tab section, find where `<HubFeed` is rendered. IMMEDIATELY BEFORE the `<HubFeed` component, add:

```tsx
{
  pendingQuote && (
    <CircleApprovalBanner
      quoteId={pendingQuote.quoteId}
      quoteName={pendingQuote.quoteName}
      totalCents={pendingQuote.totalCents}
      groupToken={group.group_token}
      validUntil={pendingQuote.validUntil}
    />
  )
}
```

**Step 3d:** In the page file `app/(public)/hub/g/[groupToken]/page.tsx`, import and call `getPendingQuoteForCircle` to fetch the pending quote data, then pass it as the `pendingQuote` prop to `HubGroupView`.

Add this import:

```typescript
import { getPendingQuoteForCircle } from '@/lib/hub/circle-approval-actions'
```

Add this data fetch (alongside existing data fetches in the page):

```typescript
const pendingQuote = await getPendingQuoteForCircle(groupToken)
```

Pass to the component:

```tsx
<HubGroupView
  // ... existing props
  pendingQuote={pendingQuote}
/>
```

---

## CONSTRAINTS FOR CODEX

1. **DO NOT** modify `lib/quotes/client-actions.ts`. The new action file is standalone. It duplicates the minimal quote-accept logic intentionally to avoid coupling.
2. **DO NOT** modify any existing components except `hub-group-view.tsx` (adding one import, one prop, one conditional render) and `page.tsx` (adding one import, one fetch, one prop pass).
3. **DO NOT** create any new database tables or migrations. This spec uses existing tables only.
4. **DO NOT** add any new npm dependencies.
5. The approval banner uses plain Tailwind classes matching the existing dark theme in `hub-group-view.tsx` (stone-\* colors with opacity).
6. The `circleFirstNotify` call is wrapped in try/catch because it is a non-blocking side effect per CLAUDE.md architecture rules.
7. The `formatCurrency` import is from `@/lib/utils/currency` (already exists in the codebase).
8. Keep the edits to `hub-group-view.tsx` MINIMAL. Do not refactor, reformat, or change any existing code. Only add the import, prop, and conditional render.

---

## Verification

After building, confirm:

- [ ] `lib/hub/circle-approval-actions.ts` exports `getPendingQuoteForCircle` and `approveQuoteFromCircle`
- [ ] `components/hub/circle-approval-banner.tsx` exports `CircleApprovalBanner`
- [ ] `hub-group-view.tsx` imports and conditionally renders `CircleApprovalBanner` above `HubFeed`
- [ ] `page.tsx` fetches `pendingQuote` and passes it to `HubGroupView`
- [ ] `npx tsc --noEmit --skipLibCheck` passes (no new type errors introduced)
- [ ] The banner only shows when a quote with status 'sent' exists for the circle's event/inquiry
- [ ] After clicking Approve, the banner changes to a success state
- [ ] Expired quotes show an expired message instead of the approve button
