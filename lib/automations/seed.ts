import { createServerClient } from '@/lib/supabase/server'

type BudgetMode = 'not_sure' | 'unset'

type BudgetRuleSeed = {
  name: string
  description: string
  budgetMode: BudgetMode
  actionDescription: string
  dueHours: number
  priority: number
}

const DEFAULT_BUDGET_QUALIFICATION_RULES: BudgetRuleSeed[] = [
  {
    name: 'Budget not sure qualification task',
    description:
      "Creates a same-day follow-up task when a new inquiry doesn't include a clear budget.",
    budgetMode: 'not_sure',
    actionDescription:
      'Send budget-guidance follow-up to {{client_name}} for {{occasion}} ({{guest_count}} guests).',
    dueHours: 2,
    priority: 80,
  },
  {
    name: 'Missing budget follow-up task',
    description:
      'Creates a same-day follow-up task when a new inquiry has no budget selected or entered.',
    budgetMode: 'unset',
    actionDescription: 'Ask {{client_name}} for a target budget range before quoting {{occasion}}.',
    dueHours: 2,
    priority: 80,
  },
]

function hasBudgetModeCondition(conditions: unknown, budgetMode: BudgetMode): boolean {
  if (!Array.isArray(conditions)) return false

  return conditions.some((condition) => {
    if (!condition || typeof condition !== 'object') return false
    const record = condition as Record<string, unknown>
    return (
      record.field === 'budget_mode' &&
      record.op === 'eq' &&
      typeof record.value === 'string' &&
      record.value === budgetMode
    )
  })
}

export async function seedDefaultBudgetQualificationAutomations(
  tenantId: string
): Promise<{ created: number }> {
  const supabase: any = createServerClient({ admin: true })

  const { data: existingRules, error: existingError } = await supabase
    .from('automation_rules' as any)
    .select('id, conditions')
    .eq('tenant_id', tenantId)
    .eq('trigger_event', 'inquiry_created')
    .eq('action_type', 'create_follow_up_task')

  if (existingError) {
    throw new Error(existingError.message || 'Failed to read existing automation rules')
  }

  const coveredModes = new Set<BudgetMode>()
  for (const rule of existingRules || []) {
    if (hasBudgetModeCondition(rule.conditions, 'not_sure')) {
      coveredModes.add('not_sure')
    }
    if (hasBudgetModeCondition(rule.conditions, 'unset')) {
      coveredModes.add('unset')
    }
  }

  const toInsert = DEFAULT_BUDGET_QUALIFICATION_RULES.filter(
    (rule) => !coveredModes.has(rule.budgetMode)
  )

  if (toInsert.length === 0) {
    return { created: 0 }
  }

  const payload = toInsert.map((rule) => ({
    tenant_id: tenantId,
    name: rule.name,
    description: rule.description,
    is_active: true,
    trigger_event: 'inquiry_created',
    conditions: [{ field: 'budget_mode', op: 'eq', value: rule.budgetMode }],
    action_type: 'create_follow_up_task',
    action_config: {
      description: rule.actionDescription,
      due_hours: rule.dueHours,
    },
    priority: rule.priority,
  }))

  const { error: insertError } = await supabase.from('automation_rules' as any).insert(payload)
  if (insertError) {
    throw new Error(insertError.message || 'Failed to seed default budget automation rules')
  }

  return { created: toInsert.length }
}
