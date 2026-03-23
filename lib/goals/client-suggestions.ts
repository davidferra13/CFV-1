import type { ClientSuggestion } from './types'

type SummaryRow = {
  client_id: string | null
  lifetime_value_cents: number | null
  average_spend_per_event: number | null
  days_since_last_event: number | null
  is_dormant: boolean | null
}

type ClientRow = {
  id: string
  full_name: string
  status: string | null
}

type ExistingSuggestionRow = {
  client_id: string
  id: string
  status: string
}

// ── Build client suggestions for a revenue gap ────────────────────────────────
// Queries dormant and repeat-ready clients, ranks them by lifetime value,
// and returns up to maxSuggestions candidates with human-readable reasons.
//
// Automatically persists new suggestion rows to goal_client_suggestions so
// that the chef can track outreach status via Contact/Dismiss buttons.
// Existing rows (already contacted, booked, etc.) keep their status.

export async function buildClientSuggestions(
  supabase: any,
  tenantId: string,
  gapCents: number,
  goalId: string,
  maxSuggestions = 5
): Promise<ClientSuggestion[]> {
  if (gapCents <= 0) return []

  // Fetch dormant clients from financial summary view
  const { data: summaryRows } = await supabase
    .from('client_financial_summary')
    .select(
      'client_id, lifetime_value_cents, average_spend_per_event, days_since_last_event, is_dormant'
    )
    .eq('tenant_id', tenantId)
    .eq('is_dormant', true)
    .order('lifetime_value_cents', { ascending: false })
    .limit(20)

  const rows = ((summaryRows || []) as SummaryRow[]).filter((r) => r.client_id)
  if (rows.length === 0) return []

  const clientIds = rows.map((r) => r.client_id as string)

  // Fetch client names and statuses
  const { data: clientRows } = await supabase
    .from('clients')
    .select('id, full_name, status')
    .eq('tenant_id', tenantId)
    .in('id', clientIds)

  const clientMap = new Map<string, ClientRow>(
    ((clientRows || []) as ClientRow[]).map((c) => [c.id, c])
  )

  // Fetch existing suggestion rows to merge current status + ID
  const { data: existingRows } = await supabase
    .from('goal_client_suggestions')
    .select('client_id, id, status')
    .eq('tenant_id', tenantId)
    .eq('goal_id', goalId)
    .in('client_id', clientIds)

  const suggestionMap = new Map<string, ExistingSuggestionRow>(
    ((existingRows || []) as ExistingSuggestionRow[]).map((r) => [r.client_id, r])
  )

  // Sort: repeat_ready clients first, then by lifetime value desc
  const sorted = [...rows].sort((a, b) => {
    const ca = clientMap.get(a.client_id as string)
    const cb = clientMap.get(b.client_id as string)
    const aRepeat = ca?.status === 'repeat_ready' ? 1 : 0
    const bRepeat = cb?.status === 'repeat_ready' ? 1 : 0
    if (aRepeat !== bRepeat) return bRepeat - aRepeat
    return (b.lifetime_value_cents ?? 0) - (a.lifetime_value_cents ?? 0)
  })

  const suggestions: ClientSuggestion[] = sorted
    .slice(0, maxSuggestions)
    .map((row, index) => {
      const client = clientMap.get(row.client_id as string)
      if (!client) return null

      const existing = suggestionMap.get(row.client_id as string)
      const avgSpend = row.average_spend_per_event ?? 0
      const days = row.days_since_last_event ?? null

      return {
        clientId: row.client_id as string,
        clientName: client.full_name,
        daysDormant: days,
        avgSpendCents: avgSpend,
        lifetimeValueCents: row.lifetime_value_cents ?? 0,
        reason: buildReason(days, avgSpend, client.status ?? ''),
        rank: index,
        status: (existing?.status ?? 'pending') as ClientSuggestion['status'],
        suggestionId: existing?.id,
      }
    })
    .filter(Boolean) as ClientSuggestion[]

  // ── Persist new suggestions so Contact/Dismiss buttons get a DB ID ────────
  const newSuggestions = suggestions.filter((s) => !s.suggestionId)
  if (newSuggestions.length === 0) return suggestions

  const insertRows = newSuggestions.map((s) => ({
    tenant_id: tenantId,
    goal_id: goalId,
    client_id: s.clientId,
    reason: s.reason,
    rank: s.rank,
    days_dormant: s.daysDormant,
    avg_spend_cents: s.avgSpendCents,
    lifetime_value_cents: s.lifetimeValueCents,
  }))

  // ignoreDuplicates: true ensures existing rows (with non-pending status) are not overwritten
  await supabase
    .from('goal_client_suggestions')
    .upsert(insertRows, { onConflict: 'goal_id,client_id', ignoreDuplicates: true })

  // Re-fetch newly inserted rows to capture their auto-generated IDs
  const { data: freshRows } = await supabase
    .from('goal_client_suggestions')
    .select('client_id, id, status')
    .eq('tenant_id', tenantId)
    .eq('goal_id', goalId)
    .in(
      'client_id',
      newSuggestions.map((s) => s.clientId)
    )

  const freshMap = new Map<string, ExistingSuggestionRow>(
    ((freshRows || []) as ExistingSuggestionRow[]).map((r) => [r.client_id, r])
  )

  return suggestions.map((s) => {
    if (s.suggestionId) return s // already had a DB row
    const fresh = freshMap.get(s.clientId)
    if (!fresh) return s
    return { ...s, suggestionId: fresh.id, status: fresh.status as ClientSuggestion['status'] }
  })
}

function buildReason(
  daysDormant: number | null,
  avgSpendCents: number,
  clientStatus: string
): string {
  const dollarAvg =
    avgSpendCents > 0
      ? `avg $${Math.round(avgSpendCents / 100).toLocaleString('en-US')} booking`
      : 'prior client'

  if (clientStatus === 'repeat_ready') {
    return `Ready to rebook - ${dollarAvg}`
  }
  if (daysDormant !== null && daysDormant > 0) {
    return `Dormant ${daysDormant} day${daysDormant === 1 ? '' : 's'} - ${dollarAvg}`
  }
  return `Inactive client - ${dollarAvg}`
}
