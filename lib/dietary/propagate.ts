// Dietary Propagation Module
//
// Single entry point for "a client's dietary info changed, propagate
// to all affected entities." Consolidates the event propagation logic
// that was previously inline in updateClient.
//
// NOT a 'use server' file. Called BY server actions and mutation pipeline.

import { revalidatePath } from 'next/cache'

export type DietaryPropagationParams = {
  tenantId: string
  clientId: string
  /** The update patch containing changed dietary fields */
  patch: Record<string, unknown>
  db: any
}

const DIETARY_FIELDS = ['allergies', 'dietary_restrictions'] as const
const ACTIVE_EVENT_STATUSES = ['accepted', 'paid', 'confirmed', 'in_progress']

/**
 * Propagate dietary/allergy changes from a client record to their active events.
 * Ensures prep sheets and event detail pages show current data,
 * not stale copy-at-creation data.
 */
export async function propagateDietaryToEvents(
  params: DietaryPropagationParams
): Promise<{ eventsUpdated: number }> {
  const { tenantId, clientId, patch, db } = params

  const changedDietaryFields = DIETARY_FIELDS.filter((field) => field in patch)
  if (changedDietaryFields.length === 0) {
    return { eventsUpdated: 0 }
  }

  const propagateFields: Record<string, unknown> = {}
  for (const field of changedDietaryFields) {
    propagateFields[field] = patch[field] ?? []
  }

  const { data: affectedEvents } = await db
    .from('events')
    .update(propagateFields)
    .eq('client_id', clientId)
    .eq('tenant_id', tenantId)
    .in('status', ACTIVE_EVENT_STATUSES)
    .select('id')

  // Revalidate affected event pages so dietary badges update
  if (affectedEvents?.length) {
    for (const evt of affectedEvents) {
      revalidatePath(`/events/${evt.id}`)
    }
  }

  return { eventsUpdated: affectedEvents?.length ?? 0 }
}

/**
 * Full dietary propagation pipeline: sync allergy stores, log changes,
 * recheck menus, and propagate to events. Use when you need all
 * propagation steps in one call (e.g., from intake forms, onboarding).
 */
export async function propagateFullDietaryChange(params: {
  tenantId: string
  clientId: string
  patch: Record<string, unknown>
  previousState: Record<string, unknown>
  db: any
}): Promise<void> {
  const { tenantId, clientId, patch, previousState, db } = params

  // 1. Allergy store sync (if allergies changed)
  if ('allergies' in patch) {
    try {
      const { syncFlatToStructured } = await import('@/lib/dietary/allergy-sync')
      await syncFlatToStructured({ tenantId, clientId, db })
    } catch (err) {
      console.warn('[dietary/propagate] Allergy sync failed:', err)
    }
  }

  // 2. Log dietary changes
  const changedDietaryFields = DIETARY_FIELDS.filter((field) => field in patch)
  if (changedDietaryFields.length > 0) {
    try {
      const { logDietaryChangeInternal } = await import('@/lib/clients/dietary-alert-actions')
      for (const field of changedDietaryFields) {
        const oldVal = previousState[field]
        const newVal = patch[field]
        const oldStr = Array.isArray(oldVal) ? oldVal.join(', ') : String(oldVal ?? '')
        const newStr = Array.isArray(newVal)
          ? (newVal as string[]).join(', ')
          : String(newVal ?? '')
        if (oldStr !== newStr) {
          const oldArr = Array.isArray(oldVal) ? oldVal : []
          const newArr = Array.isArray(newVal) ? (newVal as string[]) : []
          const isRemoval = newArr.length < (oldArr as unknown[]).length
          const changeType =
            field === 'allergies'
              ? isRemoval
                ? 'allergy_removed'
                : 'allergy_added'
              : isRemoval
                ? 'restriction_removed'
                : 'restriction_added'
          await logDietaryChangeInternal(
            tenantId,
            clientId,
            changeType,
            field,
            oldStr || null,
            newStr || null
          )
        }
      }
    } catch (err) {
      console.warn('[dietary/propagate] Dietary change log failed:', err)
    }
  }

  // 3. Menu recheck
  if (changedDietaryFields.length > 0) {
    try {
      const { recheckUpcomingMenusForClient } = await import('@/lib/dietary/menu-recheck')
      await recheckUpcomingMenusForClient({ tenantId, clientId, db })
    } catch (err) {
      console.warn('[dietary/propagate] Menu recheck failed:', err)
    }
  }

  // 4. Event propagation
  try {
    await propagateDietaryToEvents({ tenantId, clientId, patch, db })
  } catch (err) {
    console.warn('[dietary/propagate] Event propagation failed:', err)
  }
}
