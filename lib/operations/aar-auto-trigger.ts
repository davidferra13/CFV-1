'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

// -- Types --

export type AARStatus = {
  shouldPrompt: boolean
  eventId: string
  eventName: string | null
  completedAt: string | null
  aarExists: boolean
}

// -- Server Actions --

/**
 * Check if a specific event needs an AAR filed.
 * Called from event detail or daily ops to prompt the chef.
 */
export async function checkAARNeeded(eventId: string): Promise<AARStatus> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: event } = await db
    .from('events')
    .select('id, occasion, status, service_completed_at, aar_filed')
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .maybeSingle()

  if (!event) {
    return {
      shouldPrompt: false,
      eventId,
      eventName: null,
      completedAt: null,
      aarExists: false,
    }
  }

  // Also check the after_action_reviews table as a secondary source
  const { data: existingAAR } = await db
    .from('after_action_reviews')
    .select('id')
    .eq('event_id', eventId)
    .limit(1)

  const aarFiled = event.aar_filed === true || (existingAAR && existingAAR.length > 0)
  const isCompleted = event.status === 'completed'

  return {
    shouldPrompt: isCompleted && !aarFiled,
    eventId: event.id,
    eventName: event.occasion,
    completedAt: event.service_completed_at ?? null,
    aarExists: aarFiled,
  }
}

/**
 * Get recently completed events needing AAR (for daily ops views).
 * Distinct from getEventsNeedingAAR in aar-prompt-actions.ts:
 * this returns AARStatus objects for banner rendering.
 */
export async function getRecentEventsNeedingAAR(): Promise<AARStatus[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Look back 7 days
  const now = new Date()
  const sevenDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7)
  const sevenDaysAgoStr = `${sevenDaysAgo.getFullYear()}-${String(sevenDaysAgo.getMonth() + 1).padStart(2, '0')}-${String(sevenDaysAgo.getDate()).padStart(2, '0')}`

  const { data: events } = await db
    .from('events')
    .select('id, occasion, status, service_completed_at, aar_filed')
    .eq('tenant_id', user.tenantId!)
    .eq('status', 'completed')
    .gte('event_date', sevenDaysAgoStr)
    .order('event_date', { ascending: false })
    .limit(5)

  if (!events || events.length === 0) return []

  // Check which events already have AARs in the reviews table
  const eventIds = events.map((e: any) => e.id)
  const { data: existingAARs } = await db
    .from('after_action_reviews')
    .select('event_id')
    .in('event_id', eventIds)

  const completedAARs = new Set((existingAARs ?? []).map((a: any) => a.event_id))

  return events
    .filter((event: any) => !event.aar_filed && !completedAARs.has(event.id))
    .map((event: any) => ({
      shouldPrompt: true,
      eventId: event.id,
      eventName: event.occasion,
      completedAt: event.service_completed_at ?? null,
      aarExists: false,
    }))
}
