'use server'

import { revalidateTag } from 'next/cache'
import { requireOperationalTelemetryActor } from './auth'
import { recordOperationalTelemetryEvent } from './store'
import type { OperationalTelemetryEventInput } from './types'

export async function recordOperationalTelemetryEventAction(
  input: OperationalTelemetryEventInput
): Promise<
  { success: true; eventId: string; inserted: boolean } | { success: false; error: string }
> {
  try {
    const actor = await requireOperationalTelemetryActor()
    const result = await recordOperationalTelemetryEvent(actor, input)
    const tenantId = actor.tenantId ?? input.tenantId

    if (tenantId) {
      revalidateTag(`operational-telemetry-${tenantId}`)
    }

    return {
      success: true,
      eventId: result.eventId,
      inserted: result.inserted,
    }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to record operational telemetry',
    }
  }
}
