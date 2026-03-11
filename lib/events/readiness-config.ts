import type { EventStatus } from './transitions'

export type ReadinessGate =
  | 'allergies_verified'
  | 'menu_client_approved'
  | 'documents_generated'
  | 'deposit_collected'
  | 'packing_reviewed'
  | 'equipment_confirmed'
  | 'receipts_uploaded'
  | 'kitchen_clean'
  | 'dop_complete'
  | 'financial_reconciled'

const READINESS_TRANSITION_GATES: Record<string, ReadinessGate[]> = {
  'paid->confirmed': [
    'allergies_verified',
    'menu_client_approved',
    'documents_generated',
    'deposit_collected',
  ],
  'confirmed->in_progress': ['packing_reviewed', 'equipment_confirmed'],
  'in_progress->completed': [
    'receipts_uploaded',
    'kitchen_clean',
    'dop_complete',
    'financial_reconciled',
  ],
}

const MANUALLY_PASSABLE_GATES = new Set<ReadinessGate>([
  'packing_reviewed',
  'equipment_confirmed',
  'receipts_uploaded',
  'kitchen_clean',
  'dop_complete',
  'financial_reconciled',
])

export function getReadinessTransitionGates(
  fromStatus: EventStatus,
  toStatus: EventStatus
): ReadinessGate[] {
  return READINESS_TRANSITION_GATES[`${fromStatus}->${toStatus}`] ?? []
}

export function canMarkReadinessGatePassed(gate: ReadinessGate): boolean {
  return MANUALLY_PASSABLE_GATES.has(gate)
}

export { READINESS_TRANSITION_GATES }
