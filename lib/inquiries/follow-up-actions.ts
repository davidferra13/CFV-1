// Auto-Follow-Up Draft Cadence
// Finds stale inquiries and drafts follow-up messages for chef approval
// Never auto-sends — always creates drafts for review

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'

export interface PendingFollowUp {
  inquiryId: string
  clientName: string
  clientEmail: string | null
  occasion: string | null
  daysSinceLastOutbound: number
  status: string
  lastOutboundAt: string | null
}

/**
 * Find inquiries that are waiting on the client and haven't had an outbound
 * message in N days. These are candidates for a follow-up nudge.
 */
export async function getStaleInquiries(staleDays: number = 3): Promise<PendingFollowUp[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Inquiries in "awaiting_client" or "quoted" where the ball is in client's court
  const { data: inquiries } = await supabase
    .from('inquiries')
    .select(
      `
      id, status, confirmed_occasion, client_id,
      client:clients(full_name, email)
    `
    )
    .eq('tenant_id', user.tenantId!)
    .in('status', ['awaiting_client', 'quoted'])
    .order('updated_at', { ascending: true })

  if (!inquiries?.length) return []

  // Get last outbound message per inquiry
  const inquiryIds = inquiries.map((i: any) => i.id)
  const { data: messages } = await supabase
    .from('messages')
    .select('inquiry_id, created_at')
    .in('inquiry_id', inquiryIds)
    .eq('direction', 'outbound')
    .order('created_at', { ascending: false })

  // Build map of latest outbound per inquiry
  const lastOutbound = new Map<string, string>()
  for (const m of messages ?? []) {
    if (m.inquiry_id && !lastOutbound.has(m.inquiry_id)) {
      lastOutbound.set(m.inquiry_id, m.created_at)
    }
  }

  const now = Date.now()
  const staleMs = staleDays * 24 * 60 * 60 * 1000
  const results: PendingFollowUp[] = []

  for (const inq of inquiries) {
    const lastOut = lastOutbound.get(inq.id)
    const referenceTime = lastOut ? new Date(lastOut).getTime() : 0 // If no outbound ever, it's definitely stale

    // Skip if not stale yet
    if (lastOut && now - referenceTime < staleMs) continue

    const client = inq.client as { full_name: string; email: string } | null
    const daysSince = lastOut ? Math.floor((now - referenceTime) / (24 * 60 * 60 * 1000)) : 999

    results.push({
      inquiryId: inq.id,
      clientName: client?.full_name ?? 'Unknown',
      clientEmail: client?.email ?? null,
      occasion: inq.confirmed_occasion,
      daysSinceLastOutbound: daysSince,
      status: inq.status,
      lastOutboundAt: lastOut ?? null,
    })
  }

  return results.sort((a, b) => b.daysSinceLastOutbound - a.daysSinceLastOutbound)
}

/**
 * Get count of pending follow-ups for the dashboard badge
 */
export async function getPendingFollowUpCount(staleDays: number = 3): Promise<number> {
  const stale = await getStaleInquiries(staleDays)
  return stale.length
}
