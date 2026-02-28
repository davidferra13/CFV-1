// Response Time SLA — compute per-inquiry urgency and overall SLA metrics
// Built on top of existing getAvgInquiryResponseTime() in pipeline-analytics.ts
// This file adds per-inquiry urgency flags for the inquiry list

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'

export interface InquiryUrgency {
  inquiryId: string
  hoursWaiting: number
  hasResponse: boolean
  urgencyLevel: 'overdue' | 'urgent' | 'ok' | 'responded'
}

/**
 * For each open inquiry, compute how long it's been waiting for a first response.
 * Returns urgency data for inquiries that need attention.
 */
export async function getInquiryUrgencies(): Promise<InquiryUrgency[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Fetch open inquiries
  const { data: inquiries } = await supabase
    .from('inquiries')
    .select('id, created_at, status')
    .eq('tenant_id', user.tenantId!)
    .in('status', ['new', 'awaiting_client', 'awaiting_chef', 'quoted'])
    .order('created_at', { ascending: true })

  if (!inquiries?.length) return []

  // Fetch first outbound message per inquiry
  const inquiryIds = inquiries.map((i: any) => i.id)
  const { data: messages } = await supabase
    .from('messages')
    .select('inquiry_id, created_at')
    .in('inquiry_id', inquiryIds)
    .eq('direction', 'outbound')
    .order('created_at', { ascending: true })

  const firstResponse = new Map<string, string>()
  for (const m of messages ?? []) {
    if (m.inquiry_id && !firstResponse.has(m.inquiry_id)) {
      firstResponse.set(m.inquiry_id, m.created_at)
    }
  }

  const now = Date.now()
  return inquiries.map((inq: any) => {
    const hasResponse = firstResponse.has(inq.id)
    const hoursWaiting = hasResponse ? 0 : (now - new Date(inq.created_at).getTime()) / 3600000

    let urgencyLevel: InquiryUrgency['urgencyLevel'] = 'responded'
    if (!hasResponse) {
      if (hoursWaiting >= 24) urgencyLevel = 'overdue'
      else if (hoursWaiting >= 4) urgencyLevel = 'urgent'
      else urgencyLevel = 'ok'
    }

    return {
      inquiryId: inq.id,
      hoursWaiting: Math.round(hoursWaiting * 10) / 10,
      hasResponse,
      urgencyLevel,
    }
  })
}

/**
 * Dashboard summary: how many inquiries are overdue / urgent / ok
 */
export interface ResponseTimeSummary {
  overdue: number // >24h no response
  urgent: number // 4–24h no response
  ok: number // <4h no response
  responded: number
  avgResponseTimeHours: number | null
}

export async function getResponseTimeSummary(): Promise<ResponseTimeSummary> {
  const urgencies = await getInquiryUrgencies()

  const overdue = urgencies.filter((u) => u.urgencyLevel === 'overdue').length
  const urgent = urgencies.filter((u) => u.urgencyLevel === 'urgent').length
  const ok = urgencies.filter((u) => u.urgencyLevel === 'ok').length
  const responded = urgencies.filter((u) => u.urgencyLevel === 'responded').length

  // Compute average across responded inquiries using pipeline analytics
  let avgResponseTimeHours: number | null = null
  try {
    const { getAvgInquiryResponseTime } = await import('@/lib/analytics/pipeline-analytics')
    const stats = await getAvgInquiryResponseTime()
    avgResponseTimeHours = stats.avgHoursToFirstResponse > 0 ? stats.avgHoursToFirstResponse : null
  } catch {
    // Non-blocking
  }

  return { overdue, urgent, ok, responded, avgResponseTimeHours }
}
