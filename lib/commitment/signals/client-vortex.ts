import { createServerClient } from '@/lib/db/server'
import type { ProactiveSignal } from '@/lib/cil/types'
import type { CommitmentDomain } from '../types'
import { DOMAIN_LABELS } from '../types'

// ── Compound Signal: Client Vortex Detector ─────────────────────────────────
// One client driving overrides across multiple domains = client vortex.
// Surfaces problematic client relationships that are eroding the chef's
// commitment integrity across the board.

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 10)
}

export interface ClientVortex {
  clientId: string
  clientName: string
  affectedDomains: CommitmentDomain[]
  overrideCount: number
  eventIds: string[]
}

/**
 * Detect client vortex patterns: one client causing overrides across 2+ domains
 * within the last 90 days.
 */
export async function detectClientVortexes(tenantId: string): Promise<ClientVortex[]> {
  const client = createServerClient()
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)

  // Get recent overrides
  const { data: overrides } = await client
    .from('commitment_overrides' as any)
    .select('id, commitment_id, context, created_at')
    .eq('tenant_id', tenantId)
    .gte('created_at', ninetyDaysAgo.toISOString())

  if (!overrides || overrides.length === 0) return []

  // Get commitment domains
  const commitmentIds = [...new Set(overrides.map((o: any) => o.commitment_id as string))]

  const { data: commitments } = await client
    .from('commitments' as any)
    .select('id, domain')
    .in('id', commitmentIds)
    .eq('tenant_id', tenantId)

  if (!commitments) return []

  const commitmentDomainMap = new Map<string, CommitmentDomain>()
  for (const c of commitments) {
    commitmentDomainMap.set(c.id as string, c.domain as CommitmentDomain)
  }

  // Group overrides by client (extracted from context.clientId or context.eventId)
  const clientOverrides = new Map<string, {
    domains: Set<CommitmentDomain>
    overrideCount: number
    eventIds: Set<string>
  }>()

  for (const o of overrides) {
    const ctx = o.context as Record<string, unknown> | null
    const clientId = (ctx?.clientId as string) || (ctx?.client_id as string)
    const eventId = (ctx?.eventId as string) || (ctx?.event_id as string)

    if (!clientId) continue

    const domain = commitmentDomainMap.get(o.commitment_id as string)
    if (!domain) continue

    if (!clientOverrides.has(clientId)) {
      clientOverrides.set(clientId, { domains: new Set(), overrideCount: 0, eventIds: new Set() })
    }

    const entry = clientOverrides.get(clientId)!
    entry.domains.add(domain)
    entry.overrideCount++
    if (eventId) entry.eventIds.add(eventId)
  }

  // Filter to clients with 2+ domains affected
  const vortexClientIds: string[] = []
  const vortexData = new Map<string, { domains: CommitmentDomain[]; count: number; eventIds: string[] }>()

  for (const [clientId, data] of clientOverrides) {
    if (data.domains.size >= 2) {
      vortexClientIds.push(clientId)
      vortexData.set(clientId, {
        domains: [...data.domains],
        count: data.overrideCount,
        eventIds: [...data.eventIds],
      })
    }
  }

  if (vortexClientIds.length === 0) return []

  // Fetch client names
  const { data: clients } = await client
    .from('clients')
    .select('id, full_name, display_name')
    .in('id', vortexClientIds)

  const clientNameMap = new Map<string, string>()
  for (const c of (clients ?? [])) {
    clientNameMap.set(c.id, (c.display_name || c.full_name || 'Unknown client') as string)
  }

  const results: ClientVortex[] = []
  for (const [clientId, data] of vortexData) {
    results.push({
      clientId,
      clientName: clientNameMap.get(clientId) || 'Unknown client',
      affectedDomains: data.domains,
      overrideCount: data.count,
      eventIds: data.eventIds,
    })
  }

  // Sort by override count descending
  results.sort((a, b) => b.overrideCount - a.overrideCount)

  return results
}

/**
 * Analyze for client vortex patterns and emit CIL proactive signals.
 */
export async function analyzeClientVortexSignals(tenantId: string): Promise<ProactiveSignal[]> {
  const signals: ProactiveSignal[] = []
  const now = Date.now()

  const vortexes = await detectClientVortexes(tenantId)

  for (const vortex of vortexes) {
    const domainLabels = vortex.affectedDomains.map((d) => DOMAIN_LABELS[d]).join(', ')
    const urgency: 1 | 2 | 3 | 4 | 5 =
      vortex.affectedDomains.length >= 4 ? 4
        : vortex.overrideCount >= 5 ? 4
          : 3

    signals.push({
      id: generateId(),
      domain: 'commitment',
      urgency,
      confidence: 0.8,
      title: `Client vortex: ${vortex.clientName}`,
      detail: `${vortex.clientName} is linked to ${vortex.overrideCount} overrides across ${vortex.affectedDomains.length} domains (${domainLabels}). This client relationship may be eroding your commitment standards.`,
      suggestedAction: 'Review this client relationship. Consider whether expectations need resetting or if pricing should reflect the extra complexity.',
      actionType: 'navigate',
      actionPayload: { path: `/clients/${vortex.clientId}` },
      entityIds: [vortex.clientId, ...vortex.eventIds],
      source: 'commitment.clientVortex',
      createdAt: now,
    })
  }

  return signals
}
