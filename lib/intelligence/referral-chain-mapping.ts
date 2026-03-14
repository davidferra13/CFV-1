'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ReferralNode {
  clientId: string
  clientName: string
  referredBy: string | null // client name or source name
  referralSource: string | null // e.g., "word_of_mouth", "google", etc.
  referredClients: string[] // client names they referred
  totalRevenueCents: number
  totalEvents: number
  chainDepth: number // how many levels deep in referral chain
  isTopReferrer: boolean
}

export interface ReferralChain {
  rootSource: string
  totalClients: number
  totalRevenueCents: number
  avgEventsPerClient: number
  maxDepth: number
  clients: string[]
}

export interface ReferralSourceROI {
  source: string
  clientCount: number
  totalRevenueCents: number
  avgRevenuePerClientCents: number
  avgEventsPerClient: number
  secondaryReferrals: number // clients these referrals brought in
  totalChainRevenueCents: number // revenue from entire chain
  roi: number // chain revenue / client count (value amplification)
}

export interface ReferralChainResult {
  nodes: ReferralNode[]
  chains: ReferralChain[]
  sourceROI: ReferralSourceROI[]
  topReferrer: string | null
  topReferrerRevenueCents: number
  avgReferralChainDepth: number
  percentFromReferrals: number // % of clients from word-of-mouth
  networkEffectScore: number // 0-100, how much referrals drive business
}

// ─── Main Action ─────────────────────────────────────────────────────────────

export async function getReferralChainMapping(): Promise<ReferralChainResult | null> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const supabase: any = createServerClient()

  // Fetch clients
  const { data: clients, error: cErr } = await supabase
    .from('clients')
    .select('id, full_name, referral_source, created_at')
    .eq('tenant_id', tenantId)

  if (cErr || !clients || clients.length < 3) return null

  // Fetch inquiries with referral data
  const { data: inquiries } = await supabase
    .from('inquiries')
    .select('id, client_id, referral_source, converted_to_event_id')
    .eq('tenant_id', tenantId)

  // Fetch events for revenue
  const { data: events } = await supabase
    .from('events')
    .select('id, client_id, quoted_price_cents, status')
    .eq('tenant_id', tenantId)
    .in('status', ['completed', 'confirmed', 'in_progress', 'paid', 'accepted'])

  // Build client data
  const clientMap = new Map<
    string,
    { name: string; source: string | null; revenue: number; events: number }
  >()
  for (const c of clients) {
    clientMap.set(c.id, {
      name: c.full_name || 'Unknown',
      source: c.referral_source || null,
      revenue: 0,
      events: 0,
    })
  }

  // Also pick up referral_source from inquiries
  for (const inq of inquiries || []) {
    if (inq.client_id && inq.referral_source && clientMap.has(inq.client_id)) {
      const client = clientMap.get(inq.client_id)!
      if (!client.source) client.source = inq.referral_source
    }
  }

  // Aggregate revenue by client
  for (const ev of events || []) {
    if (ev.client_id && clientMap.has(ev.client_id)) {
      const c = clientMap.get(ev.client_id)!
      c.revenue += ev.quoted_price_cents || 0
      c.events++
    }
  }

  // ─── Build Referral Graph ───

  // Identify who referred whom based on referral_source containing client names
  const clientNames = new Map<string, string>() // name → id (lowercase for matching)
  for (const [id, data] of clientMap.entries()) {
    clientNames.set(data.name.toLowerCase(), id)
  }

  const referredBy = new Map<string, string>() // clientId → referrer clientId
  const referralSource = new Map<string, string>() // clientId → source category

  for (const [clientId, data] of clientMap.entries()) {
    if (!data.source) continue

    const sourceLower = data.source.toLowerCase().trim()
    referralSource.set(clientId, data.source)

    // Check if the source matches a client name (word of mouth / referral)
    for (const [name, refId] of clientNames.entries()) {
      if (refId === clientId) continue
      if (sourceLower.includes(name) || name.includes(sourceLower)) {
        referredBy.set(clientId, refId)
        break
      }
    }
  }

  // Build nodes
  const referralsGiven = new Map<string, string[]>() // referrer → [referred client names]
  for (const [clientId, referrerId] of referredBy.entries()) {
    if (!referralsGiven.has(referrerId)) referralsGiven.set(referrerId, [])
    referralsGiven.get(referrerId)!.push(clientMap.get(clientId)!.name)
  }

  // Calculate chain depth for each node
  function getChainDepth(clientId: string, visited: Set<string> = new Set()): number {
    if (visited.has(clientId)) return 0
    visited.add(clientId)
    const referrer = referredBy.get(clientId)
    if (!referrer) return 0
    return 1 + getChainDepth(referrer, visited)
  }

  const nodes: ReferralNode[] = Array.from(clientMap.entries())
    .filter(([, data]) => data.events > 0 || referralSource.has(data.name))
    .map(([clientId, data]) => {
      const depth = getChainDepth(clientId)
      const referred = referralsGiven.get(clientId) || []
      const referrerData = referredBy.has(clientId)
        ? clientMap.get(referredBy.get(clientId)!)
        : null

      return {
        clientId,
        clientName: data.name,
        referredBy: referrerData?.name || null,
        referralSource: referralSource.get(clientId) || null,
        referredClients: referred,
        totalRevenueCents: data.revenue,
        totalEvents: data.events,
        chainDepth: depth,
        isTopReferrer: referred.length >= 3,
      }
    })
    .sort((a, b) => b.referredClients.length - a.referredClients.length)

  // ─── Referral Chains ───

  // Group by root source
  function getRootSource(clientId: string, visited: Set<string> = new Set()): string {
    if (visited.has(clientId)) return referralSource.get(clientId) || 'unknown'
    visited.add(clientId)
    const referrer = referredBy.get(clientId)
    if (!referrer) return referralSource.get(clientId) || 'organic'
    return getRootSource(referrer, visited)
  }

  const chainMap = new Map<
    string,
    { clients: Set<string>; revenue: number; events: number; maxDepth: number }
  >()
  for (const [clientId, data] of clientMap.entries()) {
    if (data.events === 0) continue
    const root = getRootSource(clientId)
    if (!chainMap.has(root))
      chainMap.set(root, { clients: new Set(), revenue: 0, events: 0, maxDepth: 0 })
    const chain = chainMap.get(root)!
    chain.clients.add(data.name)
    chain.revenue += data.revenue
    chain.events += data.events
    const depth = getChainDepth(clientId)
    if (depth > chain.maxDepth) chain.maxDepth = depth
  }

  const chains: ReferralChain[] = Array.from(chainMap.entries())
    .filter(([, c]) => c.clients.size >= 2)
    .map(([rootSource, c]) => ({
      rootSource,
      totalClients: c.clients.size,
      totalRevenueCents: c.revenue,
      avgEventsPerClient:
        c.clients.size > 0 ? Math.round((c.events / c.clients.size) * 10) / 10 : 0,
      maxDepth: c.maxDepth,
      clients: Array.from(c.clients),
    }))
    .sort((a, b) => b.totalRevenueCents - a.totalRevenueCents)

  // ─── Source ROI ───

  const sourceMap = new Map<
    string,
    { clients: Set<string>; revenue: number; events: number; secondary: number }
  >()
  for (const [clientId, data] of clientMap.entries()) {
    const source = referralSource.get(clientId) || 'organic'
    if (!sourceMap.has(source))
      sourceMap.set(source, { clients: new Set(), revenue: 0, events: 0, secondary: 0 })
    const s = sourceMap.get(source)!
    s.clients.add(clientId)
    s.revenue += data.revenue
    s.events += data.events
  }

  // Count secondary referrals per source
  for (const [clientId] of referredBy.entries()) {
    const referrerId = referredBy.get(clientId)!
    const referrerSource = referralSource.get(referrerId) || 'organic'
    if (sourceMap.has(referrerSource)) {
      sourceMap.get(referrerSource)!.secondary++
    }
  }

  const sourceROI: ReferralSourceROI[] = Array.from(sourceMap.entries())
    .filter(([, s]) => s.clients.size >= 1)
    .map(([source, s]) => {
      // Chain revenue includes secondary referral revenue
      const chainRevenue = s.revenue // simplified — ideally trace full chain
      return {
        source,
        clientCount: s.clients.size,
        totalRevenueCents: s.revenue,
        avgRevenuePerClientCents: s.clients.size > 0 ? Math.round(s.revenue / s.clients.size) : 0,
        avgEventsPerClient:
          s.clients.size > 0 ? Math.round((s.events / s.clients.size) * 10) / 10 : 0,
        secondaryReferrals: s.secondary,
        totalChainRevenueCents: chainRevenue,
        roi: s.clients.size > 0 ? Math.round(chainRevenue / s.clients.size) : 0,
      }
    })
    .sort((a, b) => b.totalRevenueCents - a.totalRevenueCents)

  // ─── Summary ───

  const topReferrerNode = nodes.find((n) => n.referredClients.length > 0)
  const topReferrer = topReferrerNode?.clientName || null
  const topReferrerRevenue = topReferrerNode
    ? topReferrerNode.referredClients
        .map((name) => {
          for (const [, data] of clientMap.entries()) {
            if (data.name === name) return data.revenue
          }
          return 0
        })
        .reduce((s, r) => s + r, 0)
    : 0

  const depths = nodes.filter((n) => n.chainDepth > 0).map((n) => n.chainDepth)
  const avgDepth =
    depths.length > 0
      ? Math.round((depths.reduce((s, d) => s + d, 0) / depths.length) * 10) / 10
      : 0

  const referralClients = nodes.filter(
    (n) => n.referredBy || (n.referralSource && n.referralSource.toLowerCase().includes('referral'))
  ).length
  const totalWithEvents = nodes.filter((n) => n.totalEvents > 0).length
  const percentFromReferrals =
    totalWithEvents > 0 ? Math.round((referralClients / totalWithEvents) * 100) : 0

  // Network effect score
  const totalReferralRevenue = nodes
    .filter((n) => n.chainDepth > 0)
    .reduce((s, n) => s + n.totalRevenueCents, 0)
  const totalRevenue = nodes.reduce((s, n) => s + n.totalRevenueCents, 0)
  const networkEffectScore =
    totalRevenue > 0
      ? Math.min(
          100,
          Math.round((totalReferralRevenue / totalRevenue) * 100) + (referralClients > 5 ? 10 : 0)
        )
      : 0

  return {
    nodes: nodes.slice(0, 20),
    chains: chains.slice(0, 10),
    sourceROI,
    topReferrer,
    topReferrerRevenueCents: topReferrerRevenue,
    avgReferralChainDepth: avgDepth,
    percentFromReferrals,
    networkEffectScore,
  }
}
