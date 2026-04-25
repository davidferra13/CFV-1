# Codex Build Spec: Circle Triage Engine

> **Purpose:** Transform the circles list from a passive display into an intelligent triage system that surfaces urgency, response gaps, and pipeline value so a high-volume chef never misses what matters.
>
> **Complexity:** LOW (no new tables, no migrations, no new files except one utility)
>
> **Risk:** LOW (additive changes only, no existing behavior modified)

---

## STRICT RULES FOR THIS TASK

1. **DO NOT create any new database tables or migrations.**
2. **DO NOT modify any existing function signatures.** You are ADDING new fields and a new helper, not changing existing ones.
3. **DO NOT delete any existing code.**
4. **DO NOT modify any files not listed in the "Files to Modify" section.**
5. **DO NOT use em dashes anywhere.** Use commas, semicolons, or separate sentences.
6. **DO NOT import from `@/lib/cil/`** or any AI/Ollama modules. This spec is pure deterministic logic.
7. **Every `startTransition` must have try/catch with rollback + toast on failure.**
8. **Test your changes by running `npx tsc --noEmit --skipLibCheck` before committing.** Fix any type errors.

---

## What to Build

### 1. Add `urgency_score` and enhanced attention fields to `ChefCircleSummary`

**File:** `lib/hub/chef-circle-actions.ts`

Add these fields to the existing `ChefCircleSummary` interface (around line 28, after `attention_reason`):

```typescript
// ADD these fields to the existing ChefCircleSummary interface:
urgency_score: number // 0-100, higher = more urgent
response_gap_hours: number | null // hours since last client message with no chef reply
estimated_value_cents: number | null // from linked event total_price if available
days_in_stage: number // how long circle has been in current pipeline stage
```

### 2. Enhance the data-fetching query to include response gap and value

**File:** `lib/hub/chef-circle-actions.ts`

In the `getChefCircles()` function, the batch fetch for events (around line 140-148) already selects `id, status, event_date, client_id, guest_count, occasion`. **Add `total_price` to that select:**

Change:

```typescript
.select('id, status, event_date, client_id, guest_count, occasion')
```

To:

```typescript
.select('id, status, event_date, client_id, guest_count, occasion, total_price')
```

And update the `eventMap` type to include `total_price: number | null`.

### 3. Add response gap detection

**File:** `lib/hub/chef-circle-actions.ts`

After the unread count loop (around line 230), add a batch query to detect response gaps. For each circle, we need to know: "Is the most recent message from a non-chef member, and how long ago was it?"

Add this block BEFORE the `results` loop (before line 202):

```typescript
// Batch-fetch last message author role per group for response gap detection
const responseGapMap: Record<string, { gap_hours: number | null }> = {}
if (chefProfile) {
  for (const group of groups) {
    if (!group.last_message_at) {
      responseGapMap[group.id] = { gap_hours: null }
      continue
    }
    // Check if the last message was from the chef
    const { data: lastMsg } = await db
      .from('hub_messages')
      .select('author_profile_id, created_at')
      .eq('group_id', group.id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (lastMsg && lastMsg.author_profile_id !== chefProfile.id) {
      const hoursSince = (Date.now() - new Date(lastMsg.created_at).getTime()) / 3600000
      responseGapMap[group.id] = { gap_hours: Math.round(hoursSince) }
    } else {
      responseGapMap[group.id] = { gap_hours: null }
    }
  }
}
```

**IMPORTANT:** This adds N queries (one per circle). For the circles page (no limit), this is acceptable because chefs typically have <50 active circles. For the dashboard preview (with `options.limit`), skip this query entirely and set `gap_hours: null` for all.

Wrap this block in: `if (!useFastUnread) { ... }` so the dashboard path stays fast.

### 4. Create the urgency scoring function

**File:** `lib/hub/chef-circle-actions.ts`

Add this function AFTER the existing `deriveAttention` function (after line 330):

```typescript
/**
 * Compute urgency score (0-100) from multiple signals.
 * Higher = more urgent. Used for sorting circles by what needs action first.
 */
function computeUrgencyScore(input: {
  pipeline_stage: PipelineStage
  unread_count: number
  response_gap_hours: number | null
  event_date: string | null
  estimated_value_cents: number | null
  days_in_stage: number
  needs_attention: boolean
}): number {
  let score = 0

  // Base urgency by pipeline stage (0-20)
  const stageUrgency: Partial<Record<PipelineStage, number>> = {
    new_inquiry: 15,
    awaiting_chef: 20,
    awaiting_client: 5,
    quoted: 10,
    accepted: 8,
    paid: 12,
    confirmed: 6,
    in_progress: 18,
    completed: 0,
    cancelled: 0,
    declined: 0,
    expired: 0,
    active: 2,
  }
  score += stageUrgency[input.pipeline_stage] ?? 0

  // Unread messages (0-20)
  if (input.unread_count > 0) {
    score += Math.min(input.unread_count * 5, 20)
  }

  // Response gap penalty (0-30)
  if (input.response_gap_hours !== null) {
    if (input.response_gap_hours >= 72) score += 30
    else if (input.response_gap_hours >= 48) score += 25
    else if (input.response_gap_hours >= 24) score += 15
    else if (input.response_gap_hours >= 12) score += 8
    else if (input.response_gap_hours >= 4) score += 4
  }

  // Event proximity (0-20)
  if (input.event_date) {
    const daysUntil = Math.ceil((new Date(input.event_date).getTime() - Date.now()) / 86400000)
    if (daysUntil <= 0)
      score += 20 // today or past
    else if (daysUntil <= 1) score += 18
    else if (daysUntil <= 3) score += 14
    else if (daysUntil <= 7) score += 8
    else if (daysUntil <= 14) score += 4
  }

  // Value multiplier (0-10) - higher value events get slight priority boost
  if (input.estimated_value_cents !== null && input.estimated_value_cents > 0) {
    if (input.estimated_value_cents >= 500000)
      score += 10 // $5000+
    else if (input.estimated_value_cents >= 200000)
      score += 7 // $2000+
    else if (input.estimated_value_cents >= 100000)
      score += 4 // $1000+
    else if (input.estimated_value_cents >= 50000) score += 2 // $500+
  }

  // Stale stage penalty: if stuck in a stage for too long
  if (input.days_in_stage > 14 && ['quoted', 'accepted'].includes(input.pipeline_stage)) {
    score += 5
  }
  if (input.days_in_stage > 3 && input.pipeline_stage === 'new_inquiry') {
    score += 10
  }

  return Math.min(score, 100)
}
```

### 5. Wire urgency into the results loop

**File:** `lib/hub/chef-circle-actions.ts`

In the results loop (starting around line 202), compute the new fields and add them to the pushed object.

Before building each result, compute `days_in_stage`:

```typescript
// Compute days in current stage (using last_message_at as proxy for stage entry)
const stageEntryDate = group.last_message_at || group.created_at
const daysInStage = Math.floor((Date.now() - new Date(stageEntryDate).getTime()) / 86400000)
```

Then compute the urgency score and add all new fields:

```typescript
const responseGap = responseGapMap[group.id]?.gap_hours ?? null
const valueCents = evt?.total_price != null ? Math.round(evt.total_price * 100) : null

const urgency = computeUrgencyScore({
  pipeline_stage: pipeline,
  unread_count: unreadCount,
  response_gap_hours: responseGap,
  event_date: eventDate,
  estimated_value_cents: valueCents,
  days_in_stage: daysInStage,
  needs_attention: attention.needs,
})
```

Add to the result object:

```typescript
urgency_score: urgency,
response_gap_hours: responseGap,
estimated_value_cents: valueCents,
days_in_stage: daysInStage,
```

### 6. Enhance `deriveAttention` with response gap awareness

**File:** `lib/hub/chef-circle-actions.ts`

Update the `deriveAttention` function signature to accept `responseGapHours`:

```typescript
function deriveAttention(
  stage: PipelineStage,
  unreadCount: number,
  eventDate: string | null,
  responseGapHours?: number | null
): { needs: boolean; reason: string | null }
```

Add this check at the TOP of the function (before existing checks):

```typescript
// Response gap: client waiting for chef reply
if (responseGapHours !== null && responseGapHours !== undefined) {
  if (responseGapHours >= 48) {
    return { needs: true, reason: `No reply in ${Math.round(responseGapHours / 24)}d` }
  }
  if (responseGapHours >= 24 && ['new_inquiry', 'awaiting_chef', 'quoted'].includes(stage)) {
    return { needs: true, reason: 'Client waiting 24h+' }
  }
}
```

Update the call site to pass `responseGap`:

```typescript
const attention = deriveAttention(pipeline, unreadCount, eventDate, responseGap)
```

### 7. Sort results by urgency_score descending

**File:** `lib/hub/chef-circle-actions.ts`

After the results loop, before returning, sort:

```typescript
results.sort((a, b) => b.urgency_score - a.urgency_score)
```

### 8. Display urgency indicator in CircleRow

**File:** `components/hub/circles-inbox.tsx`

In the `CircleRow` component (around line 211), add an urgency indicator next to the time display. Inside the "Meta column" div (around line 292), add BEFORE the existing `<span>` for timeAgo:

```tsx
{
  /* Urgency indicator */
}
{
  circle.urgency_score >= 60 && (
    <span className="rounded-full bg-red-500/20 px-1.5 py-0.5 text-[10px] font-bold text-red-300">
      Urgent
    </span>
  )
}
{
  circle.urgency_score >= 30 && circle.urgency_score < 60 && (
    <span className="rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-300">
      Soon
    </span>
  )
}
```

Also show the response gap if present. Add after the attention_reason block (after line 288):

```tsx
{
  circle.response_gap_hours != null && circle.response_gap_hours >= 12 && (
    <div className="mt-0.5 flex items-center gap-1 text-[11px] text-red-400/70">
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-400/70" />
      Client waiting{' '}
      {circle.response_gap_hours >= 24
        ? `${Math.round(circle.response_gap_hours / 24)}d`
        : `${circle.response_gap_hours}h`}
    </div>
  )
}
```

### 9. Show estimated value in CircleRow

**File:** `components/hub/circles-inbox.tsx`

In the meta column (around line 297), add after the guest count display:

```tsx
{
  circle.estimated_value_cents != null && circle.estimated_value_cents > 0 && (
    <span className="text-emerald-400/70">
      ${Math.round(circle.estimated_value_cents / 100).toLocaleString()}
    </span>
  )
}
```

### 10. Update the pipeline header to show total pipeline value

**File:** `components/hub/circles-pipeline-header.tsx`

After computing `totalActive` (around line 44), compute total pipeline value:

```typescript
const totalValueCents = circles
  .filter(
    (c) => !['completed', 'cancelled', 'declined', 'expired', 'active'].includes(c.pipeline_stage)
  )
  .reduce((sum, c) => sum + (c.estimated_value_cents ?? 0), 0)
```

In the "Separator + total" div (around line 72), add the value display below the active pipeline count:

```tsx
{
  totalValueCents > 0 && (
    <span className="text-[11px] text-emerald-400/70">
      ${Math.round(totalValueCents / 100).toLocaleString()} pipeline
    </span>
  )
}
```

---

## Files to Modify (Complete List)

| File                                         | Change Type                                                                                                      |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `lib/hub/chef-circle-actions.ts`             | Add fields to interface, enhance queries, add `computeUrgencyScore()`, enhance `deriveAttention()`, sort results |
| `components/hub/circles-inbox.tsx`           | Add urgency badge, response gap indicator, value display to `CircleRow`                                          |
| `components/hub/circles-pipeline-header.tsx` | Add total pipeline value display                                                                                 |

**NO OTHER FILES should be modified.**

---

## Done Criteria

1. `npx tsc --noEmit --skipLibCheck` passes with zero errors
2. `ChefCircleSummary` interface has 4 new fields: `urgency_score`, `response_gap_hours`, `estimated_value_cents`, `days_in_stage`
3. Circles list is sorted by urgency (highest first) instead of last message time
4. Each circle row shows urgency badge (Urgent/Soon) when score >= 30
5. Response gap shows as "Client waiting Xd" or "Client waiting Xh" when >= 12 hours
6. Pipeline header shows total dollar value of active pipeline
7. No em dashes in any file
8. No existing functionality broken
