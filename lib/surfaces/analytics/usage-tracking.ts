'use server'

import { requireChef } from '@/lib/auth/get-user'
import { pgClient } from '@/lib/db'

// ── Types ──────────────────────────────────────────────────────────────────

type SurfaceEventType = 'visit' | 'action' | 'pin' | 'unpin' | 'dismiss' | 'restore' | 'search_hit'

export type PinnedSurface = {
  id: number
  routePath: string
  label: string | null
  position: number
  createdAt: string
}

export type SurfaceUsageStat = {
  routePath: string
  visitCount: number
  actionCount: number
  lastVisited: string | null
}

// ── Internal helpers ───────────────────────────────────────────────────────

async function insertUsageEvent(
  chefId: string,
  routePath: string,
  eventType: SurfaceEventType,
  metadata: Record<string, unknown> = {},
  sessionId?: string
): Promise<void> {
  try {
    await pgClient`
      INSERT INTO surface_usage_events (chef_id, route_path, event_type, metadata, session_id)
      VALUES (${chefId}, ${routePath}, ${eventType}, ${JSON.stringify(metadata)}, ${sessionId ?? null})
    `
  } catch (err) {
    // Fire-and-forget: never block page loads on analytics failure
    console.error('[surface-usage] insert failed (non-fatal):', err)
  }
}

// ── Public server actions ──────────────────────────────────────────────────

/**
 * Log a page visit. Called when a chef navigates to a surface.
 * Fire-and-forget: never throws.
 */
export async function logSurfaceVisit(
  routePath: string,
  metadata: Record<string, unknown> = {},
  sessionId?: string
): Promise<void> {
  try {
    const user = await requireChef()
    await insertUsageEvent(user.entityId, routePath, 'visit', metadata, sessionId)
  } catch {
    // Auth failure or insert failure: silently ignore
  }
}

/**
 * Log an action taken on a surface (button click, form submit, etc.).
 * Fire-and-forget: never throws.
 */
export async function logSurfaceAction(
  routePath: string,
  actionName: string,
  metadata: Record<string, unknown> = {},
  sessionId?: string
): Promise<void> {
  try {
    const user = await requireChef()
    await insertUsageEvent(
      user.entityId,
      routePath,
      'action',
      { actionName, ...metadata },
      sessionId
    )
  } catch {
    // Fire-and-forget
  }
}

/**
 * Pin or unpin a surface. Manages both the usage event and the pinned_surfaces table.
 */
export async function logSurfacePin(
  routePath: string,
  pin: boolean,
  label?: string
): Promise<{ success: boolean }> {
  try {
    const user = await requireChef()
    const chefId = user.entityId

    if (pin) {
      // Get next position
      const [maxRow] = await pgClient`
        SELECT COALESCE(MAX(position), -1) + 1 AS next_pos
        FROM chef_pinned_surfaces
        WHERE chef_id = ${chefId}
      `
      const nextPos = (maxRow as { next_pos: number }).next_pos

      await pgClient`
        INSERT INTO chef_pinned_surfaces (chef_id, route_path, label, position)
        VALUES (${chefId}, ${routePath}, ${label ?? null}, ${nextPos})
        ON CONFLICT (chef_id, route_path) DO UPDATE SET label = EXCLUDED.label, position = EXCLUDED.position
      `
      await insertUsageEvent(chefId, routePath, 'pin')
    } else {
      await pgClient`
        DELETE FROM chef_pinned_surfaces
        WHERE chef_id = ${chefId} AND route_path = ${routePath}
      `
      await insertUsageEvent(chefId, routePath, 'unpin')
    }

    return { success: true }
  } catch (err) {
    console.error('[surface-usage] pin/unpin failed:', err)
    return { success: false }
  }
}

/**
 * Get all pinned surfaces for the current chef, ordered by position.
 */
export async function getPinnedSurfaces(): Promise<PinnedSurface[]> {
  try {
    const user = await requireChef()
    const rows = await pgClient`
      SELECT id, route_path, label, position, created_at
      FROM chef_pinned_surfaces
      WHERE chef_id = ${user.entityId}
      ORDER BY position ASC
    `
    return rows.map((r: Record<string, unknown>) => ({
      id: r.id as number,
      routePath: r.route_path as string,
      label: r.label as string | null,
      position: r.position as number,
      createdAt: String(r.created_at),
    }))
  } catch (err) {
    console.error('[surface-usage] getPinnedSurfaces failed:', err)
    return []
  }
}

/**
 * Get usage stats for the current chef, aggregated by route.
 * Returns visit and action counts per route, ordered by most visited.
 */
export async function getSurfaceUsageStats(
  options: { since?: string; limit?: number } = {}
): Promise<SurfaceUsageStat[]> {
  try {
    const user = await requireChef()
    const since = options.since ?? '1970-01-01'
    const limit = options.limit ?? 50

    const rows = await pgClient`
      SELECT
        route_path,
        COUNT(*) FILTER (WHERE event_type = 'visit') AS visit_count,
        COUNT(*) FILTER (WHERE event_type = 'action') AS action_count,
        MAX(created_at) FILTER (WHERE event_type = 'visit') AS last_visited
      FROM surface_usage_events
      WHERE chef_id = ${user.entityId}
        AND created_at >= ${since}::timestamptz
      GROUP BY route_path
      ORDER BY visit_count DESC
      LIMIT ${limit}
    `
    return rows.map((r: Record<string, unknown>) => ({
      routePath: r.route_path as string,
      visitCount: Number(r.visit_count),
      actionCount: Number(r.action_count),
      lastVisited: r.last_visited ? String(r.last_visited) : null,
    }))
  } catch (err) {
    console.error('[surface-usage] getSurfaceUsageStats failed:', err)
    return []
  }
}
