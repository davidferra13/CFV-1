'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import type { CommitmentDomain, OverrideCategory } from '@/lib/commitment/types'

// ── Types ───────────────────────────────────────────────────────────────────────

export interface VortexClient {
  clientId: string
  clientName: string
  overrideCount: number
  /** Share of total overrides (0-1) */
  overrideShare: number
  domains: CommitmentDomain[]
  /** Number of distinct commitment domains overridden for this client */
  domainSpan: number
  topCategories: Array<{ category: OverrideCategory | null; count: number }>
  mostRecentOverride: Date
}

export interface ClientVortexResult {
  /** True when one client drives overrides across 2+ domains */
  detected: boolean
  /** Clients meeting the vortex threshold */
  vortexClients: VortexClient[]
  /** Total overrides in window for context */
  totalOverrides: number
  windowDays: number
}

export interface ClientOverrideProfile {
  clientId: string
  clientName: string
  overrides: Array<{
    overrideId: string
    commitmentDomain: CommitmentDomain
    category: OverrideCategory | null
    reason: string
    createdAt: Date
  }>
  byDomain: Partial<Record<CommitmentDomain, number>>
  byCategory: Partial<Record<OverrideCategory, number>>
  firstOverride: Date | null
  lastOverride: Date | null
}

// ── Helpers ─────────────────────────────────────────────────────────────────────

interface OverrideWithContext {
  id: string
  commitment_id: string
  category: string | null
  reason: string
  context: Record<string, unknown> | null
  created_at: string
}

interface CommitmentRow {
  id: string
  domain: string
}

interface EventRow {
  id: string
  client_id: string
}

interface ClientRow {
  id: string
  full_name: string
}

/**
 * Resolves client_id from override context -> event -> client.
 * Returns a map of override_id to { clientId, clientName }.
 */
async function resolveOverrideClients(
  tenantId: string,
  overrides: OverrideWithContext[]
): Promise<Map<string, { clientId: string; clientName: string }>> {
  const client = createServerClient()
  const result = new Map<string, { clientId: string; clientName: string }>()

  // Collect event IDs from override context
  const eventIdSet = new Set<string>()
  const overrideToEventId = new Map<string, string>()

  for (const o of overrides) {
    const eventId =
      o.context && typeof o.context === 'object'
        ? (o.context as Record<string, unknown>).event_id
        : null
    if (typeof eventId === 'string' && eventId) {
      eventIdSet.add(eventId)
      overrideToEventId.set(o.id, eventId)
    }
  }

  if (eventIdSet.size === 0) return result

  const eventIds = Array.from(eventIdSet)

  // Fetch events to get client_id
  const { data: events } = await client
    .from('events' as any)
    .select('id, client_id')
    .in('id', eventIds)
    .eq('tenant_id', tenantId)

  if (!events || events.length === 0) return result

  const eventToClient = new Map<string, string>()
  const clientIdSet = new Set<string>()
  for (const e of events as EventRow[]) {
    eventToClient.set(e.id, e.client_id)
    clientIdSet.add(e.client_id)
  }

  // Fetch client names
  const clientIds = Array.from(clientIdSet)
  const { data: clients } = await client
    .from('clients' as any)
    .select('id, full_name')
    .in('id', clientIds)
    .eq('tenant_id', tenantId)

  const clientNameMap = new Map<string, string>()
  for (const c of (clients ?? []) as ClientRow[]) {
    clientNameMap.set(c.id, c.full_name)
  }

  // Wire it all together: override -> event -> client
  for (const o of overrides) {
    const eventId = overrideToEventId.get(o.id)
    if (!eventId) continue
    const clientId = eventToClient.get(eventId)
    if (!clientId) continue
    const clientName = clientNameMap.get(clientId) ?? 'Unknown'
    result.set(o.id, { clientId, clientName })
  }

  return result
}

// ── Server Actions ──────────────────────────────────────────────────────────────

/**
 * Detects whether a single client is driving overrides across multiple commitment domains.
 * A "vortex" client causes overrides in 2+ distinct domains.
 */
export async function detectClientVortex(windowDays: number = 90): Promise<ClientVortexResult> {
  const user = await requireChef()
  const tenantId = user.tenantId as string
  const db = createServerClient()

  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000)

  // Fetch overrides in window
  const { data: rawOverrides } = await db
    .from('commitment_overrides' as any)
    .select('id, commitment_id, category, reason, context, created_at')
    .eq('tenant_id', tenantId)
    .gte('created_at', since.toISOString())
    .order('created_at', { ascending: false })

  const overrides = (rawOverrides ?? []) as OverrideWithContext[]
  if (overrides.length === 0) {
    return { detected: false, vortexClients: [], totalOverrides: 0, windowDays }
  }

  // Fetch commitment domains
  const commitmentIds = [...new Set(overrides.map((o) => o.commitment_id))]
  const { data: rawCommitments } = await db
    .from('commitments' as any)
    .select('id, domain')
    .in('id', commitmentIds)
    .eq('tenant_id', tenantId)

  const commitmentDomainMap = new Map<string, CommitmentDomain>()
  for (const c of (rawCommitments ?? []) as CommitmentRow[]) {
    commitmentDomainMap.set(c.id, c.domain as CommitmentDomain)
  }

  // Resolve override -> client
  const overrideClientMap = await resolveOverrideClients(tenantId, overrides)

  // Group by client
  const clientGroups = new Map<
    string,
    {
      clientName: string
      overrides: Array<{
        overrideId: string
        domain: CommitmentDomain
        category: OverrideCategory | null
        createdAt: Date
      }>
    }
  >()

  for (const o of overrides) {
    const clientInfo = overrideClientMap.get(o.id)
    if (!clientInfo) continue

    if (!clientGroups.has(clientInfo.clientId)) {
      clientGroups.set(clientInfo.clientId, {
        clientName: clientInfo.clientName,
        overrides: [],
      })
    }

    const domain = commitmentDomainMap.get(o.commitment_id)
    if (!domain) continue

    clientGroups.get(clientInfo.clientId)!.overrides.push({
      overrideId: o.id,
      domain,
      category: (o.category as OverrideCategory) ?? null,
      createdAt: new Date(o.created_at),
    })
  }

  // Identify vortex clients (2+ domains)
  const vortexClients: VortexClient[] = []

  for (const [clientId, group] of clientGroups) {
    const domains = [...new Set(group.overrides.map((o) => o.domain))]
    if (domains.length < 2) continue

    // Count categories
    const catCounts = new Map<OverrideCategory | null, number>()
    for (const o of group.overrides) {
      catCounts.set(o.category, (catCounts.get(o.category) ?? 0) + 1)
    }

    const topCategories = [...catCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([category, count]) => ({ category, count }))

    const mostRecent = group.overrides.reduce(
      (latest, o) => (o.createdAt > latest ? o.createdAt : latest),
      group.overrides[0].createdAt
    )

    vortexClients.push({
      clientId,
      clientName: group.clientName,
      overrideCount: group.overrides.length,
      overrideShare: overrides.length > 0 ? group.overrides.length / overrides.length : 0,
      domains: domains as CommitmentDomain[],
      domainSpan: domains.length,
      topCategories,
      mostRecentOverride: mostRecent,
    })
  }

  // Sort by override count descending
  vortexClients.sort((a, b) => b.overrideCount - a.overrideCount)

  return {
    detected: vortexClients.length > 0,
    vortexClients,
    totalOverrides: overrides.length,
    windowDays,
  }
}

/**
 * Lists clients causing disproportionate override burden.
 * "Disproportionate" = client's override share exceeds their event share by 2x or more.
 */
export async function getVortexClients(windowDays: number = 90): Promise<VortexClient[]> {
  const result = await detectClientVortex(windowDays)
  return result.vortexClients
}

/**
 * Detailed override breakdown for a specific client.
 */
export async function getClientOverrideProfile(
  clientId: string
): Promise<ClientOverrideProfile | null> {
  if (!clientId || typeof clientId !== 'string') return null

  const user = await requireChef()
  const tenantId = user.tenantId as string
  const db = createServerClient()

  // Verify client belongs to tenant
  const { data: clientRows } = await db
    .from('clients' as any)
    .select('id, full_name')
    .eq('id', clientId)
    .eq('tenant_id', tenantId)

  const clientRow = (clientRows ?? [])[0] as ClientRow | undefined
  if (!clientRow) return null

  // Get all events for this client
  const { data: eventRows } = await db
    .from('events' as any)
    .select('id')
    .eq('client_id', clientId)
    .eq('tenant_id', tenantId)

  const eventIds = ((eventRows ?? []) as Array<{ id: string }>).map((e) => e.id)
  if (eventIds.length === 0) {
    return {
      clientId,
      clientName: clientRow.full_name,
      overrides: [],
      byDomain: {},
      byCategory: {},
      firstOverride: null,
      lastOverride: null,
    }
  }

  // Get all overrides that reference these events via context->event_id
  // We need to fetch all overrides and filter by event_id in context
  const { data: allOverrides } = await db
    .from('commitment_overrides' as any)
    .select('id, commitment_id, category, reason, context, created_at')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })

  const overridesForClient = ((allOverrides ?? []) as OverrideWithContext[]).filter((o) => {
    if (!o.context || typeof o.context !== 'object') return false
    const eventId = (o.context as Record<string, unknown>).event_id
    return typeof eventId === 'string' && eventIds.includes(eventId)
  })

  if (overridesForClient.length === 0) {
    return {
      clientId,
      clientName: clientRow.full_name,
      overrides: [],
      byDomain: {},
      byCategory: {},
      firstOverride: null,
      lastOverride: null,
    }
  }

  // Fetch commitment domains
  const commitmentIds = [...new Set(overridesForClient.map((o) => o.commitment_id))]
  const { data: rawCommitments } = await db
    .from('commitments' as any)
    .select('id, domain')
    .in('id', commitmentIds)
    .eq('tenant_id', tenantId)

  const domainMap = new Map<string, CommitmentDomain>()
  for (const c of (rawCommitments ?? []) as CommitmentRow[]) {
    domainMap.set(c.id, c.domain as CommitmentDomain)
  }

  // Build profile
  const byDomain: Partial<Record<CommitmentDomain, number>> = {}
  const byCategory: Partial<Record<OverrideCategory, number>> = {}
  const profileOverrides: ClientOverrideProfile['overrides'] = []

  for (const o of overridesForClient) {
    const domain = domainMap.get(o.commitment_id)
    if (!domain) continue

    const cat = (o.category as OverrideCategory) ?? null

    profileOverrides.push({
      overrideId: o.id,
      commitmentDomain: domain,
      category: cat,
      reason: o.reason,
      createdAt: new Date(o.created_at),
    })

    byDomain[domain] = (byDomain[domain] ?? 0) + 1
    if (cat) {
      byCategory[cat] = (byCategory[cat] ?? 0) + 1
    }
  }

  const dates = profileOverrides.map((o) => o.createdAt)

  return {
    clientId,
    clientName: clientRow.full_name,
    overrides: profileOverrides,
    byDomain,
    byCategory,
    firstOverride: dates.length > 0 ? new Date(Math.min(...dates.map((d) => d.getTime()))) : null,
    lastOverride: dates.length > 0 ? new Date(Math.max(...dates.map((d) => d.getTime()))) : null,
  }
}
