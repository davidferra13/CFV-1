/**
 * Cooling-Off Periods: types for delayed-execution actions.
 * High-stakes actions (pricing changes, client drops, commitment removal)
 * go through a mandatory cooling-off window before execution.
 */

export type CoolingOffActionType = 'pricing_change' | 'client_drop' | 'commitment_removal'

/** Delay durations per action type (in hours) */
export const COOLING_OFF_HOURS: Record<CoolingOffActionType, number> = {
  pricing_change: 4,
  client_drop: 24,
  commitment_removal: 48,
}

export interface CoolingOffPeriod {
  id: string
  tenant_id: string
  action_type: CoolingOffActionType
  action_data: Record<string, unknown>
  initiated_at: string
  executes_at: string
  cancelled_at: string | null
  executed_at: string | null
}

export type CoolingOffStatus = 'pending' | 'executed' | 'cancelled' | 'expired'
