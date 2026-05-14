export type ApprovalGateKind =
  | 'risky_substitution'
  | 'margin_drop'
  | 'allergy_conflict'
  | 'vendor_quote_expiry'
  | 'client_message'
  | 'event_snapshot'

export interface ApprovalGateInput {
  kind: ApprovalGateKind
  severity: 'info' | 'warning' | 'critical'
  acknowledged?: boolean
}

export function evaluateApprovalGate(input: ApprovalGateInput) {
  const requiresApproval = input.severity !== 'info'
  return {
    kind: input.kind,
    requiresApproval,
    blocked: requiresApproval && !input.acknowledged,
    reason: requiresApproval ? `${input.kind}_requires_approval` : 'no_approval_required',
  }
}
