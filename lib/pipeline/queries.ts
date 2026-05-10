'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { scoreInquiry, type LeadScore } from '@/lib/leads/scoring'

// ─── Types ───────────────────────────────────────────────────────

export type PipelineStageName = 'leads' | 'quoted' | 'proposals' | 'contracts' | 'events'

export type PipelineItem = {
  id: string
  type: 'inquiry' | 'proposal' | 'contract' | 'event'
  clientName: string | null
  occasion: string | null
  date: string | null
  valueCents: number
  status: string
  createdAt: string
  score?: number
  scoreLabel?: 'hot' | 'warm' | 'cold'
  channel?: string
  expiresAt?: string | null
}

export type PipelineStageData = {
  stage: PipelineStageName
  label: string
  count: number
  valueCents: number
  items: PipelineItem[]
}

export type PipelineConversion = {
  from: string
  to: string
  rate: number
}

export type PipelineAlert = {
  type: 'stale_lead' | 'expiring_contract' | 'hot_lead'
  message: string
  itemId: string
  href: string
}

export type PipelineOverview = {
  stages: PipelineStageData[]
  totalPipelineValueCents: number
  conversions: PipelineConversion[]
  alerts: PipelineAlert[]
}

export type StaleLead = {
  id: string
  clientName: string | null
  channel: string | null
  daysSinceActivity: number
  budgetCents: number
  createdAt: string
}

export type ExpiringContract = {
  id: string
  clientName: string | null
  eventDate: string | null
  daysUntilExpiry: number
  sentAt: string | null
}

export type ScoredLead = {
  id: string
  clientName: string | null
  channel: string | null
  budgetCents: number
  score: number
  label: 'hot' | 'warm' | 'cold'
  factors: string[]
  createdAt: string
}

// ─── Helpers ─────────────────────────────────────────────────────

function daysBetween(dateA: Date, dateB: Date): number {
  return Math.floor(Math.abs(dateA.getTime() - dateB.getTime()) / 86400000)
}

function safeRate(numerator: number, denominator: number): number {
  if (denominator === 0) return 0
  return Math.round((numerator / denominator) * 10000) / 10000
}

// ─── Main Pipeline Query ─────────────────────────────────────────

export async function getSalesPipelineOverview(): Promise<PipelineOverview> {
  const user = await requireChef()
  const db: any = createServerClient()
  const now = new Date()

  // 1. Leads: inquiries with active statuses
  const { data: leadRows } = await db
    .from('inquiries')
    .select(
      'id, status, confirmed_budget_cents, confirmed_guest_count, confirmed_date, channel, client_id, created_at, last_response_at, updated_at, clients(full_name)'
    )
    .eq('tenant_id', user.tenantId!)
    .in('status', ['new', 'awaiting_client', 'awaiting_chef'])
    .order('created_at', { ascending: false })

  const leads = leadRows || []

  // Score all leads
  const leadScores: Map<string, LeadScore> = new Map()
  for (const lead of leads) {
    const score = await scoreInquiry({
      id: lead.id,
      confirmed_budget_cents: lead.confirmed_budget_cents,
      confirmed_guest_count: lead.confirmed_guest_count,
      confirmed_date: lead.confirmed_date,
      channel: lead.channel,
      client_id: lead.client_id,
      created_at: lead.created_at,
    })
    leadScores.set(lead.id, score)
  }

  const leadItems: PipelineItem[] = leads.slice(0, 10).map((row: any) => {
    const ls = leadScores.get(row.id)
    return {
      id: row.id,
      type: 'inquiry' as const,
      clientName: row.clients?.full_name ?? null,
      occasion: null,
      date: row.confirmed_date ?? null,
      valueCents: row.confirmed_budget_cents ?? 0,
      status: row.status,
      createdAt: row.created_at,
      score: ls?.score,
      scoreLabel: ls?.label,
      channel: row.channel ?? undefined,
    }
  })

  const leadsStage: PipelineStageData = {
    stage: 'leads',
    label: 'Leads',
    count: leads.length,
    valueCents: leads.reduce((sum: number, r: any) => sum + (r.confirmed_budget_cents ?? 0), 0),
    items: leadItems,
  }

  // 2. Quoted: inquiries with status = 'quoted'
  const { data: quotedRows } = await db
    .from('inquiries')
    .select(
      'id, status, confirmed_budget_cents, confirmed_date, channel, client_id, created_at, clients(full_name)'
    )
    .eq('tenant_id', user.tenantId!)
    .eq('status', 'quoted')
    .order('created_at', { ascending: false })

  const quoted = quotedRows || []

  const quotedItems: PipelineItem[] = quoted.slice(0, 10).map((row: any) => ({
    id: row.id,
    type: 'inquiry' as const,
    clientName: row.clients?.full_name ?? null,
    occasion: null,
    date: row.confirmed_date ?? null,
    valueCents: row.confirmed_budget_cents ?? 0,
    status: row.status,
    createdAt: row.created_at,
    channel: row.channel ?? undefined,
  }))

  const quotedStage: PipelineStageData = {
    stage: 'quoted',
    label: 'Quoted',
    count: quoted.length,
    valueCents: quoted.reduce((sum: number, r: any) => sum + (r.confirmed_budget_cents ?? 0), 0),
    items: quotedItems,
  }

  // 3. Proposals: client_proposals with active statuses
  const { data: proposalRows } = await db
    .from('client_proposals')
    .select(
      'id, status, total_price_cents, created_at, expires_at, client_id, event_id, title, clients(full_name)'
    )
    .eq('tenant_id', user.tenantId!)
    .in('status', ['draft', 'sent', 'viewed'])
    .order('created_at', { ascending: false })

  const proposals = proposalRows || []

  const proposalItems: PipelineItem[] = proposals.slice(0, 10).map((row: any) => ({
    id: row.id,
    type: 'proposal' as const,
    clientName: row.clients?.full_name ?? null,
    occasion: row.title ?? null,
    date: null,
    valueCents: row.total_price_cents ?? 0,
    status: row.status,
    createdAt: row.created_at,
    expiresAt: row.expires_at ?? null,
  }))

  const proposalsStage: PipelineStageData = {
    stage: 'proposals',
    label: 'Proposals',
    count: proposals.length,
    valueCents: proposals.reduce((sum: number, r: any) => sum + (r.total_price_cents ?? 0), 0),
    items: proposalItems,
  }

  // 4. Contracts: event_contracts with active statuses
  const { data: contractRows } = await db
    .from('event_contracts')
    .select(
      'id, status, created_at, sent_at, client_id, event_id, events(event_date, occasion, quoted_price_cents), clients(full_name)'
    )
    .eq('chef_id', user.tenantId!)
    .in('status', ['draft', 'sent', 'viewed'])
    .order('created_at', { ascending: false })

  const contracts = contractRows || []

  const contractItems: PipelineItem[] = contracts.slice(0, 10).map((row: any) => ({
    id: row.id,
    type: 'contract' as const,
    clientName: row.clients?.full_name ?? null,
    occasion: row.events?.occasion ?? null,
    date: row.events?.event_date ?? null,
    valueCents: row.events?.quoted_price_cents ?? 0,
    status: row.status,
    createdAt: row.created_at,
  }))

  const contractsStage: PipelineStageData = {
    stage: 'contracts',
    label: 'Contracts',
    count: contracts.length,
    valueCents: contracts.reduce(
      (sum: number, r: any) => sum + (r.events?.quoted_price_cents ?? 0),
      0
    ),
    items: contractItems,
  }

  // 5. Events: confirmed or in_progress
  const { data: eventRows } = await db
    .from('events')
    .select(
      'id, status, quoted_price_cents, event_date, occasion, created_at, client_id, clients(full_name)'
    )
    .eq('tenant_id', user.tenantId!)
    .in('status', ['confirmed', 'in_progress'])
    .is('deleted_at' as any, null)
    .order('created_at', { ascending: false })

  const events = eventRows || []

  const eventItems: PipelineItem[] = events.slice(0, 10).map((row: any) => ({
    id: row.id,
    type: 'event' as const,
    clientName: row.clients?.full_name ?? null,
    occasion: row.occasion ?? null,
    date: row.event_date ?? null,
    valueCents: row.quoted_price_cents ?? 0,
    status: row.status,
    createdAt: row.created_at,
  }))

  const eventsStage: PipelineStageData = {
    stage: 'events',
    label: 'Events',
    count: events.length,
    valueCents: events.reduce((sum: number, r: any) => sum + (r.quoted_price_cents ?? 0), 0),
    items: eventItems,
  }

  const stages: PipelineStageData[] = [
    leadsStage,
    quotedStage,
    proposalsStage,
    contractsStage,
    eventsStage,
  ]
  const totalPipelineValueCents = stages.reduce((sum, s) => sum + s.valueCents, 0)

  // ─── Conversions ───────────────────────────────────────────────

  // Leads -> Quoted: how many inquiries ever reached 'quoted' vs total inquiries
  const { data: allInquiries } = await db
    .from('inquiries')
    .select('status')
    .eq('tenant_id', user.tenantId!)

  const allInq = allInquiries || []
  const totalInquiryCount = allInq.length
  const quotedInquiryCount = allInq.filter((r: any) => r.status === 'quoted').length
  const confirmedInquiryCount = allInq.filter((r: any) => r.status === 'confirmed').length

  const leadsToQuotedRate = safeRate(quotedInquiryCount + confirmedInquiryCount, totalInquiryCount)

  const quotedToConfirmedRate = safeRate(
    confirmedInquiryCount,
    quotedInquiryCount + confirmedInquiryCount
  )

  // Proposals sent -> approved
  const { data: allProposals } = await db
    .from('client_proposals')
    .select('status')
    .eq('tenant_id', user.tenantId!)

  const allProp = allProposals || []
  const sentProposals = allProp.filter((r: any) =>
    ['sent', 'viewed', 'approved', 'declined'].includes(r.status)
  ).length
  const approvedProposals = allProp.filter((r: any) => r.status === 'approved').length
  const proposalApprovalRate = safeRate(approvedProposals, sentProposals)

  // Contracts sent -> signed
  const { data: allContracts } = await db
    .from('event_contracts')
    .select('status')
    .eq('chef_id', user.tenantId!)

  const allCon = allContracts || []
  const sentContracts = allCon.filter((r: any) =>
    ['sent', 'viewed', 'signed'].includes(r.status)
  ).length
  const signedContracts = allCon.filter((r: any) => r.status === 'signed').length
  const contractSignRate = safeRate(signedContracts, sentContracts)

  const conversions: PipelineConversion[] = [
    { from: 'leads', to: 'quoted', rate: leadsToQuotedRate },
    { from: 'quoted', to: 'confirmed', rate: quotedToConfirmedRate },
    { from: 'proposals_sent', to: 'proposals_approved', rate: proposalApprovalRate },
    { from: 'contracts_sent', to: 'contracts_signed', rate: contractSignRate },
  ]

  // ─── Alerts ────────────────────────────────────────────────────

  const alerts: PipelineAlert[] = []

  // Stale leads: no activity in 7+ days
  for (const lead of leads) {
    const lastActivity = lead.last_response_at || lead.updated_at || lead.created_at
    const days = daysBetween(now, new Date(lastActivity))
    if (days >= 7) {
      alerts.push({
        type: 'stale_lead',
        message: `${lead.clients?.full_name || 'Unknown lead'} has had no activity for ${days} days`,
        itemId: lead.id,
        href: `/leads/${lead.id}`,
      })
    }
  }

  // Expiring contracts: sent/viewed, sent_at + 14 days < now + 3 days
  const expiryThreshold = new Date(now.getTime() + 3 * 86400000)
  for (const contract of contracts) {
    if (['sent', 'viewed'].includes(contract.status) && contract.sent_at) {
      const deadline = new Date(new Date(contract.sent_at).getTime() + 14 * 86400000)
      if (deadline < expiryThreshold) {
        const daysLeft = Math.max(0, daysBetween(now, deadline))
        alerts.push({
          type: 'expiring_contract',
          message: `Contract for ${contract.clients?.full_name || 'client'} expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`,
          itemId: contract.id,
          href: `/events/${contract.event_id}`,
        })
      }
    }
  }

  // Hot leads: score >= 70, status = 'new' (not yet responded)
  for (const lead of leads) {
    if (lead.status === 'new') {
      const ls = leadScores.get(lead.id)
      if (ls && ls.score >= 70) {
        alerts.push({
          type: 'hot_lead',
          message: `Hot lead from ${lead.clients?.full_name || 'unknown'} (score: ${ls.score}) needs a response`,
          itemId: lead.id,
          href: `/leads/${lead.id}`,
        })
      }
    }
  }

  return {
    stages,
    totalPipelineValueCents,
    conversions,
    alerts,
  }
}

// ─── Stale Leads ─────────────────────────────────────────────────

export async function getStaleLeads(daysThreshold: number = 7): Promise<StaleLead[]> {
  const user = await requireChef()
  const db: any = createServerClient()
  const now = new Date()

  const { data: rows } = await db
    .from('inquiries')
    .select(
      'id, channel, confirmed_budget_cents, created_at, last_response_at, updated_at, clients(full_name)'
    )
    .eq('tenant_id', user.tenantId!)
    .in('status', ['new', 'awaiting_client', 'awaiting_chef'])
    .order('updated_at', { ascending: true })

  if (!rows) return []

  const stale: StaleLead[] = []
  for (const row of rows) {
    const lastActivity = row.last_response_at || row.updated_at || row.created_at
    const days = daysBetween(now, new Date(lastActivity))
    if (days >= daysThreshold) {
      stale.push({
        id: row.id,
        clientName: row.clients?.full_name ?? null,
        channel: row.channel ?? null,
        daysSinceActivity: days,
        budgetCents: row.confirmed_budget_cents ?? 0,
        createdAt: row.created_at,
      })
    }
  }

  return stale
}

// ─── Expiring Contracts ──────────────────────────────────────────

export async function getExpiringContracts(daysAhead: number = 3): Promise<ExpiringContract[]> {
  const user = await requireChef()
  const db: any = createServerClient()
  const now = new Date()
  const threshold = new Date(now.getTime() + daysAhead * 86400000)

  const { data: rows } = await db
    .from('event_contracts')
    .select('id, status, sent_at, client_id, event_id, events(event_date), clients(full_name)')
    .eq('chef_id', user.tenantId!)
    .in('status', ['sent', 'viewed'])
    .order('sent_at', { ascending: true })

  if (!rows) return []

  const expiring: ExpiringContract[] = []
  for (const row of rows) {
    if (!row.sent_at) continue
    const deadline = new Date(new Date(row.sent_at).getTime() + 14 * 86400000)
    if (deadline < threshold) {
      expiring.push({
        id: row.id,
        clientName: row.clients?.full_name ?? null,
        eventDate: row.events?.event_date ?? null,
        daysUntilExpiry: Math.max(0, daysBetween(now, deadline)),
        sentAt: row.sent_at,
      })
    }
  }

  return expiring
}

// ─── Leads by Score ──────────────────────────────────────────────

export async function getLeadsByScore(): Promise<ScoredLead[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: rows } = await db
    .from('inquiries')
    .select(
      'id, confirmed_budget_cents, confirmed_guest_count, confirmed_date, channel, client_id, created_at, clients(full_name)'
    )
    .eq('tenant_id', user.tenantId!)
    .in('status', ['new', 'awaiting_client', 'awaiting_chef'])
    .order('created_at', { ascending: false })

  if (!rows) return []

  const scored: ScoredLead[] = []
  for (const row of rows) {
    const ls = await scoreInquiry({
      id: row.id,
      confirmed_budget_cents: row.confirmed_budget_cents,
      confirmed_guest_count: row.confirmed_guest_count,
      confirmed_date: row.confirmed_date,
      channel: row.channel,
      client_id: row.client_id,
      created_at: row.created_at,
    })
    scored.push({
      id: row.id,
      clientName: row.clients?.full_name ?? null,
      channel: row.channel ?? null,
      budgetCents: row.confirmed_budget_cents ?? 0,
      score: ls.score,
      label: ls.label,
      factors: ls.factors,
      createdAt: row.created_at,
    })
  }

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score)

  return scored
}
