'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

// ─── Types ───────────────────────────────────────────────────────

export type FollowupTriggerType =
  | 'proposal_sent'
  | 'proposal_viewed'
  | 'booking_confirmed'
  | 'event_completed'
  | 'dormant'

export type FollowupRule = {
  id: string
  chefId: string
  triggerType: FollowupTriggerType
  delayDays: number
  templateId: string
  templateName?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type PendingFollowup = {
  ruleId: string
  triggerType: FollowupTriggerType
  templateId: string
  eventId: string | null
  clientId: string | null
  dueDate: string
  reason: string
}

// ─── Schemas ─────────────────────────────────────────────────────

const TRIGGER_TYPES: [FollowupTriggerType, ...FollowupTriggerType[]] = [
  'proposal_sent',
  'proposal_viewed',
  'booking_confirmed',
  'event_completed',
  'dormant',
]

const CreateFollowupRuleSchema = z.object({
  triggerType: z.enum(TRIGGER_TYPES),
  delayDays: z.number().int().min(0),
  templateId: z.string().uuid(),
  isActive: z.boolean().optional(),
})

// ─── Actions ─────────────────────────────────────────────────────

export async function createFollowupRule(
  input: z.infer<typeof CreateFollowupRuleSchema>
): Promise<FollowupRule> {
  const user = await requireChef()
  const parsed = CreateFollowupRuleSchema.parse(input)
  const db: any = createServerClient()

  const { data, error } = await db
    .from('followup_rules')
    .insert({
      chef_id: user.tenantId!,
      trigger_type: parsed.triggerType,
      delay_days: parsed.delayDays,
      template_id: parsed.templateId,
      is_active: parsed.isActive ?? true,
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to create followup rule: ${error.message}`)

  revalidatePath('/settings')

  return mapRule(data)
}

export async function listFollowupRules(): Promise<FollowupRule[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('followup_rules')
    .select('*')
    .eq('chef_id', user.tenantId!)
    .order('trigger_type', { ascending: true })
    .order('delay_days', { ascending: true })

  if (error) throw new Error(`Failed to list followup rules: ${error.message}`)

  return (data || []).map(mapRule)
}

export async function toggleFollowupRule(id: string, isActive: boolean): Promise<FollowupRule> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('followup_rules')
    .update({ is_active: isActive })
    .eq('id', id)
    .eq('chef_id', user.tenantId!)
    .select()
    .single()

  if (error) throw new Error(`Failed to toggle followup rule: ${error.message}`)

  revalidatePath('/settings')

  return mapRule(data)
}

/**
 * Evaluate all active followup rules for the current chef and return
 * a list of pending actions that are now due. This function does NOT
 * send emails or execute side effects - it only identifies what needs
 * to happen. The caller decides whether to execute.
 */
export async function processFollowupRules(): Promise<PendingFollowup[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Fetch all active rules
  const { data: rules, error: rulesError } = await db
    .from('followup_rules')
    .select('*')
    .eq('chef_id', user.tenantId!)
    .eq('is_active', true)

  if (rulesError) throw new Error(`Failed to fetch followup rules: ${rulesError.message}`)
  if (!rules || rules.length === 0) return []

  const now = new Date()
  const pending: PendingFollowup[] = []

  // Group rules by trigger type for batch processing
  const rulesByTrigger: Record<string, any[]> = {}
  for (const rule of rules) {
    const key = rule.trigger_type as string
    if (!rulesByTrigger[key]) rulesByTrigger[key] = []
    rulesByTrigger[key].push(rule)
  }

  // --- proposal_sent: quotes in 'proposed' status ---
  if (rulesByTrigger['proposal_sent']) {
    const { data: quotes } = await db
      .from('quotes')
      .select('id, event_id, created_at')
      .eq('chef_id', user.tenantId!)
      .eq('status', 'proposed')

    for (const quote of quotes || []) {
      for (const rule of rulesByTrigger['proposal_sent']) {
        const dueDate = addDays(new Date(quote.created_at), rule.delay_days)
        if (dueDate <= now) {
          pending.push({
            ruleId: rule.id,
            triggerType: 'proposal_sent',
            templateId: rule.template_id,
            eventId: quote.event_id || null,
            clientId: null,
            dueDate: dueDate.toISOString(),
            reason: `Quote ${quote.id} was sent ${rule.delay_days} day(s) ago`,
          })
        }
      }
    }
  }

  // --- proposal_viewed: check proposal_views for quotes ---
  if (rulesByTrigger['proposal_viewed']) {
    const { data: views } = await db
      .from('proposal_views')
      .select('quote_id, viewed_at')
      .order('viewed_at', { ascending: false })

    // Deduplicate by quote_id (use first view per quote)
    const firstViewByQuote: Record<string, string> = {}
    for (const view of views || []) {
      if (!firstViewByQuote[view.quote_id]) {
        firstViewByQuote[view.quote_id] = view.viewed_at
      }
    }

    for (const [quoteId, viewedAt] of Object.entries(firstViewByQuote)) {
      for (const rule of rulesByTrigger['proposal_viewed']) {
        const dueDate = addDays(new Date(viewedAt), rule.delay_days)
        if (dueDate <= now) {
          pending.push({
            ruleId: rule.id,
            triggerType: 'proposal_viewed',
            templateId: rule.template_id,
            eventId: null,
            clientId: null,
            dueDate: dueDate.toISOString(),
            reason: `Proposal for quote ${quoteId} was viewed ${rule.delay_days} day(s) ago`,
          })
        }
      }
    }
  }

  // --- booking_confirmed: events that transitioned to 'confirmed' ---
  if (rulesByTrigger['booking_confirmed']) {
    const { data: transitions } = await db
      .from('event_transitions' as any)
      .select('event_id, transitioned_at')
      .eq('to_status', 'confirmed')

    for (const transition of transitions || []) {
      for (const rule of rulesByTrigger['booking_confirmed']) {
        const dueDate = addDays(new Date(transition.transitioned_at), rule.delay_days)
        if (dueDate <= now) {
          pending.push({
            ruleId: rule.id,
            triggerType: 'booking_confirmed',
            templateId: rule.template_id,
            eventId: transition.event_id,
            clientId: null,
            dueDate: dueDate.toISOString(),
            reason: `Booking confirmed ${rule.delay_days} day(s) ago for event ${transition.event_id}`,
          })
        }
      }
    }
  }

  // --- event_completed: events in 'completed' status ---
  if (rulesByTrigger['event_completed']) {
    const { data: events } = await db
      .from('events')
      .select('id, client_id, updated_at')
      .eq('chef_id', user.tenantId!)
      .eq('status', 'completed')

    for (const event of events || []) {
      for (const rule of rulesByTrigger['event_completed']) {
        const dueDate = addDays(new Date(event.updated_at), rule.delay_days)
        if (dueDate <= now) {
          pending.push({
            ruleId: rule.id,
            triggerType: 'event_completed',
            templateId: rule.template_id,
            eventId: event.id,
            clientId: event.client_id,
            dueDate: dueDate.toISOString(),
            reason: `Event ${event.id} completed ${rule.delay_days} day(s) ago`,
          })
        }
      }
    }
  }

  // --- dormant: clients with no events in the last 90 days ---
  if (rulesByTrigger['dormant']) {
    const ninetyDaysAgo = addDays(now, -90).toISOString()

    const { data: clients } = await db
      .from('clients')
      .select('id, last_event_date')
      .eq('tenant_id', user.tenantId!)

    for (const client of clients || []) {
      const lastEvent = client.last_event_date
      if (!lastEvent || lastEvent < ninetyDaysAgo) {
        for (const rule of rulesByTrigger['dormant']) {
          // For dormant, delay_days is counted from "today" as the trigger is ongoing
          pending.push({
            ruleId: rule.id,
            triggerType: 'dormant',
            templateId: rule.template_id,
            eventId: null,
            clientId: client.id,
            dueDate: now.toISOString(),
            reason: `Client ${client.id} has been dormant (last event: ${lastEvent || 'never'})`,
          })
        }
      }
    }
  }

  return pending
}

// ─── Helpers ─────────────────────────────────────────────────────

function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

function mapRule(row: any): FollowupRule {
  return {
    id: row.id,
    chefId: row.chef_id,
    triggerType: row.trigger_type,
    delayDays: row.delay_days,
    templateId: row.template_id,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}
