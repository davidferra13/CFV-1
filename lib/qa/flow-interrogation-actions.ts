'use server'

import { requireAdmin } from '@/lib/auth/admin'
import { pgClient } from '@/lib/db'
import type { FlowInterrogationReport, FlowChainResult, OrphanedEntity } from './flow-types'

// ---------------------------------------------------------------------------
// Cross-Boundary Flow Interrogation
// Traces entity flows across domain boundaries and reports broken chains.
// ---------------------------------------------------------------------------

export async function runFlowInterrogation(): Promise<FlowInterrogationReport> {
  await requireAdmin()

  const [inquiryChain, commChain, loyaltyChain, orphans] = await Promise.all([
    traceInquiryEventMenuRecipeChain(),
    traceEventCommunicationNotificationChain(),
    traceClientLoyaltyRewardChain(),
    detectOrphanedEntities(),
  ])

  const chains = [inquiryChain, commChain, loyaltyChain]
  const brokenChains = chains.filter((c) => c.broken).length

  return {
    chains,
    orphanedEntities: orphans,
    deadEndFlows: [],
    totalChainsChecked: chains.length,
    brokenChains,
    runAt: new Date().toISOString(),
  }
}

// ---------------------------------------------------------------------------
// Chain 1: Inquiry -> Event -> Menu -> Recipe
// ---------------------------------------------------------------------------

async function traceInquiryEventMenuRecipeChain(): Promise<FlowChainResult> {
  try {
    // Find an inquiry that has an event, check if menu and recipe exist
    const rows = await pgClient`
      SELECT
        i.id AS inquiry_id, i.status AS inquiry_status,
        e.id AS event_id, e.status AS event_status,
        m.id AS menu_id,
        mi.recipe_id
      FROM inquiries i
      LEFT JOIN events e ON e.inquiry_id = i.id
      LEFT JOIN menus m ON m.event_id = e.id
      LEFT JOIN menu_items mi ON mi.menu_id = m.id
      WHERE i.status NOT IN ('draft', 'cancelled')
      ORDER BY i.created_at DESC
      LIMIT 5
    `

    const sample = rows as unknown as {
      inquiry_id: string
      inquiry_status: string
      event_id: string | null
      event_status: string | null
      menu_id: string | null
      recipe_id: string | null
    }[]

    // Check for broken: inquiry with event but no menu on accepted events
    const brokenEntry = sample.find(
      (r) => r.event_id && r.event_status === 'accepted' && !r.menu_id
    )

    return {
      chain: 'inquiry->event->menu->recipe',
      steps: sample.slice(0, 1).map((r) => ({
        entity: 'inquiry',
        entityId: r.inquiry_id,
        status: r.inquiry_status,
        linkedTo: r.event_id,
      })),
      broken: !!brokenEntry,
      orphanedAt: brokenEntry ? 'event->menu' : undefined,
    }
  } catch (err) {
    return {
      chain: 'inquiry->event->menu->recipe',
      steps: [],
      broken: true,
      error: String(err),
    }
  }
}

// ---------------------------------------------------------------------------
// Chain 2: Event -> Communication -> Notification delivery
// ---------------------------------------------------------------------------

async function traceEventCommunicationNotificationChain(): Promise<FlowChainResult> {
  try {
    const rows = await pgClient`
      SELECT
        e.id AS event_id,
        e.status AS event_status,
        cm.id AS comm_id,
        n.id AS notification_id,
        n.delivered_at
      FROM events e
      LEFT JOIN communications cm ON cm.event_id = e.id
      LEFT JOIN notifications n ON n.reference_id = cm.id::text
        AND n.reference_type = 'communication'
      WHERE e.status IN ('accepted', 'confirmed', 'completed')
      ORDER BY e.created_at DESC
      LIMIT 5
    `

    const sample = rows as unknown as {
      event_id: string
      event_status: string
      comm_id: string | null
      notification_id: string | null
      delivered_at: string | null
    }[]

    const brokenEntry = sample.find((r) => r.comm_id && !r.notification_id)

    return {
      chain: 'event->communication->notification',
      steps: sample.slice(0, 1).map((r) => ({
        entity: 'event',
        entityId: r.event_id,
        status: r.event_status,
        linkedTo: r.comm_id,
      })),
      broken: !!brokenEntry,
      orphanedAt: brokenEntry ? 'communication->notification' : undefined,
    }
  } catch (err) {
    return {
      chain: 'event->communication->notification',
      steps: [],
      broken: true,
      error: String(err),
    }
  }
}

// ---------------------------------------------------------------------------
// Chain 3: Client -> Loyalty -> Reward
// ---------------------------------------------------------------------------

async function traceClientLoyaltyRewardChain(): Promise<FlowChainResult> {
  try {
    const rows = await pgClient`
      SELECT
        c.id AS client_id,
        lp.id AS loyalty_id,
        lp.points_balance,
        lr.id AS reward_id
      FROM clients c
      LEFT JOIN loyalty_profiles lp ON lp.client_id = c.id
      LEFT JOIN loyalty_rewards lr ON lr.loyalty_profile_id = lp.id
        AND lr.status = 'earned'
      WHERE c.created_at >= now() - INTERVAL '90 days'
      ORDER BY c.created_at DESC
      LIMIT 5
    `

    const sample = rows as unknown as {
      client_id: string
      loyalty_id: string | null
      points_balance: number | null
      reward_id: string | null
    }[]

    const brokenEntry = sample.find(
      (r) => r.loyalty_id && (r.points_balance ?? 0) > 100 && !r.reward_id
    )

    return {
      chain: 'client->loyalty->reward',
      steps: sample.slice(0, 1).map((r) => ({
        entity: 'client',
        entityId: r.client_id,
        status: r.loyalty_id ? 'has_loyalty' : 'no_loyalty',
        linkedTo: r.loyalty_id,
      })),
      broken: !!brokenEntry,
      orphanedAt: brokenEntry ? 'loyalty->reward' : undefined,
    }
  } catch (err) {
    return {
      chain: 'client->loyalty->reward',
      steps: [],
      broken: true,
      error: String(err),
    }
  }
}

// ---------------------------------------------------------------------------
// Orphaned Entity Detection
// ---------------------------------------------------------------------------

async function detectOrphanedEntities(): Promise<OrphanedEntity[]> {
  const orphans: OrphanedEntity[] = []

  try {
    // Events with no chef
    const eventsNoChefsRows = await pgClient`
      SELECT COUNT(*)::int AS count FROM events WHERE chef_id IS NULL
    `
    const eventsNoChefs = (eventsNoChefsRows[0] as { count: number } | undefined)?.count ?? 0
    if (eventsNoChefs > 0) {
      orphans.push({
        table: 'events',
        id: 'multiple',
        reason: `${eventsNoChefs} events with no chef_id`,
      })
    }

    // Menu items with no recipe
    const menuItemsNoRecipeRows = await pgClient`
      SELECT COUNT(*)::int AS count
      FROM menu_items
      WHERE recipe_id IS NULL AND custom_item = false
    `
    const menuItemsNoRecipe =
      (menuItemsNoRecipeRows[0] as { count: number } | undefined)?.count ?? 0
    if (menuItemsNoRecipe > 0) {
      orphans.push({
        table: 'menu_items',
        id: 'multiple',
        reason: `${menuItemsNoRecipe} menu items with no recipe (non-custom)`,
      })
    }
  } catch (err) {
    console.error('[runFlowInterrogation] orphan detection failed:', err)
  }

  return orphans
}
