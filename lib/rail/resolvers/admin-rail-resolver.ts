// lib/rail/resolvers/admin-rail-resolver.ts
// Admin-specific rail sources: tenant health, system alerts, pending approvals.
// Called from the aggregator for admin users only.

import type { RailItem, RailTier } from '@/lib/rail/types'

const MAX_ITEMS = 10

// ---------------------------------------------------------------------------
// Tenant health check
// ---------------------------------------------------------------------------

interface TenantHealthRow {
  tenantId: string
  tenantName: string
  eventCount: number
  lastEventDate: string | null
  staffCount: number
  unpaidCount: number
}

async function getTenantHealthItems(tenantId: string): Promise<RailItem[]> {
  try {
    const { pgClient } = await import('@/lib/db')
    const now = new Date()

    const rows = await pgClient`
      SELECT
        c.id AS "tenantId",
        c.business_name AS "tenantName",
        COUNT(DISTINCT e.id)::int AS "eventCount",
        MAX(e.event_date)::text AS "lastEventDate",
        COUNT(DISTINCT sm.id)::int AS "staffCount",
        COUNT(DISTINCT CASE WHEN e.payment_status IN ('unpaid', 'partial') THEN e.id END)::int AS "unpaidCount"
      FROM chefs c
      LEFT JOIN events e ON e.tenant_id = c.id
        AND e.status NOT IN ('cancelled')
        AND e.event_date >= CURRENT_DATE - INTERVAL '90 days'
      LEFT JOIN staff_members sm ON sm.chef_id = c.id
        AND sm.status = 'active'
      WHERE c.id = ${tenantId}
      GROUP BY c.id, c.business_name
      LIMIT 1
    `

    const items: RailItem[] = []

    for (const row of rows) {
      const r = row as TenantHealthRow

      // Flag if no events in 30+ days
      if (r.lastEventDate) {
        const lastMs = new Date(r.lastEventDate).getTime()
        const daysSince = (now.getTime() - lastMs) / 86_400_000
        if (daysSince > 30) {
          items.push({
            id: `admin-health-stale-${r.tenantId}`,
            tenantId,
            source: 'admin',
            tier: 'awareness' as RailTier,
            state: 'surfaced',
            score: 35,
            title: `No events in ${Math.round(daysSince)} days`,
            subtitle: r.tenantName ?? 'Tenant',
            actionUrl: '/admin/tenants',
            createdAt: now,
            surfacedAt: now,
            ttlMinutes: 1440,
            metadata: {
              tenantId: r.tenantId,
              daysSinceLastEvent: Math.round(daysSince),
              checkType: 'tenant-health',
            },
          })
        }
      }

      // Flag unpaid events
      if (r.unpaidCount > 0) {
        const tier: RailTier = r.unpaidCount >= 3 ? 'action' : 'awareness'
        const score = r.unpaidCount >= 3 ? 65 : 40
        items.push({
          id: `admin-health-unpaid-${r.tenantId}`,
          tenantId,
          source: 'admin',
          tier,
          state: 'surfaced',
          score,
          title: `${r.unpaidCount} event${r.unpaidCount === 1 ? '' : 's'} with outstanding payments`,
          subtitle: r.tenantName ?? 'Tenant',
          actionUrl: '/admin/finance',
          createdAt: now,
          surfacedAt: now,
          ttlMinutes: 10080,
          metadata: {
            tenantId: r.tenantId,
            unpaidCount: r.unpaidCount,
            checkType: 'tenant-health',
          },
        })
      }
    }

    return items
  } catch (err) {
    console.error('[rail/resolvers/admin] Tenant health query failed:', err)
    return []
  }
}

// ---------------------------------------------------------------------------
// Pending approvals (shift swaps, staff onboarding items)
// ---------------------------------------------------------------------------

async function getPendingApprovalItems(tenantId: string): Promise<RailItem[]> {
  try {
    const { pgClient } = await import('@/lib/db')
    const now = new Date()

    // Shift swap requests pending approval
    const swapRows = await pgClient`
      SELECT
        ssr.id,
        ssr.created_at AS "createdAt",
        sm_from.name AS "fromName",
        sm_to.name AS "toName",
        ss.shift_date AS "shiftDate"
      FROM shift_swap_requests ssr
      JOIN scheduled_shifts ss ON ss.id = ssr.shift_id
      JOIN staff_members sm_from ON sm_from.id = ssr.requester_id
      LEFT JOIN staff_members sm_to ON sm_to.id = ssr.target_id
      WHERE ss.tenant_id = ${tenantId}
        AND ssr.status = 'pending'
      ORDER BY ssr.created_at ASC
      LIMIT ${MAX_ITEMS}
    `

    const items: RailItem[] = []

    for (const row of swapRows) {
      const r = row as {
        id: string
        createdAt: string
        fromName: string
        toName: string | null
        shiftDate: string
      }

      const ageMs = now.getTime() - new Date(r.createdAt).getTime()
      const ageHours = ageMs / 3_600_000

      let tier: RailTier = 'awareness'
      let score = 40
      if (ageHours > 48) {
        tier = 'action'
        score = 70
      } else if (ageHours > 24) {
        tier = 'action'
        score = 55
      }

      const toLabel = r.toName ? ` to ${r.toName}` : ''
      items.push({
        id: `admin-swap-${r.id}`,
        tenantId,
        source: 'admin',
        tier,
        state: 'surfaced',
        score,
        title: `Shift swap request from ${r.fromName}${toLabel}`,
        subtitle: `Shift on ${r.shiftDate}, pending ${Math.round(ageHours)}h`,
        actionUrl: '/chef/staff',
        createdAt: now,
        surfacedAt: now,
        ttlMinutes: 4320,
        metadata: {
          swapRequestId: r.id,
          shiftDate: r.shiftDate,
          ageHours: Math.round(ageHours),
          checkType: 'pending-approval',
        },
      })
    }

    // Staff onboarding items not completed
    const onboardingRows = await pgClient`
      SELECT
        soi.id,
        soi.title,
        soi.due_date AS "dueDate",
        sm.name AS "staffName"
      FROM staff_onboarding_items soi
      JOIN staff_members sm ON sm.id = soi.staff_member_id
      WHERE sm.chef_id = ${tenantId}
        AND soi.completed_at IS NULL
        AND (soi.due_date IS NULL OR soi.due_date <= CURRENT_DATE + INTERVAL '7 days')
      ORDER BY soi.due_date ASC NULLS LAST
      LIMIT ${MAX_ITEMS}
    `

    for (const row of onboardingRows) {
      const r = row as {
        id: string
        title: string
        dueDate: string | null
        staffName: string
      }

      let tier: RailTier = 'opportunity'
      let score = 15
      if (r.dueDate) {
        const dueMs = new Date(r.dueDate).getTime()
        const daysUntil = (dueMs - now.getTime()) / 86_400_000
        if (daysUntil < 0) {
          tier = 'action'
          score = 75
        } else if (daysUntil <= 2) {
          tier = 'action'
          score = 60
        } else {
          tier = 'awareness'
          score = 35
        }
      }

      items.push({
        id: `admin-onboard-${r.id}`,
        tenantId,
        source: 'admin',
        tier,
        state: 'surfaced',
        score,
        title: `${r.staffName}: ${r.title}`,
        subtitle: r.dueDate ? `Due ${r.dueDate}` : 'No due date',
        actionUrl: '/chef/staff',
        createdAt: now,
        surfacedAt: now,
        ttlMinutes: 10080,
        metadata: {
          onboardingItemId: r.id,
          staffName: r.staffName,
          dueDate: r.dueDate,
          checkType: 'pending-approval',
        },
      })
    }

    return items
  } catch (err) {
    console.error('[rail/resolvers/admin] Pending approvals query failed:', err)
    return []
  }
}

// ---------------------------------------------------------------------------
// System alerts (stale data, missing configs)
// ---------------------------------------------------------------------------

async function getSystemAlertItems(tenantId: string): Promise<RailItem[]> {
  try {
    const { pgClient } = await import('@/lib/db')
    const now = new Date()
    const items: RailItem[] = []

    // Check for staff members missing W-9 info (compliance risk)
    const w9Rows = await pgClient`
      SELECT
        sm.id,
        sm.name,
        sm.created_at AS "createdAt"
      FROM staff_members sm
      WHERE sm.chef_id = ${tenantId}
        AND sm.status = 'active'
        AND sm.contractor_type = 'contractor'
        AND sm.w9_collected = false
      ORDER BY sm.created_at ASC
      LIMIT 5
    `

    if (w9Rows.length > 0) {
      const names = (w9Rows as unknown as { name: string }[]).map((r) => r.name)
      const displayNames =
        names.length <= 2 ? names.join(' and ') : `${names[0]} and ${names.length - 1} others`

      items.push({
        id: `admin-alert-w9-${tenantId}`,
        tenantId,
        source: 'admin',
        tier: 'action' as RailTier,
        state: 'surfaced',
        score: 60,
        title: `Missing W-9: ${displayNames}`,
        subtitle: `${w9Rows.length} contractor${w9Rows.length === 1 ? '' : 's'} without tax forms`,
        actionUrl: '/chef/staff',
        createdAt: now,
        surfacedAt: now,
        ttlMinutes: 10080,
        metadata: {
          missingW9Count: w9Rows.length,
          staffNames: names,
          checkType: 'system-alert',
        },
      })
    }

    // Check for events with no menu assigned within 7 days
    const noMenuRows = await pgClient`
      SELECT
        e.id,
        e.event_date AS "eventDate",
        c.full_name AS "clientName"
      FROM events e
      LEFT JOIN clients c ON c.id = e.client_id
      LEFT JOIN menus m ON m.event_id = e.id
      WHERE e.tenant_id = ${tenantId}
        AND e.status NOT IN ('cancelled', 'completed', 'draft')
        AND e.event_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
        AND m.id IS NULL
      ORDER BY e.event_date ASC
      LIMIT 5
    `

    for (const row of noMenuRows) {
      const r = row as { id: string; eventDate: string; clientName: string | null }
      const daysUntil = (new Date(r.eventDate).getTime() - now.getTime()) / 86_400_000

      let tier: RailTier = 'action'
      let score = 65
      if (daysUntil <= 2) {
        tier = 'critical'
        score = 88
      }

      items.push({
        id: `admin-alert-nomenu-${r.id}`,
        tenantId,
        source: 'admin',
        tier,
        state: 'surfaced',
        score,
        title: `No menu for ${r.clientName ?? 'upcoming event'}`,
        subtitle: `Event on ${r.eventDate}, ${Math.round(daysUntil)}d away`,
        actionUrl: `/chef/events/${r.id}`,
        createdAt: now,
        surfacedAt: now,
        ttlMinutes: Math.max(Math.round(daysUntil * 1440), 60),
        metadata: {
          eventId: r.id,
          eventDate: r.eventDate,
          daysUntil: Math.round(daysUntil),
          checkType: 'system-alert',
        },
      })
    }

    return items
  } catch (err) {
    console.error('[rail/resolvers/admin] System alerts query failed:', err)
    return []
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function getAdminRailItems(tenantId: string): Promise<RailItem[]> {
  const [health, approvals, alerts] = await Promise.allSettled([
    getTenantHealthItems(tenantId),
    getPendingApprovalItems(tenantId),
    getSystemAlertItems(tenantId),
  ])

  const items: RailItem[] = [
    ...(health.status === 'fulfilled' ? health.value : []),
    ...(approvals.status === 'fulfilled' ? approvals.value : []),
    ...(alerts.status === 'fulfilled' ? alerts.value : []),
  ]

  return items
}
