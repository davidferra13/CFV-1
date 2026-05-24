'use server'

// lib/feature-gates/gate-actions.ts
// Server actions for feature gate queries. Auth-gated, tenant-scoped.

import { requireChef } from '@/lib/auth/get-user'
import { GATE_REGISTRY, type GateKey } from './gate-registry'
import { checkGate, getChefGates } from './gate-check'
import type { GateCheckResult, GateRegistry } from './gate-types'

/**
 * Get all gates with allowed/denied status for the current chef.
 */
export async function getMyGates(): Promise<Record<GateKey, GateCheckResult>> {
  const user = await requireChef()
  return getChefGates(user.entityId)
}

/**
 * Get the full gate registry (definitions only, no per-chef status).
 */
export async function getGateRegistry(): Promise<GateRegistry> {
  await requireChef()
  return { ...GATE_REGISTRY }
}

/**
 * Check a single gate for the current chef.
 */
export async function checkMyGate(key: GateKey): Promise<GateCheckResult> {
  const user = await requireChef()
  return checkGate(user.entityId, key)
}
