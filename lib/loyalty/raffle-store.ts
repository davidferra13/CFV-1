// Tenant-explicit raffle helpers for API v2 routes.
// Accepts tenantId directly instead of calling requireChef().

import crypto from 'crypto'
import { createServerClient } from '@/lib/db/server'
import type { RaffleRound, EligibleEntry } from './raffle-actions'

export async function getRafflesForTenant(tenantId: string): Promise<RaffleRound[]> {
  const db: any = createServerClient({ admin: true })
  const { data, error } = await db
    .from('raffle_rounds')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('month_start', { ascending: false })

  if (error) return []
  return (data || []) as RaffleRound[]
}

export async function createRaffleForTenant(
  tenantId: string,
  input: {
    name: string
    month: string
    prizeDescription: string
    prizeTopScorer?: string
    prizeMostDedicated?: string
  },
  actorId?: string
): Promise<{ success: true; roundId: string } | { success: false; error: string }> {
  const db: any = createServerClient({ admin: true })

  const [year, monthNum] = input.month.split('-').map(Number)
  const monthStart = `${year}-${String(monthNum).padStart(2, '0')}-01`
  const lastDay = new Date(year, monthNum, 0).getDate()
  const monthEnd = `${year}-${String(monthNum).padStart(2, '0')}-${lastDay}`
  const monthLabel = new Date(`${monthStart}T00:00:00Z`).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })

  const { data, error } = await db
    .from('raffle_rounds')
    .insert({
      tenant_id: tenantId,
      month_label: monthLabel,
      month_start: monthStart,
      month_end: monthEnd,
      prize_description: input.prizeDescription.trim(),
      prize_random_draw: input.prizeDescription.trim(),
      prize_top_scorer: input.prizeTopScorer?.trim() || null,
      prize_most_dedicated: input.prizeMostDedicated?.trim() || null,
      status: 'active',
      created_by: actorId ?? tenantId,
    })
    .select('id')
    .single()

  if (error) {
    if (error.code === '23505')
      return { success: false, error: 'A raffle already exists for this month.' }
    return { success: false, error: 'Failed to create raffle.' }
  }

  return { success: true, roundId: data.id }
}

export async function getEligibleEntriesForTenant(
  tenantId: string,
  raffleId: string
): Promise<EligibleEntry[]> {
  const db: any = createServerClient({ admin: true })

  const { data: round } = await db
    .from('raffle_rounds')
    .select('id')
    .eq('id', raffleId)
    .eq('tenant_id', tenantId)
    .single()
  if (!round) return []

  const { data: entries, error } = await db
    .from('raffle_entries')
    .select('client_id, alias_emoji, game_score, clients(full_name)')
    .eq('round_id', raffleId)

  if (error) return []

  const clientMap = new Map<
    string,
    { name: string; alias: string; entries: number; bestScore: number }
  >()
  for (const entry of entries || []) {
    const existing = clientMap.get(entry.client_id) || {
      name: entry.clients?.full_name || 'Client',
      alias: entry.alias_emoji,
      entries: 0,
      bestScore: 0,
    }
    existing.entries += 1
    existing.bestScore = Math.max(existing.bestScore, entry.game_score || 0)
    clientMap.set(entry.client_id, existing)
  }

  return [...clientMap.entries()]
    .map(([clientId, data]) => ({
      clientId,
      clientName: data.name,
      aliasEmoji: data.alias,
      totalEntries: data.entries,
      bestScore: data.bestScore,
    }))
    .sort((a, b) => b.totalEntries - a.totalEntries)
}

export async function getRaffleResultsForTenant(tenantId: string, raffleId: string) {
  const db: any = createServerClient({ admin: true })

  const { data: round, error } = await db
    .from('raffle_rounds')
    .select('*')
    .eq('id', raffleId)
    .eq('tenant_id', tenantId)
    .single()

  if (error || !round)
    return { round: null, totalEntries: 0, uniqueParticipants: 0, winnerName: null }

  let winnerName: string | null = null
  if (round.winner_client_id) {
    const { data: client } = await db
      .from('clients')
      .select('full_name')
      .eq('id', round.winner_client_id)
      .single()
    winnerName = client?.full_name || null
  }

  return {
    round: round as RaffleRound,
    totalEntries: round.total_entries_at_draw || 0,
    uniqueParticipants: round.total_participants_at_draw || 0,
    winnerName,
  }
}

export async function drawWinnerForTenant(
  tenantId: string,
  raffleId: string
): Promise<
  { success: true; winnerId: string; winnerName: string } | { success: false; error: string }
> {
  const db: any = createServerClient({ admin: true })

  const { data: round, error: roundErr } = await db
    .from('raffle_rounds')
    .select('id, status')
    .eq('id', raffleId)
    .eq('tenant_id', tenantId)
    .single()

  if (roundErr || !round) return { success: false, error: 'Raffle round not found.' }
  if (round.status !== 'active') return { success: false, error: 'This raffle is not active.' }

  const { data: entries, error: entriesErr } = await db
    .from('raffle_entries')
    .select('id, client_id, alias_emoji, game_score, clients(full_name)')
    .eq('round_id', raffleId)

  if (entriesErr || !entries || entries.length === 0)
    return { success: false, error: 'No entries found.' }

  const seedBytes = crypto.getRandomValues(new Uint8Array(32))
  const drawSeed = Buffer.from(seedBytes).toString('hex')
  const indexBytes = crypto.getRandomValues(new Uint8Array(4))
  const randomIndex = new DataView(indexBytes.buffer).getUint32(0) % entries.length
  const winner = entries[randomIndex]
  const uniqueParticipants = new Set(entries.map((e: { client_id: string }) => e.client_id)).size

  const { error: updateErr } = await db
    .from('raffle_rounds')
    .update({
      status: 'completed',
      winner_client_id: winner.client_id,
      winner_alias: winner.alias_emoji,
      winner_entry_id: winner.id,
      draw_seed: drawSeed,
      drawn_at: new Date().toISOString(),
      total_entries_at_draw: entries.length,
      total_participants_at_draw: uniqueParticipants,
    })
    .eq('id', raffleId)
    .eq('tenant_id', tenantId)

  if (updateErr) return { success: false, error: 'Failed to record winner.' }
  return {
    success: true,
    winnerId: winner.client_id,
    winnerName: winner.clients?.full_name || 'Unknown Client',
  }
}
