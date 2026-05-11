// Remy - Circle Layer Context Loader
// Loads circle-scoped data for the shared Remy concierge.
// Two tiers: base (all members) and business (chef only).

import { createServerClient } from '@/lib/db/server'

export interface RemyCircleContext {
  // Circle identity
  circleName: string
  circleType: string
  memberCount: number

  // Chef info (public-safe)
  chefName: string | null
  businessName: string | null

  // Members with dietary data
  members: Array<{
    displayName: string
    role: string
    allergies: string[]
    dietary: string[]
  }>

  // Linked event (if any)
  event: {
    id: string
    occasion: string | null
    date: string | null
    serveTime: string | null
    arrivalTime: string | null
    status: string
    guestCount: number | null
    locationName: string | null
    locationAddress: string | null
  } | null

  // Menu
  menu: Array<{
    courseName: string
    dishes: string[]
  }>

  // Recent messages (for conversational context)
  recentMessages: Array<{
    author: string
    body: string
    source: string
  }>

  // Timeline (from circle config)
  timeline: Array<{ label: string; time: string }> | null

  // Sourcing updates
  sourcingStatus: string | null

  // Business tier (chef only - null for guests)
  business: {
    quotedPriceCents: number | null
    totalPaidCents: number | null
    profitCents: number | null
    pipelineStage: string | null
    clientLoyaltyTier: string | null
    clientPastEventCount: number
  } | null
}

type ContextScope = 'minimal' | 'focused' | 'full'

/**
 * Load circle-scoped context for Remy.
 * memberRole determines whether business tier is included.
 */
export async function loadRemyCircleContext(
  groupId: string,
  memberRole: string,
  scope: ContextScope = 'focused'
): Promise<RemyCircleContext> {
  const db: any = createServerClient({ admin: true })

  // Parallel load: circle + members + event + messages
  const [circleResult, membersResult, messagesResult] = await Promise.all([
    db
      .from('hub_groups')
      .select('name, group_type, event_id, tenant_id, message_count')
      .eq('id', groupId)
      .single(),
    db
      .from('hub_group_members')
      .select('role, hub_guest_profiles!profile_id(display_name, known_allergies, known_dietary)')
      .eq('group_id', groupId),
    scope !== 'minimal'
      ? db
          .from('hub_messages')
          .select('body, source, hub_guest_profiles!author_profile_id(display_name)')
          .eq('group_id', groupId)
          .is('deleted_at', null)
          .neq('message_type', 'system')
          .order('created_at', { ascending: false })
          .limit(15)
      : Promise.resolve({ data: [] }),
  ])

  const circle = circleResult.data
  if (!circle) throw new Error('Circle not found')

  const tenantId = circle.tenant_id

  // Load chef info
  const { data: chef } = await db
    .from('chefs')
    .select('display_name, business_name')
    .eq('id', tenantId)
    .single()

  // Load event if linked
  let event: RemyCircleContext['event'] = null
  let menu: RemyCircleContext['menu'] = []
  let timeline: RemyCircleContext['timeline'] = null
  let sourcingStatus: string | null = null
  let business: RemyCircleContext['business'] = null

  if (circle.event_id && scope !== 'minimal') {
    const { data: eventData } = await db
      .from('events')
      .select(
        'id, occasion, event_date, serve_time, arrival_time, status, guest_count, location_name, location_address, menu_id, client_id, total_price, quoted_total_cents'
      )
      .eq('id', circle.event_id)
      .single()

    if (eventData) {
      event = {
        id: eventData.id,
        occasion: eventData.occasion,
        date: eventData.event_date,
        serveTime: eventData.serve_time,
        arrivalTime: eventData.arrival_time,
        status: eventData.status,
        guestCount: eventData.guest_count,
        locationName: eventData.location_name,
        locationAddress: eventData.location_address,
      }

      // Load menu courses + dishes
      if (eventData.menu_id) {
        const { data: courses } = await db
          .from('menu_courses')
          .select('name, display_order, menu_dishes(name, display_order)')
          .eq('menu_id', eventData.menu_id)
          .order('display_order', { ascending: true })

        menu = (courses ?? []).map((c: any) => ({
          courseName: c.name,
          dishes: (c.menu_dishes ?? [])
            .sort((a: any, b: any) => a.display_order - b.display_order)
            .map((d: any) => d.name),
        }))
      }

      // Load timeline from circle config
      const { data: shareSettings } = await db
        .from('event_share_settings')
        .select('circle_config')
        .eq('event_id', circle.event_id)
        .single()

      if (shareSettings?.circle_config?.layout?.timeline) {
        timeline = shareSettings.circle_config.layout.timeline.map((t: any) => ({
          label: t.label ?? t.title ?? '',
          time: t.time ?? t.startTime ?? '',
        }))
      }

      // Sourcing summary
      if (shareSettings?.circle_config?.adaptive?.availabilityItems) {
        const items = shareSettings.circle_config.adaptive.availabilityItems
        const confirmed = items.filter((i: any) => i.status === 'confirmed').length
        const total = items.length
        sourcingStatus = total > 0 ? `${confirmed}/${total} ingredients confirmed` : null
      }

      // Business tier (chef only)
      if (memberRole === 'chef' && scope === 'full') {
        const clientId = eventData.client_id

        let pastEventCount = 0
        let loyaltyTier: string | null = null

        if (clientId) {
          const [pastResult, clientResult] = await Promise.all([
            db
              .from('events')
              .select('id', { count: 'exact', head: true })
              .eq('client_id', clientId)
              .eq('tenant_id', tenantId),
            db.from('clients').select('loyalty_tier').eq('id', clientId).single(),
          ])
          pastEventCount = pastResult.count ?? 0
          loyaltyTier = clientResult.data?.loyalty_tier ?? null
        }

        business = {
          quotedPriceCents: eventData.quoted_total_cents,
          totalPaidCents: eventData.total_price,
          profitCents:
            eventData.total_price && eventData.quoted_total_cents
              ? eventData.total_price - eventData.quoted_total_cents
              : null,
          pipelineStage: eventData.status,
          clientLoyaltyTier: loyaltyTier,
          clientPastEventCount: pastEventCount,
        }
      }
    }
  }

  // Format members
  const members = (membersResult.data ?? []).map((m: any) => ({
    displayName: m.hub_guest_profiles?.display_name ?? 'Unknown',
    role: m.role,
    allergies: m.hub_guest_profiles?.known_allergies ?? [],
    dietary: m.hub_guest_profiles?.known_dietary ?? [],
  }))

  // Format recent messages
  const recentMessages = (messagesResult.data ?? []).reverse().map((m: any) => ({
    author: m.hub_guest_profiles?.display_name ?? 'Unknown',
    body: (m.body ?? '').slice(0, 200),
    source: m.source ?? 'circle',
  }))

  return {
    circleName: circle.name ?? 'Dinner Circle',
    circleType: circle.group_type ?? 'circle',
    memberCount: members.length,
    chefName: chef?.display_name ?? null,
    businessName: chef?.business_name ?? null,
    members,
    event,
    menu,
    recentMessages,
    timeline,
    sourcingStatus,
    business,
  }
}

/**
 * Format circle context into a string block for the system prompt.
 */
export function formatCircleContext(ctx: RemyCircleContext): string {
  const parts: string[] = []

  parts.push(`## CIRCLE: ${ctx.circleName}`)
  parts.push(`Type: ${ctx.circleType} | Members: ${ctx.memberCount}`)
  if (ctx.chefName)
    parts.push(`Chef: ${ctx.chefName}${ctx.businessName ? ` (${ctx.businessName})` : ''}`)

  // Event
  if (ctx.event) {
    parts.push(`\n## EVENT`)
    parts.push(`Occasion: ${ctx.event.occasion ?? 'Dinner'}`)
    parts.push(`Date: ${ctx.event.date ?? 'TBD'}`)
    if (ctx.event.serveTime) parts.push(`Serve time: ${ctx.event.serveTime}`)
    if (ctx.event.arrivalTime) parts.push(`Arrival time: ${ctx.event.arrivalTime}`)
    parts.push(`Status: ${ctx.event.status}`)
    if (ctx.event.guestCount) parts.push(`Guest count: ${ctx.event.guestCount}`)
    if (ctx.event.locationName) parts.push(`Location: ${ctx.event.locationName}`)
    if (ctx.event.locationAddress) parts.push(`Address: ${ctx.event.locationAddress}`)
  }

  // Menu
  if (ctx.menu.length > 0) {
    parts.push(`\n## MENU`)
    for (const course of ctx.menu) {
      parts.push(`**${course.courseName}:** ${course.dishes.join(', ')}`)
    }
  }

  // Members with dietary
  const membersWithDietary = ctx.members.filter(
    (m) => m.allergies.length > 0 || m.dietary.length > 0
  )
  if (membersWithDietary.length > 0) {
    parts.push(`\n## DIETARY NEEDS (SAFETY-CRITICAL)`)
    for (const m of membersWithDietary) {
      const needs: string[] = []
      if (m.allergies.length > 0) needs.push(`ALLERGIES: ${m.allergies.join(', ')}`)
      if (m.dietary.length > 0) needs.push(`Dietary: ${m.dietary.join(', ')}`)
      parts.push(`- ${m.displayName}: ${needs.join(' | ')}`)
    }
  }

  // Timeline
  if (ctx.timeline && ctx.timeline.length > 0) {
    parts.push(`\n## TIMELINE`)
    for (const t of ctx.timeline) {
      parts.push(`- ${t.time}: ${t.label}`)
    }
  }

  // Sourcing
  if (ctx.sourcingStatus) {
    parts.push(`\n## SOURCING: ${ctx.sourcingStatus}`)
  }

  // Recent conversation
  if (ctx.recentMessages.length > 0) {
    parts.push(`\n## RECENT CIRCLE CONVERSATION`)
    for (const m of ctx.recentMessages.slice(-10)) {
      const sourceTag = m.source === 'remy' ? ' [Remy]' : m.source === 'email' ? ' [via email]' : ''
      parts.push(`${m.author}${sourceTag}: ${m.body}`)
    }
  }

  // Business tier (chef only)
  if (ctx.business) {
    parts.push(`\n## BUSINESS CONTEXT (CHEF-ONLY - NEVER SHARE WITH GUESTS)`)
    if (ctx.business.quotedPriceCents != null) {
      parts.push(`Quoted: $${(ctx.business.quotedPriceCents / 100).toFixed(2)}`)
    }
    if (ctx.business.totalPaidCents != null) {
      parts.push(`Paid: $${(ctx.business.totalPaidCents / 100).toFixed(2)}`)
    }
    if (ctx.business.profitCents != null) {
      parts.push(`Profit: $${(ctx.business.profitCents / 100).toFixed(2)}`)
    }
    if (ctx.business.pipelineStage) parts.push(`Pipeline: ${ctx.business.pipelineStage}`)
    if (ctx.business.clientLoyaltyTier) parts.push(`Client tier: ${ctx.business.clientLoyaltyTier}`)
    parts.push(`Client past events: ${ctx.business.clientPastEventCount}`)
  }

  return parts.join('\n')
}

/**
 * Determine context scope from the message content.
 */
export function getCircleContextScope(message: string, memberRole: string): ContextScope {
  const trimmed = message.trim().toLowerCase()

  // Minimal: greetings, very short messages
  const minimalPatterns = [
    /^(?:hi|hey|hello|yo|sup|morning|evening)\s*[!.?]*$/i,
    /^(?:thanks|thank\s+you|thx)\s*[!.?]*$/i,
  ]
  for (const p of minimalPatterns) {
    if (p.test(trimmed)) return 'minimal'
  }

  // Full: business questions (chef only)
  if (memberRole === 'chef') {
    const fullPatterns = [
      /\b(?:margin|profit|cost|revenue|expense)\b/i,
      /\b(?:pipeline|urgency|lead\s*score)\b/i,
      /\b(?:client\s*history|booking\s*frequency)\b/i,
      /\b(?:how\s+much\s+(?:am\s+I|do\s+I))\b/i,
    ]
    for (const p of fullPatterns) {
      if (p.test(trimmed)) return 'full'
    }
  }

  return 'focused'
}
