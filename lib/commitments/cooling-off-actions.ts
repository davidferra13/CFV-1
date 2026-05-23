'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import {
  COOLING_OFF_HOURS,
  type CoolingOffActionType,
  type CoolingOffPeriod,
  type CoolingOffStatus,
} from './cooling-off-types'

/**
 * Start a cooling-off period for a high-stakes action.
 * The action will not execute until the delay expires and executeCooledAction is called.
 */
export async function initiateCoolingOff(
  actionType: CoolingOffActionType,
  actionData: Record<string, unknown>
): Promise<CoolingOffPeriod> {
  const user = await requireChef()
  const db = createServerClient()

  const delayHours = COOLING_OFF_HOURS[actionType]
  const now = new Date()
  const executesAt = new Date(now.getTime() + delayHours * 60 * 60 * 1000)

  const { data, error } = await db
    .from('cooling_off_periods')
    .insert({
      tenant_id: user.tenantId!,
      action_type: actionType,
      action_data: actionData,
      executes_at: executesAt.toISOString(),
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to initiate cooling-off period: ${error.message}`)
  return data as CoolingOffPeriod
}

/**
 * Check whether a cooling-off period is still active, executed, or cancelled.
 */
export async function checkCoolingOffStatus(
  coolingOffId: string
): Promise<{ status: CoolingOffStatus; period: CoolingOffPeriod }> {
  const user = await requireChef()
  const db = createServerClient()

  const { data, error } = await db
    .from('cooling_off_periods')
    .select('*')
    .eq('id', coolingOffId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (error || !data) throw new Error('Cooling-off period not found')

  const period = data as CoolingOffPeriod
  let status: CoolingOffStatus

  if (period.cancelled_at) {
    status = 'cancelled'
  } else if (period.executed_at) {
    status = 'executed'
  } else if (new Date(period.executes_at) <= new Date()) {
    status = 'expired' // ready to execute
  } else {
    status = 'pending'
  }

  return { status, period }
}

/**
 * Execute a cooled action after its delay has passed.
 * Returns the action data so the caller can perform the actual operation.
 * Fails if the period is still cooling, already executed, or cancelled.
 */
export async function executeCooledAction(
  coolingOffId: string
): Promise<{ actionType: CoolingOffActionType; actionData: Record<string, unknown> }> {
  const user = await requireChef()
  const db = createServerClient()

  const { status, period } = await checkCoolingOffStatus(coolingOffId)

  if (status === 'cancelled') {
    throw new Error('This action was cancelled during the cooling-off period')
  }
  if (status === 'executed') {
    throw new Error('This action has already been executed')
  }
  if (status === 'pending') {
    throw new Error('Cooling-off period has not elapsed yet')
  }

  // Mark as executed
  const { error } = await db
    .from('cooling_off_periods')
    .update({ executed_at: new Date().toISOString() })
    .eq('id', coolingOffId)
    .eq('tenant_id', user.tenantId!)

  if (error) throw new Error(`Failed to mark cooling-off as executed: ${error.message}`)

  return {
    actionType: period.action_type as CoolingOffActionType,
    actionData: period.action_data as Record<string, unknown>,
  }
}

/**
 * Cancel a pending cooling-off action before it executes.
 * Only works if the action has not already been executed.
 */
export async function cancelCoolingOff(coolingOffId: string): Promise<void> {
  const user = await requireChef()
  const db = createServerClient()

  const { status } = await checkCoolingOffStatus(coolingOffId)

  if (status === 'executed') {
    throw new Error('Cannot cancel an already-executed action')
  }
  if (status === 'cancelled') {
    return // already cancelled, idempotent
  }

  const { error } = await db
    .from('cooling_off_periods')
    .update({ cancelled_at: new Date().toISOString() })
    .eq('id', coolingOffId)
    .eq('tenant_id', user.tenantId!)

  if (error) throw new Error(`Failed to cancel cooling-off period: ${error.message}`)
}

/**
 * List all cooling-off periods for the current chef, optionally filtered by status.
 */
export async function listCoolingOffPeriods(
  filterStatus?: CoolingOffStatus
): Promise<CoolingOffPeriod[]> {
  const user = await requireChef()
  const db = createServerClient()

  let query = db
    .from('cooling_off_periods')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .order('initiated_at', { ascending: false })

  if (filterStatus === 'cancelled') {
    query = query.not('cancelled_at', 'is', null)
  } else if (filterStatus === 'executed') {
    query = query.not('executed_at', 'is', null)
  } else if (filterStatus === 'pending') {
    query = query
      .is('cancelled_at', null)
      .is('executed_at', null)
      .gt('executes_at', new Date().toISOString())
  }

  const { data, error } = await query

  if (error) throw new Error(`Failed to list cooling-off periods: ${error.message}`)
  return (data ?? []) as CoolingOffPeriod[]
}
