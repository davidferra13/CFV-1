'use server'

// Cross-tenant platform activity feed - unified timeline of all platform activity.
// Queries existing tables (no new tables needed). Admin-only.

import { createAdminClient } from '@/lib/db/admin'
import { requireAdmin } from '@/lib/auth/admin'
import { deriveProvenance } from '@/lib/analytics/source-provenance'
import { resolveOwnerIdentity } from '@/lib/platform/owner-account'
import { calculateDistanceMiles } from '@/lib/geo/public-location'
import { PUBLIC_INTAKE_LANE_KEYS } from '@/lib/public/intake-lane-config'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PlatformActivity = {
  id: string // "{table}:{row_id}"
  timestamp: string
  type:
    | 'booking'
    | 'inquiry'
    | 'event_transition'
    | 'recipe'
    | 'menu'
    | 'client'
    | 'payment'
    | 'chef_signup'
    | 'onboarding'
  chef_id: string
  chef_name: string
  summary: string
  metadata: Record<string, any>
  is_local: boolean
  link: string | null
}

export type ActivityFeedInput = {
  limit?: number
  offset?: number
  types?: string[]
  chefId?: string
  localOnly?: boolean
}

export type ActivityFeedResult = {
  items: PlatformActivity[]
  total: number
}

export type ChefSuccessRow = {
  id: string
  name: string
  events: number
  revenue: number
  clients: number
  lastActive: string | null
}

export type ChefSuccessResult = {
  chefs: ChefSuccessRow[]
}

export type VitalsSummary = {
  todayBookings: number
  todayInquiries: number
  todayEvents: number
  unmatchedBookings: number
  quietChefs: { id: string; name: string; lastActive: string | null }[]
  topChefs: { id: string; name: string; eventCount: number; revenueCents: number }[]
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type FounderGeo = {
  lat: number | null
  lng: number | null
  radiusMiles: number
}

async function getFounderGeo(db: any): Promise<FounderGeo> {
  const owner = await resolveOwnerIdentity(db)
  if (!owner.ownerChefId) return { lat: null, lng: null, radiusMiles: 50 }

  // Try chef_discovery_profiles first
  const { data: discovery } = await db
    .from('chef_discovery_profiles')
    .select('service_area_lat, service_area_lng, service_area_radius_miles')
    .eq('chef_id', owner.ownerChefId)
    .maybeSingle()

  if (discovery?.service_area_lat && discovery?.service_area_lng) {
    return {
      lat: discovery.service_area_lat,
      lng: discovery.service_area_lng,
      radiusMiles: discovery.service_area_radius_miles ?? 50,
    }
  }

  return { lat: null, lng: null, radiusMiles: 50 }
}

function isWithinRadius(founderGeo: FounderGeo, lat: number | null, lng: number | null): boolean {
  if (!founderGeo.lat || !founderGeo.lng || !lat || !lng) return false
  const dist = calculateDistanceMiles(founderGeo.lat, founderGeo.lng, lat, lng)
  return dist <= founderGeo.radiusMiles
}

function relativeTime(isoDate: string): string {
  const now = Date.now()
  const then = new Date(isoDate).getTime()
  const diffMs = now - then
  const diffMin = Math.floor(diffMs / 60_000)
  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHrs = Math.floor(diffMin / 60)
  if (diffHrs < 24) return `${diffHrs}h ago`
  const diffDays = Math.floor(diffHrs / 24)
  if (diffDays < 30) return `${diffDays}d ago`
  return new Date(isoDate).toLocaleDateString()
}

// Build a chef name lookup map from an array of chef rows
function buildChefMap(chefs: any[]): Map<string, string> {
  const map = new Map<string, string>()
  for (const c of chefs) {
    map.set(c.id, c.display_name || c.business_name || 'Unknown Chef')
  }
  return map
}

// ---------------------------------------------------------------------------
// Main: getPlatformActivityFeed
// ---------------------------------------------------------------------------

export async function getPlatformActivityFeed(
  input: ActivityFeedInput = {}
): Promise<ActivityFeedResult> {
  await requireAdmin()
  const db: any = createAdminClient()

  const limit = Math.min(input.limit ?? 50, 200)
  const offset = input.offset ?? 0
  const typeFilter = input.types && input.types.length > 0 ? new Set(input.types) : null
  const chefFilter = input.chefId || null

  // Load chef name map and founder geo in parallel
  const [chefListResult, founderGeo] = await Promise.all([
    db.from('chefs').select('id, display_name, business_name, email'),
    getFounderGeo(db),
  ])
  const allChefs = chefListResult.data ?? []
  const chefMap = buildChefMap(allChefs)

  // Fan-out: query each activity source in parallel (limited to recent 200 each)
  const perSourceLimit = 200
  const queries: Promise<PlatformActivity[]>[] = []

  // 1. Inquiries (bookings + direct)
  if (!typeFilter || typeFilter.has('booking') || typeFilter.has('inquiry')) {
    queries.push(
      (async () => {
        let q = db
          .from('inquiries')
          .select(
            'id, tenant_id, channel, status, confirmed_occasion, confirmed_guest_count, confirmed_location, first_contact_at, created_at, unknown_fields, utm_medium'
          )
          .order('created_at', { ascending: false })
          .limit(perSourceLimit)

        if (chefFilter) q = q.eq('tenant_id', chefFilter)

        const { data, error } = await q
        if (error) {
          console.error('[activity-feed] inquiries query failed:', error)
          return []
        }

        return (data ?? [])
          .map((row: any) => {
            const provenance = deriveProvenance({
              channel: row.channel,
              unknown_fields: row.unknown_fields,
              utm_medium: row.utm_medium,
            })
            const isOpenBooking = provenance.key === PUBLIC_INTAKE_LANE_KEYS.open_booking
            const actType = isOpenBooking ? 'booking' : 'inquiry'
            if (typeFilter && !typeFilter.has(actType)) return null

            const chefName = chefMap.get(row.tenant_id) || 'Unknown Chef'
            const location = row.confirmed_location || ''
            const guests = row.confirmed_guest_count
            const occasion = row.confirmed_occasion || 'an event'

            let summary = ''
            if (isOpenBooking) {
              summary = `New open booking: ${occasion}`
              if (guests) summary += ` for ${guests} guests`
              if (location) summary += ` in ${location}`
            } else if (provenance.key === PUBLIC_INTAKE_LANE_KEYS.instant_book) {
              summary = `New instant-book request: ${occasion}`
              if (guests) summary += ` for ${guests} guests`
              if (location) summary += ` in ${location}`
            } else {
              summary = `New inquiry: ${occasion}`
              if (location) summary += ` in ${location}`
            }

            // Check locality using geocoded location from unknown_fields
            const distMiles = row.unknown_fields?.distance_miles
            const matchedLocation = row.unknown_fields?.matched_location
            let isLocal = false
            if (typeof distMiles === 'number') {
              isLocal = distMiles <= founderGeo.radiusMiles
            }

            return {
              id: `inquiries:${row.id}`,
              timestamp: row.created_at || row.first_contact_at,
              type: actType as PlatformActivity['type'],
              chef_id: row.tenant_id,
              chef_name: chefName,
              summary,
              metadata: {
                occasion,
                guest_count: guests,
                location,
                status: row.status,
                channel: row.channel,
                distance_miles: distMiles,
                matched_location: matchedLocation,
                provenance_key: provenance.key,
                provenance_label: provenance.label,
              },
              is_local: isLocal,
              link: `/admin/inquiries`,
            }
          })
          .filter(Boolean) as PlatformActivity[]
      })()
    )
  }

  // 2. Event state transitions
  if (!typeFilter || typeFilter.has('event_transition')) {
    queries.push(
      (async () => {
        let q = db
          .from('event_state_transitions')
          .select('id, event_id, tenant_id, from_status, to_status, transitioned_at, reason')
          .order('transitioned_at', { ascending: false })
          .limit(perSourceLimit)

        if (chefFilter) q = q.eq('tenant_id', chefFilter)

        const { data, error } = await q
        if (error) {
          console.error('[activity-feed] event_state_transitions query failed:', error)
          return []
        }

        return (data ?? []).map((row: any) => {
          const chefName = chefMap.get(row.tenant_id) || 'Unknown Chef'
          const fromLabel = row.from_status || 'new'
          return {
            id: `event_state_transitions:${row.id}`,
            timestamp: row.transitioned_at,
            type: 'event_transition' as const,
            chef_id: row.tenant_id,
            chef_name: chefName,
            summary: `Event moved from ${fromLabel} to ${row.to_status}`,
            metadata: {
              event_id: row.event_id,
              from_status: row.from_status,
              to_status: row.to_status,
              reason: row.reason,
            },
            is_local: false, // Event transitions don't have location
            link: `/admin/events`,
          }
        })
      })()
    )
  }

  // 3. Recipes
  if (!typeFilter || typeFilter.has('recipe')) {
    queries.push(
      (async () => {
        let q = db
          .from('recipes')
          .select('id, tenant_id, name, category, created_at')
          .eq('archived', false)
          .order('created_at', { ascending: false })
          .limit(perSourceLimit)

        if (chefFilter) q = q.eq('tenant_id', chefFilter)

        const { data, error } = await q
        if (error) {
          console.error('[activity-feed] recipes query failed:', error)
          return []
        }

        return (data ?? []).map((row: any) => {
          const chefName = chefMap.get(row.tenant_id) || 'Unknown Chef'
          return {
            id: `recipes:${row.id}`,
            timestamp: row.created_at,
            type: 'recipe' as const,
            chef_id: row.tenant_id,
            chef_name: chefName,
            summary: `Created recipe: ${row.name}`,
            metadata: { name: row.name, category: row.category },
            is_local: false,
            link: null, // Don't expose recipe content (chef IP)
          }
        })
      })()
    )
  }

  // 4. Menus
  if (!typeFilter || typeFilter.has('menu')) {
    queries.push(
      (async () => {
        let q = db
          .from('menus')
          .select('id, tenant_id, name, status, created_at')
          .order('created_at', { ascending: false })
          .limit(perSourceLimit)

        if (chefFilter) q = q.eq('tenant_id', chefFilter)

        const { data, error } = await q
        if (error) {
          console.error('[activity-feed] menus query failed:', error)
          return []
        }

        return (data ?? []).map((row: any) => {
          const chefName = chefMap.get(row.tenant_id) || 'Unknown Chef'
          return {
            id: `menus:${row.id}`,
            timestamp: row.created_at,
            type: 'menu' as const,
            chef_id: row.tenant_id,
            chef_name: chefName,
            summary: `Created menu: ${row.name}`,
            metadata: { name: row.name, status: row.status },
            is_local: false,
            link: null,
          }
        })
      })()
    )
  }

  // 5. Clients
  if (!typeFilter || typeFilter.has('client')) {
    queries.push(
      (async () => {
        let q = db
          .from('clients')
          .select('id, tenant_id, full_name, email, created_at')
          .order('created_at', { ascending: false })
          .limit(perSourceLimit)

        if (chefFilter) q = q.eq('tenant_id', chefFilter)

        const { data, error } = await q
        if (error) {
          console.error('[activity-feed] clients query failed:', error)
          return []
        }

        return (data ?? []).map((row: any) => {
          const chefName = chefMap.get(row.tenant_id) || 'Unknown Chef'
          return {
            id: `clients:${row.id}`,
            timestamp: row.created_at,
            type: 'client' as const,
            chef_id: row.tenant_id,
            chef_name: chefName,
            summary: `New client: ${row.full_name}`,
            metadata: { name: row.full_name, email: row.email },
            is_local: false,
            link: `/admin/clients`,
          }
        })
      })()
    )
  }

  // 6. Payments (ledger entries)
  if (!typeFilter || typeFilter.has('payment')) {
    queries.push(
      (async () => {
        let q = db
          .from('ledger_entries')
          .select('id, tenant_id, amount_cents, entry_type, description, created_at')
          .order('created_at', { ascending: false })
          .limit(perSourceLimit)

        if (chefFilter) q = q.eq('tenant_id', chefFilter)

        const { data, error } = await q
        if (error) {
          console.error('[activity-feed] ledger_entries query failed:', error)
          return []
        }

        return (data ?? []).map((row: any) => {
          const chefName = chefMap.get(row.tenant_id) || 'Unknown Chef'
          const amount = (Math.abs(row.amount_cents) / 100).toLocaleString('en-US', {
            style: 'currency',
            currency: 'USD',
          })
          return {
            id: `ledger_entries:${row.id}`,
            timestamp: row.created_at,
            type: 'payment' as const,
            chef_id: row.tenant_id,
            chef_name: chefName,
            summary: `${row.entry_type}: ${amount} - ${row.description}`,
            metadata: {
              amount_cents: row.amount_cents,
              entry_type: row.entry_type,
              description: row.description,
            },
            is_local: false,
            link: `/admin/financials`,
          }
        })
      })()
    )
  }

  // 7. Chef signups
  if (!typeFilter || typeFilter.has('chef_signup')) {
    queries.push(
      (async () => {
        const { data, error } = await db
          .from('chefs')
          .select('id, display_name, business_name, email, created_at')
          .order('created_at', { ascending: false })
          .limit(perSourceLimit)

        if (error) {
          console.error('[activity-feed] chefs query failed:', error)
          return []
        }

        return (data ?? []).map((row: any) => {
          const name = row.display_name || row.business_name || row.email
          return {
            id: `chefs:${row.id}`,
            timestamp: row.created_at,
            type: 'chef_signup' as const,
            chef_id: row.id,
            chef_name: name,
            summary: `New chef signed up: ${name}`,
            metadata: { email: row.email, business_name: row.business_name },
            is_local: false,
            link: `/admin/users`,
          }
        })
      })()
    )
  }

  // Execute all queries in parallel
  const results = await Promise.all(queries)

  // Merge and sort by timestamp (newest first)
  let merged: PlatformActivity[] = results.flat()
  merged.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  // Apply local-only filter
  if (input.localOnly) {
    merged = merged.filter((item) => item.is_local)
  }

  const total = merged.length
  const items = merged.slice(offset, offset + limit)

  return { items, total }
}

// ---------------------------------------------------------------------------
// Vitals sidebar
// ---------------------------------------------------------------------------

export async function getPlatformVitals(): Promise<VitalsSummary> {
  await requireAdmin()
  const db: any = createAdminClient()

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayISO = todayStart.toISOString()

  const fourteenDaysAgo = new Date()
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)
  const fourteenDaysISO = fourteenDaysAgo.toISOString()

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const thirtyDaysISO = thirtyDaysAgo.toISOString()

  // Run queries in parallel
  const [
    todayInquiryRowsResult,
    todayEventsResult,
    allChefsResult,
    recentEventCounts,
    recentRevenue,
  ] = await Promise.all([
    db
      .from('inquiries')
      .select('id, channel, status, converted_to_event_id, unknown_fields, utm_medium')
      .gte('created_at', todayISO),
    db.from('events').select('id', { count: 'exact', head: true }).gte('created_at', todayISO),
    db.from('chefs').select('id, display_name, business_name, email, created_at'),
    db.from('events').select('id, tenant_id, created_at').gte('created_at', thirtyDaysISO),
    db
      .from('ledger_entries')
      .select('id, tenant_id, amount_cents, created_at')
      .gte('created_at', thirtyDaysISO),
  ])

  const todayInquiryRows: any[] = todayInquiryRowsResult.data ?? []
  const allChefs: any[] = allChefsResult.data ?? []
  const recentEvents: any[] = recentEventCounts.data ?? []
  const recentLedger: any[] = recentRevenue.data ?? []
  const todayOpenBookings = todayInquiryRows.filter((row) => {
    const provenance = deriveProvenance({
      channel: row.channel,
      unknown_fields: row.unknown_fields,
      utm_medium: row.utm_medium,
    })
    return provenance.key === PUBLIC_INTAKE_LANE_KEYS.open_booking
  })
  const todayDirectAndOtherInquiries = todayInquiryRows.filter((row) => {
    const provenance = deriveProvenance({
      channel: row.channel,
      unknown_fields: row.unknown_fields,
      utm_medium: row.utm_medium,
    })
    return provenance.key !== PUBLIC_INTAKE_LANE_KEYS.open_booking
  })
  const unmatchedBookings = todayOpenBookings.filter(
    (row) => row.status === 'new' && row.converted_to_event_id == null
  ).length

  // Aggregate events per chef
  const chefEventMap = new Map<string, number>()
  for (const e of recentEvents) {
    chefEventMap.set(e.tenant_id, (chefEventMap.get(e.tenant_id) || 0) + 1)
  }

  // Aggregate revenue per chef
  const chefRevenueMap = new Map<string, number>()
  for (const l of recentLedger) {
    chefRevenueMap.set(
      l.tenant_id,
      (chefRevenueMap.get(l.tenant_id) || 0) + Math.abs(l.amount_cents)
    )
  }

  // Find last activity per chef (most recent event created_at)
  const chefLastActive = new Map<string, string>()
  for (const e of recentEvents) {
    const existing = chefLastActive.get(e.tenant_id)
    if (!existing || e.created_at > existing) {
      chefLastActive.set(e.tenant_id, e.created_at)
    }
  }

  // Quiet chefs: no events in 14+ days
  const quietChefs = allChefs
    .filter((c: any) => {
      const lastAct = chefLastActive.get(c.id)
      if (!lastAct) return true // Never had events
      return new Date(lastAct).getTime() < new Date(fourteenDaysISO).getTime()
    })
    .slice(0, 10)
    .map((c: any) => ({
      id: c.id,
      name: c.display_name || c.business_name || c.email,
      lastActive: chefLastActive.get(c.id) || null,
    }))

  // Top chefs: by event count, top 5
  const topChefs = allChefs
    .map((c: any) => ({
      id: c.id,
      name: c.display_name || c.business_name || c.email,
      eventCount: chefEventMap.get(c.id) || 0,
      revenueCents: chefRevenueMap.get(c.id) || 0,
    }))
    .sort((a, b) => b.eventCount - a.eventCount || b.revenueCents - a.revenueCents)
    .slice(0, 5)

  return {
    todayBookings: todayOpenBookings.length,
    todayInquiries: todayDirectAndOtherInquiries.length,
    todayEvents: todayEventsResult.count ?? 0,
    unmatchedBookings,
    quietChefs,
    topChefs,
  }
}

// ---------------------------------------------------------------------------
// Chef success metrics
// ---------------------------------------------------------------------------

export async function getChefSuccessMetrics(input?: {
  period?: '7d' | '30d' | '90d'
}): Promise<ChefSuccessResult> {
  await requireAdmin()
  const db: any = createAdminClient()

  const days = input?.period === '7d' ? 7 : input?.period === '90d' ? 90 : 30
  const since = new Date()
  since.setDate(since.getDate() - days)
  const sinceISO = since.toISOString()

  const [chefsResult, eventsResult, ledgerResult, clientsResult] = await Promise.all([
    db.from('chefs').select('id, display_name, business_name, email'),
    db.from('events').select('id, tenant_id, created_at').gte('created_at', sinceISO),
    db.from('ledger_entries').select('id, tenant_id, amount_cents').gte('created_at', sinceISO),
    db.from('clients').select('id, tenant_id, created_at').gte('created_at', sinceISO),
  ])

  const allChefs: any[] = chefsResult.data ?? []
  const events: any[] = eventsResult.data ?? []
  const ledger: any[] = ledgerResult.data ?? []
  const clients: any[] = clientsResult.data ?? []

  // Aggregate
  const eventMap = new Map<string, number>()
  const lastEventMap = new Map<string, string>()
  for (const e of events) {
    eventMap.set(e.tenant_id, (eventMap.get(e.tenant_id) || 0) + 1)
    const existing = lastEventMap.get(e.tenant_id)
    if (!existing || e.created_at > existing) lastEventMap.set(e.tenant_id, e.created_at)
  }

  const revenueMap = new Map<string, number>()
  for (const l of ledger) {
    revenueMap.set(l.tenant_id, (revenueMap.get(l.tenant_id) || 0) + Math.abs(l.amount_cents))
  }

  const clientMap = new Map<string, number>()
  for (const c of clients) {
    clientMap.set(c.tenant_id, (clientMap.get(c.tenant_id) || 0) + 1)
  }

  const chefs: ChefSuccessRow[] = allChefs.map((c: any) => ({
    id: c.id,
    name: c.display_name || c.business_name || c.email,
    events: eventMap.get(c.id) || 0,
    revenue: revenueMap.get(c.id) || 0,
    clients: clientMap.get(c.id) || 0,
    lastActive: lastEventMap.get(c.id) || null,
  }))

  // Sort by events desc
  chefs.sort((a, b) => b.events - a.events || b.revenue - a.revenue)

  return { chefs }
}
