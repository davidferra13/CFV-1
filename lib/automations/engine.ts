// Automations Engine
// Core evaluation loop: when an event fires, find matching rules and execute actions.
// Called as a non-blocking side effect from other server actions and processors.
// Uses admin client (no user session required).

import { createServerClient } from '@/lib/supabase/server'
import { evaluateConditions } from './conditions'
import { executeAction } from './action-handlers'
import type { AutomationRule, AutomationContext, TriggerEvent, Condition } from './types'

// ─── Cooldown Windows ────────────────────────────────────────────────────
// Prevent the same rule from firing on the same entity more than once
// within a cooldown window. Stops time-based triggers (event_approaching,
// no_response_timeout) from firing hundreds of times per cycle.

const COOLDOWN_HOURS: Partial<Record<TriggerEvent, number>> = {
  event_approaching: 12, // at most once per 12h per event
  no_response_timeout: 24, // at most once per 24h per inquiry
  follow_up_overdue: 24, // at most once per 24h (rescheduling resets the trigger)
  quote_expiring: 24, // at most once per 24h per quote
}

// ─── Main Entry Point ────────────────────────────────────────────────────
// Call this after key actions: inquiry creation, status changes, Wix processing, etc.
// Non-blocking: catches all errors internally.

export async function evaluateAutomations(
  tenantId: string,
  triggerEvent: TriggerEvent,
  context: Omit<AutomationContext, 'tenantId'>
): Promise<void> {
  try {
    const supabase = createServerClient({ admin: true })
    const fullContext: AutomationContext = { ...context, tenantId }

    // 1. Find all active rules matching this trigger event for this tenant
    const { data: rules, error } = await supabase
      .from('automation_rules' as any)
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('trigger_event', triggerEvent)
      .eq('is_active', true)
      .order('priority', { ascending: false })

    if (error || !rules || rules.length === 0) return

    // 2. Evaluate each rule's conditions and execute matching actions
    for (const ruleRow of rules) {
      const rule = ruleRow as unknown as AutomationRule
      try {
        // ── Cooldown deduplication ───────────────────────────────────────
        // For time-based triggers, skip if we already successfully fired
        // this rule for this entity within the cooldown window.
        const cooldownHours = COOLDOWN_HOURS[rule.trigger_event]
        if (cooldownHours && fullContext.entityId) {
          const cutoff = new Date(Date.now() - cooldownHours * 3_600_000).toISOString()
          const { data: recentExecution } = await supabase
            .from('automation_executions' as any)
            .select('id')
            .eq('rule_id', rule.id)
            .eq('trigger_entity_id', fullContext.entityId)
            .eq('status', 'success')
            .gte('executed_at', cutoff)
            .limit(1)
            .maybeSingle()

          if (recentExecution) {
            // Already fired recently - skip silently (no log entry)
            continue
          }
        }

        // ── Parse conditions from JSONB ─────────────────────────────────
        const conditions = (rule.conditions || []) as Condition[]

        // ── Evaluate conditions ─────────────────────────────────────────
        if (!evaluateConditions(conditions, fullContext)) {
          // Conditions not met - log as skipped
          await logExecution(supabase, tenantId, rule, fullContext, 'skipped')
          continue
        }

        // ── Execute the action ──────────────────────────────────────────
        const result = await executeAction(rule, fullContext)

        // ── Log the execution ───────────────────────────────────────────
        await logExecution(
          supabase,
          tenantId,
          rule,
          fullContext,
          result.success ? 'success' : 'failed',
          result.details,
          result.error
        )

        // ── Update rule stats ───────────────────────────────────────────
        if (result.success) {
          await supabase
            .from('automation_rules' as any)
            .update({
              last_fired_at: new Date().toISOString(),
              total_fires: rule.total_fires + 1,
            })
            .eq('id', rule.id)
        }
      } catch (ruleErr) {
        const error = ruleErr as Error
        console.error(`[Automations] Rule "${rule.name}" (${rule.id}) failed:`, error.message)
        await logExecution(
          supabase,
          tenantId,
          rule,
          fullContext,
          'failed',
          undefined,
          error.message
        )
      }
    }
  } catch (err) {
    // Non-blocking: automations should never break the main flow
    console.error('[Automations] Engine error (non-fatal):', err)
  }
}

// ─── Log Execution ───────────────────────────────────────────────────────

async function logExecution(
  supabase: any,
  tenantId: string,
  rule: AutomationRule,
  context: AutomationContext,
  status: 'success' | 'failed' | 'skipped',
  actionResult?: Record<string, unknown>,
  error?: string
) {
  await supabase.from('automation_executions' as any).insert({
    tenant_id: tenantId,
    rule_id: rule.id,
    trigger_event: rule.trigger_event,
    trigger_entity_id: context.entityId || null,
    trigger_entity_type: context.entityType || null,
    action_type: rule.action_type,
    action_result: actionResult || null,
    status,
    error: error || null,
  })
}
