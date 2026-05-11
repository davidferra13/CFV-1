// Service Day Live - Client-facing prep/service milestone tracker
// Reads existing time-tracking columns from events table to show real-time progress

'use server'

import { requireClient } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { z } from 'zod'

export type ServiceMilestone = {
  key: 'confirmed' | 'shopping' | 'prepping' | 'en_route' | 'serving'
  label: string
  description: string
  reachedAt: string | null
  isActive: boolean
}

export type ServiceDayStatus = {
  eventId: string
  eventName: string
  eventDate: string
  currentStage: ServiceMilestone['key'] | null
  milestones: ServiceMilestone[]
  lastUpdatedAt: string | null
}

const eventIdSchema = z.string().uuid()

/**
 * Get the full service day status for a client's event.
 * Returns milestones derived from the event's time-tracking columns.
 */
export async function getServiceDayStatus(eventId: string): Promise<ServiceDayStatus | null> {
  const parsed = eventIdSchema.safeParse(eventId)
  if (!parsed.success) {
    throw new Error('Invalid event ID')
  }

  const user = await requireClient()
  const db: any = createServerClient()

  const { data: event, error } = await db
    .from('events')
    .select(
      `id, occasion, event_date, status,
       shopping_started_at, prep_started_at, travel_started_at, service_started_at`
    )
    .eq('id', parsed.data)
    .eq('client_id', user.entityId)
    .single()

  if (error || !event) {
    return null
  }

  // Only show service day live for confirmed/in_progress events
  if (!['confirmed', 'in_progress'].includes(event.status)) {
    return null
  }

  const milestones = buildMilestones(event)
  const currentStage = getCurrentStage(milestones)
  const lastUpdatedAt = getLastUpdatedAt(event)

  return {
    eventId: event.id,
    eventName: event.occasion || 'Your Event',
    eventDate: event.event_date,
    currentStage,
    milestones,
    lastUpdatedAt,
  }
}

/**
 * Get just the milestones array (lighter payload for polling).
 */
export async function getServiceDayMilestones(eventId: string): Promise<ServiceMilestone[] | null> {
  const status = await getServiceDayStatus(eventId)
  if (!status) return null
  return status.milestones
}

function buildMilestones(event: any): ServiceMilestone[] {
  const milestones: ServiceMilestone[] = [
    {
      key: 'confirmed',
      label: 'Confirmed',
      description: 'Your event is confirmed and on the calendar',
      reachedAt: event.event_date, // always true for confirmed+ events
      isActive: false,
    },
    {
      key: 'shopping',
      label: 'Shopping',
      description: 'Your chef is sourcing fresh ingredients',
      reachedAt: event.shopping_started_at ?? null,
      isActive: false,
    },
    {
      key: 'prepping',
      label: 'Prepping',
      description: 'Prep work is underway in the kitchen',
      reachedAt: event.prep_started_at ?? null,
      isActive: false,
    },
    {
      key: 'en_route',
      label: 'En Route',
      description: 'Your chef is on the way to your venue',
      reachedAt: event.travel_started_at ?? null,
      isActive: false,
    },
    {
      key: 'serving',
      label: 'Serving',
      description: 'Your chef has arrived and service is active',
      reachedAt: event.service_started_at ?? null,
      isActive: false,
    },
  ]

  // Mark the current active milestone (last reached one that does not have a successor reached)
  let lastReachedIndex = -1
  for (let i = 0; i < milestones.length; i++) {
    if (milestones[i].reachedAt) {
      lastReachedIndex = i
    }
  }

  if (lastReachedIndex >= 0) {
    milestones[lastReachedIndex].isActive = true
  }

  return milestones
}

function getCurrentStage(milestones: ServiceMilestone[]): ServiceMilestone['key'] | null {
  const active = milestones.find((m) => m.isActive)
  return active?.key ?? null
}

function getLastUpdatedAt(event: any): string | null {
  const timestamps = [
    event.service_started_at,
    event.travel_started_at,
    event.prep_started_at,
    event.shopping_started_at,
  ].filter(Boolean)

  if (timestamps.length === 0) return null
  // Return most recent timestamp
  return timestamps.sort((a: string, b: string) => new Date(b).getTime() - new Date(a).getTime())[0]
}
