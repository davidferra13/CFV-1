// Client Attention Queue - server data loader
// Combines stale inquiries + communication cadence into a single ranked list

import { getStaleInquiries, type PendingFollowUp } from '@/lib/inquiries/follow-up-actions'
import { ClientAttentionWidget } from '@/components/dashboard/client-attention-widget'

export interface AttentionItem {
  id: string
  clientName: string
  clientEmail: string | null
  reason: string
  daysSilent: number
  urgency: 'critical' | 'high' | 'medium'
  /** Link to inquiry or client page */
  href: string
  /** inquiry status for context */
  status: string
  occasion: string | null
}

function classifyUrgency(days: number): AttentionItem['urgency'] {
  if (days >= 14) return 'critical'
  if (days >= 7) return 'high'
  return 'medium'
}

function buildReason(item: PendingFollowUp): string {
  if (item.daysSinceLastOutbound >= 999) {
    return 'Never contacted'
  }
  if (item.status === 'quoted') {
    return `Quote sent ${item.daysSinceLastOutbound}d ago, no response`
  }
  return `No outbound message in ${item.daysSinceLastOutbound}d`
}

export async function ClientAttentionSection() {
  let stale: PendingFollowUp[] = []
  try {
    stale = await getStaleInquiries(2) // 2 days threshold
  } catch (err) {
    console.error('[ClientAttention] Failed to load stale inquiries', err)
    return null
  }

  if (stale.length === 0) return null

  const items: AttentionItem[] = stale
    .map((s) => ({
      id: s.inquiryId,
      clientName: s.clientName,
      clientEmail: s.clientEmail,
      reason: buildReason(s),
      daysSilent: s.daysSinceLastOutbound,
      urgency: classifyUrgency(s.daysSinceLastOutbound),
      href: `/inquiries/${s.inquiryId}`,
      status: s.status,
      occasion: s.occasion,
    }))
    .sort((a, b) => b.daysSilent - a.daysSilent)
    .slice(0, 8)

  return <ClientAttentionWidget items={items} />
}
