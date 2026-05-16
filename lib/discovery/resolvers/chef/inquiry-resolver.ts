import type { GodModeResolvedItem, GodModeResolverContext, RailTier } from '../../god-mode-types'

// ---------------------------------------------------------------------------
// Row shape (subset of inquiry table fields we need)
// ---------------------------------------------------------------------------

export interface InquiryRow {
  id: string
  status: string
  created_at: string
  last_response_at: string | null
  confirmed_guest_count: number | null
  confirmed_occasion: string | null
  confirmed_date: string | null
  confirmed_location: string | null
  client_name: string | null
  client: { id: string; full_name: string; email: string | null } | null
}

// ---------------------------------------------------------------------------
// Pure logic (exported for testing)
// ---------------------------------------------------------------------------

const MS_HOUR = 3_600_000
const CLOSED_STATUSES = new Set(['confirmed', 'declined', 'expired'])

export function assignInquiryTier(row: InquiryRow, now: Date): RailTier | null {
  if (CLOSED_STATUSES.has(row.status)) return null

  // Waiting on client response: lower urgency
  if (row.status === 'awaiting_client') return 'p2'

  // For new/awaiting_chef: measure hours since creation with no chef response
  const referenceTime = row.last_response_at ?? row.created_at
  const hoursSince = (now.getTime() - new Date(referenceTime).getTime()) / MS_HOUR

  if (hoursSince > 48) return 'p0'
  if (hoursSince > 24) return 'p1'
  return 'p1' // New today
}

export function buildInquiryLabel(row: InquiryRow, now: Date): string {
  const parts: string[] = []
  const name = row.client_name ?? row.client?.full_name ?? 'Unknown'
  parts.push(name)

  if (row.confirmed_guest_count) {
    parts.push(`${row.confirmed_guest_count}g`)
  }
  if (row.confirmed_date) {
    const d = new Date(row.confirmed_date + 'T00:00:00')
    parts.push(d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }))
  }
  if (row.confirmed_location) {
    parts.push(row.confirmed_location)
  }

  // Add waiting duration
  const referenceTime = row.last_response_at ?? row.created_at
  const hoursWaiting = (now.getTime() - new Date(referenceTime).getTime()) / MS_HOUR
  if (hoursWaiting >= 24) {
    const days = Math.floor(hoursWaiting / 24)
    parts.push(`${days}d waiting`)
  } else if (hoursWaiting >= 1) {
    parts.push(`${Math.floor(hoursWaiting)}h waiting`)
  }

  return parts.join(' ')
}

function buildInquiryContext(row: InquiryRow): string {
  if (row.confirmed_occasion) return row.confirmed_occasion
  return `Inquiry from ${row.client_name ?? row.client?.full_name ?? 'unknown client'}`
}

// ---------------------------------------------------------------------------
// Resolver (queries DB, returns resolved items)
// ---------------------------------------------------------------------------

export async function resolveInquiries(
  ctx: GodModeResolverContext
): Promise<GodModeResolvedItem[]> {
  const { getInquiries } = await import('@/lib/inquiries/actions')

  let rows: InquiryRow[]
  try {
    const result = await getInquiries({
      status: ['new', 'awaiting_chef', 'awaiting_client', 'quoted'],
    })
    rows = (result ?? []) as unknown as InquiryRow[]
  } catch (err) {
    console.error('[inquiry-resolver] Query failed:', err)
    return []
  }

  const items: GodModeResolvedItem[] = []

  for (const row of rows) {
    const tier = assignInquiryTier(row, ctx.now)
    if (!tier) continue

    const escalatesAt = tier === 'p1' ? new Date(ctx.now.getTime() + 24 * MS_HOUR) : undefined

    items.push({
      definitionId: `chef.inquiry_${row.status}`,
      tier,
      label: buildInquiryLabel(row, ctx.now),
      context: buildInquiryContext(row),
      destination: `/chef/inquiries/${row.id}`,
      icon: 'lightning',
      loopState: row.status === 'awaiting_client' ? 'waiting' : 'active',
      sourceKind: 'inquiry',
      evidenceLabel: 'confirmed',
      confidence: 1,
      proofHref: `/chef/inquiries/${row.id}`,
      nextAction: row.status === 'awaiting_client' ? 'Track client reply' : 'Respond to inquiry',
      waitingOn:
        row.status === 'awaiting_client'
          ? { kind: 'reply', label: 'Client reply', followUpAt: null }
          : null,
      inlineActions:
        tier === 'p0' || tier === 'p1'
          ? [
              {
                label: 'Respond',
                action: 'navigate',
                params: { href: `/chef/inquiries/${row.id}` },
                variant: 'default',
              },
            ]
          : undefined,
      data: {
        inquiryId: row.id,
        clientId: row.client?.id,
        guestCount: row.confirmed_guest_count,
        eventDate: row.confirmed_date,
      },
      escalatesAt,
    })
  }

  return items
}
