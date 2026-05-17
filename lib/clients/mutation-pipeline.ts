// Client Mutation Pipeline
//
// Extracts the side-effect chain from updateClient into a testable,
// named-step pipeline. Each step is either critical (failure = rollback)
// or non-critical (failure = log warning, continue).
//
// NOT a 'use server' file. Called BY server actions, not directly by clients.

export type MutationStep = {
  name: string
  critical: boolean
  execute: () => Promise<void>
}

export type StepResult = {
  name: string
  success: boolean
  error?: string
}

export type MutationResult = {
  success: boolean
  stepsExecuted: StepResult[]
}

export type ClientMutationParams = {
  tenantId: string
  actorId: string
  clientId: string
  patch: Record<string, unknown>
  previousState: Record<string, unknown>
  updatedState: Record<string, unknown>
  db: any
}

// Fields that indicate dietary data changed
const DIETARY_FIELDS = ['allergies', 'dietary_restrictions'] as const

function hasDietaryChanges(patch: Record<string, unknown>): boolean {
  return DIETARY_FIELDS.some((field) => field in patch)
}

function getChangedDietaryFields(patch: Record<string, unknown>): string[] {
  return DIETARY_FIELDS.filter((field) => field in patch)
}

/**
 * Build the ordered list of mutation steps for a client update.
 * Steps are returned in execution order. Critical steps run first.
 */
export function buildMutationSteps(params: ClientMutationParams): MutationStep[] {
  const { tenantId, actorId, clientId, patch, previousState, updatedState, db } = params
  const steps: MutationStep[] = []
  const changedFields = Object.keys(patch)

  // Step 1: Activity log (non-critical)
  steps.push({
    name: 'activity_log',
    critical: false,
    execute: async () => {
      const { logChefActivity } = await import('@/lib/activity/log-chef')
      const fieldDiffs = Object.fromEntries(
        changedFields.map((field) => [
          field,
          {
            before: previousState[field] ?? null,
            after: updatedState[field] ?? null,
          },
        ])
      )
      await logChefActivity({
        tenantId,
        actorId,
        action: 'client_updated',
        domain: 'client',
        entityType: 'client',
        entityId: clientId,
        summary: `Updated client: ${updatedState.full_name} - ${changedFields.join(', ')}`,
        context: {
          client_name: updatedState.full_name,
          changed_fields: changedFields,
          field_diffs: fieldDiffs,
        },
        clientId,
      })
    },
  })

  // Step 2: Webhook dispatch (non-critical)
  steps.push({
    name: 'webhook_dispatch',
    critical: false,
    execute: async () => {
      const { emitWebhook } = await import('@/lib/webhooks/emitter')
      await emitWebhook(tenantId, 'client.updated', {
        client_id: clientId,
        full_name: updatedState.full_name,
        changed_fields: changedFields,
      })
    },
  })

  // Step 3: Dietary change log (non-critical, only if dietary fields changed)
  if (hasDietaryChanges(patch)) {
    steps.push({
      name: 'dietary_change_log',
      critical: false,
      execute: async () => {
        const { logDietaryChangeInternal } = await import(
          '@/lib/clients/dietary-alert-actions'
        )
        const changedDietaryFields = getChangedDietaryFields(patch)
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
            const isRemoval = newArr.length < oldArr.length
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
      },
    })
  }

  // Step 4: Allergy sync (non-critical, only if allergies changed)
  if ('allergies' in patch) {
    steps.push({
      name: 'allergy_sync',
      critical: false,
      execute: async () => {
        const { syncFlatToStructured } = await import('@/lib/dietary/allergy-sync')
        await syncFlatToStructured({ tenantId, clientId, db })
      },
    })
  }

  // Step 5: Menu recheck (non-critical, only if dietary fields changed)
  if (hasDietaryChanges(patch)) {
    steps.push({
      name: 'menu_recheck',
      critical: false,
      execute: async () => {
        const { recheckUpcomingMenusForClient } = await import(
          '@/lib/dietary/menu-recheck'
        )
        await recheckUpcomingMenusForClient({ tenantId, clientId, db })
      },
    })
  }

  // Step 6: Event dietary propagation (non-critical, only if dietary fields changed)
  if (hasDietaryChanges(patch)) {
    steps.push({
      name: 'event_dietary_propagation',
      critical: false,
      execute: async () => {
        const { propagateDietaryToEvents } = await import(
          '@/lib/dietary/propagate'
        )
        await propagateDietaryToEvents({
          tenantId,
          clientId,
          patch,
          db,
        })
      },
    })
  }

  return steps
}

/**
 * Execute the client mutation pipeline.
 * Critical steps abort on failure. Non-critical steps log warnings and continue.
 */
export async function executeClientMutation(
  params: ClientMutationParams
): Promise<MutationResult> {
  const steps = buildMutationSteps(params)
  const results: StepResult[] = []

  for (const step of steps) {
    try {
      await step.execute()
      results.push({ name: step.name, success: true })
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err)
      results.push({ name: step.name, success: false, error: errorMsg })

      if (step.critical) {
        console.error(`[mutation-pipeline] CRITICAL step "${step.name}" failed:`, err)
        return { success: false, stepsExecuted: results }
      }

      console.warn(`[mutation-pipeline] Non-critical step "${step.name}" failed:`, errorMsg)
    }
  }

  return { success: true, stepsExecuted: results }
}
