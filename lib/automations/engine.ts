// Automations Engine
// Core evaluation loop: when an event fires, find matching rules and execute actions.
// Called as a non-blocking side effect from other server actions and processors.
// Uses admin client (no user session required).

import { createServerClient } from '@/lib/supabase/server'
import { evaluateConditions } from './conditions'
import { executeAction } from './action-handlers'
import type { AutomationRule, AutomationContext, TriggerEvent, Condition } from './types'

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
        // Parse conditions from JSONB
        const conditions = (rule.conditions || []) as Condition[]

        // Evaluate conditions
        if (!evaluateConditions(conditions, fullContext)) {
          // Conditions not met — log as skipped
          await logExecution(supabase, tenantId, rule, fullContext, 'skipped')
          continue
        }

        // Execute the action
        const result = await executeAction(rule, fullContext)

        // Log the execution
        await logExecution(
          supabase,
          tenantId,
          rule,
          fullContext,
          result.success ? 'success' : 'failed',
          result.details,
          result.error
        )

        // Update rule stats
        await supabase
          .from('automation_rules' as any)
          .update({
            last_fired_at: new Date().toISOString(),
            total_fires: rule.total_fires + 1,
          })
          .eq('id', rule.id)
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
  supabase: ReturnType<typeof createServerClient>,
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
