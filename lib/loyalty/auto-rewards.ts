// Birthday & Anniversary Auto-Rewards
// Deterministic daily check: awards loyalty points on client milestones.
// Formula > AI: no LLM needed, pure date math + DB writes.

'use server'

import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ---- Types ----

export type AutoRewardConfig = {
  birthday_points: number
  anniversary_points: number
  birthday_email_enabled: boolean
  anniversary_email_enabled: boolean
}

export type UpcomingMilestone = {
  client_id: string
  client_name: string
  type: 'birthday' | 'anniversary'
  date: string // YYYY-MM-DD (this year's occurrence)
  days_away: number
}

const DEFAULT_CONFIG: AutoRewardConfig = {
  birthday_points: 100,
  anniversary_points: 150,
  birthday_email_enabled: false,
  anniversary_email_enabled: false,
}

// ---- Helpers ----

function todayStr(): string {
  return new Date().toISOString().split('T')[0]
}

function currentYear(): number {
  return new Date().getFullYear()
}

/** Check if a date (YYYY-MM-DD) matches today's month+day */
function isToday(dateStr: string | null): boolean {
  if (!dateStr) return false
  const today = new Date()
  const date = new Date(dateStr + 'T00:00:00')
  return date.getMonth() === today.getMonth() && date.getDate() === today.getDate()
}

// ---- Actions ----

/**
 * Check and award birthday points for all clients of a chef.
 * Idempotent: tracks awarded milestones in loyalty_transactions description
 * to prevent double-awarding in the same year.
 */
export async function checkAndAwardBirthdayPoints(
  chefId: string
): Promise<{ awarded: number; skipped: number }> {
  const supabase: any = createServerClient({ admin: true })
  const year = currentYear()
  let awarded = 0
  let skipped = 0

  // Get loyalty config
  const { data: config } = await supabase
    .from('loyalty_config')
    .select('is_active, welcome_points')
    .eq('tenant_id', chefId)
    .single()

  if (!config || !config.is_active) {
    return { awarded: 0, skipped: 0 }
  }

  // Load auto-reward config from platform_settings (or use defaults)
  const rewardConfig = await getAutoRewardConfig(chefId)
  if (rewardConfig.birthday_points <= 0) {
    return { awarded: 0, skipped: 0 }
  }

  // Find clients with birthday today
  const today = new Date()
  const monthDay = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  const { data: clients } = await supabase
    .from('clients')
    .select('id, full_name, birthday, loyalty_points')
    .eq('tenant_id', chefId)
    .not('birthday', 'is', null)

  if (!clients || clients.length === 0) {
    return { awarded: 0, skipped: 0 }
  }

  for (const client of clients) {
    if (!isToday(client.birthday)) continue

    // Check if already awarded this year
    const idempotencyKey = `birthday-${year}`
    const { data: existing } = await supabase
      .from('loyalty_transactions')
      .select('id')
      .eq('tenant_id', chefId)
      .eq('client_id', client.id)
      .eq('type', 'bonus')
      .like('description', `%${idempotencyKey}%`)
      .limit(1)

    if (existing && existing.length > 0) {
      skipped++
      continue
    }

    // Award points
    const { error: txError } = await supabase.from('loyalty_transactions').insert({
      tenant_id: chefId,
      client_id: client.id,
      type: 'bonus',
      points: rewardConfig.birthday_points,
      description: `Happy Birthday! (${idempotencyKey})`,
      created_by: null,
    })

    if (txError) {
      console.error(`[auto-rewards] Birthday award failed for ${client.id}:`, txError)
      skipped++
      continue
    }

    // Update balance
    const newBalance = (client.loyalty_points || 0) + rewardConfig.birthday_points
    await supabase.from('clients').update({ loyalty_points: newBalance }).eq('id', client.id)

    awarded++
  }

  return { awarded, skipped }
}

/**
 * Check and award anniversary points for all clients of a chef.
 * Anniversary = date of their first completed event with this chef.
 */
export async function checkAndAwardAnniversaryPoints(
  chefId: string
): Promise<{ awarded: number; skipped: number }> {
  const supabase: any = createServerClient({ admin: true })
  const year = currentYear()
  let awarded = 0
  let skipped = 0

  // Get loyalty config
  const { data: config } = await supabase
    .from('loyalty_config')
    .select('is_active')
    .eq('tenant_id', chefId)
    .single()

  if (!config || !config.is_active) {
    return { awarded: 0, skipped: 0 }
  }

  const rewardConfig = await getAutoRewardConfig(chefId)
  if (rewardConfig.anniversary_points <= 0) {
    return { awarded: 0, skipped: 0 }
  }

  // Find clients with first_event_date matching today's month+day
  const { data: clients } = await supabase
    .from('clients')
    .select('id, full_name, first_event_date, anniversary, loyalty_points')
    .eq('tenant_id', chefId)

  if (!clients || clients.length === 0) {
    return { awarded: 0, skipped: 0 }
  }

  for (const client of clients) {
    // Use anniversary if set, otherwise fall back to first_event_date
    const anniversaryDate = client.anniversary || client.first_event_date
    if (!anniversaryDate || !isToday(anniversaryDate)) continue

    // Don't award on the first year (that's the actual event, not an anniversary)
    const eventYear = new Date(anniversaryDate + 'T00:00:00').getFullYear()
    if (eventYear === year) continue

    // Idempotency check
    const idempotencyKey = `anniversary-${year}`
    const { data: existing } = await supabase
      .from('loyalty_transactions')
      .select('id')
      .eq('tenant_id', chefId)
      .eq('client_id', client.id)
      .eq('type', 'bonus')
      .like('description', `%${idempotencyKey}%`)
      .limit(1)

    if (existing && existing.length > 0) {
      skipped++
      continue
    }

    const yearsCount = year - eventYear

    const { error: txError } = await supabase.from('loyalty_transactions').insert({
      tenant_id: chefId,
      client_id: client.id,
      type: 'bonus',
      points: rewardConfig.anniversary_points,
      description: `Happy ${yearsCount}-year anniversary! (${idempotencyKey})`,
      created_by: null,
    })

    if (txError) {
      console.error(`[auto-rewards] Anniversary award failed for ${client.id}:`, txError)
      skipped++
      continue
    }

    const newBalance = (client.loyalty_points || 0) + rewardConfig.anniversary_points
    await supabase.from('clients').update({ loyalty_points: newBalance }).eq('id', client.id)

    awarded++
  }

  return { awarded, skipped }
}

/**
 * Get upcoming birthdays and anniversaries for the next N days.
 * Used on the briefing page and dashboard.
 */
export async function getUpcomingMilestones(
  chefId: string,
  daysAhead: number = 14
): Promise<UpcomingMilestone[]> {
  const supabase: any = createServerClient({ admin: true })

  const { data: clients } = await supabase
    .from('clients')
    .select('id, full_name, birthday, anniversary, first_event_date')
    .eq('tenant_id', chefId)

  if (!clients || clients.length === 0) return []

  const milestones: UpcomingMilestone[] = []
  const now = new Date()
  const year = now.getFullYear()

  for (const client of clients) {
    // Check birthday
    if (client.birthday) {
      const bday = new Date(client.birthday + 'T00:00:00')
      // This year's birthday
      const thisYearBday = new Date(year, bday.getMonth(), bday.getDate())
      // If already passed this year, check next year
      if (thisYearBday < now) {
        thisYearBday.setFullYear(year + 1)
      }
      const daysAwayCnt = Math.floor(
        (thisYearBday.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      )
      if (daysAwayCnt >= 0 && daysAwayCnt <= daysAhead) {
        milestones.push({
          client_id: client.id,
          client_name: client.full_name ?? 'Unknown',
          type: 'birthday',
          date: thisYearBday.toISOString().split('T')[0],
          days_away: daysAwayCnt,
        })
      }
    }

    // Check anniversary
    const annivDate = client.anniversary || client.first_event_date
    if (annivDate) {
      const anniv = new Date(annivDate + 'T00:00:00')
      // Skip if this is the same year (no anniversary yet)
      if (anniv.getFullYear() === year) continue

      const thisYearAnniv = new Date(year, anniv.getMonth(), anniv.getDate())
      if (thisYearAnniv < now) {
        thisYearAnniv.setFullYear(year + 1)
      }
      const daysAwayCnt = Math.floor(
        (thisYearAnniv.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      )
      if (daysAwayCnt >= 0 && daysAwayCnt <= daysAhead) {
        milestones.push({
          client_id: client.id,
          client_name: client.full_name ?? 'Unknown',
          type: 'anniversary',
          date: thisYearAnniv.toISOString().split('T')[0],
          days_away: daysAwayCnt,
        })
      }
    }
  }

  // Sort by days_away
  milestones.sort((a, b) => a.days_away - b.days_away)
  return milestones
}

/**
 * Get auto-reward configuration for a chef.
 * Stored in platform_settings JSONB or falls back to defaults.
 */
export async function getAutoRewardConfig(chefId: string): Promise<AutoRewardConfig> {
  const supabase: any = createServerClient({ admin: true })

  const { data } = await supabase
    .from('platform_settings')
    .select('value')
    .eq('key', `auto_reward_config_${chefId}`)
    .single()

  if (!data?.value) return DEFAULT_CONFIG

  try {
    const parsed = typeof data.value === 'string' ? JSON.parse(data.value) : data.value
    return {
      birthday_points: parsed.birthday_points ?? DEFAULT_CONFIG.birthday_points,
      anniversary_points: parsed.anniversary_points ?? DEFAULT_CONFIG.anniversary_points,
      birthday_email_enabled:
        parsed.birthday_email_enabled ?? DEFAULT_CONFIG.birthday_email_enabled,
      anniversary_email_enabled:
        parsed.anniversary_email_enabled ?? DEFAULT_CONFIG.anniversary_email_enabled,
    }
  } catch {
    return DEFAULT_CONFIG
  }
}

/**
 * Update auto-reward configuration for the current chef.
 */
export async function updateAutoRewardConfig(
  config: Partial<AutoRewardConfig>
): Promise<{ success: boolean; error?: string }> {
  const { requireChef } = await import('@/lib/auth/get-user')
  const user = await requireChef()
  const supabase: any = createServerClient()

  const current = await getAutoRewardConfig(user.entityId)
  const merged = { ...current, ...config }

  const { error } = await supabase.from('platform_settings').upsert(
    {
      key: `auto_reward_config_${user.entityId}`,
      value: merged,
    },
    { onConflict: 'key' }
  )

  if (error) {
    console.error('[updateAutoRewardConfig] Error:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/loyalty')
  return { success: true }
}
