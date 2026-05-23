// lib/rail/sources/staff.ts
// Staff rail source: upcoming shifts, event assignments, prep readiness.
// Surfaces staff-related action items into the universal rail.

import type { RailItem, RailTier } from '@/lib/rail/types'

const MS_HOUR = 3_600_000
const MS_DAY = 86_400_000
const MAX_ITEMS = 10

// ---------------------------------------------------------------------------
// Upcoming shifts (scheduled_shifts within 7 days)
// ---------------------------------------------------------------------------

async function getUpcomingShiftItems(tenantId: string): Promise<RailItem[]> {
  try {
    const { pgClient } = await import('@/lib/db')
    const now = new Date()

    const rows = await pgClient`
      SELECT
        ss.id,
        ss.shift_date AS "shiftDate",
        ss.start_time AS "startTime",
        ss.end_time AS "endTime",
        ss.role,
        ss.status,
        sm.name AS "staffName"
      FROM scheduled_shifts ss
      JOIN staff_members sm ON sm.id = ss.staff_member_id
      WHERE ss.tenant_id = ${tenantId}
        AND ss.status IN ('scheduled', 'confirmed', 'swap_requested')
        AND ss.shift_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
      ORDER BY ss.shift_date ASC, ss.start_time ASC
      LIMIT ${MAX_ITEMS}
    `

    const items: RailItem[] = []

    for (const row of rows) {
      const r = row as {
        id: string
        shiftDate: string
        startTime: string
        endTime: string
        role: string | null
        status: string
        staffName: string
      }

      const shiftDateMs = new Date(r.shiftDate).getTime()
      const diffMs = shiftDateMs - now.getTime()
      const diffHours = diffMs / MS_HOUR
      const diffDays = diffMs / MS_DAY

      let tier: RailTier
      let score: number

      if (diffHours <= 24) {
        tier = 'action'
        score = 65
      } else if (diffDays <= 3) {
        tier = 'awareness'
        score = 35
      } else {
        tier = 'opportunity'
        score = 15
      }

      // Boost for unconfirmed shifts
      if (r.status === 'scheduled') {
        score = Math.min(score + 10, 99)
      }
      // Boost for swap requests needing attention
      if (r.status === 'swap_requested') {
        tier = 'action'
        score = Math.min(score + 20, 99)
      }

      const roleLabel = r.role ? ` (${r.role})` : ''
      const title = `${r.staffName}${roleLabel}`

      let subtitle: string
      if (diffHours <= 0) {
        subtitle = `Shift today at ${r.startTime}`
      } else if (diffHours <= 24) {
        subtitle = `Tomorrow, ${r.startTime} to ${r.endTime}`
      } else {
        subtitle = `In ${Math.round(diffDays)}d, ${r.startTime} to ${r.endTime}`
      }

      if (r.status === 'swap_requested') {
        subtitle += ', swap requested'
      } else if (r.status === 'scheduled') {
        subtitle += ', unconfirmed'
      }

      items.push({
        id: `staff-shift-${r.id}`,
        tenantId,
        source: 'staff',
        tier,
        state: 'surfaced',
        score,
        title,
        subtitle,
        actionUrl: '/chef/staff',
        createdAt: now,
        surfacedAt: now,
        ttlMinutes: Math.max(Math.round(diffMs / 60_000), 60),
        metadata: {
          shiftId: r.id,
          shiftDate: r.shiftDate,
          startTime: r.startTime,
          endTime: r.endTime,
          role: r.role,
          status: r.status,
          staffName: r.staffName,
        },
      })
    }

    return items
  } catch (err) {
    console.error('[rail/sources/staff] Shift query failed:', err)
    return []
  }
}

// ---------------------------------------------------------------------------
// Event staff assignments (upcoming events needing staff prep)
// ---------------------------------------------------------------------------

async function getEventAssignmentItems(tenantId: string): Promise<RailItem[]> {
  try {
    const { pgClient } = await import('@/lib/db')
    const now = new Date()

    const rows = await pgClient`
      SELECT
        esa.id,
        esa.status,
        esa.scheduled_hours AS "scheduledHours",
        esa.role_override AS "roleOverride",
        esa.coc_acknowledged AS "cocAcknowledged",
        sm.name AS "staffName",
        sm.role AS "defaultRole",
        e.event_date AS "eventDate",
        e.occasion,
        c.full_name AS "clientName"
      FROM event_staff_assignments esa
      JOIN staff_members sm ON sm.id = esa.staff_member_id
      JOIN events e ON e.id = esa.event_id
      LEFT JOIN clients c ON c.id = e.client_id
      WHERE e.tenant_id = ${tenantId}
        AND esa.status = 'scheduled'
        AND e.status NOT IN ('completed', 'cancelled')
        AND e.event_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '14 days'
      ORDER BY e.event_date ASC
      LIMIT ${MAX_ITEMS}
    `

    const items: RailItem[] = []

    for (const row of rows) {
      const r = row as {
        id: string
        status: string
        scheduledHours: number | null
        roleOverride: string | null
        cocAcknowledged: boolean
        staffName: string
        defaultRole: string
        eventDate: string
        occasion: string | null
        clientName: string | null
      }

      const eventDateMs = new Date(r.eventDate).getTime()
      const diffMs = eventDateMs - now.getTime()
      const diffDays = diffMs / MS_DAY

      let tier: RailTier
      let score: number

      if (diffDays <= 1) {
        tier = 'action'
        score = 70
      } else if (diffDays <= 3) {
        tier = 'awareness'
        score = 40
      } else {
        tier = 'opportunity'
        score = 18
      }

      // Boost if code of conduct not acknowledged for imminent event
      if (!r.cocAcknowledged && diffDays <= 3) {
        score = Math.min(score + 15, 99)
        if (tier === 'awareness') tier = 'action'
      }

      const role = r.roleOverride ?? r.defaultRole
      const clientLabel = r.clientName ?? 'Event'
      const occasionLabel = r.occasion ? ` (${r.occasion})` : ''
      const title = `${r.staffName} assigned to ${clientLabel}${occasionLabel}`

      let subtitle = `${role}, ${r.eventDate}`
      if (r.scheduledHours) {
        subtitle += `, ${r.scheduledHours}h`
      }
      if (!r.cocAcknowledged) {
        subtitle += ', COC pending'
      }

      items.push({
        id: `staff-assign-${r.id}`,
        tenantId,
        source: 'staff',
        tier,
        state: 'surfaced',
        score,
        title,
        subtitle,
        actionUrl: '/chef/staff',
        createdAt: now,
        surfacedAt: now,
        ttlMinutes: Math.max(Math.round(diffMs / 60_000), 60),
        metadata: {
          assignmentId: r.id,
          staffName: r.staffName,
          role,
          eventDate: r.eventDate,
          cocAcknowledged: r.cocAcknowledged,
        },
      })
    }

    return items
  } catch (err) {
    console.error('[rail/sources/staff] Assignment query failed:', err)
    return []
  }
}

// ---------------------------------------------------------------------------
// Events with no staff assigned (prep gap)
// ---------------------------------------------------------------------------

async function getUnstaffedEventItems(tenantId: string): Promise<RailItem[]> {
  try {
    const { pgClient } = await import('@/lib/db')
    const now = new Date()

    const rows = await pgClient`
      SELECT
        e.id,
        e.event_date AS "eventDate",
        e.guest_count AS "guestCount",
        e.occasion,
        c.full_name AS "clientName"
      FROM events e
      LEFT JOIN clients c ON c.id = e.client_id
      LEFT JOIN event_staff_assignments esa ON esa.event_id = e.id
      WHERE e.tenant_id = ${tenantId}
        AND e.status NOT IN ('draft', 'cancelled', 'completed')
        AND e.event_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '14 days'
        AND e.guest_count >= 10
        AND esa.id IS NULL
      ORDER BY e.event_date ASC
      LIMIT 5
    `

    const items: RailItem[] = []

    for (const row of rows) {
      const r = row as {
        id: string
        eventDate: string
        guestCount: number
        occasion: string | null
        clientName: string | null
      }

      const diffMs = new Date(r.eventDate).getTime() - now.getTime()
      const diffDays = diffMs / MS_DAY

      let tier: RailTier = 'awareness'
      let score = 45
      if (diffDays <= 1) {
        tier = 'critical'
        score = 90
      } else if (diffDays <= 3) {
        tier = 'action'
        score = 75
      }

      const clientLabel = r.clientName ?? 'Event'
      const occasionLabel = r.occasion ? ` (${r.occasion})` : ''

      items.push({
        id: `staff-unstaffed-${r.id}`,
        tenantId,
        source: 'staff',
        tier,
        state: 'surfaced',
        score,
        title: `No staff assigned: ${clientLabel}${occasionLabel}`,
        subtitle: `${r.guestCount} guests on ${r.eventDate}`,
        actionUrl: `/chef/events/${r.id}/staff`,
        createdAt: now,
        surfacedAt: now,
        ttlMinutes: Math.max(Math.round(diffMs / 60_000), 60),
        metadata: {
          eventId: r.id,
          eventDate: r.eventDate,
          guestCount: r.guestCount,
        },
      })
    }

    return items
  } catch (err) {
    console.error('[rail/sources/staff] Unstaffed events query failed:', err)
    return []
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function getStaffRailItems(tenantId: string): Promise<RailItem[]> {
  const [shifts, assignments, unstaffed] = await Promise.allSettled([
    getUpcomingShiftItems(tenantId),
    getEventAssignmentItems(tenantId),
    getUnstaffedEventItems(tenantId),
  ])

  const items: RailItem[] = [
    ...(shifts.status === 'fulfilled' ? shifts.value : []),
    ...(assignments.status === 'fulfilled' ? assignments.value : []),
    ...(unstaffed.status === 'fulfilled' ? unstaffed.value : []),
  ]

  return items
}
