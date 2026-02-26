// Condition Evaluator
// Evaluates rule conditions against context fields.
// All conditions are AND'd together.

import type { Condition, AutomationContext } from './types'

export function evaluateConditions(conditions: Condition[], context: AutomationContext): boolean {
  if (!conditions || conditions.length === 0) return true

  return conditions.every((condition) => evaluateSingle(condition, context.fields))
}

function evaluateSingle(condition: Condition, fields: Record<string, unknown>): boolean {
  const fieldValue = fields[condition.field]

  // If the field doesn't exist in context, the condition fails
  if (fieldValue === undefined || fieldValue === null) {
    // Unless we're checking for null/empty
    if (condition.op === 'eq' && (condition.value === null || condition.value === '')) return true
    if (condition.op === 'neq' && condition.value !== null && condition.value !== '') return true
    return false
  }

  switch (condition.op) {
    case 'eq':
      return String(fieldValue) === String(condition.value)

    case 'neq':
      return String(fieldValue) !== String(condition.value)

    case 'gt':
      return Number(fieldValue) > Number(condition.value)

    case 'lt':
      return Number(fieldValue) < Number(condition.value)

    case 'gte':
      return Number(fieldValue) >= Number(condition.value)

    case 'lte':
      return Number(fieldValue) <= Number(condition.value)

    case 'contains':
      return String(fieldValue).toLowerCase().includes(String(condition.value).toLowerCase())

    case 'in':
      if (Array.isArray(condition.value)) {
        return condition.value.includes(String(fieldValue))
      }
      return false

    default:
      return false
  }
}
