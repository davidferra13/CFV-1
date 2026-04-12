'use server'

// Split Settlement Actions
// Computes revenue splits for multi-chef events based on collaborator
// roles, station assignments, and agreed percentages.
// Pure math, no AI.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

// ── Types ──────────────────────────────────────────────────────────────────

export type CollaboratorSettlement = {
  collaboratorId: string
  chefId: string
  chefName: string
  role: string
  station: string | null
  splitPercent: number
  splitAmountCents: number
  status: 'pending' | 'confirmed' | 'paid'
}

export type EventSettlement = {
  eventId: string
  eventName: string
  totalRevenueCents: number
  collaborators: CollaboratorSettlement[]
  hostChefSplitCents: number
  hostChefSplitPercent: number
}

// ── Default split percentages by role ──────────────────────────────────────

const DEFAULT_SPLITS: Record<string, number> = {
  lead_chef: 40,
  sous_chef: 25,
  line_cook: 20,
  pastry_chef: 25,
  server: 15,
  assistant: 15,
  bartender: 20,
}

// ── getEventSettlement ─────────────────────────────────────────────────────

/**
 * Calculates the revenue split for a multi-chef event.
 * Uses collaborator roles and custom percentages if set.
 * Falls back to default role-based splits.
 */
export async function getEventSettlement(eventId: string): Promise<EventSettlement | null> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Fetch event with revenue data
  const { data: event, error: eventError } = await db
    .from('events')
    .select('id, occasion, quoted_price_cents, amount_paid_cents')
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (eventError || !event) {
    console.error('[getEventSettlement] Event fetch error:', eventError)
    return null
  }

  // Fetch collaborators
  const { data: collabs, error: collabError } = await db
    .from('event_collaborators')
    .select(
      `
      id, chef_id, role, status, note,
      permissions
    `
    )
    .eq('event_id', eventId)
    .in('status', ['accepted', 'confirmed'])

  if (collabError) {
    console.error('[getEventSettlement] Collaborator fetch error:', collabError)
    return null
  }

  if (!collabs || collabs.length === 0) {
    return null // No collaborators, no split needed
  }

  // Fetch chef names for collaborators
  const chefIds = collabs.map((c: any) => c.chef_id)
  const { data: chefs } = await db.from('chefs').select('id, business_name').in('id', chefIds)

  const chefNameMap: Record<string, string> = {}
  for (const chef of chefs ?? []) {
    chefNameMap[chef.id] = chef.business_name || 'Unknown'
  }

  const totalRevenue = event.amount_paid_cents ?? event.quoted_price_cents ?? 0

  // Calculate splits
  const collaborators: CollaboratorSettlement[] = collabs.map((c: any) => {
    // Check for custom split in permissions JSON
    const customSplit = c.permissions?.split_percent
    const splitPercent =
      typeof customSplit === 'number' ? customSplit : (DEFAULT_SPLITS[c.role] ?? 15)

    return {
      collaboratorId: c.id,
      chefId: c.chef_id,
      chefName: chefNameMap[c.chef_id] ?? 'Unknown',
      role: c.role,
      station: c.permissions?.station ?? null,
      splitPercent,
      splitAmountCents: Math.round((totalRevenue * splitPercent) / 100),
      status: 'pending' as const,
    }
  })

  // Host chef gets the remainder
  const totalCollabPercent = collaborators.reduce((sum, c) => sum + c.splitPercent, 0)
  const hostPercent = Math.max(0, 100 - totalCollabPercent)
  const hostAmount = totalRevenue - collaborators.reduce((sum, c) => sum + c.splitAmountCents, 0)

  return {
    eventId: event.id,
    eventName: event.occasion ?? 'Untitled Event',
    totalRevenueCents: totalRevenue,
    collaborators,
    hostChefSplitCents: hostAmount,
    hostChefSplitPercent: hostPercent,
  }
}

// ── getEventCollaboratorsWithStations ──────────────────────────────────────

/**
 * Gets collaborators organized by station assignment.
 * Used for the station board view.
 */
export async function getEventCollaboratorsWithStations(eventId: string): Promise<{
  stations: Record<string, Array<{ chefName: string; role: string; chefId: string }>>
  unassigned: Array<{ chefName: string; role: string; chefId: string }>
} | null> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: collabs, error } = await db
    .from('event_collaborators')
    .select('chef_id, role, permissions, status')
    .eq('event_id', eventId)
    .in('status', ['accepted', 'confirmed'])

  if (error || !collabs?.length) return null

  // Fetch chef names
  const chefIds = collabs.map((c: any) => c.chef_id)
  const { data: chefs } = await db.from('chefs').select('id, business_name').in('id', chefIds)

  const chefNameMap: Record<string, string> = {}
  for (const chef of chefs ?? []) {
    chefNameMap[chef.id] = chef.business_name || 'Unknown'
  }

  const stations: Record<string, Array<{ chefName: string; role: string; chefId: string }>> = {}
  const unassigned: Array<{ chefName: string; role: string; chefId: string }> = []

  for (const c of collabs) {
    const entry = {
      chefName: chefNameMap[c.chef_id] ?? 'Unknown',
      role: c.role,
      chefId: c.chef_id,
    }

    const station = c.permissions?.station
    if (station) {
      if (!stations[station]) stations[station] = []
      stations[station].push(entry)
    } else {
      unassigned.push(entry)
    }
  }

  return { stations, unassigned }
}
