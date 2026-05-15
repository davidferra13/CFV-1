import type { GodModeResolvedItem, GodModeResolverContext, RailTier } from '../../god-mode-types'

const MS_DAY = 86_400_000
const TERMINAL_STATUSES = new Set(['accepted', 'rejected', 'expired'])

export interface QuoteRow {
  id: string
  status: string
  total_quoted_cents: number | null
  valid_until: string | null
  guest_count_estimated: number | null
  created_at: string
  client: { id: string; full_name: string; email: string | null } | null
}

export function assignQuoteTier(row: QuoteRow, now: Date): RailTier | null {
  if (TERMINAL_STATUSES.has(row.status)) return null

  if (row.status === 'draft') return 'p2'

  // Sent quotes: urgency based on expiration (calendar-day distance)
  if (row.status === 'sent' && row.valid_until) {
    const expiresDate = new Date(row.valid_until + 'T00:00:00Z')
    const todayDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
    const calendarDays = (expiresDate.getTime() - todayDate.getTime()) / MS_DAY

    if (calendarDays <= 2) return 'p0'
    if (calendarDays <= 7) return 'p1'
    return 'p2'
  }

  if (row.status === 'sent') return 'p2'

  return 'p3'
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 0 })}`
}

export function buildQuoteLabel(row: QuoteRow, now: Date): string {
  const parts: string[] = []
  const name = row.client?.full_name ?? 'Client'
  parts.push(`${name} quote`)

  if (row.total_quoted_cents) {
    parts.push(formatCents(row.total_quoted_cents))
  }

  if (row.status === 'sent' && row.valid_until) {
    const expiresDate = new Date(row.valid_until + 'T00:00:00Z')
    const todayDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
    const daysUntil = Math.round((expiresDate.getTime() - todayDate.getTime()) / MS_DAY)
    if (daysUntil <= 0) {
      parts.push('expired')
    } else if (daysUntil === 1) {
      parts.push('expires tomorrow')
    } else {
      parts.push(`expires ${daysUntil}d`)
    }
  } else if (row.status === 'draft') {
    parts.push('draft')
  }

  return parts.join(' ')
}

export async function resolveQuotes(ctx: GodModeResolverContext): Promise<GodModeResolvedItem[]> {
  const { getQuotes } = await import('@/lib/quotes/actions')

  let quotes: QuoteRow[]
  try {
    const result = await getQuotes({ status: ['draft', 'sent'] })
    quotes = (result ?? []) as unknown as QuoteRow[]
  } catch (err) {
    console.error('[quote-resolver] Query failed:', err)
    return []
  }

  const items: GodModeResolvedItem[] = []

  for (const quote of quotes) {
    const tier = assignQuoteTier(quote, ctx.now)
    if (!tier) continue

    const escalatesAt =
      tier === 'p1' && quote.valid_until
        ? new Date(new Date(quote.valid_until + 'T00:00:00').getTime() - 2 * MS_DAY)
        : undefined

    items.push({
      definitionId: quote.status === 'draft' ? 'chef.quote_draft' : 'chef.quote_sent',
      tier,
      label: buildQuoteLabel(quote, ctx.now),
      context: quote.guest_count_estimated
        ? `${quote.guest_count_estimated} guests estimated`
        : 'Quote pending',
      destination: `/chef/quotes/${quote.id}`,
      icon: 'document',
      inlineActions:
        quote.status === 'draft'
          ? [
              {
                label: 'Edit',
                action: 'navigate',
                params: { href: `/chef/quotes/${quote.id}/edit` },
                variant: 'default',
              },
            ]
          : tier === 'p0'
            ? [
                {
                  label: 'Nudge',
                  action: 'send_quote_reminder',
                  params: { quoteId: quote.id },
                  variant: 'default',
                },
              ]
            : undefined,
      data: {
        quoteId: quote.id,
        clientId: quote.client?.id,
        amountCents: quote.total_quoted_cents,
        validUntil: quote.valid_until,
      },
      escalatesAt,
    })
  }

  return items
}
