'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ─── Types ───────────────────────────────────────────────────────────────────

export type GiftType = 'thank_you' | 'birthday' | 'holiday' | 'milestone' | 'apology' | 'custom'
export type DeliveryMethod = 'hand_delivered' | 'shipped' | 'digital' | 'with_service'
export type TriggerType = 'post_event' | 'birthday' | 'anniversary' | 'no_booking_30d' | 'no_booking_60d' | 'no_booking_90d' | 'holiday' | 'milestone_event_count'
export type RuleAction = 'reminder' | 'email_draft' | 'gift_suggestion'

export type GiftEntry = {
  id: string
  chef_id: string
  client_id: string
  gift_type: GiftType
  occasion: string
  description: string
  cost_cents: number
  sent_at: string
  delivery_method: DeliveryMethod
  notes: string | null
  created_at: string
}

export type FollowUpRule = {
  id: string
  chef_id: string
  trigger_type: TriggerType
  action: RuleAction
  template_text: string | null
  enabled: boolean
  created_at: string
}

export type GiftSuggestion = {
  type: GiftType
  reason: string
  client_id: string
  client_name: string
  urgency: 'high' | 'medium' | 'low'
}

// ─── Gift Log ────────────────────────────────────────────────────────────────

export async function getGiftLog(clientId?: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  let query = supabase
    .from('client_gift_log')
    .select('*')
    .eq('chef_id', user.entityId)
    .order('sent_at', { ascending: false })

  if (clientId) {
    query = query.eq('client_id', clientId)
  }

  const { data, error } = await query

  if (error) throw new Error(`Failed to load gift log: ${error.message}`)
  return (data || []) as GiftEntry[]
}

export async function addGiftEntry(data: {
  client_id: string
  gift_type: GiftType
  occasion: string
  description: string
  cost_cents: number
  sent_at: string
  delivery_method: DeliveryMethod
  notes?: string
}) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { error } = await supabase
    .from('client_gift_log')
    .insert({
      chef_id: user.entityId,
      client_id: data.client_id,
      gift_type: data.gift_type,
      occasion: data.occasion,
      description: data.description,
      cost_cents: data.cost_cents,
      sent_at: data.sent_at,
      delivery_method: data.delivery_method,
      notes: data.notes || null,
    })

  if (error) throw new Error(`Failed to add gift: ${error.message}`)
  revalidatePath('/clients')
  return { success: true }
}

export async function deleteGiftEntry(id: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { error } = await supabase
    .from('client_gift_log')
    .delete()
    .eq('id', id)
    .eq('chef_id', user.entityId)

  if (error) throw new Error(`Failed to delete gift: ${error.message}`)
  revalidatePath('/clients')
  return { success: true }
}

// ─── Follow-Up Rules ─────────────────────────────────────────────────────────

export async function getFollowUpRules() {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('client_followup_rules')
    .select('*')
    .eq('chef_id', user.entityId)
    .order('created_at', { ascending: true })

  if (error) throw new Error(`Failed to load follow-up rules: ${error.message}`)
  return (data || []) as FollowUpRule[]
}

export async function upsertFollowUpRule(data: {
  id?: string
  trigger_type: TriggerType
  action: RuleAction
  template_text?: string
  enabled?: boolean
}) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const row = {
    chef_id: user.entityId,
    trigger_type: data.trigger_type,
    action: data.action,
    template_text: data.template_text || null,
    enabled: data.enabled ?? true,
  }

  if (data.id) {
    const { error } = await supabase
      .from('client_followup_rules')
      .update(row)
      .eq('id', data.id)
      .eq('chef_id', user.entityId)

    if (error) throw new Error(`Failed to update rule: ${error.message}`)
  } else {
    const { error } = await supabase
      .from('client_followup_rules')
      .insert(row)

    if (error) throw new Error(`Failed to create rule: ${error.message}`)
  }

  revalidatePath('/settings')
  return { success: true }
}

export async function deleteFollowUpRule(id: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { error } = await supabase
    .from('client_followup_rules')
    .delete()
    .eq('id', id)
    .eq('chef_id', user.entityId)

  if (error) throw new Error(`Failed to delete rule: ${error.message}`)
  revalidatePath('/settings')
  return { success: true }
}

// ─── Gift Suggestions (Deterministic, No AI) ─────────────────────────────────

export async function getGiftSuggestions(clientId?: string): Promise<GiftSuggestion[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const now = new Date()
  const suggestions: GiftSuggestion[] = []

  // Build client query
  let clientQuery = supabase
    .from('clients')
    .select('id, first_name, last_name, date_of_birth')
    .eq('tenant_id', user.tenantId!)

  if (clientId) {
    clientQuery = clientQuery.eq('id', clientId)
  }

  const { data: clients } = await clientQuery

  if (!clients || clients.length === 0) return suggestions

  for (const client of clients) {
    const name = [client.first_name, client.last_name].filter(Boolean).join(' ') || 'Client'

    // Birthday check: within 14 days
    if (client.date_of_birth) {
      const dob = new Date(client.date_of_birth)
      const thisYearBday = new Date(now.getFullYear(), dob.getMonth(), dob.getDate())
      // If birthday already passed this year, check next year
      if (thisYearBday < now) {
        thisYearBday.setFullYear(thisYearBday.getFullYear() + 1)
      }
      const daysUntil = Math.ceil((thisYearBday.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      if (daysUntil <= 14) {
        suggestions.push({
          type: 'birthday',
          reason: daysUntil === 0 ? `${name}'s birthday is today!` : `${name}'s birthday is in ${daysUntil} day${daysUntil === 1 ? '' : 's'}`,
          client_id: client.id,
          client_name: name,
          urgency: daysUntil <= 3 ? 'high' : daysUntil <= 7 ? 'medium' : 'low',
        })
      }
    }

    // No recent booking check: 60+ days since last event
    const { data: recentEvents } = await supabase
      .from('events')
      .select('event_date')
      .eq('tenant_id', user.tenantId!)
      .eq('client_id', client.id)
      .order('event_date', { ascending: false })
      .limit(1)

    if (recentEvents && recentEvents.length > 0) {
      const lastEventDate = new Date(recentEvents[0].event_date)
      const daysSince = Math.floor((now.getTime() - lastEventDate.getTime()) / (1000 * 60 * 60 * 24))

      if (daysSince >= 60) {
        suggestions.push({
          type: 'custom',
          reason: `No booking from ${name} in ${daysSince} days. Consider a re-engagement gift.`,
          client_id: client.id,
          client_name: name,
          urgency: daysSince >= 90 ? 'high' : 'medium',
        })
      }
    }

    // Milestone check: event count milestones (5, 10, 25, 50)
    const { count: eventCount } = await supabase
      .from('events')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', user.tenantId!)
      .eq('client_id', client.id)

    if (eventCount) {
      const milestones = [5, 10, 25, 50, 100]
      for (const milestone of milestones) {
        if (eventCount === milestone) {
          suggestions.push({
            type: 'milestone',
            reason: `${name} just hit ${milestone} events! A milestone gift would show appreciation.`,
            client_id: client.id,
            client_name: name,
            urgency: 'medium',
          })
        }
      }
    }
  }

  // Sort by urgency: high first
  const urgencyOrder = { high: 0, medium: 1, low: 2 }
  suggestions.sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency])

  return suggestions
}

// ─── Gifting Stats ───────────────────────────────────────────────────────────

export async function getGiftingStats() {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Get all gifts for this chef
  const { data: gifts } = await supabase
    .from('client_gift_log')
    .select('client_id, cost_cents')
    .eq('chef_id', user.entityId)

  if (!gifts || gifts.length === 0) {
    return {
      totalSpentCents: 0,
      totalGifts: 0,
      giftsPerClient: {} as Record<string, number>,
      avgGiftCents: 0,
      giftedClientIds: [] as string[],
    }
  }

  const totalSpentCents = gifts.reduce((sum: number, g: any) => sum + (g.cost_cents || 0), 0)
  const giftsPerClient: Record<string, number> = {}
  const giftedClientIds = new Set<string>()

  for (const gift of gifts) {
    giftsPerClient[gift.client_id] = (giftsPerClient[gift.client_id] || 0) + 1
    giftedClientIds.add(gift.client_id)
  }

  return {
    totalSpentCents,
    totalGifts: gifts.length,
    giftsPerClient,
    avgGiftCents: Math.round(totalSpentCents / gifts.length),
    giftedClientIds: Array.from(giftedClientIds),
  }
}
