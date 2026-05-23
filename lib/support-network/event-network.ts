'use server'

// Support Network Map - Event Network Collector
// Collects all operational relationships around a specific event.

import { requireChef } from '@/lib/auth/get-user'
import { pgClient } from '@/lib/db/index'
import type { NetworkNode, NetworkEdge, SupportNetwork } from './types'

/**
 * Build a support network centered on a specific event.
 * Pulls from: client, vendors, staff, venue.
 */
export async function getEventNetwork(eventId: string): Promise<SupportNetwork> {
  const user = await requireChef()
  const tenantId = user.tenantId!

  const nodes: NetworkNode[] = []
  const edges: NetworkEdge[] = []
  const seenIds = new Set<string>()

  // Get the center event
  const [event] = await pgClient`
    SELECT e.id, e.occasion, e.event_date, e.status,
           e.client_id, e.venue_vendor_id,
           c.full_name AS client_name, c.email AS client_email, c.phone AS client_phone
    FROM events e
    LEFT JOIN clients c ON c.id = e.client_id
    WHERE e.id = ${eventId}
      AND e.tenant_id = ${tenantId}
      AND e.deleted_at IS NULL
  `

  if (!event) {
    return {
      centerId: eventId,
      centerName: 'Unknown event',
      centerType: 'event',
      nodes: [],
      edges: [],
      computedAt: new Date().toISOString(),
    }
  }

  seenIds.add(eventId)

  // Add client node
  if (event.client_id) {
    const clientId = event.client_id as string
    seenIds.add(clientId)
    nodes.push({
      id: clientId,
      name: (event.client_name as string) || 'Client',
      role: 'event_guest',
      email: (event.client_email as string) || null,
      phone: (event.client_phone as string) || null,
      context: 'Primary client',
      lastInteraction: (event.event_date as string) || null,
      href: `/clients/${clientId}`,
    })
    edges.push({
      fromId: eventId,
      toId: clientId,
      source: 'event_assignment',
      label: 'Client',
    })
  }

  // Add venue if present
  if (event.venue_vendor_id) {
    try {
      const [venue] = await pgClient`
        SELECT id, business_name, contact_name, email, phone
        FROM vendors
        WHERE id = ${event.venue_vendor_id}
          AND chef_id = ${tenantId}
      `
      if (venue) {
        const venueId = `vendor:${venue.id}`
        seenIds.add(venueId)
        nodes.push({
          id: venueId,
          name: (venue.business_name as string) || 'Venue',
          role: 'venue',
          email: (venue.email as string) || null,
          phone: (venue.phone as string) || null,
          context: (venue.contact_name as string) || null,
          lastInteraction: null,
          href: `/vendors/${venue.id}`,
        })
        edges.push({
          fromId: eventId,
          toId: venueId,
          source: 'event_assignment',
          label: 'Venue',
        })
      }
    } catch (err) {
      console.error('[SupportNetwork] Venue collector failed:', err)
    }
  }

  // Staff assigned to event
  try {
    const staffRows = await pgClient`
      SELECT sa.staff_member_id, sm.full_name, sm.email, sm.phone, sa.role
      FROM staff_assignments sa
      JOIN staff_members sm ON sm.id = sa.staff_member_id
      WHERE sa.event_id = ${eventId}
        AND sm.chef_id = ${tenantId}
    `
    for (const s of staffRows) {
      const staffId = `staff:${s.staff_member_id}`
      if (!seenIds.has(staffId)) {
        seenIds.add(staffId)
        nodes.push({
          id: staffId,
          name: (s.full_name as string) || 'Staff',
          role: 'staff',
          email: (s.email as string) || null,
          phone: (s.phone as string) || null,
          context: (s.role as string) || 'Assigned staff',
          lastInteraction: null,
          href: `/staff`,
        })
      }
      edges.push({
        fromId: eventId,
        toId: staffId,
        source: 'event_assignment',
        label: (s.role as string) || 'Staff',
      })
    }
  } catch {
    // Staff assignments may not exist
  }

  return {
    centerId: eventId,
    centerName: (event.occasion as string) || 'Event',
    centerType: 'event',
    nodes,
    edges,
    computedAt: new Date().toISOString(),
  }
}
