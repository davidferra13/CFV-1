'use server'

// Event Closure Streaks
// Tracks how many consecutive events the chef has financially closed within 48 hours
// of the event completing. Used to build accountability habit reinforcement.
//
// Rules:
// - Closing an event within 48h of the event date: streak increments
// - Gap of >7 days since last closure: streak resets
// - Milestone messages at 3, 7, 14, 30

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

export type ClosureStreakData = {
  currentStreak: number
  longestStreak: number
  lastClosureDate: string | null
  milestoneMessage: string | null
}

const MILESTONE_MESSAGES: Record<number, string> = {
  3: 'Hat trick - 3 events closed on time in a row!',
  7: 'One week streak - your finances are pristine',
  14: '2-week streak - the rare chef who closes clean',
  30: 'Month-long streak - legendary closure discipline',
}

function getMilestoneMessage(streak: number): string | null {
  return MILESTONE_MESSAGES[streak] ?? null
}

/**
 * Get the current chef's closure streak data for display.
 */
export async function getClosureStreak(): Promise<ClosureStreakData> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: chef } = await db
    .from('chefs')
    .select('current_closure_streak, longest_closure_streak, last_closure_date')
    .eq('id', user.entityId!)
    .single()

  if (!chef) {
    return { currentStreak: 0, longestStreak: 0, lastClosureDate: null, milestoneMessage: null }
  }

  const current = (chef as any).current_closure_streak ?? 0
  const longest = (chef as any).longest_closure_streak ?? 0
  const lastDate = (chef as any).last_closure_date ?? null

  return {
    currentStreak: current,
    longestStreak: longest,
    lastClosureDate: lastDate,
    milestoneMessage: getMilestoneMessage(current),
  }
}

/**
 * Called when a chef financially closes an event.
 * Updates streak based on how quickly the event was closed relative to event date.
 * eventDate: YYYY-MM-DD string of when the event occurred.
 */
export async function recordClosureForStreak(eventDate: string): Promise<void> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: chef } = await db
    .from('chefs')
    .select('current_closure_streak, longest_closure_streak, last_closure_date')
    .eq('id', user.entityId!)
    .single()

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const eventDt = new Date(eventDate + 'T12:00:00')
  const hoursAfterEvent = (today.getTime() - eventDt.getTime()) / (1000 * 60 * 60)
  const closedOnTime = hoursAfterEvent <= 48

  const currentStreak = (chef as any)?.current_closure_streak ?? 0
  const longestStreak = (chef as any)?.longest_closure_streak ?? 0
  const lastClosureDateStr = (chef as any)?.last_closure_date as string | null

  // Gap detection: if last closure was >7 days ago, reset streak
  let newStreak: number
  if (lastClosureDateStr) {
    const lastDt = new Date(lastClosureDateStr + 'T12:00:00')
    const daysSinceLastClosure = (today.getTime() - lastDt.getTime()) / (1000 * 60 * 60 * 24)
    if (daysSinceLastClosure > 7) {
      // Streak broken - start fresh
      newStreak = closedOnTime ? 1 : 0
    } else {
      newStreak = closedOnTime ? currentStreak + 1 : Math.max(0, currentStreak - 0) // don't penalize, just don't increment
    }
  } else {
    newStreak = closedOnTime ? 1 : 0
  }

  const newLongest = Math.max(longestStreak, newStreak)
  const todayStr = today.toISOString().split('T')[0]

  await db
    .from('chefs')
    .update({
      current_closure_streak: newStreak,
      longest_closure_streak: newLongest,
      last_closure_date: todayStr,
    } as any)
    .eq('id', user.entityId!)
}
