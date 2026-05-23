'use server'

// Support Network Map - Client Network Collector
// Collects all operational relationships around a specific client.

import { requireChef } from '@/lib/auth/get-user'
import { pgClient } from '@/lib/db/index'
import type { NetworkNode, NetworkEdge, SupportNetwork } from './types'

/**
 * Build a support network centered on a specific client.
 * Pulls from: connections, referrals, events, vendors, touchpoints.
 */
export async function getClientNetwork(clientId: string): Promise<SupportNetwork> {
  const user = await requireChef()
  const tenantId = user.tenantId!

  const nodes: NetworkNode[] = []
  const edges: NetworkEdge[] = []
  const seenIds = new Set<string>()

  // Get the center client
  const [centerClient] = await pgClient`
    SELECT id, full_name, email, phone
    FROM clients
    WHERE id = ${clientId}
      AND tenant_id = ${tenantId}
      AND deleted_at IS NULL
  `
  if (!centerClient) {
    return {
      centerId: clientId,
      centerName: 'Unknown',
      centerType: 'client',
      nodes: [],
      edges: [],
      computedAt: new Date().toISOString(),
    }
  }
  seenIds.add(clientId)

  // ---- Client Connections ----
  try {
    const connections = await pgClient`
      SELECT cc.id, cc.client_a_id, cc.client_b_id, cc.relationship_type, cc.notes,
             ca.full_name AS a_name, ca.email AS a_email, ca.phone AS a_phone,
             cb.full_name AS b_name, cb.email AS b_email, cb.phone AS b_phone
      FROM client_connections cc
      LEFT JOIN clients ca ON ca.id = cc.client_a_id
      LEFT JOIN clients cb ON cb.id = cc.client_b_id
      WHERE cc.tenant_id = ${tenantId}
        AND (cc.client_a_id = ${clientId} OR cc.client_b_id = ${clientId})
    `
    for (const c of connections) {
      const isA = c.client_a_id === clientId
      const otherId = isA ? c.client_b_id : c.client_a_id
      const otherName = isA ? c.b_name : c.a_name
      const otherEmail = isA ? c.b_email : c.a_email
      const otherPhone = isA ? c.b_phone : c.a_phone

      if (!seenIds.has(otherId)) {
        seenIds.add(otherId)
        nodes.push({
          id: otherId,
          name: otherName || 'Unknown',
          role: 'connection',
          email: otherEmail || null,
          phone: otherPhone || null,
          context: c.relationship_type || null,
          lastInteraction: null,
          href: `/clients/${otherId}`,
        })
      }
      edges.push({
        fromId: clientId,
        toId: otherId,
        source: 'client_connection',
        label: c.relationship_type || 'Connected',
      })
    }
  } catch (err) {
    console.error('[SupportNetwork] Connection collector failed:', err)
  }

  // ---- Referrals (outbound: who this client referred) ----
  try {
    const referrals = await pgClient`
      SELECT r.id, r.referred_client_id,
             c.full_name AS referred_name, c.email AS referred_email
      FROM referrals r
      LEFT JOIN clients c ON c.id = r.referred_client_id
      WHERE r.referrer_client_id = ${clientId}
        AND r.tenant_id = ${tenantId}
        AND r.referred_client_id IS NOT NULL
    `
    for (const r of referrals) {
      if (r.referred_client_id && !seenIds.has(r.referred_client_id)) {
        seenIds.add(r.referred_client_id)
        nodes.push({
          id: r.referred_client_id,
          name: r.referred_name || 'Unknown',
          role: 'referred',
          email: r.referred_email || null,
          phone: null,
          context: 'Referred by this client',
          lastInteraction: null,
          href: `/clients/${r.referred_client_id}`,
        })
      }
      if (r.referred_client_id) {
        edges.push({
          fromId: clientId,
          toId: r.referred_client_id,
          source: 'referral',
          label: 'Referred',
        })
      }
    }
  } catch (err) {
    console.error('[SupportNetwork] Referral collector failed:', err)
  }

  // ---- Referrals (inbound: who referred this client) ----
  try {
    const inbound = await pgClient`
      SELECT r.id, r.referrer_client_id,
             c.full_name AS referrer_name, c.email AS referrer_email
      FROM referrals r
      LEFT JOIN clients c ON c.id = r.referrer_client_id
      WHERE r.referred_client_id = ${clientId}
        AND r.tenant_id = ${tenantId}
    `
    for (const r of inbound) {
      if (r.referrer_client_id && !seenIds.has(r.referrer_client_id)) {
        seenIds.add(r.referrer_client_id)
        nodes.push({
          id: r.referrer_client_id,
          name: r.referrer_name || 'Unknown',
          role: 'referrer',
          email: r.referrer_email || null,
          phone: null,
          context: 'Referred this client',
          lastInteraction: null,
          href: `/clients/${r.referrer_client_id}`,
        })
      }
      if (r.referrer_client_id) {
        edges.push({
          fromId: r.referrer_client_id,
          toId: clientId,
          source: 'referral',
          label: 'Referred by',
        })
      }
    }
  } catch (err) {
    console.error('[SupportNetwork] Inbound referral collector failed:', err)
  }

  // ---- Events shared with this client ----
  try {
    const events = await pgClient`
      SELECT e.id, e.occasion, e.event_date, e.status,
             v.id AS venue_vendor_id, v.business_name AS venue_name
      FROM events e
      LEFT JOIN vendors v ON v.id = e.venue_vendor_id AND v.chef_id = ${tenantId}
      WHERE e.client_id = ${clientId}
        AND e.tenant_id = ${tenantId}
        AND e.deleted_at IS NULL
        AND e.status NOT IN ('cancelled')
      ORDER BY e.event_date DESC NULLS LAST
      LIMIT 10
    `
    for (const ev of events) {
      const eventNodeId = `event:${ev.id}`
      if (!seenIds.has(eventNodeId)) {
        seenIds.add(eventNodeId)
        nodes.push({
          id: eventNodeId,
          name: ev.occasion || 'Event',
          role: 'event_guest',
          email: null,
          phone: null,
          context: ev.event_date
            ? `${ev.status} on ${new Date(ev.event_date).toLocaleDateString()}`
            : ev.status,
          lastInteraction: ev.event_date || null,
          href: `/events/${ev.id}`,
        })
      }
      edges.push({
        fromId: clientId,
        toId: eventNodeId,
        source: 'event_assignment',
        label: 'Event',
      })

      // Add venue if present
      if (ev.venue_vendor_id && !seenIds.has(`vendor:${ev.venue_vendor_id}`)) {
        const venueNodeId = `vendor:${ev.venue_vendor_id}`
        seenIds.add(venueNodeId)
        nodes.push({
          id: venueNodeId,
          name: ev.venue_name || 'Venue',
          role: 'venue',
          email: null,
          phone: null,
          context: 'Event venue',
          lastInteraction: null,
          href: `/vendors/${ev.venue_vendor_id}`,
        })
        edges.push({
          fromId: eventNodeId,
          toId: venueNodeId,
          source: 'event_assignment',
          label: 'Venue',
        })
      }
    }
  } catch (err) {
    console.error('[SupportNetwork] Event collector failed:', err)
  }

  // ---- Recent touchpoints ----
  try {
    const touchpoints = await pgClient`
      SELECT ct.id, ct.type, ct.summary, ct.touched_at
      FROM client_touchpoints ct
      WHERE ct.client_id = ${clientId}
        AND ct.tenant_id = ${tenantId}
      ORDER BY ct.touched_at DESC
      LIMIT 5
    `
    // Touchpoints add context to the center, not new nodes
    // but we note the last interaction for the center
    if (touchpoints.length > 0) {
      // We could add touchpoint info; for V1, just note existence
    }
  } catch (err) {
    // Touchpoints are optional context, don't fail
  }

  return {
    centerId: clientId,
    centerName: (centerClient as any).full_name || 'Unknown',
    centerType: 'client',
    nodes,
    edges,
    computedAt: new Date().toISOString(),
  }
}
