# Build Spec: Chef Schedule Blocks

> **Codex agent spec. Follow exactly. Do not improvise.**

## Goal

Let chefs record external schedule blocks (restaurant shifts, personal time, prep blocks) so they can see their real availability alongside private dining events.

## Why

Dual-track chefs work a restaurant job AND do private dinners. Without recording restaurant shifts somewhere, they cannot see their true availability. This table is the foundation for future availability intelligence (auto-blocking conflicting bookings, showing open slots to clients).

## Persona Reference

"Derek Alvarez" profile: 40h/week restaurant shifts + 40h/week private dinners. Constantly context-switches, overcommits, risks double-booking. Needs one place to record both worlds.

---

## Files to Create (4 new files)

### 1. `database/migrations/20260426000001_chef_schedule_blocks.sql`

New table for external schedule blocks. Additive migration, no destructive operations.

```sql
-- Chef Schedule Blocks
-- Records external commitments (restaurant shifts, personal time, prep blocks)
-- so the chef can see real availability alongside private dining events.
-- Additive migration: new table only. No existing tables modified.

CREATE TABLE IF NOT EXISTS chef_schedule_blocks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id         UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  title           TEXT NOT NULL DEFAULT '',
  block_type      TEXT NOT NULL DEFAULT 'external_shift',
  -- block_type values: 'external_shift', 'personal', 'prep', 'blocked'
  start_at        TIMESTAMPTZ NOT NULL,
  end_at          TIMESTAMPTZ NOT NULL,
  all_day         BOOLEAN NOT NULL DEFAULT false,
  recurrence_rule TEXT,
  -- iCal RRULE string for repeating blocks, e.g.:
  -- 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR' (weekday restaurant shifts)
  -- NULL means one-off block
  source          TEXT NOT NULL DEFAULT 'manual',
  -- source values: 'manual', 'google_calendar', 'import'
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT csb_end_after_start CHECK (end_at > start_at OR all_day = true)
);

-- Index for fast lookup by chef + date range
CREATE INDEX IF NOT EXISTS idx_chef_schedule_blocks_chef_date
  ON chef_schedule_blocks(chef_id, start_at);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_chef_schedule_blocks_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_chef_schedule_blocks_updated_at
  BEFORE UPDATE ON chef_schedule_blocks
  FOR EACH ROW EXECUTE FUNCTION update_chef_schedule_blocks_updated_at();
```

**IMPORTANT:** This migration file must be created but NOT applied. Do NOT run `drizzle-kit push` or any migration apply command. The developer will review and apply it manually.

### 2. `lib/scheduling/schedule-block-actions.ts`

Server actions for CRUD on schedule blocks.

```ts
'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'

// ── Types ────────────────────────────────────────────────────────────────────

export type ScheduleBlockType = 'external_shift' | 'personal' | 'prep' | 'blocked'

export interface ScheduleBlock {
  id: string
  chef_id: string
  title: string
  block_type: ScheduleBlockType
  start_at: string
  end_at: string
  all_day: boolean
  recurrence_rule: string | null
  source: string
  notes: string | null
  created_at: string
  updated_at: string
}

export interface CreateScheduleBlockInput {
  title: string
  block_type: ScheduleBlockType
  start_at: string
  end_at: string
  all_day?: boolean
  recurrence_rule?: string | null
  notes?: string | null
}

export interface UpdateScheduleBlockInput {
  title?: string
  block_type?: ScheduleBlockType
  start_at?: string
  end_at?: string
  all_day?: boolean
  recurrence_rule?: string | null
  notes?: string | null
}

// ── Actions ──────────────────────────────────────────────────────────────────

/**
 * Get all schedule blocks for the current chef.
 * Returns in chronological order.
 */
export async function getScheduleBlocks(): Promise<ScheduleBlock[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('chef_schedule_blocks')
    .select('*')
    .eq('chef_id', user.tenantId!)
    .order('start_at', { ascending: true })

  if (error) {
    console.error('[schedule-blocks] Failed to fetch blocks', error)
    return []
  }

  return data ?? []
}

/**
 * Get schedule blocks for a date range.
 * Useful for checking availability for a specific period.
 */
export async function getScheduleBlocksForRange(
  startDate: string,
  endDate: string
): Promise<ScheduleBlock[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('chef_schedule_blocks')
    .select('*')
    .eq('chef_id', user.tenantId!)
    .gte('start_at', startDate)
    .lte('end_at', endDate)
    .order('start_at', { ascending: true })

  if (error) {
    console.error('[schedule-blocks] Range query failed', error)
    return []
  }

  return data ?? []
}

/**
 * Create a new schedule block.
 */
export async function createScheduleBlock(
  input: CreateScheduleBlockInput
): Promise<{ success: boolean; error?: string; block?: ScheduleBlock }> {
  const user = await requireChef()

  // Validate
  if (!input.title.trim()) {
    return { success: false, error: 'Title is required' }
  }
  if (!input.start_at || !input.end_at) {
    return { success: false, error: 'Start and end times are required' }
  }
  if (new Date(input.end_at) <= new Date(input.start_at) && !input.all_day) {
    return { success: false, error: 'End time must be after start time' }
  }

  const VALID_TYPES: ScheduleBlockType[] = ['external_shift', 'personal', 'prep', 'blocked']
  if (!VALID_TYPES.includes(input.block_type)) {
    return { success: false, error: 'Invalid block type' }
  }

  const db: any = createServerClient()

  const { data, error } = await db
    .from('chef_schedule_blocks')
    .insert({
      chef_id: user.tenantId!,
      title: input.title.trim(),
      block_type: input.block_type,
      start_at: input.start_at,
      end_at: input.end_at,
      all_day: input.all_day ?? false,
      recurrence_rule: input.recurrence_rule ?? null,
      source: 'manual',
      notes: input.notes?.trim() || null,
    })
    .select()
    .single()

  if (error) {
    console.error('[schedule-blocks] Create failed', error)
    return { success: false, error: 'Failed to create schedule block' }
  }

  revalidatePath('/settings/schedule')
  return { success: true, block: data }
}

/**
 * Update an existing schedule block.
 */
export async function updateScheduleBlock(
  blockId: string,
  input: UpdateScheduleBlockInput
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Verify ownership
  const { data: existing } = await db
    .from('chef_schedule_blocks')
    .select('id')
    .eq('id', blockId)
    .eq('chef_id', user.tenantId!)
    .maybeSingle()

  if (!existing) {
    return { success: false, error: 'Block not found' }
  }

  const updates: Record<string, unknown> = {}
  if (input.title !== undefined) updates.title = input.title.trim()
  if (input.block_type !== undefined) updates.block_type = input.block_type
  if (input.start_at !== undefined) updates.start_at = input.start_at
  if (input.end_at !== undefined) updates.end_at = input.end_at
  if (input.all_day !== undefined) updates.all_day = input.all_day
  if (input.recurrence_rule !== undefined) updates.recurrence_rule = input.recurrence_rule
  if (input.notes !== undefined) updates.notes = input.notes?.trim() || null

  if (Object.keys(updates).length === 0) {
    return { success: true }
  }

  const { error } = await db
    .from('chef_schedule_blocks')
    .update(updates)
    .eq('id', blockId)
    .eq('chef_id', user.tenantId!)

  if (error) {
    console.error('[schedule-blocks] Update failed', error)
    return { success: false, error: 'Failed to update schedule block' }
  }

  revalidatePath('/settings/schedule')
  return { success: true }
}

/**
 * Delete a schedule block.
 */
export async function deleteScheduleBlock(
  blockId: string
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Verify ownership
  const { data: existing } = await db
    .from('chef_schedule_blocks')
    .select('id')
    .eq('id', blockId)
    .eq('chef_id', user.tenantId!)
    .maybeSingle()

  if (!existing) {
    return { success: false, error: 'Block not found' }
  }

  const { error } = await db
    .from('chef_schedule_blocks')
    .delete()
    .eq('id', blockId)
    .eq('chef_id', user.tenantId!)

  if (error) {
    console.error('[schedule-blocks] Delete failed', error)
    return { success: false, error: 'Failed to delete schedule block' }
  }

  revalidatePath('/settings/schedule')
  return { success: true }
}
```

### 3. `app/(chef)/settings/schedule/page.tsx`

Settings page for managing schedule blocks.

```tsx
import { requireChef } from '@/lib/auth/get-user'
import { getScheduleBlocks } from '@/lib/scheduling/schedule-block-actions'
import { ScheduleBlocksManager } from '@/components/settings/schedule-blocks-manager'

export const metadata = { title: 'Schedule Blocks' }

export default async function ScheduleSettingsPage() {
  await requireChef()
  const blocks = await getScheduleBlocks()

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-100">Schedule Blocks</h1>
        <p className="mt-1 text-sm text-stone-400">
          Record your restaurant shifts, personal time, and other commitments so you can see your
          real availability.
        </p>
      </div>

      <ScheduleBlocksManager initialBlocks={blocks} />
    </div>
  )
}
```

### 4. `components/settings/schedule-blocks-manager.tsx`

Client component with block list + add form.

```tsx
'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  createScheduleBlock,
  deleteScheduleBlock,
  type ScheduleBlock,
  type ScheduleBlockType,
} from '@/lib/scheduling/schedule-block-actions'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { toast } from 'sonner'

// ── Block Type Config ────────────────────────────────────────────────────────

const BLOCK_TYPES: { value: ScheduleBlockType; label: string; color: string }[] = [
  { value: 'external_shift', label: 'Restaurant Shift', color: 'bg-blue-500' },
  { value: 'personal', label: 'Personal', color: 'bg-emerald-500' },
  { value: 'prep', label: 'Prep Block', color: 'bg-violet-500' },
  { value: 'blocked', label: 'Blocked', color: 'bg-red-500' },
]

function getBlockTypeConfig(type: ScheduleBlockType) {
  return BLOCK_TYPES.find((t) => t.value === type) ?? BLOCK_TYPES[0]
}

// ── Component ────────────────────────────────────────────────────────────────

interface Props {
  initialBlocks: ScheduleBlock[]
}

export function ScheduleBlocksManager({ initialBlocks }: Props) {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [isPending, startTransition] = useTransition()

  // ── Form state ───────────────────────────────────────────────────────────
  const [title, setTitle] = useState('')
  const [blockType, setBlockType] = useState<ScheduleBlockType>('external_shift')
  const [startAt, setStartAt] = useState('')
  const [endAt, setEndAt] = useState('')
  const [allDay, setAllDay] = useState(false)
  const [notes, setNotes] = useState('')

  function resetForm() {
    setTitle('')
    setBlockType('external_shift')
    setStartAt('')
    setEndAt('')
    setAllDay(false)
    setNotes('')
    setShowForm(false)
  }

  function handleCreate() {
    if (!title.trim()) {
      toast.error('Title is required')
      return
    }
    if (!startAt || !endAt) {
      toast.error('Start and end times are required')
      return
    }

    startTransition(async () => {
      try {
        const result = await createScheduleBlock({
          title: title.trim(),
          block_type: blockType,
          start_at: new Date(startAt).toISOString(),
          end_at: new Date(endAt).toISOString(),
          all_day: allDay,
          notes: notes.trim() || null,
        })

        if (result.success) {
          toast.success('Schedule block created')
          resetForm()
          router.refresh()
        } else {
          toast.error(result.error ?? 'Failed to create block')
        }
      } catch {
        toast.error('Failed to create schedule block')
      }
    })
  }

  function handleDelete(blockId: string) {
    startTransition(async () => {
      try {
        const result = await deleteScheduleBlock(blockId)
        if (result.success) {
          toast.success('Block deleted')
          router.refresh()
        } else {
          toast.error(result.error ?? 'Failed to delete block')
        }
      } catch {
        toast.error('Failed to delete block')
      }
    })
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Add button */}
      {!showForm && <Button onClick={() => setShowForm(true)}>Add Schedule Block</Button>}

      {/* Create form */}
      {showForm && (
        <Card className="space-y-4 p-4">
          <h3 className="text-sm font-semibold text-stone-200">New Schedule Block</h3>

          <div className="space-y-3">
            {/* Title */}
            <div>
              <label className="mb-1 block text-xs font-medium text-stone-400">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Restaurant shift, Personal day"
                className="w-full rounded-md border border-stone-600 bg-stone-800 px-3 py-2 text-sm text-stone-100 placeholder:text-stone-500 focus:border-brand-500 focus:outline-none"
              />
            </div>

            {/* Block type */}
            <div>
              <label className="mb-1 block text-xs font-medium text-stone-400">Type</label>
              <div className="flex flex-wrap gap-2">
                {BLOCK_TYPES.map((bt) => (
                  <button
                    key={bt.value}
                    onClick={() => setBlockType(bt.value)}
                    className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs transition-colors ${
                      blockType === bt.value
                        ? 'bg-stone-600 text-stone-100'
                        : 'bg-stone-800 text-stone-400 hover:bg-stone-700'
                    }`}
                  >
                    <span className={`inline-block h-2 w-2 rounded-full ${bt.color}`} />
                    {bt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* All day toggle */}
            <label className="flex items-center gap-2 text-sm text-stone-300">
              <input
                type="checkbox"
                checked={allDay}
                onChange={(e) => setAllDay(e.target.checked)}
                className="rounded border-stone-600"
              />
              All day
            </label>

            {/* Date/time inputs */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-stone-400">
                  {allDay ? 'Start date' : 'Start'}
                </label>
                <input
                  type={allDay ? 'date' : 'datetime-local'}
                  value={startAt}
                  onChange={(e) => setStartAt(e.target.value)}
                  className="w-full rounded-md border border-stone-600 bg-stone-800 px-3 py-2 text-sm text-stone-100 focus:border-brand-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-stone-400">
                  {allDay ? 'End date' : 'End'}
                </label>
                <input
                  type={allDay ? 'date' : 'datetime-local'}
                  value={endAt}
                  onChange={(e) => setEndAt(e.target.value)}
                  className="w-full rounded-md border border-stone-600 bg-stone-800 px-3 py-2 text-sm text-stone-100 focus:border-brand-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="mb-1 block text-xs font-medium text-stone-400">
                Notes (optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Any notes about this block..."
                className="w-full rounded-md border border-stone-600 bg-stone-800 px-3 py-2 text-sm text-stone-100 placeholder:text-stone-500 focus:border-brand-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button onClick={handleCreate} disabled={isPending}>
              {isPending ? 'Creating...' : 'Create Block'}
            </Button>
            <Button variant="ghost" onClick={resetForm}>
              Cancel
            </Button>
          </div>
        </Card>
      )}

      {/* Block list */}
      {initialBlocks.length === 0 && !showForm && (
        <Card className="p-8 text-center">
          <p className="text-sm text-stone-400">
            No schedule blocks yet. Add your restaurant shifts and other commitments to see your
            real availability.
          </p>
        </Card>
      )}

      {initialBlocks.length > 0 && (
        <div className="space-y-2">
          {initialBlocks.map((block) => {
            const typeConfig = getBlockTypeConfig(block.block_type as ScheduleBlockType)
            return (
              <Card key={block.id} className="flex items-center gap-3 p-3">
                <span
                  className={`inline-block h-3 w-3 flex-shrink-0 rounded-full ${typeConfig.color}`}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-stone-200">
                      {block.title || typeConfig.label}
                    </span>
                    <span className="text-xs text-stone-500">{typeConfig.label}</span>
                  </div>
                  <p className="text-xs text-stone-400">
                    {block.all_day
                      ? format(new Date(block.start_at), 'MMM d, yyyy')
                      : `${format(new Date(block.start_at), 'MMM d, h:mm a')} - ${format(new Date(block.end_at), 'h:mm a')}`}
                    {block.recurrence_rule && ' (recurring)'}
                  </p>
                  {block.notes && <p className="mt-0.5 text-xs text-stone-500">{block.notes}</p>}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(block.id)}
                  disabled={isPending}
                  className="flex-shrink-0 text-stone-500 hover:text-red-400"
                >
                  Delete
                </Button>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
```

---

## DO NOT Modify

- Any existing database tables or migrations
- `lib/hub/chef-circle-actions.ts`
- `app/(chef)/circles/page.tsx`
- `components/hub/circles-pipeline-header.tsx`
- Any existing settings pages
- `database/schema.ts` (it is auto-generated)

## DO NOT

- Run `drizzle-kit push` or apply the migration
- Add this page to the nav config (the developer will do this)
- Install new npm packages (date-fns and sonner are already installed)
- Modify any existing files not listed above
- Create test files (this is a UI-only feature for now)

---

## Verification

After implementing, confirm:

1. `npx tsc --noEmit --skipLibCheck` passes with zero errors
2. Migration file exists at `database/migrations/20260426000001_chef_schedule_blocks.sql`
3. The `/settings/schedule` page renders without crashing (it will show empty state before migration is applied)
4. The `ScheduleBlocksManager` component renders the form when "Add Schedule Block" is clicked
5. All 4 block types are selectable
6. The date/time inputs switch between `date` and `datetime-local` based on "All day" toggle
7. No existing pages or components are modified

## Regression Risk

MINIMAL. All 4 files are brand new. No existing files are modified. The only risk is if the migration conflicts with another migration at timestamp `20260426000001`, but this is checked by using a timestamp higher than the current highest (`20260425000020`).

## Notes for Reviewer

- The `chef_schedule_blocks` table uses `chef_id` (not `tenant_id`) per the naming convention for feature tables (Layer 5+)
- The `recurrence_rule` column is TEXT for future iCal RRULE support but the UI does not implement recurrence editing yet (manual one-off blocks only in v1)
- RLS is intentionally omitted here because the app uses server-side tenant scoping via `requireChef()`, consistent with other feature tables. Add RLS later if needed.
- The migration does NOT need to be applied for the page to compile. The page will just show empty state until the migration is run.
