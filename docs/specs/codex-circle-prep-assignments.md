# Circle Prep Assignments (Learning Mode Foundation)

> **Codex Build Spec** -- Single agent, sequential phases.
> Touches: 1 migration, 1 type edit, 1 new actions file, 2 new components, 2 small wiring edits.

---

## Why This Exists

Dinner Circles already solve 6 of 8 problems for inexperienced cooks (direction, ingredients, timing, confidence, community, feedback). The two missing pieces: **members don't know what THEY should do**, and **there's no focused "my tasks" view**.

Prep assignments let a chef assign a circle member to a specific meal on the board with task-specific instructions. The member sees their assignments in a focused card. This turns the circle from a coordination channel into a learning container.

---

## What To Build (5 Phases, In Order)

### Phase 1: Migration

**Create file:** `database/migrations/20260425000021_meal_board_prep_assignments.sql`

```sql
-- Prep assignments: chef assigns circle members to meal board entries
-- Enables learning mode where members see exactly what they need to do

ALTER TABLE hub_meal_board
  ADD COLUMN assigned_profile_id UUID REFERENCES hub_guest_profiles(id) ON DELETE SET NULL,
  ADD COLUMN assigned_display_name TEXT,
  ADD COLUMN assignment_notes TEXT;

CREATE INDEX idx_hub_meal_board_assigned
  ON hub_meal_board(assigned_profile_id)
  WHERE assigned_profile_id IS NOT NULL;

COMMENT ON COLUMN hub_meal_board.assigned_profile_id IS 'Circle member assigned to help with this meal';
COMMENT ON COLUMN hub_meal_board.assigned_display_name IS 'Denormalized display name of assignee (avoids join)';
COMMENT ON COLUMN hub_meal_board.assignment_notes IS 'Chef instructions for the assignee (step-by-step what to do)';
```

**Rules:**
- This is the ONLY migration file to create. Do not create any other migration files.
- Do NOT modify any existing migration files.
- Do NOT run `drizzle-kit push` or apply the migration. Just create the file.

---

### Phase 2: Type Update

**Modify file:** `lib/hub/types.ts`

Find the `MealBoardEntry` interface (around line 346). Add these three fields BEFORE the closing brace, after the existing `serving_time` field:

```ts
  assigned_profile_id: string | null
  assigned_display_name: string | null
  assignment_notes: string | null
```

**Rules:**
- Add ONLY these 3 lines. Do not modify any other types.
- Do not remove or reorder existing fields.
- The fields must be nullable (string | null) because most meals won't have assignments.

---

### Phase 3: Server Actions

**Create file:** `lib/hub/prep-assignment-actions.ts`

```ts
'use server'

import { z } from 'zod'
import { createServerClient } from '@/lib/db/compat'

// ---------------------------------------------------------------------------
// Helpers (reused from meal-board-actions pattern)
// ---------------------------------------------------------------------------

async function resolveProfile(db: any, profileToken: string) {
  const { data, error } = await db
    .from('hub_guest_profiles')
    .select('id, display_name')
    .eq('profile_token', profileToken)
    .maybeSingle()
  if (error || !data) throw new Error('Profile not found')
  return data as { id: string; display_name: string }
}

async function requireChefOrAdmin(db: any, groupId: string, profileId: string) {
  const { data, error } = await db
    .from('hub_group_members')
    .select('role')
    .eq('group_id', groupId)
    .eq('profile_id', profileId)
    .maybeSingle()
  if (error || !data) throw new Error('Not a member of this circle')
  if (!['owner', 'admin', 'chef'].includes(data.role)) {
    throw new Error('Only circle owners, admins, or chefs can manage assignments')
  }
}

// ---------------------------------------------------------------------------
// Assign a member to a meal
// ---------------------------------------------------------------------------

const AssignSchema = z.object({
  groupId: z.string().uuid(),
  profileToken: z.string().uuid(), // caller (must be chef/admin)
  mealEntryId: z.string().uuid(),
  assigneeProfileId: z.string().uuid(),
  notes: z.string().max(2000).optional().nullable(),
})

export async function assignMemberToMeal(
  input: z.infer<typeof AssignSchema>
): Promise<{ success: boolean; error?: string }> {
  try {
    const v = AssignSchema.parse(input)
    const db: any = createServerClient({ admin: true })

    // Auth: caller must be chef/admin
    const caller = await resolveProfile(db, v.profileToken)
    await requireChefOrAdmin(db, v.groupId, caller.id)

    // Verify meal entry belongs to this group
    const { data: meal, error: mealErr } = await db
      .from('hub_meal_board')
      .select('id, group_id')
      .eq('id', v.mealEntryId)
      .eq('group_id', v.groupId)
      .maybeSingle()
    if (mealErr || !meal) throw new Error('Meal entry not found in this circle')

    // Get assignee display name
    const { data: assignee, error: assigneeErr } = await db
      .from('hub_guest_profiles')
      .select('id, display_name')
      .eq('id', v.assigneeProfileId)
      .maybeSingle()
    if (assigneeErr || !assignee) throw new Error('Assignee profile not found')

    // Verify assignee is a member of this circle
    const { data: membership } = await db
      .from('hub_group_members')
      .select('id')
      .eq('group_id', v.groupId)
      .eq('profile_id', v.assigneeProfileId)
      .maybeSingle()
    if (!membership) throw new Error('Assignee is not a member of this circle')

    // Update the meal entry
    const { error: updateErr } = await db
      .from('hub_meal_board')
      .update({
        assigned_profile_id: v.assigneeProfileId,
        assigned_display_name: assignee.display_name,
        assignment_notes: v.notes?.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', v.mealEntryId)

    if (updateErr) throw new Error(`Failed to assign: ${updateErr.message}`)

    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Assignment failed' }
  }
}

// ---------------------------------------------------------------------------
// Remove assignment from a meal
// ---------------------------------------------------------------------------

const UnassignSchema = z.object({
  groupId: z.string().uuid(),
  profileToken: z.string().uuid(),
  mealEntryId: z.string().uuid(),
})

export async function unassignMemberFromMeal(
  input: z.infer<typeof UnassignSchema>
): Promise<{ success: boolean; error?: string }> {
  try {
    const v = UnassignSchema.parse(input)
    const db: any = createServerClient({ admin: true })

    const caller = await resolveProfile(db, v.profileToken)
    await requireChefOrAdmin(db, v.groupId, caller.id)

    const { error: updateErr } = await db
      .from('hub_meal_board')
      .update({
        assigned_profile_id: null,
        assigned_display_name: null,
        assignment_notes: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', v.mealEntryId)
      .eq('group_id', v.groupId)

    if (updateErr) throw new Error(`Failed to unassign: ${updateErr.message}`)

    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unassign failed' }
  }
}

// ---------------------------------------------------------------------------
// Get assignable members for a circle (for the dropdown)
// ---------------------------------------------------------------------------

export async function getAssignableMembers(
  groupId: string
): Promise<{ profileId: string; displayName: string }[]> {
  const db: any = createServerClient({ admin: true })

  const { data, error } = await db
    .from('hub_group_members')
    .select('profile_id, hub_guest_profiles!inner(id, display_name)')
    .eq('group_id', groupId)
    .in('role', ['member', 'viewer', 'admin', 'owner', 'chef'])

  if (error || !data) return []

  return (data as any[])
    .filter((row: any) => row.hub_guest_profiles?.display_name)
    .map((row: any) => ({
      profileId: row.profile_id,
      displayName: row.hub_guest_profiles.display_name,
    }))
}

// ---------------------------------------------------------------------------
// Get my meal assignments for a circle (member view)
// ---------------------------------------------------------------------------

const MyAssignmentsSchema = z.object({
  groupId: z.string().uuid(),
  groupToken: z.string(),
  profileToken: z.string().uuid(),
})

export async function getMyMealAssignments(
  input: z.infer<typeof MyAssignmentsSchema>
): Promise<{
  assignments: Array<{
    id: string
    meal_date: string
    meal_type: string
    title: string
    description: string | null
    assignment_notes: string | null
    serving_time: string | null
    status: string
  }>
}> {
  const v = MyAssignmentsSchema.parse(input)
  const db: any = createServerClient({ admin: true })

  // Verify circle access
  const { data: group, error: groupErr } = await db
    .from('hub_groups')
    .select('id')
    .eq('id', v.groupId)
    .eq('group_token', v.groupToken)
    .maybeSingle()
  if (groupErr || !group) throw new Error('Circle not found')

  // Resolve profile
  const profile = await resolveProfile(db, v.profileToken)

  // Get assignments for the next 14 days
  const today = new Date()
  const twoWeeksOut = new Date(today)
  twoWeeksOut.setDate(twoWeeksOut.getDate() + 14)

  const startDate = today.toISOString().split('T')[0]
  const endDate = twoWeeksOut.toISOString().split('T')[0]

  const { data, error } = await db
    .from('hub_meal_board')
    .select('id, meal_date, meal_type, title, description, assignment_notes, serving_time, status')
    .eq('group_id', v.groupId)
    .eq('assigned_profile_id', profile.id)
    .neq('status', 'cancelled')
    .gte('meal_date', startDate)
    .lte('meal_date', endDate)
    .order('meal_date', { ascending: true })

  if (error) throw new Error(`Failed to load assignments: ${error.message}`)

  return { assignments: data ?? [] }
}
```

**Rules:**
- This is a NEW file. Do not modify `lib/hub/meal-board-actions.ts`.
- The `getAssignableMembers` function uses a join syntax. If the compat layer does not support `!inner` joins, fall back to two separate queries: first get member profile_ids, then batch-fetch display_names. Test this.
- All mutations require chef/admin role. Members can only READ their own assignments.

---

### Phase 4: UI Components

#### 4a. Prep Assignment Badge

**Create file:** `components/hub/prep-assignment-badge.tsx`

This component renders inline on each meal entry in the weekly meal board. It shows:
- **No assignment + chef viewing:** A small "Assign" button
- **Assigned + chef viewing:** Assignee name badge + "x" to remove + click to reassign
- **Assigned + you're the assignee:** "Your task" highlight + assignment notes expandable
- **Assigned + other member viewing:** Assignee name shown (read-only)

```tsx
'use client'

import { useState, useTransition } from 'react'
import {
  assignMemberToMeal,
  unassignMemberFromMeal,
  getAssignableMembers,
} from '@/lib/hub/prep-assignment-actions'

interface PrepAssignmentBadgeProps {
  groupId: string
  mealEntryId: string
  assignedProfileId: string | null
  assignedDisplayName: string | null
  assignmentNotes: string | null
  currentProfileId: string | null
  profileToken: string | null
  isChefOrAdmin: boolean
  onAssigned?: () => void // callback to refresh parent data
}

export function PrepAssignmentBadge({
  groupId,
  mealEntryId,
  assignedProfileId,
  assignedDisplayName,
  assignmentNotes,
  currentProfileId,
  profileToken,
  isChefOrAdmin,
  onAssigned,
}: PrepAssignmentBadgeProps) {
  const [showDropdown, setShowDropdown] = useState(false)
  const [showNotes, setShowNotes] = useState(false)
  const [members, setMembers] = useState<{ profileId: string; displayName: string }[]>([])
  const [notes, setNotes] = useState('')
  const [isPending, startTransition] = useTransition()

  const isAssignedToMe = assignedProfileId && currentProfileId === assignedProfileId

  const handleOpenAssign = async () => {
    if (!isChefOrAdmin || !profileToken) return
    try {
      const result = await getAssignableMembers(groupId)
      setMembers(result)
      setShowDropdown(true)
      setNotes(assignmentNotes ?? '')
    } catch {
      // silently fail - members list couldn't load
    }
  }

  const handleAssign = (profileId: string, displayName: string) => {
    if (!profileToken) return
    startTransition(async () => {
      const result = await assignMemberToMeal({
        groupId,
        profileToken,
        mealEntryId,
        assigneeProfileId: profileId,
        notes: notes.trim() || null,
      })
      if (result.success) {
        setShowDropdown(false)
        onAssigned?.()
      }
    })
  }

  const handleUnassign = () => {
    if (!profileToken) return
    startTransition(async () => {
      const result = await unassignMemberFromMeal({
        groupId,
        profileToken,
        mealEntryId,
      })
      if (result.success) {
        onAssigned?.()
      }
    })
  }

  // No assignment, not a chef - show nothing
  if (!assignedProfileId && !isChefOrAdmin) return null

  // No assignment, chef can assign
  if (!assignedProfileId && isChefOrAdmin) {
    return (
      <div className="relative mt-1">
        <button
          type="button"
          onClick={handleOpenAssign}
          className="rounded-full border border-dashed border-stone-700 px-2 py-0.5 text-[10px] text-stone-600 hover:border-stone-500 hover:text-stone-400 transition-colors"
        >
          + Assign helper
        </button>

        {showDropdown && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)} />
            <div className="absolute left-0 top-full z-50 mt-1 w-56 rounded-lg border border-stone-700 bg-stone-900 p-2 shadow-xl">
              <p className="mb-1.5 text-[10px] font-medium text-stone-400">Assign to:</p>
              <div className="max-h-32 space-y-0.5 overflow-y-auto">
                {members.map((m) => (
                  <button
                    key={m.profileId}
                    type="button"
                    onClick={() => handleAssign(m.profileId, m.displayName)}
                    disabled={isPending}
                    className="w-full rounded px-2 py-1 text-left text-xs text-stone-300 hover:bg-stone-800 disabled:opacity-50"
                  >
                    {m.displayName}
                  </button>
                ))}
                {members.length === 0 && (
                  <p className="px-2 py-1 text-xs text-stone-600">No members found</p>
                )}
              </div>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Instructions for this person (optional)..."
                className="mt-2 w-full rounded bg-stone-800 px-2 py-1 text-xs text-stone-200 placeholder:text-stone-600 focus:outline-none focus:ring-1 focus:ring-[var(--hub-primary,#e88f47)]"
                rows={2}
                maxLength={2000}
              />
            </div>
          </>
        )}
      </div>
    )
  }

  // Has assignment
  return (
    <div className="mt-1">
      <div className="flex items-center gap-1">
        {isAssignedToMe ? (
          <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-[10px] font-medium text-blue-300">
            Your task
          </span>
        ) : (
          <span className="rounded-full bg-stone-700/60 px-2 py-0.5 text-[10px] text-stone-400">
            {assignedDisplayName}
          </span>
        )}
        {isChefOrAdmin && (
          <button
            type="button"
            onClick={handleUnassign}
            disabled={isPending}
            className="text-[10px] text-stone-600 hover:text-red-400 disabled:opacity-50"
            title="Remove assignment"
          >
            x
          </button>
        )}
        {assignmentNotes && (
          <button
            type="button"
            onClick={() => setShowNotes(!showNotes)}
            className="text-[10px] text-stone-600 hover:text-stone-300"
            title={showNotes ? 'Hide notes' : 'Show notes'}
          >
            {showNotes ? '...' : 'notes'}
          </button>
        )}
      </div>

      {/* Assignment notes (expanded) */}
      {showNotes && assignmentNotes && (
        <div className="mt-1 rounded bg-blue-950/30 border border-blue-900/30 px-2 py-1">
          <p className="text-[10px] text-blue-200/80 leading-relaxed whitespace-pre-line">
            {assignmentNotes}
          </p>
        </div>
      )}
    </div>
  )
}
```

#### 4b. My Prep Tasks Card

**Create file:** `components/hub/my-prep-tasks.tsx`

This component shows a focused card at the top of the Meals tab when the current member has prep assignments. It fetches assignments on mount.

```tsx
'use client'

import { useEffect, useState } from 'react'
import { getMyMealAssignments } from '@/lib/hub/prep-assignment-actions'

interface MyPrepTasksProps {
  groupId: string
  groupToken: string
  profileToken: string
}

const MEAL_EMOJI: Record<string, string> = {
  breakfast: 'sunrise',
  lunch: 'sun',
  dinner: 'moon',
  snack: 'apple',
}

function formatMealDate(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00')
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

export function MyPrepTasks({ groupId, groupToken, profileToken }: MyPrepTasksProps) {
  const [assignments, setAssignments] = useState<
    Array<{
      id: string
      meal_date: string
      meal_type: string
      title: string
      description: string | null
      assignment_notes: string | null
      serving_time: string | null
      status: string
    }>
  >([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    getMyMealAssignments({ groupId, groupToken, profileToken })
      .then((result) => {
        if (active) setAssignments(result.assignments)
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [groupId, groupToken, profileToken])

  if (loading) return null
  if (assignments.length === 0) return null

  return (
    <div className="mx-4 mt-4 rounded-xl border border-blue-900/40 bg-blue-950/20 p-3">
      <h3 className="text-xs font-semibold text-blue-300">
        Your Prep Tasks ({assignments.length})
      </h3>
      <div className="mt-2 space-y-2">
        {assignments.map((task) => (
          <div
            key={task.id}
            className="rounded-lg border border-stone-800 bg-stone-900/60 p-2"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-stone-500">
                  {formatMealDate(task.meal_date)}
                </span>
                <span className="text-[10px] text-stone-600 capitalize">{task.meal_type}</span>
              </div>
              {task.status === 'served' && (
                <span className="rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-[9px] text-emerald-400">
                  done
                </span>
              )}
            </div>
            <p className="mt-0.5 text-xs font-medium text-stone-200">{task.title}</p>
            {task.description && (
              <p className="mt-0.5 text-[10px] text-stone-500">{task.description}</p>
            )}
            {task.assignment_notes && (
              <button
                type="button"
                onClick={() => setExpandedId(expandedId === task.id ? null : task.id)}
                className="mt-1 text-[10px] text-blue-400 hover:text-blue-300"
              >
                {expandedId === task.id ? 'Hide instructions' : 'View instructions'}
              </button>
            )}
            {expandedId === task.id && task.assignment_notes && (
              <div className="mt-1.5 rounded bg-blue-950/40 border border-blue-900/30 px-2 py-1.5">
                <p className="text-[10px] text-blue-200/80 leading-relaxed whitespace-pre-line">
                  {task.assignment_notes}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
```

---

### Phase 5: Wiring (Minimal Edits to Existing Files)

#### 5a. Wire PrepAssignmentBadge into WeeklyMealBoard

**File:** `components/hub/weekly-meal-board.tsx`

**Step 1:** Add import at the top of the file, after the existing imports (around line 37):

```ts
import { PrepAssignmentBadge } from './prep-assignment-badge'
```

**Step 2:** The component needs `currentProfileId` as a new prop. Add it to the `WeeklyMealBoardProps` interface (around line 124):

```ts
interface WeeklyMealBoardProps {
  groupId: string
  groupToken: string
  initialEntries: MealBoardEntry[]
  initialLoadError?: string | null
  initialHouseholdSummary?: HouseholdDietarySummary | null
  initialHouseholdError?: string | null
  profileToken: string | null
  isChefOrAdmin: boolean
  currentProfileId?: string | null  // <-- ADD THIS LINE
}
```

Add it to the destructured props in the function signature (around line 148):

```ts
  currentProfileId: currentProfileIdProp,
```

**Step 3:** Find the section that renders attendance and comments for a populated meal entry. Look for this exact code block (around line 1084-1094):

```tsx
                          {/* Attendance + comments (who's eating, discuss) */}
                          {!editMode && !entry.id.startsWith('temp-') && (
                            <div className="mt-1.5 flex items-center gap-2">
                              <MealAttendance groupId={groupId} mealEntryId={entry.id} compact />
```

Insert the PrepAssignmentBadge BEFORE that block (between the allergen conflict warning and the attendance section):

```tsx
                          {/* Prep assignment */}
                          {!editMode && !entry.id.startsWith('temp-') && (
                            <PrepAssignmentBadge
                              groupId={groupId}
                              mealEntryId={entry.id}
                              assignedProfileId={entry.assigned_profile_id ?? null}
                              assignedDisplayName={entry.assigned_display_name ?? null}
                              assignmentNotes={entry.assignment_notes ?? null}
                              currentProfileId={currentProfileIdProp ?? null}
                              profileToken={profileToken}
                              isChefOrAdmin={isChefOrAdmin}
                              onAssigned={() => {
                                getMealBoard({ groupId, groupToken, startDate: weekStart, endDate: weekEnd })
                                  .then(setEntries)
                                  .catch(() => {})
                              }}
                            />
                          )}
```

**Rules for this file:**
- Do NOT rewrite or reformat the file. Only add the import, the prop, and the insertion block.
- Do NOT modify any existing logic, styling, or component behavior.
- The `onAssigned` callback refreshes entries using the existing `getMealBoard` import (already imported at line 14).
- Make sure the `weekStart` and `weekEnd` variables are in scope at the insertion point. They are derived from `formatDateISO(currentMonday)` and `formatDateISO(addDays(currentMonday, 6))`. If they are not already named variables, compute them inline.

#### 5b. Wire MyPrepTasks into HubGroupView

**File:** `app/(public)/hub/g/[groupToken]/hub-group-view.tsx`

**Step 1:** Add import after existing hub component imports (around line 33):

```ts
import { MyPrepTasks } from '@/components/hub/my-prep-tasks'
```

**Step 2:** Find the meals tab rendering (around line 572-582). It currently looks like:

```tsx
        {activeTab === 'meals' && (
          <WeeklyMealBoard
            groupId={group.id}
            groupToken={group.group_token}
            initialEntries={mealBoardEntries}
            initialLoadError={mealBoardError}
            initialHouseholdSummary={householdSummary}
            initialHouseholdError={householdSummaryError}
            profileToken={profileToken}
            isChefOrAdmin={isOwnerOrAdmin}
          />
        )}
```

Replace with:

```tsx
        {activeTab === 'meals' && (
          <>
            {profileToken && (
              <MyPrepTasks
                groupId={group.id}
                groupToken={group.group_token}
                profileToken={profileToken}
              />
            )}
            <WeeklyMealBoard
              groupId={group.id}
              groupToken={group.group_token}
              initialEntries={mealBoardEntries}
              initialLoadError={mealBoardError}
              initialHouseholdSummary={householdSummary}
              initialHouseholdError={householdSummaryError}
              profileToken={profileToken}
              isChefOrAdmin={isOwnerOrAdmin}
              currentProfileId={currentProfileId}
            />
          </>
        )}
```

**Rules for this file:**
- Do NOT rewrite or reformat the file. Only add the import and modify the meals tab section.
- The `currentProfileId` and `profileToken` variables already exist in this component.

---

## What NOT To Do (Codex Guardrails)

1. **Do NOT modify `lib/hub/meal-board-actions.ts`.** The existing `getMealBoard` uses `SELECT *` which automatically picks up new columns.
2. **Do NOT modify the meal edit form** in weekly-meal-board.tsx. Assignment is a separate interaction via the badge.
3. **Do NOT add a new role** like 'learner' to hub_group_members. That's future work.
4. **Do NOT create more than one migration file.**
5. **Do NOT run `drizzle-kit push` or apply migrations.**
6. **Do NOT modify the schema.ts file.** That file is auto-generated.
7. **Do NOT delete any existing code.** All changes are additive.
8. **Do NOT add tests.** The developer will test manually.
9. **Do NOT modify any component not listed in Phase 5.** No nav changes, no layout changes, no new pages.
10. **Do NOT use em dashes anywhere.** Use commas, semicolons, or separate sentences.

---

## Files Touched Summary

| File | Action | Risk |
|------|--------|------|
| `database/migrations/20260425000021_meal_board_prep_assignments.sql` | CREATE | None |
| `lib/hub/types.ts` | EDIT (3 lines) | Low |
| `lib/hub/prep-assignment-actions.ts` | CREATE | None |
| `components/hub/prep-assignment-badge.tsx` | CREATE | None |
| `components/hub/my-prep-tasks.tsx` | CREATE | None |
| `components/hub/weekly-meal-board.tsx` | EDIT (import + prop + 1 block) | Medium |
| `app/(public)/hub/g/[groupToken]/hub-group-view.tsx` | EDIT (import + wrap meals tab) | Low |

---

## Testing Checklist (for developer, not Codex)

- [ ] Migration applies cleanly to local DB
- [ ] Meal board still renders correctly with no assignments
- [ ] Chef can click "Assign helper" and see member dropdown
- [ ] Chef can assign a member with notes
- [ ] Assigned member sees "Your task" badge on the meal entry
- [ ] Assigned member sees "My Prep Tasks" card at top of Meals tab
- [ ] Assignment notes expand/collapse correctly
- [ ] Chef can remove assignment (x button)
- [ ] Non-chef members cannot see "Assign" button
- [ ] Members with no assignments don't see the prep tasks card
