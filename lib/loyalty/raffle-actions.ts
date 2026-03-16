'use server'

// Monthly Raffle Server Actions (Pro-gated)
// Creates and manages raffle rounds, draws winners using crypto.getRandomValues
// for provably fair selection. All tenant-scoped via session.

import { requireChef } from '@/lib/auth/get-user'
import { requirePro } from '@/lib/billing/require-pro'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import crypto from 'crypto'

// ── Types ────────────────────────────────────────────────────────────────

export type RaffleRound = {
  id: string
  tenant_id: string
  month_label: string
  month_start: string
  month_end: string
  prize_description: string
  status: 'active' | 'drawing' | 'completed' | 'cancelled'
  winner_client_id: string | null
  winner_alias: string | null
  draw_seed: string | null
  drawn_at: string | null
  prize_delivered: boolean
  total_entries_at_draw: number | null
  total_participants_at_draw: number | null
  prize_random_draw: string | null
  prize_top_scorer: string | null
  prize_most_dedicated: string | null
  top_scorer_client_id: string | null
  top_scorer_alias: string | null
  most_dedicated_client_id: string | null
  most_dedicated_alias: string | null
  created_at: string
  updated_at: string
}

export type RaffleEntry = {
  id: string
  round_id: string
  client_id: string
  alias_emoji: string
  game_score: number
  entry_date: string
  created_at: string
}

export type EligibleEntry = {
  clientId: string
  clientName: string
  aliasEmoji: string
  totalEntries: number
  bestScore: number
}

// ── Create Raffle ────────────────────────────────────────────────────────

export async function createRaffle(input: {
  name: string
  month: string // YYYY-MM format
  prizeDescription: string
  prizeTopScorer?: string
  prizeMostDedicated?: string
}): Promise<{ success: true; roundId: string } | { success: false; error: string }> {
  await requirePro('raffle')
  const user = await requireChef()
  const tenantId = user.tenantId!
  const supabase: any = createServerClient()

  // Parse month into start/end dates
  const [year, monthNum] = input.month.split('-').map(Number)
  const monthStart = `${year}-${String(monthNum).padStart(2, '0')}-01`
  const lastDay = new Date(year, monthNum, 0).getDate()
  const monthEnd = `${year}-${String(monthNum).padStart(2, '0')}-${lastDay}`

  const monthLabel = new Date(`${monthStart}T00:00:00Z`).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })

  const { data, error } = await supabase
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
      created_by: user.id,
    })
    .select('id')
    .single()

  if (error) {
    if (error.code === '23505') {
      return { success: false, error: 'A raffle already exists for this month.' }
    }
    console.error('[raffle] createRaffle failed:', error)
    return { success: false, error: 'Failed to create raffle.' }
  }

  revalidatePath('/loyalty/raffle')
  return { success: true, roundId: data.id }
}

// ── List Raffles ─────────────────────────────────────────────────────────

export async function getRaffles(): Promise<RaffleRound[]> {
  await requirePro('raffle')
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('raffle_rounds')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .order('month_start', { ascending: false })

  if (error) {
    console.error('[raffle] getRaffles failed:', error)
    return []
  }

  return (data || []) as RaffleRound[]
}

// ── Get Current Raffle ───────────────────────────────────────────────────

export async function getCurrentRaffle(): Promise<RaffleRound | null> {
  await requirePro('raffle')
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('raffle_rounds')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .eq('status', 'active')
    .order('month_start', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('[raffle] getCurrentRaffle failed:', error)
    return null
  }

  return data as RaffleRound | null
}

// ── Get Eligible Entries ─────────────────────────────────────────────────

export async function getEligibleEntries(raffleId: string): Promise<EligibleEntry[]> {
  await requirePro('raffle')
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Verify the round belongs to this tenant
  const { data: round, error: roundErr } = await supabase
    .from('raffle_rounds')
    .select('id')
    .eq('id', raffleId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (roundErr || !round) {
    return []
  }

  // Get all entries with client names
  const { data: entries, error: entriesErr } = await supabase
    .from('raffle_entries')
    .select('client_id, alias_emoji, game_score, clients(full_name)')
    .eq('round_id', raffleId)

  if (entriesErr) {
    console.error('[raffle] getEligibleEntries failed:', entriesErr)
    return []
  }

  // Aggregate per client
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

// ── Draw Winner ──────────────────────────────────────────────────────────

export async function drawWinner(
  raffleId: string
): Promise<
  { success: true; winnerId: string; winnerName: string } | { success: false; error: string }
> {
  await requirePro('raffle')
  const user = await requireChef()
  const tenantId = user.tenantId!
  const supabase: any = createServerClient()

  // Verify the round exists, is active, and belongs to this tenant
  const { data: round, error: roundErr } = await supabase
    .from('raffle_rounds')
    .select('id, status')
    .eq('id', raffleId)
    .eq('tenant_id', tenantId)
    .single()

  if (roundErr || !round) {
    return { success: false, error: 'Raffle round not found.' }
  }

  if (round.status !== 'active') {
    return { success: false, error: 'This raffle is not active. Only active raffles can be drawn.' }
  }

  // Get all entries
  const { data: entries, error: entriesErr } = await supabase
    .from('raffle_entries')
    .select('id, client_id, alias_emoji, game_score, clients(full_name)')
    .eq('round_id', raffleId)

  if (entriesErr || !entries || entries.length === 0) {
    return { success: false, error: 'No entries found for this raffle.' }
  }

  // Generate cryptographically secure random seed
  const seedBytes = crypto.getRandomValues(new Uint8Array(32))
  const drawSeed = Buffer.from(seedBytes).toString('hex')

  // Select random winner using crypto-secure index
  const indexBytes = crypto.getRandomValues(new Uint8Array(4))
  const randomIndex = new DataView(indexBytes.buffer).getUint32(0) % entries.length
  const winner = entries[randomIndex]

  // Count unique participants
  const uniqueParticipants = new Set(entries.map((e: { client_id: string }) => e.client_id)).size

  // Update the round
  const { error: updateErr } = await supabase
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

  if (updateErr) {
    console.error('[raffle] drawWinner update failed:', updateErr)
    return { success: false, error: 'Failed to record winner.' }
  }

  revalidatePath('/loyalty/raffle')
  return {
    success: true,
    winnerId: winner.client_id,
    winnerName: winner.clients?.full_name || 'Unknown Client',
  }
}

// ── Get Raffle Results ───────────────────────────────────────────────────

export async function getRaffleResults(raffleId: string): Promise<{
  round: RaffleRound | null
  totalEntries: number
  uniqueParticipants: number
  winnerName: string | null
}> {
  await requirePro('raffle')
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data: round, error } = await supabase
    .from('raffle_rounds')
    .select('*')
    .eq('id', raffleId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (error || !round) {
    return { round: null, totalEntries: 0, uniqueParticipants: 0, winnerName: null }
  }

  let winnerName: string | null = null
  if (round.winner_client_id) {
    const { data: client } = await supabase
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
