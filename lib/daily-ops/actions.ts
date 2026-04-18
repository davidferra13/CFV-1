'use server'

// Daily Ops - Server Actions
// Orchestrates all data fetches, runs the plan engine, and handles item completion/dismissal.
// Every action is tenant-scoped via requireChef().

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import { getPriorityQueue } from '@/lib/queue/actions'
import { getDOPTaskDigest } from '@/lib/scheduling/task-digest'
import { getNextBestActions } from '@/lib/clients/next-best-action'
import { getOverdueFollowUps } from '@/lib/dashboard/accountability'
import { getTodos, toggleTodo } from '@/lib/todos/actions'
import { getRecipeDebt } from '@/lib/recipes/actions'
import { getUpcomingCalls } from '@/lib/calls/actions'
import { listProtectedBlocks } from '@/lib/scheduling/protected-time-actions'
import { toggleDOPTaskCompletion } from '@/lib/scheduling/dop-completions'
import { buildDailyPlan, type PlanEngineInput } from './plan-engine'
import type { DailyPlan } from './types'

// ============================================
// SAFE WRAPPER
// ============================================

async function safe<T>(label: string, fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn()
  } catch (err) {
    console.error(`[DailyOps] ${label} failed:`, err)
    return fallback
  }
}

// ============================================
// GET DAILY PLAN
// ============================================

export async function getDailyPlan(): Promise<DailyPlan> {
  const user = await requireChef()
  const db: any = createServerClient()
  const _td = new Date()
  const todayStr = `${_td.getFullYear()}-${String(_td.getMonth() + 1).padStart(2, '0')}-${String(_td.getDate()).padStart(2, '0')}`

  // 20-second deadline: if data fetching hangs (e.g. connection pool exhausted),
  // throw to the error boundary so the page shows a real error instead of a permanent skeleton.
  let timeoutHandle: ReturnType<typeof setTimeout>
  const planDeadline = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(
      () => reject(new Error('[DailyOps] Timeout: getDailyPlan took too long')),
      20000
    )
  })

  const results = await Promise.race([
    Promise.all([
      safe('queue', getPriorityQueue, {
        items: [],
        nextAction: null,
        summary: {
          totalItems: 0,
          byDomain: {
            inquiry: 0,
            message: 0,
            quote: 0,
            event: 0,
            financial: 0,
            post_event: 0,
            client: 0,
            culinary: 0,
            network: 0,
          },
          byUrgency: { critical: 0, high: 0, normal: 0, low: 0 },
          allCaughtUp: true,
        },
        computedAt: new Date().toISOString(),
      }),
      safe('dopDigest', getDOPTaskDigest, {
        tasks: [],
        overdueCount: 0,
        dueTodayCount: 0,
        upcomingCount: 0,
        totalIncomplete: 0,
      }),
      safe('nba', () => getNextBestActions(10), []),
      safe('followUps', () => getOverdueFollowUps(10), []),
      safe('todos', getTodos, []),
      safe('recipeDebt', getRecipeDebt, {
        total: 0,
        last7Days: 0,
        last30Days: 0,
        older: 0,
        totalRecipes: 0,
      }),
      safe('calls', () => getUpcomingCalls(10), []),
      safe('protectedBlocks', listProtectedBlocks, []),
      // Fetch today's dismissals
      safe(
        'dismissals',
        async () => {
          const { data } = await db
            .from('daily_plan_dismissals')
            .select('item_key')
            .eq('chef_id', user.tenantId!)
            .eq('dismissed_date', todayStr)
          return data ?? []
        },
        []
      ),
      // Fetch today's events for context
      safe(
        'todayEvents',
        async () => {
          const { data } = await db
            .from('events')
            .select('id, occasion, serve_time, guest_count, client:clients(full_name)')
            .eq('tenant_id', user.tenantId!)
            .eq('event_date', todayStr)
            .not('status', 'eq', 'cancelled')
            .order('serve_time', { ascending: true })
          return data ?? []
        },
        []
      ),
    ]),
    planDeadline,
  ])

  clearTimeout(timeoutHandle!)

  const [
    queue,
    dopDigest,
    nextBestActions,
    overdueFollowUps,
    todos,
    recipeDebt,
    upcomingCalls,
    protectedBlocks,
    dismissalRows,
    todayEventsRaw,
  ] = results

  // Build dismissed keys set
  const dismissedKeys = new Set<string>(dismissalRows.map((r: any) => r.item_key))

  // Map today's events
  const todayEvents = todayEventsRaw.map((e: any) => ({
    id: e.id as string,
    occasion: e.occasion as string | null,
    clientName: (e.client as any)?.full_name ?? 'Unknown',
    serveTime: (e.serve_time as string) ?? 'TBD',
    guestCount: (e.guest_count as number) ?? 0,
  }))

  // Map protected time
  const todayProtected = protectedBlocks
    .filter((b) => b.start_date <= todayStr && b.end_date >= todayStr)
    .map((b) => ({
      title: b.title,
      startDate: b.start_date,
      endDate: b.end_date,
      blockType: b.block_type,
    }))

  // Map upcoming calls
  const callsMapped = (upcomingCalls as any[]).map((c: any) => ({
    id: c.id,
    call_type: c.call_type,
    scheduled_at: c.scheduled_at,
    client_name: c.client_name ?? c.contact_name,
    title: c.title,
  }))

  // Build the plan
  const input: PlanEngineInput = {
    queue,
    dopDigest,
    nextBestActions,
    overdueFollowUps,
    todos,
    recipeDebt,
    upcomingCalls: callsMapped,
    todayEvents,
    protectedTime: todayProtected,
    dismissedKeys,
  }

  return buildDailyPlan(input)
}

// ============================================
// COMPLETE A PLAN ITEM
// ============================================

export async function completeDailyPlanItem(
  itemId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Parse the source system and ID from the item key
    const [sourceSystem, ...rest] = itemId.split(':')
    const sourceId = rest.join(':')

    switch (sourceSystem) {
      case 'dop': {
        // Format: dop:eventId:taskId
        const [eventId, taskId] = sourceId.split(':')
        if (eventId && taskId) {
          await toggleDOPTaskCompletion(eventId, taskId)
        }
        break
      }
      case 'todo': {
        // Format: todo:todoId
        if (sourceId) {
          await toggleTodo(sourceId)
        }
        break
      }
      // Queue items, NBA items, follow-ups, etc. don't have a "complete" action
      // - they resolve by the chef taking the action (following the deep link).
      // We dismiss them instead.
      default: {
        await dismissDailyPlanItem(itemId)
        break
      }
    }

    revalidatePath('/daily')
    revalidatePath('/dashboard')
    return { success: true }
  } catch (err) {
    console.error('[DailyOps] completeDailyPlanItem failed:', err)
    return { success: false, error: 'Failed to complete item' }
  }
}

// ============================================
// DISMISS (SNOOZE) A PLAN ITEM
// ============================================

export async function dismissDailyPlanItem(
  itemKey: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await requireChef()
    const db: any = createServerClient()
    const _td = new Date()
    const todayStr = `${_td.getFullYear()}-${String(_td.getMonth() + 1).padStart(2, '0')}-${String(_td.getDate()).padStart(2, '0')}`

    const { error } = await db.from('daily_plan_dismissals').upsert(
      {
        chef_id: user.tenantId!,
        item_key: itemKey,
        dismissed_date: todayStr,
      },
      { onConflict: 'chef_id,item_key,dismissed_date' }
    )

    if (error) {
      console.error('[DailyOps] dismissDailyPlanItem failed:', error)
      return { success: false, error: 'Failed to dismiss item' }
    }

    revalidatePath('/daily')
    return { success: true }
  } catch (err) {
    console.error('[DailyOps] dismissDailyPlanItem failed:', err)
    return { success: false, error: 'Failed to dismiss item' }
  }
}

// ============================================
// GET DAILY PLAN STATS (lightweight, for dashboard banner)
// ============================================

export async function getDailyPlanStats(): Promise<{
  totalItems: number
  completedItems: number
  adminItems: number
  prepItems: number
  creativeItems: number
  relationshipItems: number
  estimatedMinutes: number
} | null> {
  try {
    const plan = await getDailyPlan()
    return plan.stats
  } catch {
    return null
  }
}
