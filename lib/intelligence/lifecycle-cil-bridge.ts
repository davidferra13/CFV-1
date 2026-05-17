// Lifecycle CIL Bridge
// Emits a CIL signal when a lifecycle stage transition is detected.
// Non-blocking; logs errors but never throws to the caller.

import { notifyCIL } from '@/lib/cil/notify'
import type { LifecycleStage } from './lifecycle-stage-detector'
import { isForwardTransition, getStageLabel } from './lifecycle-stage-detector'

interface LifecycleTransitionEvent {
  tenantId: string
  clientId: string
  previousStage: LifecycleStage
  currentStage: LifecycleStage
  confidence: number
  evidence: string[]
}

/**
 * Compares previous and current stage. If different, emits a CIL signal.
 * Safe to call from any context; failures are swallowed.
 */
export async function emitLifecycleTransition(event: LifecycleTransitionEvent): Promise<void> {
  try {
    if (event.previousStage === event.currentStage) return

    const isForward = isForwardTransition(event.previousStage, event.currentStage)
    const direction = isForward ? 'progressed' : 'regressed'

    await notifyCIL({
      tenantId: event.tenantId,
      source: 'event_transition',
      entityIds: [`client_${event.clientId}`],
      payload: {
        type: 'lifecycle_stage_change',
        previousStage: event.previousStage,
        currentStage: event.currentStage,
        previousLabel: getStageLabel(event.previousStage),
        currentLabel: getStageLabel(event.currentStage),
        direction,
        confidence: event.confidence,
        evidence: event.evidence,
      },
    })
  } catch (err) {
    console.error(
      '[lifecycle-cil-bridge] Failed to emit transition signal (non-fatal)',
      err instanceof Error ? err.message : err
    )
  }
}

/**
 * Convenience: compare stored stage with fresh detection, emit if changed.
 * Returns the current stage for the caller to cache/store.
 */
export async function checkAndEmitTransition(input: {
  tenantId: string
  clientId: string
  previousStage: LifecycleStage | null
  currentStage: LifecycleStage
  confidence: number
  evidence: string[]
}): Promise<LifecycleStage> {
  if (input.previousStage && input.previousStage !== input.currentStage) {
    await emitLifecycleTransition({
      tenantId: input.tenantId,
      clientId: input.clientId,
      previousStage: input.previousStage,
      currentStage: input.currentStage,
      confidence: input.confidence,
      evidence: input.evidence,
    })
  }
  return input.currentStage
}
