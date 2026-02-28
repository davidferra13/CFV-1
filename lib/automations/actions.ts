// Automations Server Actions
// Chef-facing CRUD for automation rules and execution history.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import type { AutomationRule, AutomationExecution, TriggerEvent, ActionType } from './types'

// ─── Validation ──────────────────────────────────────────────────────────

const CreateRuleSchema = z.object({
  name: z.string().min(1, 'Name required'),
  description: z.string().optional(),
  trigger_event: z.string().min(1, 'Trigger required'),
  conditions: z
    .array(
      z.object({
        field: z.string(),
        op: z.string(),
        value: z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]),
      })
    )
    .default([]),
  action_type: z.string().min(1, 'Action required'),
  action_config: z.record(z.string(), z.unknown()).default({}),
  priority: z.number().default(0),
})

// ─── Create Rule ─────────────────────────────────────────────────────────

export async function createAutomationRule(input: z.infer<typeof CreateRuleSchema>) {
  const user = await requireChef()
  const validated = CreateRuleSchema.parse(input)
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('automation_rules' as any)
    .insert({
      tenant_id: user.tenantId!,
      name: validated.name,
      description: validated.description || null,
      trigger_event: validated.trigger_event,
      conditions: validated.conditions,
      action_type: validated.action_type,
      action_config: validated.action_config,
      priority: validated.priority,
    })
    .select()
    .single()

  if (error) {
    console.error('[createAutomationRule] Error:', error)
    throw new Error('Failed to create automation rule')
  }

  revalidatePath('/settings/automations')
  return { success: true, rule: data as unknown as AutomationRule }
}

// ─── Update Rule ─────────────────────────────────────────────────────────

export async function updateAutomationRule(
  ruleId: string,
  input: Partial<z.infer<typeof CreateRuleSchema>>
) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { error } = await supabase
    .from('automation_rules' as any)
    .update({
      ...input,
      updated_at: new Date().toISOString(),
    })
    .eq('id', ruleId)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[updateAutomationRule] Error:', error)
    throw new Error('Failed to update rule')
  }

  revalidatePath('/settings/automations')
}

// ─── Toggle Rule Active/Inactive ─────────────────────────────────────────

export async function toggleAutomationRule(ruleId: string, isActive: boolean) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { error } = await supabase
    .from('automation_rules' as any)
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq('id', ruleId)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[toggleAutomationRule] Error:', error)
    throw new Error('Failed to toggle rule')
  }

  revalidatePath('/settings/automations')
}

// ─── Delete Rule ─────────────────────────────────────────────────────────

export async function deleteAutomationRule(ruleId: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { error } = await supabase
    .from('automation_rules' as any)
    .delete()
    .eq('id', ruleId)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[deleteAutomationRule] Error:', error)
    throw new Error('Failed to delete rule')
  }

  revalidatePath('/settings/automations')
}

// ─── Get Rules ───────────────────────────────────────────────────────────

export async function getAutomationRules(): Promise<AutomationRule[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('automation_rules' as any)
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .order('priority', { ascending: false })

  if (error) {
    console.error('[getAutomationRules] Error:', error)
    return []
  }

  return (data || []) as unknown as AutomationRule[]
}

// ─── Get Templates for Rule Builder ──────────────────────────────────────
// Lightweight fetch for the template picker dropdown in the rule builder.

export async function getTemplatesForAutomations(): Promise<{ id: string; name: string }[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('response_templates')
    .select('id, name')
    .eq('tenant_id', user.tenantId!)
    .eq('is_active', true)
    .order('name')

  if (error) {
    console.error('[getTemplatesForAutomations] Error:', error)
    return []
  }

  return data || []
}

// ─── Get Execution History ───────────────────────────────────────────────

export async function getAutomationExecutions(options?: {
  ruleId?: string
  limit?: number
}): Promise<AutomationExecution[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  let query = supabase
    .from('automation_executions' as any)
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .order('executed_at', { ascending: false })
    .limit(options?.limit ?? 50)

  if (options?.ruleId) {
    query = query.eq('rule_id', options.ruleId)
  }

  const { data, error } = await query

  if (error) {
    console.error('[getAutomationExecutions] Error:', error)
    return []
  }

  return (data || []) as unknown as AutomationExecution[]
}
