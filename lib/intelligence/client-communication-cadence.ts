'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ClientCommunicationProfile {
  clientId: string
  clientName: string
  avgResponseHours: number | null
  inquiryCount: number
  quoteResponseAvgDays: number | null
  lastContactDate: string | null
  silentDays: number // days since last activity
  status: 'active' | 'slowing' | 'silent' | 'new'
  alerts: string[]
}

export interface CommunicationCadenceResult {
  profiles: ClientCommunicationProfile[]
  silentClients: ClientCommunicationProfile[] // clients who've gone quiet mid-pipeline
  avgChefResponseHours: number // how fast the chef responds
  fastestResponseClient: string | null
  slowestResponseClient: string | null
  openInquiriesWithoutReply: number
  pipelineAtRisk: number // inquiries where client has gone silent
}

// ─── Main Action ─────────────────────────────────────────────────────────────

export async function getCommunicationCadence(): Promise<CommunicationCadenceResult | null> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const supabase: any = createServerClient()

  // Fetch inquiries with timing data
  const { data: inquiries, error } = await supabase
    .from('inquiries')
    .select(
      `
      id, status, created_at, updated_at, client_id,
      client:clients(full_name, last_event_date)
    `
    )
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })

  if (error || !inquiries || inquiries.length === 0) return null

  // Fetch quotes for response time tracking
  const { data: quotes } = await supabase
    .from('quotes')
    .select('id, inquiry_id, sent_at, accepted_at, rejected_at, status')
    .eq('tenant_id', tenantId)

  const quoteByInquiry = new Map<string, any[]>()
  for (const q of quotes || []) {
    if (!q.inquiry_id) continue
    if (!quoteByInquiry.has(q.inquiry_id)) quoteByInquiry.set(q.inquiry_id, [])
    quoteByInquiry.get(q.inquiry_id)!.push(q)
  }

  const now = Date.now()
  const clientMap = new Map<
    string,
    {
      name: string
      inquiryCount: number
      responseHours: number[]
      quoteResponseDays: number[]
      lastActivity: number
      alerts: string[]
      openInquiryStatus: string | null
    }
  >()

  let openWithoutReply = 0

  for (const inquiry of inquiries) {
    const clientId = inquiry.client_id
    if (!clientId) continue

    const client = inquiry.client as any
    const clientName = client?.full_name || 'Unknown'

    if (!clientMap.has(clientId)) {
      clientMap.set(clientId, {
        name: clientName,
        inquiryCount: 0,
        responseHours: [],
        quoteResponseDays: [],
        lastActivity: 0,
        alerts: [],
        openInquiryStatus: null,
      })
    }

    const profile = clientMap.get(clientId)!
    profile.inquiryCount++

    // Track last activity
    const updatedAt = new Date(inquiry.updated_at).getTime()
    if (updatedAt > profile.lastActivity) profile.lastActivity = updatedAt

    // Quote response time
    const inquiryQuotes = quoteByInquiry.get(inquiry.id) || []
    for (const q of inquiryQuotes) {
      if (q.sent_at && q.accepted_at) {
        const days = (new Date(q.accepted_at).getTime() - new Date(q.sent_at).getTime()) / 86400000
        if (days > 0 && days < 90) profile.quoteResponseDays.push(days)
      } else if (q.sent_at && q.rejected_at) {
        const days = (new Date(q.rejected_at).getTime() - new Date(q.sent_at).getTime()) / 86400000
        if (days > 0 && days < 90) profile.quoteResponseDays.push(days)
      }
    }

    // Chef response time (created_at to first quote sent)
    if (inquiryQuotes.length > 0 && inquiryQuotes[0].sent_at) {
      const hours =
        (new Date(inquiryQuotes[0].sent_at).getTime() - new Date(inquiry.created_at).getTime()) /
        3600000
      if (hours > 0 && hours < 720) profile.responseHours.push(hours)
    }

    // Open inquiry tracking
    const openStatuses = ['new', 'awaiting_response', 'awaiting_chef', 'awaiting_client', 'quoted']
    if (openStatuses.includes(inquiry.status)) {
      profile.openInquiryStatus = inquiry.status

      if (inquiry.status === 'new') {
        const hoursOld = (now - new Date(inquiry.created_at).getTime()) / 3600000
        if (hoursOld > 48) openWithoutReply++
      }
    }
  }

  // Build profiles
  const profiles: ClientCommunicationProfile[] = []
  let totalChefResponseHours: number[] = []

  for (const [clientId, data] of clientMap.entries()) {
    const silentDays = Math.floor((now - data.lastActivity) / 86400000)
    const avgResponseHours =
      data.responseHours.length > 0
        ? Math.round(data.responseHours.reduce((s, h) => s + h, 0) / data.responseHours.length)
        : null
    const quoteResponseAvgDays =
      data.quoteResponseDays.length > 0
        ? Math.round(
            (data.quoteResponseDays.reduce((s, d) => s + d, 0) / data.quoteResponseDays.length) * 10
          ) / 10
        : null

    totalChefResponseHours.push(...data.responseHours)

    // Determine status
    let status: ClientCommunicationProfile['status'] = 'active'
    if (data.inquiryCount === 1 && silentDays < 7) status = 'new'
    else if (silentDays > 30) status = 'silent'
    else if (silentDays > 14) status = 'slowing'

    // Generate alerts
    const alerts: string[] = [...data.alerts]

    if (data.openInquiryStatus === 'awaiting_client' && silentDays > 7) {
      alerts.push(`Client hasn't responded in ${silentDays} days (inquiry awaiting their response)`)
    }
    if (data.openInquiryStatus === 'quoted' && silentDays > 5) {
      alerts.push(`Quote sent ${silentDays} days ago with no response`)
    }
    if (quoteResponseAvgDays && quoteResponseAvgDays > 7) {
      alerts.push(`Slow quote responder (avg ${quoteResponseAvgDays} days)`)
    }

    profiles.push({
      clientId,
      clientName: data.name,
      avgResponseHours,
      inquiryCount: data.inquiryCount,
      quoteResponseAvgDays,
      lastContactDate:
        data.lastActivity > 0 ? new Date(data.lastActivity).toISOString().split('T')[0] : null,
      silentDays,
      status,
      alerts,
    })
  }

  // Sort: silent/slowing first, then by silent days
  const statusOrder = { silent: 0, slowing: 1, active: 2, new: 3 }
  profiles.sort(
    (a, b) => statusOrder[a.status] - statusOrder[b.status] || b.silentDays - a.silentDays
  )

  const silentClients = profiles.filter(
    (p) => p.status === 'silent' || (p.status === 'slowing' && p.alerts.length > 0)
  )
  const avgChefResponse =
    totalChefResponseHours.length > 0
      ? Math.round(
          totalChefResponseHours.reduce((s, h) => s + h, 0) / totalChefResponseHours.length
        )
      : 0

  const withQuoteResponse = profiles.filter((p) => p.quoteResponseAvgDays !== null)
  const fastest =
    withQuoteResponse.length > 0
      ? withQuoteResponse.reduce((a, b) =>
          a.quoteResponseAvgDays! < b.quoteResponseAvgDays! ? a : b
        ).clientName
      : null
  const slowest =
    withQuoteResponse.length > 0
      ? withQuoteResponse.reduce((a, b) =>
          a.quoteResponseAvgDays! > b.quoteResponseAvgDays! ? a : b
        ).clientName
      : null

  const pipelineAtRisk = profiles.filter(
    (p) => (p.status === 'silent' || p.status === 'slowing') && p.alerts.length > 0
  ).length

  return {
    profiles: profiles.slice(0, 25),
    silentClients: silentClients.slice(0, 10),
    avgChefResponseHours: avgChefResponse,
    fastestResponseClient: fastest,
    slowestResponseClient: slowest,
    openInquiriesWithoutReply: openWithoutReply,
    pipelineAtRisk,
  }
}
