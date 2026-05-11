// Preset Rule Executor
// Executes actions for each of the 6 config-driven preset rule types.
// Called by the cron route (no user session required).
// Uses admin client for cross-tenant operations.

import { createAdminClient } from '@/lib/db/admin'
import { createNotification, getChefAuthUserId } from '@/lib/notifications/actions'
import type { PresetRuleType } from './types'

type ExecutorResult = {
  processed: number
  triggered: number
  errors: number
}

// -------- Main dispatcher --------

export async function executePresetRule(
  tenantId: string,
  ruleType: PresetRuleType,
  config: Record<string, number | string | boolean>
): Promise<ExecutorResult> {
  switch (ruleType) {
    case 'auto_draft_follow_up':
      return executeDraftFollowUp(tenantId, config)
    case 'auto_request_review':
      return executeRequestReview(tenantId, config)
    case 'auto_flag_stale_inquiry':
      return executeFlagStaleInquiry(tenantId, config)
    case 'auto_reorder_ingredient':
      return executeReorderIngredient(tenantId, config)
    case 'auto_block_calendar':
      return executeBlockCalendar(tenantId, config)
    case 'auto_archive_quote':
      return executeArchiveQuote(tenantId, config)
    default:
      console.error(`[Executor] Unknown preset rule type: ${ruleType}`)
      return { processed: 0, triggered: 0, errors: 1 }
  }
}

// -------- 1. Auto-Draft Follow-Up --------
// Event completed -> draft a thank-you email after delay_hours

async function executeDraftFollowUp(
  tenantId: string,
  config: Record<string, number | string | boolean>
): Promise<ExecutorResult> {
  const db = createAdminClient()
  const delayHours = Number(config.delay_hours) || 24
  const cutoff = new Date(Date.now() - delayHours * 3_600_000).toISOString()

  // Find completed events where completed_at is older than delay
  const { data: events, error: eventsErr } = await db
    .from('events')
    .select('id, occasion, tenant_id, client_id')
    .eq('tenant_id', tenantId)
    .eq('status', 'completed')
    .lt('updated_at', cutoff)
    .is('deleted_at', null)
    .limit(50)

  if (eventsErr || !events) return { processed: 0, triggered: 0, errors: eventsErr ? 1 : 0 }

  let triggered = 0
  let errors = 0

  for (const event of events) {
    const ev = event as any

    // Check if a draft already exists for this event (dedup)
    const { data: existing } = await db
      .from('messages')
      .select('id')
      .eq('event_id', ev.id)
      .eq('tenant_id', tenantId)
      .eq('direction', 'outbound')
      .eq('status', 'draft')
      .ilike('subject', '%thank%')
      .limit(1)

    if (existing && existing.length > 0) continue

    // Get client name
    const { data: client } = await db
      .from('clients')
      .select('first_name, last_name')
      .eq('id', ev.client_id)
      .single()

    const clientName = client
      ? `${(client as any).first_name || ''} ${(client as any).last_name || ''}`.trim()
      : 'there'
    const occasion = ev.occasion || 'your event'

    try {
      await db.from('messages').insert({
        tenant_id: tenantId,
        event_id: ev.id,
        channel: 'email',
        direction: 'outbound',
        status: 'draft',
        subject: `Thank you, ${clientName}!`,
        body: `Hi ${clientName},\n\nThank you for having me at ${occasion}. I hope everything was exactly what you were looking for.\n\nLooking forward to cooking for you again!`,
      })
      triggered++
    } catch (err) {
      console.error(`[Executor] Draft follow-up failed for event ${ev.id}:`, err)
      errors++
    }
  }

  return { processed: events.length, triggered, errors }
}

// -------- 2. Auto-Request Review --------
// X days post-event with no review -> send review request

async function executeRequestReview(
  tenantId: string,
  config: Record<string, number | string | boolean>
): Promise<ExecutorResult> {
  const db = createAdminClient()
  const daysAfter = Number(config.days_after_event) || 3
  const cutoff = new Date(Date.now() - daysAfter * 86_400_000).toISOString()

  // Find completed events older than daysAfter with no review
  const { data: events, error: eventsErr } = await db
    .from('events')
    .select('id, occasion, client_id')
    .eq('tenant_id', tenantId)
    .eq('status', 'completed')
    .lt('updated_at', cutoff)
    .is('deleted_at', null)
    .limit(50)

  if (eventsErr || !events) return { processed: 0, triggered: 0, errors: eventsErr ? 1 : 0 }

  let triggered = 0
  let errors = 0

  for (const event of events) {
    const ev = event as any

    // Check if review already exists
    const { data: existingReview } = await db
      .from('client_reviews')
      .select('id')
      .eq('event_id', ev.id)
      .eq('tenant_id', tenantId)
      .limit(1)

    if (existingReview && existingReview.length > 0) continue

    // Check if review request draft already exists (dedup)
    const { data: existingDraft } = await db
      .from('messages')
      .select('id')
      .eq('event_id', ev.id)
      .eq('tenant_id', tenantId)
      .eq('direction', 'outbound')
      .ilike('subject', '%review%')
      .limit(1)

    if (existingDraft && existingDraft.length > 0) continue

    // Get client name
    const { data: client } = await db
      .from('clients')
      .select('first_name, last_name')
      .eq('id', ev.client_id)
      .single()

    const clientName = client
      ? `${(client as any).first_name || ''} ${(client as any).last_name || ''}`.trim()
      : 'there'
    const occasion = ev.occasion || 'your event'

    try {
      await db.from('messages').insert({
        tenant_id: tenantId,
        event_id: ev.id,
        channel: 'email',
        direction: 'outbound',
        status: 'draft',
        subject: `How was everything, ${clientName}?`,
        body: `Hi ${clientName},\n\nI hope you enjoyed ${occasion}! If you have a moment, I would really appreciate a review. It helps other clients find me and lets me know how to keep improving.\n\nThank you!`,
      })
      triggered++
    } catch (err) {
      console.error(`[Executor] Review request failed for event ${ev.id}:`, err)
      errors++
    }
  }

  return { processed: events.length, triggered, errors }
}

// -------- 3. Auto-Flag Stale Inquiry --------
// Inquiry untouched for stale_hours -> bump priority, notify

async function executeFlagStaleInquiry(
  tenantId: string,
  config: Record<string, number | string | boolean>
): Promise<ExecutorResult> {
  const db = createAdminClient()
  const staleHours = Number(config.stale_hours) || 48
  const cutoff = new Date(Date.now() - staleHours * 3_600_000).toISOString()

  // Find inquiries that have been sitting without activity
  const { data: inquiries, error: inqErr } = await db
    .from('inquiries')
    .select('id, confirmed_occasion, status, client_id')
    .eq('tenant_id', tenantId)
    .in('status', ['new', 'awaiting_chef', 'awaiting_client'])
    .lt('updated_at', cutoff)
    .limit(50)

  if (inqErr || !inquiries) return { processed: 0, triggered: 0, errors: inqErr ? 1 : 0 }

  let triggered = 0
  let errors = 0

  for (const inquiry of inquiries) {
    const inq = inquiry as any

    // Check if already flagged via a todo (dedup)
    const { data: existingTodo } = await db
      .from('chef_todos')
      .select('id')
      .eq('chef_id', tenantId)
      .ilike('text', `%${inq.id}%`)
      .eq('completed', false)
      .limit(1)

    if (existingTodo && existingTodo.length > 0) continue

    // Get client name
    let clientName = 'Unknown'
    if (inq.client_id) {
      const { data: client } = await db
        .from('clients')
        .select('first_name, last_name')
        .eq('id', inq.client_id)
        .single()
      if (client) {
        clientName =
          `${(client as any).first_name || ''} ${(client as any).last_name || ''}`.trim() ||
          'Unknown'
      }
    }

    const occasion = inq.confirmed_occasion || 'inquiry'

    try {
      // Update inquiry to bump follow-up priority
      await db
        .from('inquiries')
        .update({
          follow_up_due_at: new Date().toISOString(),
          next_action_required: `Stale inquiry: no activity for ${staleHours}h. Follow up with ${clientName}.`,
          next_action_by: 'chef',
          updated_at: new Date().toISOString(),
        })
        .eq('id', inq.id)
        .eq('tenant_id', tenantId)

      // Create a todo for visibility
      await db.from('chef_todos').insert({
        chef_id: tenantId,
        text: `Stale inquiry (${staleHours}h): ${clientName} - ${occasion} -> /inquiries/${inq.id}`,
        completed: false,
        created_by: 'system',
        sort_order: 0,
      })

      // Notify chef
      const chefUserId = await getChefAuthUserId(tenantId)
      if (chefUserId) {
        await createNotification({
          tenantId,
          recipientId: chefUserId,
          category: 'system',
          action: 'system_alert',
          title: `Stale inquiry: ${clientName}`,
          body: `${clientName}'s ${occasion} inquiry has had no activity for ${staleHours} hours.`,
          actionUrl: `/inquiries/${inq.id}`,
          inquiryId: inq.id,
        })
      }

      triggered++
    } catch (err) {
      console.error(`[Executor] Flag stale inquiry failed for ${inq.id}:`, err)
      errors++
    }
  }

  return { processed: inquiries.length, triggered, errors }
}

// -------- 4. Auto-Reorder Ingredient --------
// Stock below par -> create purchase order draft, notify

async function executeReorderIngredient(
  tenantId: string,
  config: Record<string, number | string | boolean>
): Promise<ExecutorResult> {
  const db = createAdminClient()
  const shouldNotify = config.notify !== false

  // Find ingredients below par level
  const { data: belowPar, error: invErr } = await db
    .from('inventory_counts')
    .select('id, ingredient_id, ingredient_name, current_qty, par_level, unit, vendor_id')
    .eq('chef_id', tenantId)
    .not('par_level', 'is', null)
    .limit(100)

  if (invErr || !belowPar) return { processed: 0, triggered: 0, errors: invErr ? 1 : 0 }

  // Filter to items actually below par
  const needsReorder = (belowPar as any[]).filter(
    (item) => item.par_level && Number(item.current_qty) < Number(item.par_level)
  )

  if (needsReorder.length === 0) return { processed: belowPar.length, triggered: 0, errors: 0 }

  let triggered = 0
  let errors = 0

  for (const item of needsReorder) {
    // Check if a draft PO already exists for this ingredient (dedup)
    const { data: existingTodo } = await db
      .from('chef_todos')
      .select('id')
      .eq('chef_id', tenantId)
      .ilike('text', `%reorder%${item.ingredient_name}%`)
      .eq('completed', false)
      .limit(1)

    if (existingTodo && existingTodo.length > 0) continue

    try {
      const deficit = Number(item.par_level) - Number(item.current_qty)

      // Create a todo for the chef to action
      await db.from('chef_todos').insert({
        chef_id: tenantId,
        text: `Reorder: ${item.ingredient_name} is below par (${Number(item.current_qty).toFixed(1)} / ${Number(item.par_level).toFixed(1)} ${item.unit}). Need ${deficit.toFixed(1)} ${item.unit} more.`,
        completed: false,
        created_by: 'system',
        sort_order: 0,
      })

      // Notify chef if enabled
      if (shouldNotify) {
        const chefUserId = await getChefAuthUserId(tenantId)
        if (chefUserId) {
          await createNotification({
            tenantId,
            recipientId: chefUserId,
            category: 'system',
            action: 'system_alert',
            title: `Low stock: ${item.ingredient_name}`,
            body: `${item.ingredient_name} is at ${Number(item.current_qty).toFixed(1)} ${item.unit} (par: ${Number(item.par_level).toFixed(1)}). Consider reordering.`,
            actionUrl: '/inventory',
          })
        }
      }

      triggered++
    } catch (err) {
      console.error(`[Executor] Reorder ingredient failed for ${item.ingredient_name}:`, err)
      errors++
    }
  }

  return { processed: needsReorder.length, triggered, errors }
}

// -------- 5. Auto-Block Calendar --------
// Event confirmed -> block prep days (event date minus lead time)

async function executeBlockCalendar(
  tenantId: string,
  config: Record<string, number | string | boolean>
): Promise<ExecutorResult> {
  const db = createAdminClient()
  const leadTimeDays = Number(config.lead_time_days) || 2

  // Find confirmed events that might not have prep blocks yet
  const { data: events, error: eventsErr } = await db
    .from('events')
    .select('id, event_date, occasion')
    .eq('tenant_id', tenantId)
    .eq('status', 'confirmed')
    .is('deleted_at', null)
    .limit(50)

  if (eventsErr || !events) return { processed: 0, triggered: 0, errors: eventsErr ? 1 : 0 }

  let triggered = 0
  let errors = 0

  for (const event of events) {
    const ev = event as any
    if (!ev.event_date) continue

    const eventDate = new Date(ev.event_date)

    for (let dayOffset = 1; dayOffset <= leadTimeDays; dayOffset++) {
      const prepDate = new Date(eventDate)
      prepDate.setDate(prepDate.getDate() - dayOffset)
      const blockDateStr = prepDate.toISOString().slice(0, 10)

      // Check if block already exists (dedup)
      const { data: existing } = await db
        .from('chef_availability_blocks')
        .select('id')
        .eq('chef_id', tenantId)
        .eq('block_date', blockDateStr)
        .eq('event_id', ev.id)
        .limit(1)

      if (existing && existing.length > 0) continue

      try {
        await db.from('chef_availability_blocks').insert({
          chef_id: tenantId,
          block_date: blockDateStr,
          block_type: 'full_day',
          reason: `Prep day for ${ev.occasion || 'event'} (auto-blocked)`,
          is_event_auto: true,
          event_id: ev.id,
        })
        triggered++
      } catch (err) {
        console.error(`[Executor] Block calendar failed for event ${ev.id} on ${blockDateStr}:`, err)
        errors++
      }
    }
  }

  return { processed: events.length, triggered, errors }
}

// -------- 6. Auto-Archive Quote --------
// Quote expired for X days -> move to archive, log activity

async function executeArchiveQuote(
  tenantId: string,
  config: Record<string, number | string | boolean>
): Promise<ExecutorResult> {
  const db = createAdminClient()
  const daysAfterExpiry = Number(config.days_after_expiry) || 30
  const cutoff = new Date(Date.now() - daysAfterExpiry * 86_400_000).toISOString()

  // Find expired quotes older than the threshold
  const { data: quotes, error: quotesErr } = await db
    .from('quotes')
    .select('id, quote_name, client_id, expired_at')
    .eq('tenant_id', tenantId)
    .eq('status', 'expired')
    .lt('expired_at', cutoff)
    .limit(50)

  if (quotesErr || !quotes) return { processed: 0, triggered: 0, errors: quotesErr ? 1 : 0 }

  let triggered = 0
  let errors = 0

  for (const quote of quotes) {
    const q = quote as any

    try {
      // Transition to archived status
      await db
        .from('quotes')
        .update({
          status: 'archived',
          updated_at: new Date().toISOString(),
        })
        .eq('id', q.id)
        .eq('tenant_id', tenantId)

      // Log the state transition
      await db.from('quote_state_transitions').insert({
        quote_id: q.id,
        tenant_id: tenantId,
        from_status: 'expired',
        to_status: 'archived',
        reason: `Auto-archived after ${daysAfterExpiry} days of expiry`,
        metadata: { source: 'preset_automation_rule', rule_type: 'auto_archive_quote' },
      })

      triggered++
    } catch (err) {
      console.error(`[Executor] Archive quote failed for ${q.id}:`, err)
      errors++
    }
  }

  return { processed: quotes.length, triggered, errors }
}
