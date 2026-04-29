export type CallOutcomeStateInput = {
  status: string
  outcome_summary?: string | null
  call_notes?: string | null
  next_action?: string | null
}

export function hasLoggedCallOutcome(call: CallOutcomeStateInput): boolean {
  return hasText(call.outcome_summary) || hasText(call.call_notes) || hasText(call.next_action)
}

export function callNeedsOutcome(call: CallOutcomeStateInput): boolean {
  return call.status === 'completed' && !hasLoggedCallOutcome(call)
}

function hasText(value: string | null | undefined): value is string {
  return typeof value === 'string' && value.trim().length > 0
}
