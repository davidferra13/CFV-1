'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import { createOfflineAction } from '@/lib/offline/offline-action'
import { getPendingCount } from '@/lib/offline/idb-queue'
import { withRetry, isTransientError } from '@/lib/resilience/retry'
import type { SaveState } from '@/lib/save-state/model'
import { toAppError } from '@/lib/errors/app-error'
import { mapErrorToUI } from '@/lib/errors/map-error-to-ui'
import {
  OFFLINE_QUEUED_STATE,
  SAVED_STATE,
  SAVE_FAILED_STATE,
  SAVING_STATE,
  UNSAVED_STATE,
} from './use-idempotent-mutation.states'
import { trackQolMetric } from '@/lib/qol/metrics-client'

type MutationOptions<
  TInput extends Record<string, unknown> & { idempotency_key?: string },
  TResult,
> = {
  mutation: (input: TInput) => Promise<TResult>
  optimisticResult?: TResult
  maxAttempts?: number
}

type MutationResult<TResult> = {
  result: TResult
  idempotencyKey: string
  queued: boolean
}

function ensureIdempotencyKey<
  TInput extends Record<string, unknown> & { idempotency_key?: string },
>(input: TInput): TInput {
  if (input.idempotency_key) return input
  return { ...input, idempotency_key: crypto.randomUUID() } as TInput
}

export function useIdempotentMutation<
  TInput extends Record<string, unknown> & { idempotency_key?: string },
  TResult,
>(actionName: string, options: MutationOptions<TInput, TResult>) {
  const { mutation, optimisticResult, maxAttempts = 3 } = options
  const [saveState, setSaveState] = useState<SaveState>(UNSAVED_STATE)
  const lastInputRef = useRef<TInput | null>(null)

  const offlineSafeMutation = useMemo(
    () =>
      createOfflineAction<TResult>({
        name: actionName,
        action: async (input: unknown) =>
          withRetry(() => mutation(input as TInput), {
            maxAttempts,
            retryOn: isTransientError,
          }),
        optimisticResult,
      }),
    [actionName, maxAttempts, mutation, optimisticResult]
  )

  const mutate = useCallback(
    async (input: TInput): Promise<MutationResult<TResult>> => {
      const payload = ensureIdempotencyKey(input)
      lastInputRef.current = payload
      setSaveState(SAVING_STATE)

      try {
        const result = await offlineSafeMutation(payload)
        const queued = Boolean((result as any)?._offlineQueued)
        if (queued) {
          const queuedCount = await getPendingCount().catch(() => 1)
          setSaveState(OFFLINE_QUEUED_STATE(queuedCount || 1))
        } else {
          setSaveState(SAVED_STATE())
        }

        return {
          result: result as TResult,
          queued,
          idempotencyKey: String(payload.idempotency_key),
        }
      } catch (error) {
        const appError = toAppError(error)
        const uiError = mapErrorToUI(appError)
        setSaveState(SAVE_FAILED_STATE(uiError.message, uiError.traceId))
        trackQolMetric({
          metricKey: 'save_failed',
          entityType: actionName,
          metadata: {
            code: appError.code,
            category: appError.category,
            retryable: appError.retryable,
          },
        })
        if (appError.category === 'conflict') {
          trackQolMetric({
            metricKey: 'conflict_detected',
            entityType: actionName,
            metadata: { code: appError.code },
          })
        }
        throw appError
      }
    },
    [actionName, offlineSafeMutation]
  )

  const retryLast = useCallback(async () => {
    if (!lastInputRef.current) return null
    return mutate(lastInputRef.current)
  }, [mutate])

  const markUnsaved = useCallback(() => {
    setSaveState(UNSAVED_STATE)
  }, [])

  return {
    mutate,
    retryLast,
    markUnsaved,
    saveState,
    setSaveState,
  }
}
