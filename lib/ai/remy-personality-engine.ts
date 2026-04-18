'use server'

// Remy Personality Engine
// Deterministic logic for curated greetings, milestone detection, onboarding
// state machine, and dynamic system prompt blocks.
//
// All functions use requireChef() for tenant ID. Non-blocking side effects
// (milestone inserts, stage updates) are fire-and-forget - they never block chat.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import {
  ONBOARDING_GREETINGS,
  ONBOARDING_GREETING_QUICK_REPLIES,
  TOUR_BEATS,
  TOUR_BEAT_QUICK_REPLIES,
  ONBOARDING_CLOSER,
  CHECKIN_SCRIPTS,
  MILESTONE_SCRIPTS,
  DOW_OPENERS,
  MONTHLY_OPENERS,
  SPECIAL_DAY_OPENERS,
  EMPTY_STATE_SCRIPTS,
  MOTIVATIONAL_CONTEXTS,
  TENURE_ADJUSTMENTS,
  interpolate,
  ordinal,
} from '@/lib/ai/remy-curated'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db: any = createServerClient()

// ─── Types ────────────────────────────────────────────────────────────────────

export type OnboardingStage =
  | 'not_started'
  | 'greeted'
  | 'toured'
  | 'first_interaction'
  | 'onboarded'

export type RelationshipTenure = 'new' | 'settling' | 'established' | 'veteran'

export interface CuratedGreeting {
  text: string
  quickReplies: string[]
  /** True = this is a curated message; false = let Ollama handle normally */
  isCurated: true
}

export interface OnboardingRow {
  id: string
  chef_id: string
  stage: OnboardingStage
  tour_beat: number
  skipped: boolean
  started_at: string
  completed_at: string | null
  last_checkin_at: string | null
  message_count: number
}

// ─── Onboarding Stage Reader ──────────────────────────────────────────────────

export async function getOnboardingStage(chefId: string): Promise<OnboardingRow | null> {
  try {
    const rows = await db.from('remy_onboarding').select('*').eq('chef_id', chefId).limit(1)
    if (rows.error || !rows.data || rows.data.length === 0) return null
    return rows.data[0] as unknown as OnboardingRow
  } catch {
    return null
  }
}

async function upsertOnboardingRow(chefId: string): Promise<OnboardingRow> {
  // Try to read first
  const existing = await getOnboardingStage(chefId)
  if (existing) return existing
  // Create
  const rows = await db
    .from('remy_onboarding')
    .insert({ chef_id: chefId, stage: 'not_started', tour_beat: 0, message_count: 0 })
    .select('*')
  if (rows.error) throw new Error(rows.error.message)
  return rows.data![0] as unknown as OnboardingRow
}

// ─── Stage Advancement ────────────────────────────────────────────────────────

export async function advanceOnboarding(
  chefId: string,
  stage: OnboardingStage,
  extra?: { skipped?: boolean; completed?: boolean; tourBeat?: number }
): Promise<void> {
  try {
    const updates: Record<string, unknown> = { stage }
    if (extra?.skipped) updates.skipped = true
    if (extra?.completed) updates.completed_at = new Date().toISOString()
    if (extra?.tourBeat !== undefined) updates.tour_beat = extra.tourBeat
    await db.from('remy_onboarding').update(updates).eq('chef_id', chefId)
  } catch (err) {
    console.error('[non-blocking] advanceOnboarding failed', err)
  }
}

export async function incrementMessageCount(chefId: string): Promise<void> {
  try {
    const current = await getOnboardingStage(chefId)
    if (!current) return
    await db
      .from('remy_onboarding')
      .update({ message_count: (current.message_count ?? 0) + 1 })
      .eq('chef_id', chefId)
  } catch {
    // Non-blocking, ignore
  }
}

export async function markCheckinShown(chefId: string): Promise<void> {
  try {
    await db
      .from('remy_onboarding')
      .update({ last_checkin_at: new Date().toISOString() })
      .eq('chef_id', chefId)
  } catch {
    // Non-blocking
  }
}

// ─── Milestone Detection ──────────────────────────────────────────────────────

interface CelebrationCandidate {
  key: string
  text: string
  data?: Record<string, string | number>
}

async function getCelebratedMilestones(chefId: string): Promise<Set<string>> {
  try {
    const rows = await db.from('remy_milestones').select('milestone_key').eq('chef_id', chefId)
    if (rows.error || !rows.data) return new Set()
    return new Set((rows.data as Array<{ milestone_key: string }>).map((r) => r.milestone_key))
  } catch {
    return new Set()
  }
}

export async function markMilestoneCelebrated(
  chefId: string,
  key: string,
  data?: Record<string, unknown>
): Promise<void> {
  try {
    await db
      .from('remy_milestones')
      .insert({ chef_id: chefId, milestone_key: key, data: data ?? null })
  } catch {
    // Unique constraint = already celebrated. Non-blocking.
  }
}

async function getChefCounts(chefId: string): Promise<{
  clientCount: number
  eventCount: number
  completedEventCount: number
  revenueCents: number
  reviewCount: number
  fiveStarCount: number
  repeatClientName: string | null
}> {
  try {
    const [clients, events, revenue, reviews] = await Promise.all([
      db.from('clients').select('id', { count: 'exact' }).eq('tenant_id', chefId),
      db.from('events').select('id, status', { count: 'exact' }).eq('tenant_id', chefId).limit(200),
      db
        .from('ledger_entries')
        .select('amount_cents')
        .eq('tenant_id', chefId)
        .eq('entry_type', 'revenue'),
      db
        .from('client_reviews')
        .select('id, rating', { count: 'exact' })
        .eq('tenant_id', chefId)
        .limit(50),
    ])

    const clientCount = clients.count ?? 0
    const evtRows = (events.data ?? []) as Array<{ status: string }>
    const eventCount = clients.count !== null ? (events.count ?? 0) : evtRows.length
    const completedEventCount = evtRows.filter((e) => e.status === 'completed').length
    const revRows = (revenue.data ?? []) as Array<{ amount_cents: number }>
    const revenueCents = revRows.reduce((s, r) => s + (r.amount_cents ?? 0), 0)
    const reviewRows = (reviews.data ?? []) as Array<{ rating: number }>
    const reviewCount = reviews.count ?? reviewRows.length
    const fiveStarCount = reviewRows.filter((r) => r.rating >= 5).length

    // Check for repeat client (client with 2+ events)
    let repeatClientName: string | null = null
    try {
      const repeatRows = await db
        .from('events')
        .select('client_id, clients(full_name)')
        .eq('tenant_id', chefId)
        .not('client_id', 'is', null)
        .limit(200)
      if (!repeatRows.error && repeatRows.data) {
        const countMap = new Map<string, { name: string; count: number }>()
        for (const row of repeatRows.data as Array<{
          client_id: string
          clients: { full_name: string } | null
        }>) {
          if (!row.client_id) continue
          const existing = countMap.get(row.client_id)
          const name = row.clients?.full_name ?? 'Client'
          if (existing) {
            existing.count++
          } else {
            countMap.set(row.client_id, { name, count: 1 })
          }
        }
        for (const [, val] of countMap) {
          if (val.count >= 2) {
            repeatClientName = val.name
            break
          }
        }
      }
    } catch {
      // Non-critical
    }

    return {
      clientCount,
      eventCount,
      completedEventCount,
      revenueCents,
      reviewCount,
      fiveStarCount,
      repeatClientName,
    }
  } catch {
    return {
      clientCount: 0,
      eventCount: 0,
      completedEventCount: 0,
      revenueCents: 0,
      reviewCount: 0,
      fiveStarCount: 0,
      repeatClientName: null,
    }
  }
}

export async function detectMilestones(chefId: string): Promise<CelebrationCandidate | null> {
  try {
    const [celebrated, counts] = await Promise.all([
      getCelebratedMilestones(chefId),
      getChefCounts(chefId),
    ])

    const {
      clientCount,
      eventCount,
      completedEventCount,
      revenueCents,
      reviewCount,
      fiveStarCount,
      repeatClientName,
    } = counts

    // Priority order: revenue > events > clients > loyalty > time
    const checks: Array<{
      key: string
      condition: boolean
      data?: Record<string, string | number>
    }> = [
      { key: 'revenue_100k', condition: revenueCents >= 10_000_000 },
      { key: 'revenue_50k', condition: revenueCents >= 5_000_000 },
      { key: 'revenue_25k', condition: revenueCents >= 2_500_000 },
      { key: 'revenue_10k', condition: revenueCents >= 1_000_000 },
      { key: 'revenue_5k', condition: revenueCents >= 500_000 },
      { key: 'revenue_1k', condition: revenueCents >= 100_000 },
      { key: 'first_payment', condition: revenueCents > 0 },
      { key: 'events_100', condition: completedEventCount >= 100 },
      { key: 'events_50', condition: completedEventCount >= 50 },
      { key: 'events_25', condition: completedEventCount >= 25 },
      { key: 'events_10', condition: completedEventCount >= 10 },
      { key: 'first_event_completed', condition: completedEventCount >= 1 },
      { key: 'first_event', condition: eventCount >= 1 },
      { key: 'clients_100', condition: clientCount >= 100 },
      { key: 'clients_50', condition: clientCount >= 50 },
      { key: 'clients_25', condition: clientCount >= 25 },
      { key: 'clients_10', condition: clientCount >= 10 },
      {
        key: 'first_repeat_client',
        condition: repeatClientName !== null,
        data: { clientName: repeatClientName ?? '' },
      },
      { key: 'first_client', condition: clientCount >= 1 },
      { key: 'first_five_star', condition: fiveStarCount >= 1 },
      { key: 'first_review', condition: reviewCount >= 1 },
    ]

    for (const check of checks) {
      if (check.condition && !celebrated.has(check.key)) {
        const template = MILESTONE_SCRIPTS[check.key]
        if (!template) continue
        const text = interpolate(template, check.data ?? {})
        return { key: check.key, text, data: check.data }
      }
    }

    return null
  } catch {
    return null
  }
}

// ─── Anniversary Check ────────────────────────────────────────────────────────

async function detectAnniversary(
  chefId: string,
  chefCreatedAt: string,
  chefName: string
): Promise<CelebrationCandidate | null> {
  try {
    const celebrated = await getCelebratedMilestones(chefId)
    const created = new Date(chefCreatedAt)
    const now = new Date()
    const daysOld = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24))

    const anniversaryChecks: Array<{ key: string; days: number }> = [
      { key: 'anniversary_365d', days: 365 },
      { key: 'anniversary_180d', days: 180 },
      { key: 'anniversary_90d', days: 90 },
      { key: 'anniversary_30d', days: 30 },
    ]

    for (const check of anniversaryChecks) {
      // Show within a 2-day window of the anniversary
      if (daysOld >= check.days && daysOld <= check.days + 2 && !celebrated.has(check.key)) {
        const template = MILESTONE_SCRIPTS[check.key]
        if (!template) continue
        return { key: check.key, text: interpolate(template, { chefName }) }
      }
    }
    return null
  } catch {
    return null
  }
}

// ─── First-Week Check-in ──────────────────────────────────────────────────────

async function getCheckIn(chefId: string, onboarding: OnboardingRow): Promise<string | null> {
  if (onboarding.stage !== 'onboarded') return null
  if (!onboarding.completed_at) return null

  // Stop after 7 days
  const completedAt = new Date(onboarding.completed_at)
  const now = new Date()
  const daysSince = Math.floor((now.getTime() - completedAt.getTime()) / (1000 * 60 * 60 * 24))
  if (daysSince > 7) return null

  // Only once per day
  if (onboarding.last_checkin_at) {
    const lastCheckin = new Date(onboarding.last_checkin_at)
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    const lastDay = `${lastCheckin.getFullYear()}-${String(lastCheckin.getMonth() + 1).padStart(2, '0')}-${String(lastCheckin.getDate()).padStart(2, '0')}`
    if (today === lastDay) return null
  }

  // Get counts for conditional variants
  const counts = await getChefCounts(chefId)

  let text: string | null = null

  if (daysSince <= 1) {
    text =
      counts.clientCount >= 3
        ? interpolate(CHECKIN_SCRIPTS.day1_has_clients, { clientCount: counts.clientCount })
        : CHECKIN_SCRIPTS.day1_few_clients
  } else if (daysSince <= 3) {
    text =
      counts.eventCount >= 1
        ? interpolate(CHECKIN_SCRIPTS.day3_has_events, { eventCount: counts.eventCount })
        : CHECKIN_SCRIPTS.day3_no_events
  } else if (daysSince <= 5) {
    // count recipes
    let recipeCount = 0
    try {
      const r = await db.from('recipes').select('id', { count: 'exact' }).eq('tenant_id', chefId)
      recipeCount = r.count ?? 0
    } catch {
      /* ignore */
    }
    text =
      recipeCount >= 1
        ? interpolate(CHECKIN_SCRIPTS.day5_has_recipes, { recipeCount })
        : CHECKIN_SCRIPTS.day5_no_recipes
  } else if (daysSince <= 7) {
    text = CHECKIN_SCRIPTS.day7
  }

  if (text) {
    // Mark shown (non-blocking)
    markCheckinShown(chefId).catch(() => {})
  }

  return text
}

// ─── Seasonal Opener ──────────────────────────────────────────────────────────

export async function getSeasonalOpener(): Promise<string> {
  const now = new Date()
  const month = now.getMonth() // 0-11
  const dow = now.getDay() // 0=Sun

  // Special days first (MM-DD)
  const mmdd = String(month + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0')

  // Thanksgiving: 4th Thursday of November
  if (month === 10 && dow === 4) {
    const day = now.getDate()
    // 4th Thursday = day 22-28
    if (day >= 22 && day <= 28) {
      return `Happy Thanksgiving, chef! 🦃 Whether you're cooking for clients or your own family today - enjoy the meal. You've earned it.`
    }
  }

  const specialDay = SPECIAL_DAY_OPENERS[mmdd]
  if (specialDay) return specialDay

  // Day-of-week openers (prefer Mon/Fri/Sat which have more variants)
  const dowOptions = DOW_OPENERS[dow]
  if (dowOptions && dowOptions.length > 0) {
    return dowOptions[Math.floor(Math.random() * dowOptions.length)]
  }

  // Monthly fallback
  return MONTHLY_OPENERS[month] ?? `Good to see you, chef. What's on the board today? 🔪`
}

// ─── Relationship Tenure ──────────────────────────────────────────────────────

export async function getRelationshipTenure(createdAt: string): Promise<RelationshipTenure> {
  const created = new Date(createdAt)
  const now = new Date()
  const daysOld = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24))

  if (daysOld <= 7) return 'new'
  if (daysOld <= 30) return 'settling'
  if (daysOld <= 90) return 'established'
  return 'veteran'
}

// ─── Master Greeting Function ─────────────────────────────────────────────────

/**
 * Returns a curated greeting for the drawer open event, or null to let Ollama
 * handle the first message normally.
 *
 * Priority: onboarding stage > uncelebrated milestone > check-in > seasonal
 */
export async function getCuratedGreeting(
  chefId: string,
  chefName: string
): Promise<CuratedGreeting | null> {
  // Fetch chefCreatedAt for anniversary detection
  let chefCreatedAt = new Date().toISOString()
  try {
    const chefRow = await db.from('chefs').select('created_at').eq('id', chefId).limit(1)
    if (!chefRow.error && chefRow.data && chefRow.data.length > 0) {
      chefCreatedAt = (chefRow.data[0] as { created_at: string }).created_at
    }
  } catch {
    /* non-critical */
  }
  try {
    const onboarding = await upsertOnboardingRow(chefId)

    // 1. Onboarding state machine
    if (onboarding.stage === 'not_started') {
      const variant = ONBOARDING_GREETINGS[Math.floor(Math.random() * ONBOARDING_GREETINGS.length)]
      const text = interpolate(variant, { chefName })
      // Advance to greeted (non-blocking)
      advanceOnboarding(chefId, 'greeted').catch(() => {})
      return { isCurated: true, text, quickReplies: ONBOARDING_GREETING_QUICK_REPLIES }
    }

    if (onboarding.stage === 'greeted' && !onboarding.skipped) {
      // Continue tour if mid-way; otherwise wait for quick-reply input
      // Return null here - tour beats are delivered via advanceRemyTour()
      return null
    }

    // 1b. Chef wizard awareness - acknowledge setup completion or encourage mid-setup
    try {
      const wizardRow = await db
        .from('chefs')
        .select('onboarding_completed_at')
        .eq('id', chefId)
        .limit(1)
      const wizardCompleted = wizardRow.data?.[0]?.onboarding_completed_at
      if (wizardCompleted) {
        const completedAt = new Date(wizardCompleted as string)
        const hoursSinceCompletion = (Date.now() - completedAt.getTime()) / (1000 * 60 * 60)
        // Within 2 hours of wizard completion, celebrate it once
        if (hoursSinceCompletion < 2) {
          const celebrated = await db
            .from('remy_milestones')
            .select('id')
            .eq('chef_id', chefId)
            .eq('milestone_key', 'wizard_completed')
            .limit(1)
          if (!celebrated.data?.length) {
            markMilestoneCelebrated(chefId, 'wizard_completed', {}).catch(() => {})
            return {
              isCurated: true,
              text: `Welcome aboard, ${chefName}! Your workspace is all set up. I'm Remy, your AI assistant. Ask me anything about managing your business, or just say hi.`,
              quickReplies: ['What can you help with?', 'Show me around'],
            }
          }
        }
      }
    } catch {
      // Non-critical: wizard awareness is best-effort
    }

    // 2. Uncelebrated milestones (only for onboarded users, one at a time)
    if (onboarding.stage === 'onboarded') {
      const [milestone, anniversary] = await Promise.all([
        detectMilestones(chefId),
        detectAnniversary(chefId, chefCreatedAt, chefName),
      ])
      const toShow = anniversary ?? milestone
      if (toShow) {
        markMilestoneCelebrated(chefId, toShow.key, toShow.data).catch(() => {})
        return { isCurated: true, text: toShow.text, quickReplies: [] }
      }

      // 3. First-week check-in
      const checkin = await getCheckIn(chefId, onboarding)
      if (checkin) {
        return { isCurated: true, text: checkin, quickReplies: [] }
      }
    }

    // 4. Seasonal opener (once per day per new conversation)
    const seasonal = await getSeasonalOpener()
    return { isCurated: true, text: seasonal, quickReplies: [] }
  } catch {
    return null
  }
}

// ─── Tour Advancement ─────────────────────────────────────────────────────────

/**
 * Called when the chef clicks "Give me the tour" or "Next" during the tour.
 * Returns the next tour beat as a curated message, or null when tour is complete.
 */
export async function advanceRemyTour(
  action: 'start' | 'next' | 'skip'
): Promise<CuratedGreeting | null> {
  try {
    const user = await requireChef()
    const chefId = user.tenantId!

    const onboarding = await getOnboardingStage(chefId)
    if (!onboarding) return null

    if (action === 'skip') {
      await advanceOnboarding(chefId, 'onboarded', { skipped: true, completed: true })
      return null
    }

    // Determine current beat
    const currentBeat = onboarding.stage === 'greeted' ? onboarding.tour_beat : 0
    const nextBeat = action === 'start' ? 0 : currentBeat + 1

    if (nextBeat >= TOUR_BEATS.length) {
      // Tour complete
      await advanceOnboarding(chefId, 'toured', { tourBeat: TOUR_BEATS.length })
      return null
    }

    await advanceOnboarding(chefId, 'greeted', { tourBeat: nextBeat })

    const isLastBeat = nextBeat === TOUR_BEATS.length - 1
    return {
      isCurated: true,
      text: TOUR_BEATS[nextBeat],
      quickReplies: isLastBeat ? [] : TOUR_BEAT_QUICK_REPLIES,
    }
  } catch {
    return null
  }
}

// ─── Post-Tour Closer ─────────────────────────────────────────────────────────

/**
 * Appends the onboarding closer to an Ollama response once the chef has had
 * 3+ exchanges after the tour. Called from remy-actions.ts.
 * Returns the closer string or empty string if not time yet.
 */
export async function maybeGetOnboardingCloser(chefId: string): Promise<string> {
  try {
    const onboarding = await getOnboardingStage(chefId)
    if (!onboarding) return ''
    if (onboarding.stage !== 'first_interaction') return ''
    if (onboarding.message_count < 3) return ''

    // Advance to onboarded
    await advanceOnboarding(chefId, 'onboarded', { completed: true })
    return ONBOARDING_CLOSER
  } catch {
    return ''
  }
}

// ─── Dynamic System Prompt Block ─────────────────────────────────────────────

interface PersonalityBlockOptions {
  chefId: string
  clientCount: number
  eventCount: number
  recipeCount: number
  revenueCents: number
  staleInquiryCount?: number
}

/**
 * Builds additional blocks for the Remy system prompt based on current context.
 * Injected into buildRemySystemPrompt() in remy-actions.ts.
 */
export async function buildDynamicPersonalityBlock(opts: PersonalityBlockOptions): Promise<string> {
  const parts: string[] = []

  try {
    // Fetch chef created_at for tenure calculation
    let chefCreatedAt = new Date().toISOString()
    try {
      const chefRow = await db.from('chefs').select('created_at').eq('id', opts.chefId).limit(1)
      if (!chefRow.error && chefRow.data && chefRow.data.length > 0) {
        chefCreatedAt = (chefRow.data[0] as { created_at: string }).created_at
      }
    } catch {
      /* non-critical */
    }

    // Tenure tone adjustment
    const tenure = await getRelationshipTenure(chefCreatedAt)
    parts.push(`\n${TENURE_ADJUSTMENTS[tenure]}`)

    // Empty state encouragement (injected as facts for the LLM)
    if (opts.clientCount === 0) {
      parts.push(`\nEMPTY STATE NOTE: ${EMPTY_STATE_SCRIPTS.no_clients}`)
    }
    if (opts.eventCount === 0) {
      parts.push(`\nEMPTY STATE NOTE: ${EMPTY_STATE_SCRIPTS.no_events}`)
    }
    if (opts.recipeCount === 0) {
      parts.push(`\nEMPTY STATE NOTE: ${EMPTY_STATE_SCRIPTS.no_recipes}`)
    }
    if (opts.revenueCents === 0) {
      parts.push(`\nEMPTY STATE NOTE: ${EMPTY_STATE_SCRIPTS.no_revenue}`)
    }

    // Stale inquiry motivational context
    if (opts.staleInquiryCount && opts.staleInquiryCount > 0) {
      parts.push(
        `\n${interpolate(MOTIVATIONAL_CONTEXTS.stale_inquiries, { count: opts.staleInquiryCount })}`
      )
    }

    // Slow week check
    if (opts.eventCount === 0) {
      parts.push(`\n${MOTIVATIONAL_CONTEXTS.slow_week}`)
    }
  } catch {
    // Non-blocking
  }

  return parts.join('\n')
}

// ─── Onboarding First-Interaction Tracking ────────────────────────────────────

/**
 * Called after the tour completes and the chef sends their first real message.
 * Advances stage from toured -> first_interaction.
 * Fire-and-forget, non-blocking.
 */
export async function trackFirstInteraction(chefId: string, stage: OnboardingStage): Promise<void> {
  if (stage !== 'toured') return
  advanceOnboarding(chefId, 'first_interaction').catch(() => {})
}

// ─── Drawer-Facing Server Action ─────────────────────────────────────────────

/**
 * Called by the Remy drawer on open when there are no existing messages in the
 * current conversation. Returns a curated greeting if one is due, or null.
 *
 * This is the primary integration point for the drawer.
 */
export async function getRemyCuratedGreeting(): Promise<CuratedGreeting | null> {
  try {
    const user = await requireChef()
    const chefId = user.tenantId!

    // Fetch the chef's display name
    let chefName = 'Chef'
    try {
      const chefRow = await db
        .from('chefs')
        .select('business_name, display_name')
        .eq('id', chefId)
        .limit(1)
      if (!chefRow.error && chefRow.data && chefRow.data.length > 0) {
        const row = chefRow.data[0] as { business_name: string | null; display_name: string | null }
        chefName = row.display_name ?? row.business_name ?? 'Chef'
        // Use first name only for a personal touch
        const firstName = chefName.split(' ')[0]
        if (firstName) chefName = firstName
      }
    } catch {
      /* non-critical - use default */
    }

    return getCuratedGreeting(chefId, chefName)
  } catch {
    return null
  }
}
