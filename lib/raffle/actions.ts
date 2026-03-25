// Monthly Raffle Server Actions
// Game-based raffle entries, anonymous leaderboard, provably fair automated drawing.
// Chef creates rounds with custom prizes; clients earn entries by playing Pan Catch.

'use server'

import { requireChef, requireClient } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import { ALIAS_EMOJIS } from './constants'
import { createClientNotification } from '@/lib/notifications/client-actions'
import crypto from 'crypto'

// =====================================================================================
// TYPES
// =====================================================================================

export type RaffleRound = {
  id: string
  tenant_id: string
  month_label: string
  month_start: string
  month_end: string
  prize_description: string
  status: 'active' | 'drawing' | 'completed' | 'cancelled'
  // Random draw winner
  winner_client_id: string | null
  winner_alias: string | null
  winner_entry_id: string | null
  draw_seed: string | null
  drawn_at: string | null
  prize_delivered: boolean
  prize_delivered_at: string | null
  total_entries_at_draw: number | null
  total_participants_at_draw: number | null
  // Per-category prizes
  prize_random_draw: string | null
  prize_top_scorer: string | null
  prize_most_dedicated: string | null
  // Top Scorer winner
  top_scorer_client_id: string | null
  top_scorer_alias: string | null
  top_scorer_entry_id: string | null
  top_scorer_score: number | null
  // Most Dedicated winner
  most_dedicated_client_id: string | null
  most_dedicated_alias: string | null
  most_dedicated_entry_count: number | null
  // Per-category delivery tracking
  prize_random_delivered: boolean
  prize_random_delivered_at: string | null
  prize_top_scorer_delivered: boolean
  prize_top_scorer_delivered_at: string | null
  prize_most_dedicated_delivered: boolean
  prize_most_dedicated_delivered_at: string | null
  created_at: string
  updated_at: string
}

export type RaffleEntry = {
  id: string
  tenant_id: string
  round_id: string
  client_id: string
  alias_emoji: string
  game_score: number
  source: string
  entry_date: string
  created_at: string
}

export type LeaderboardEntry = {
  alias_emoji: string
  best_score: number
  total_entries: number
  is_you: boolean
}

export type WinnerInfo = {
  category: 'random_draw' | 'top_scorer' | 'most_dedicated'
  alias: string
  is_you: boolean
  prize_description: string
  detail: string // e.g. "Random draw from 47 entries" or "Score: 1,280"
}

export type DrawReceipt = {
  drawn_at: string
  draw_seed: string
  total_entries: number
  total_participants: number
  winner_alias: string
  is_you_winner: boolean
  prize_description: string
  winners: WinnerInfo[]
}

// =====================================================================================
// CHEF ACTIONS
// =====================================================================================

/** Create a new raffle round for the current month (or specified month). */
export async function createRaffleRound(input: {
  prizeDescription: string
  monthStart: string // ISO date - first of month
  monthEnd: string // ISO date - last of month
  prizeTopScorer?: string // optional top scorer prize (null = category disabled)
  prizeMostDedicated?: string // optional most dedicated prize (null = category disabled)
}): Promise<{ success: boolean; error?: string; roundId?: string }> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  // Generate month label from the start date
  const startDate = new Date(input.monthStart + 'T00:00:00Z')
  const monthLabel = startDate.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })

  const { data, error } = await (db as any)
    .from('raffle_rounds')
    .insert({
      tenant_id: tenantId,
      month_label: monthLabel,
      month_start: input.monthStart,
      month_end: input.monthEnd,
      prize_description: input.prizeDescription.trim(),
      prize_random_draw: input.prizeDescription.trim(),
      prize_top_scorer: input.prizeTopScorer?.trim() || null,
      prize_most_dedicated: input.prizeMostDedicated?.trim() || null,
      status: 'active',
      created_by: user.id,
    } as any)
    .select('id')
    .single()

  if (error) {
    if (error.code === '23505') {
      return { success: false, error: 'A raffle already exists for this month.' }
    }
    console.error('[raffle] Failed to create round:', error)
    return { success: false, error: 'Failed to create raffle round.' }
  }

  try {
    const { createNotification, getChefAuthUserId } = await import('@/lib/notifications/actions')
    const chefUserId = await getChefAuthUserId(tenantId)
    if (chefUserId) {
      await createNotification({
        tenantId,
        recipientId: chefUserId,
        category: 'loyalty',
        action: 'raffle_new_round',
        title: `New raffle round created: ${monthLabel}`,
        body: 'The monthly raffle is now active.',
        actionUrl: '/loyalty/raffle',
      })
    }
  } catch (notifyErr) {
    console.error('[non-blocking] Raffle round creation notification failed:', notifyErr)
  }

  revalidatePath('/my-rewards')
  revalidatePath('/loyalty/raffle')
  return { success: true, roundId: data.id }
}

/** Update a raffle round (prize description or cancel). */
export async function updateRaffleRound(
  roundId: string,
  input: { prizeDescription?: string; status?: 'cancelled' }
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  const updates: Record<string, unknown> = {}
  if (input.prizeDescription !== undefined)
    updates.prize_description = input.prizeDescription.trim()
  if (input.status === 'cancelled') updates.status = 'cancelled'

  const { error } = await (db as any)
    .from('raffle_rounds')
    .update(updates)
    .eq('id', roundId)
    .eq('tenant_id', tenantId)
    .eq('status', 'active') // Can only update active rounds

  if (error) {
    console.error('[raffle] Failed to update round:', error)
    return { success: false, error: 'Failed to update raffle round.' }
  }

  revalidatePath('/my-rewards')
  revalidatePath('/loyalty/raffle')
  return { success: true }
}

/** Get all raffle rounds for the chef's tenant (most recent first). */
export async function getRaffleRounds(): Promise<RaffleRound[]> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  const { data, error } = await (db as any)
    .from('raffle_rounds')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('month_start', { ascending: false })

  if (error) {
    console.error('[raffle] Failed to fetch rounds:', error)
    return []
  }

  return (data || []) as RaffleRound[]
}

/** Get detailed round info with entries (chef view - shows real client names). */
export async function getRaffleRoundDetail(roundId: string): Promise<{
  round: RaffleRound | null
  entries: (RaffleEntry & { client_name: string })[]
  totalEntries: number
  uniqueParticipants: number
  winnerName: string | null
  topScorerName: string | null
  mostDedicatedName: string | null
}> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  const [roundResult, entriesResult] = await Promise.all([
    (db as any)
      .from('raffle_rounds')
      .select('*')
      .eq('id', roundId)
      .eq('tenant_id', tenantId)
      .single(),
    (db as any)
      .from('raffle_entries')
      .select('*, clients!inner(full_name)')
      .eq('round_id', roundId)
      .eq('tenant_id', tenantId)
      .order('game_score', { ascending: false }),
  ])

  if (roundResult.error || !roundResult.data) {
    return {
      round: null,
      entries: [],
      totalEntries: 0,
      uniqueParticipants: 0,
      winnerName: null,
      topScorerName: null,
      mostDedicatedName: null,
    }
  }

  const entries = (entriesResult.data || []).map((e: any) => ({
    ...e,
    client_name: e.clients?.full_name || 'Unknown',
  }))

  const uniqueClients = new Set(entries.map((e: any) => e.client_id))

  let winnerName: string | null = null
  if (roundResult.data.winner_client_id) {
    const winner = entries.find((e: any) => e.client_id === roundResult.data.winner_client_id)
    winnerName = winner?.client_name || null
  }

  let topScorerName: string | null = null
  if (roundResult.data.top_scorer_client_id) {
    const ts = entries.find((e: any) => e.client_id === roundResult.data.top_scorer_client_id)
    topScorerName = ts?.client_name || null
  }

  let mostDedicatedName: string | null = null
  if (roundResult.data.most_dedicated_client_id) {
    const md = entries.find((e: any) => e.client_id === roundResult.data.most_dedicated_client_id)
    mostDedicatedName = md?.client_name || null
  }

  return {
    round: roundResult.data as RaffleRound,
    entries,
    totalEntries: entries.length,
    uniqueParticipants: uniqueClients.size,
    winnerName,
    topScorerName,
    mostDedicatedName,
  }
}

/** Mark a raffle prize as delivered (per category). */
export async function markPrizeDelivered(
  roundId: string,
  category: 'random' | 'top_scorer' | 'most_dedicated' = 'random'
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  const columnMap = {
    random: { delivered: 'prize_random_delivered', deliveredAt: 'prize_random_delivered_at' },
    top_scorer: {
      delivered: 'prize_top_scorer_delivered',
      deliveredAt: 'prize_top_scorer_delivered_at',
    },
    most_dedicated: {
      delivered: 'prize_most_dedicated_delivered',
      deliveredAt: 'prize_most_dedicated_delivered_at',
    },
  }
  const cols = columnMap[category]
  const now = new Date().toISOString()

  // Update per-category delivery + legacy prize_delivered for backward compat
  const updates: Record<string, unknown> = {
    [cols.delivered]: true,
    [cols.deliveredAt]: now,
  }
  if (category === 'random') {
    updates.prize_delivered = true
    updates.prize_delivered_at = now
  }

  const { error } = await (db as any)
    .from('raffle_rounds')
    .update(updates)
    .eq('id', roundId)
    .eq('tenant_id', tenantId)
    .eq('status', 'completed')

  if (error) {
    console.error('[raffle] Failed to mark prize delivered:', error)
    return { success: false, error: 'Failed to update delivery status.' }
  }

  revalidatePath('/loyalty/raffle')
  return { success: true }
}

// =====================================================================================
// CLIENT ACTIONS
// =====================================================================================

/** Get the active raffle for the client's chef, their entries, leaderboard, and last draw receipt. */
export async function getActiveRaffle(): Promise<{
  round: RaffleRound | null
  myEntries: number
  myAlias: string | null
  hasEntryToday: boolean
  totalEntries: number
  leaderboard: LeaderboardEntry[]
  lastDrawReceipt: DrawReceipt | null
} | null> {
  const user = await requireClient()
  const db: any = createServerClient()

  // Get client's tenant
  const { data: client } = await db
    .from('clients')
    .select('tenant_id')
    .eq('id', user.entityId)
    .single()

  if (!client) return null

  const today = new Date().toISOString().split('T')[0]
  const thisMonthStart = today.substring(0, 7) + '-01' // YYYY-MM-01

  // Fetch active round + most recent completed round in parallel
  const [activeResult, completedResult] = await Promise.all([
    (db as any)
      .from('raffle_rounds')
      .select('*')
      .eq('tenant_id', client.tenant_id)
      .eq('status', 'active')
      .gte('month_end', today)
      .order('month_start', { ascending: false })
      .limit(1)
      .maybeSingle(),
    (db as any)
      .from('raffle_rounds')
      .select('*')
      .eq('tenant_id', client.tenant_id)
      .eq('status', 'completed')
      .order('drawn_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  // Build last draw receipt from the most recent completed round
  let lastDrawReceipt: DrawReceipt | null = null
  if (completedResult.data) {
    const cr = completedResult.data as RaffleRound
    const winners: WinnerInfo[] = []

    // Random draw winner (always present on completed rounds)
    if (cr.winner_alias) {
      winners.push({
        category: 'random_draw',
        alias: cr.winner_alias,
        is_you: cr.winner_client_id === user.entityId,
        prize_description: cr.prize_random_draw || cr.prize_description,
        detail: `Random draw from ${cr.total_entries_at_draw || 0} entries`,
      })
    }

    // Top scorer (only shown if prize was offered for this category)
    if (cr.top_scorer_alias && cr.prize_top_scorer) {
      winners.push({
        category: 'top_scorer',
        alias: cr.top_scorer_alias,
        is_you: cr.top_scorer_client_id === user.entityId,
        prize_description: cr.prize_top_scorer,
        detail: `High score: ${(cr.top_scorer_score || 0).toLocaleString()}`,
      })
    }

    // Most dedicated (only shown if prize was offered)
    if (cr.most_dedicated_alias && cr.prize_most_dedicated) {
      winners.push({
        category: 'most_dedicated',
        alias: cr.most_dedicated_alias,
        is_you: cr.most_dedicated_client_id === user.entityId,
        prize_description: cr.prize_most_dedicated,
        detail: `${cr.most_dedicated_entry_count || 0} days played`,
      })
    }

    lastDrawReceipt = {
      drawn_at: cr.drawn_at!,
      draw_seed: cr.draw_seed || '',
      total_entries: cr.total_entries_at_draw || 0,
      total_participants: cr.total_participants_at_draw || 0,
      winner_alias: cr.winner_alias || '?',
      is_you_winner: winners.some((w) => w.is_you),
      prize_description: cr.prize_description,
      winners,
    }
  }

  const round = activeResult.data as RaffleRound | null
  if (!round) {
    return {
      round: null,
      myEntries: 0,
      myAlias: null,
      hasEntryToday: false,
      totalEntries: 0,
      leaderboard: [],
      lastDrawReceipt,
    }
  }

  // Get all entries for this round
  const { data: allEntries } = await (db as any)
    .from('raffle_entries')
    .select('client_id, alias_emoji, game_score, entry_date')
    .eq('round_id', round.id)

  const entries = allEntries || []
  const myEntries = entries.filter((e: any) => e.client_id === user.entityId)
  const hasEntryToday = myEntries.some((e: any) => e.entry_date === today)
  const myAlias = myEntries.length > 0 ? myEntries[0].alias_emoji : null

  // Build anonymous leaderboard: best score per participant
  const bestScores = new Map<
    string,
    { alias: string; score: number; entries: number; clientId: string }
  >()
  for (const e of entries as any[]) {
    const existing = bestScores.get(e.client_id)
    if (!existing || e.game_score > existing.score) {
      bestScores.set(e.client_id, {
        alias: e.alias_emoji,
        score: e.game_score,
        entries: (existing?.entries || 0) + 1,
        clientId: e.client_id,
      })
    } else {
      existing.entries++
    }
  }

  const leaderboard: LeaderboardEntry[] = Array.from(bestScores.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
    .map((entry) => ({
      alias_emoji: entry.alias,
      best_score: entry.score,
      total_entries: entry.entries,
      is_you: entry.clientId === user.entityId,
    }))

  return {
    round,
    myEntries: myEntries.length,
    myAlias,
    hasEntryToday,
    totalEntries: entries.length,
    leaderboard,
    lastDrawReceipt,
  }
}

/** Submit a raffle entry after completing a game. Clients can play unlimited times; 1 entry per day, best score tracked. */
export async function submitRaffleEntry(
  roundId: string,
  gameScore: number
): Promise<{
  success: boolean
  error?: string
  totalEntries?: number
  alias?: string
  isNewEntry?: boolean
}> {
  const user = await requireClient()
  const db: any = createServerClient()

  // Get client info
  const { data: client } = await db
    .from('clients')
    .select('tenant_id')
    .eq('id', user.entityId)
    .single()

  if (!client) return { success: false, error: 'Client not found.' }

  // Verify round is active and belongs to client's tenant
  const { data: round } = await (db as any)
    .from('raffle_rounds')
    .select('id, status, tenant_id')
    .eq('id', roundId)
    .eq('tenant_id', client.tenant_id)
    .eq('status', 'active')
    .single()

  if (!round) return { success: false, error: 'No active raffle found.' }

  // Get existing alias for this client in this round, or assign new one
  const { data: existingEntries } = await (db as any)
    .from('raffle_entries')
    .select('alias_emoji')
    .eq('round_id', roundId)
    .eq('client_id', user.entityId)
    .limit(1)

  let aliasEmoji: string
  if (existingEntries && existingEntries.length > 0) {
    aliasEmoji = existingEntries[0].alias_emoji
  } else {
    // Assign a new unique alias - check which emojis are already taken in this round
    const { data: usedAliases } = await (db as any)
      .from('raffle_entries')
      .select('alias_emoji')
      .eq('round_id', roundId)

    const used = new Set((usedAliases || []).map((e: any) => e.alias_emoji))
    const available = ALIAS_EMOJIS.filter((e) => !used.has(e))
    aliasEmoji =
      available.length > 0
        ? available[Math.floor(Math.random() * available.length)]
        : ALIAS_EMOJIS[Math.floor(Math.random() * ALIAS_EMOJIS.length)]
  }

  const safeScore = Math.max(0, Math.round(gameScore))

  // Try to insert a new entry for today
  const { error: insertError } = await (db as any).from('raffle_entries').insert({
    tenant_id: client.tenant_id,
    round_id: roundId,
    client_id: user.entityId,
    alias_emoji: aliasEmoji,
    game_score: safeScore,
    source: 'pan_catch',
  } as any)

  let isNewEntry = true
  if (insertError) {
    if (insertError.code === '23505') {
      // Already have an entry today - update score if this one is higher
      isNewEntry = false
      const today = new Date().toISOString().split('T')[0]
      await (db as any)
        .from('raffle_entries')
        .update({ game_score: safeScore })
        .eq('round_id', roundId)
        .eq('client_id', user.entityId)
        .eq('entry_date', today)
        .lt('game_score', safeScore) // Only update if new score is higher
    } else {
      console.error('[raffle] Failed to insert entry:', insertError)
      return { success: false, error: 'Failed to record entry.' }
    }
  }

  // Get updated total
  const { count } = await (db as any)
    .from('raffle_entries')
    .select('id', { count: 'exact', head: true })
    .eq('round_id', roundId)

  // Non-blocking notification (only on new entries, not replays)
  if (isNewEntry) {
    try {
      await createClientNotification({
        tenantId: client.tenant_id,
        clientId: user.entityId,
        category: 'loyalty',
        action: 'raffle_entry_earned',
        title: 'Raffle Entry Earned!',
        body: `You earned a raffle entry with a score of ${safeScore}.`,
        actionUrl: '/my-rewards',
      })
    } catch (err) {
      console.error('[non-blocking] Raffle entry notification failed', err)
    }
  }

  revalidatePath('/my-rewards')
  return { success: true, totalEntries: count || 0, alias: aliasEmoji, isNewEntry }
}

// =====================================================================================
// DRAW SYSTEM (used by cron + admin trigger for testing)
// =====================================================================================

/** Draw winners for a raffle round. Random draw + top scorer + most dedicated. Fully automated, provably fair. */
export async function drawRaffleWinner(roundId: string): Promise<{
  success: boolean
  error?: string
  winnerId?: string
  winnerAlias?: string
  topScorerId?: string
  topScorerAlias?: string
  mostDedicatedId?: string
  mostDedicatedAlias?: string
}> {
  // Use admin client to bypass RLS (called from cron)
  const db = createServerClient({ admin: true })

  // Lock the round by setting status to 'drawing' (prevents concurrent draws)
  const { data: round, error: lockError } = await (db as any)
    .from('raffle_rounds')
    .update({ status: 'drawing' })
    .eq('id', roundId)
    .eq('status', 'active')
    .select('*')
    .single()

  if (lockError || !round) {
    return { success: false, error: 'Round not found or already drawn.' }
  }

  // Get all entries (expanded fields for top scorer + most dedicated computation)
  const { data: entries, error: entriesError } = await (db as any)
    .from('raffle_entries')
    .select('id, client_id, alias_emoji, game_score, entry_date, created_at')
    .eq('round_id', roundId)

  if (entriesError || !entries || entries.length === 0) {
    // No entries - cancel the round
    await (db as any).from('raffle_rounds').update({ status: 'cancelled' }).eq('id', roundId)
    return { success: false, error: 'No entries in this round.' }
  }

  // ── Random Draw Winner (cryptographically random) ──
  const seedBytes = crypto.randomBytes(32)
  const drawSeed = seedBytes.toString('hex')
  const randomIndex = seedBytes.readUInt32BE(0) % entries.length
  const winnerEntry = entries[randomIndex]

  // ── Top Scorer (highest game_score, tie-break: earliest entry) ──
  const sortedByScore = [...entries].sort((a, b) => {
    if ((b.game_score ?? 0) !== (a.game_score ?? 0))
      return (b.game_score ?? 0) - (a.game_score ?? 0)
    if (a.entry_date !== b.entry_date) return a.entry_date.localeCompare(b.entry_date)
    return a.created_at.localeCompare(b.created_at)
  })
  const topScorer = sortedByScore[0]

  // ── Most Dedicated (most distinct days played, tie-break: highest score, then earliest entry) ──
  const clientStats = new Map<
    string,
    {
      clientId: string
      alias: string
      dayCount: number
      bestScore: number
      earliestEntry: string
    }
  >()
  for (const e of entries) {
    const existing = clientStats.get(e.client_id)
    if (!existing) {
      clientStats.set(e.client_id, {
        clientId: e.client_id,
        alias: e.alias_emoji,
        dayCount: 1,
        bestScore: e.game_score ?? 0,
        earliestEntry: e.created_at,
      })
    } else {
      existing.dayCount++
      if ((e.game_score ?? 0) > existing.bestScore) existing.bestScore = e.game_score ?? 0
      if (e.created_at < existing.earliestEntry) existing.earliestEntry = e.created_at
    }
  }
  const mostDedicated =
    Array.from(clientStats.values()).sort((a, b) => {
      if (b.dayCount !== a.dayCount) return b.dayCount - a.dayCount
      if (b.bestScore !== a.bestScore) return b.bestScore - a.bestScore
      return a.earliestEntry.localeCompare(b.earliestEntry)
    })[0] || null

  // Count unique participants
  const uniqueParticipants = clientStats.size

  // Update round with all winners
  const { error: updateError } = await (db as any)
    .from('raffle_rounds')
    .update({
      status: 'completed',
      // Random draw
      winner_client_id: winnerEntry.client_id,
      winner_entry_id: winnerEntry.id,
      winner_alias: winnerEntry.alias_emoji,
      draw_seed: drawSeed,
      drawn_at: new Date().toISOString(),
      total_entries_at_draw: entries.length,
      total_participants_at_draw: uniqueParticipants,
      // Top Scorer
      top_scorer_client_id: topScorer?.client_id || null,
      top_scorer_alias: topScorer?.alias_emoji || null,
      top_scorer_entry_id: topScorer?.id || null,
      top_scorer_score: topScorer?.game_score || null,
      // Most Dedicated
      most_dedicated_client_id: mostDedicated?.clientId || null,
      most_dedicated_alias: mostDedicated?.alias || null,
      most_dedicated_entry_count: mostDedicated?.dayCount || null,
    } as any)
    .eq('id', roundId)

  if (updateError) {
    console.error('[raffle] Failed to record winner:', updateError)
    await (db as any).from('raffle_rounds').update({ status: 'active' }).eq('id', roundId)
    return { success: false, error: 'Failed to record draw result.' }
  }

  // ── Non-blocking notifications - group per client if they won multiple categories ──
  const winnerNotifications = new Map<string, string[]>()
  winnerNotifications.set(winnerEntry.client_id, ['Random Draw'])
  if (topScorer && round.prize_top_scorer) {
    const cats = winnerNotifications.get(topScorer.client_id) || []
    cats.push('Top Scorer')
    winnerNotifications.set(topScorer.client_id, cats)
  }
  if (mostDedicated && round.prize_most_dedicated) {
    const cats = winnerNotifications.get(mostDedicated.clientId) || []
    cats.push('Most Dedicated')
    winnerNotifications.set(mostDedicated.clientId, cats)
  }

  for (const [clientId, categories] of winnerNotifications) {
    try {
      const categoryLabel = categories.join(' + ')
      await createClientNotification({
        tenantId: round.tenant_id,
        clientId,
        category: 'loyalty',
        action: 'raffle_winner',
        title:
          categories.length > 1
            ? `You Won ${categories.length} Raffle Prizes!`
            : 'You Won the Monthly Raffle!',
        body: `Congratulations! You won: ${categoryLabel}`,
        actionUrl: '/my-rewards',
      })
    } catch (err) {
      console.error('[non-blocking] Raffle winner notification failed', err)
    }
  }

  try {
    const { createNotification, getChefAuthUserId } = await import('@/lib/notifications/actions')
    const chefUserId = await getChefAuthUserId(round.tenant_id)
    if (chefUserId) {
      await createNotification({
        tenantId: round.tenant_id,
        recipientId: chefUserId,
        category: 'loyalty',
        action: 'raffle_drawn_chef',
        title: 'Raffle draw completed',
        body: `Winners selected from ${entries.length} entries across ${uniqueParticipants} participants.`,
        actionUrl: '/loyalty/raffle',
      })
    }
  } catch (notifyErr) {
    console.error('[non-blocking] Chef raffle draw notification failed:', notifyErr)
  }

  return {
    success: true,
    winnerId: winnerEntry.client_id,
    winnerAlias: winnerEntry.alias_emoji,
    topScorerId: topScorer?.client_id,
    topScorerAlias: topScorer?.alias_emoji,
    mostDedicatedId: mostDedicated?.clientId,
    mostDedicatedAlias: mostDedicated?.alias,
  }
}
