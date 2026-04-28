export type CallOutcomePresetId =
  | 'qualified_send_proposal'
  | 'budget_mismatch_revise_scope'
  | 'waiting_on_client'
  | 'verbal_acceptance'
  | 'deposit_reminder'
  | 'logistics_confirmed'
  | 'rebooking_opportunity'
  | 'not_a_fit'

export type CallOutcomePreset = {
  id: CallOutcomePresetId
  label: string
  outcomeSummary: string
  nextAction: string
  dueInDays: number
}

export const CALL_OUTCOME_PRESETS: CallOutcomePreset[] = [
  {
    id: 'qualified_send_proposal',
    label: 'Qualified, send proposal',
    outcomeSummary: 'Client is qualified and ready for a proposal.',
    nextAction: 'Send proposal',
    dueInDays: 1,
  },
  {
    id: 'budget_mismatch_revise_scope',
    label: 'Budget mismatch',
    outcomeSummary: 'Client expectations and budget need a revised scope.',
    nextAction: 'Revise scope and send adjusted option',
    dueInDays: 1,
  },
  {
    id: 'waiting_on_client',
    label: 'Waiting on client',
    outcomeSummary: 'Client needs to confirm details before the next step.',
    nextAction: 'Follow up for missing client details',
    dueInDays: 2,
  },
  {
    id: 'verbal_acceptance',
    label: 'Verbally accepted',
    outcomeSummary: 'Client verbally accepted the proposal.',
    nextAction: 'Send deposit or payment reminder',
    dueInDays: 0,
  },
  {
    id: 'deposit_reminder',
    label: 'Deposit reminder',
    outcomeSummary: 'Client needs a deposit reminder to hold the date.',
    nextAction: 'Send deposit reminder',
    dueInDays: 0,
  },
  {
    id: 'logistics_confirmed',
    label: 'Logistics confirmed',
    outcomeSummary: 'Arrival, service timing, kitchen access, and final details are confirmed.',
    nextAction: 'Proceed with procurement and prep',
    dueInDays: 0,
  },
  {
    id: 'rebooking_opportunity',
    label: 'Rebooking opportunity',
    outcomeSummary: 'Client is a good candidate for another booking.',
    nextAction: 'Send rebooking options',
    dueInDays: 2,
  },
  {
    id: 'not_a_fit',
    label: 'Not a fit',
    outcomeSummary: 'Client or event is not a fit right now.',
    nextAction: 'Close out or decline politely',
    dueInDays: 0,
  },
]

export function getPresetDueDateValue(preset: CallOutcomePreset, baseDate = new Date()): string {
  const due = new Date(baseDate)
  due.setDate(due.getDate() + preset.dueInDays)
  return due.toISOString().slice(0, 10)
}
