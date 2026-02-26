'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { trackQolMetric } from '@/lib/qol/metrics-client'

const DRAFT_DB_NAME = 'chefflow-drafts'
const DRAFT_DB_VERSION = 1
const DRAFT_STORE = 'drafts'

export type DurableDraftSource = 'LOCAL_DRAFT'

export type DurableDraftRecord<T> = {
  draftKey: string
  schemaVersion: number
  surfaceId: string
  recordId: string
  tenantId: string
  data: T
  lastSavedAt: string
  source: DurableDraftSource
}

type DurableDraftSchema<T> = {
  schemaVersion: number
  tenantId: string
  defaultData: T
  debounceMs?: number
}

type PersistOptions = {
  immediate?: boolean
}

function openDraftDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DRAFT_DB_NAME, DRAFT_DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(DRAFT_STORE)) {
        db.createObjectStore(DRAFT_STORE, { keyPath: 'draftKey' })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function getDraftRecord<T>(draftKey: string): Promise<DurableDraftRecord<T> | null> {
  if (typeof window === 'undefined' || typeof indexedDB === 'undefined') return null
  const db = await openDraftDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DRAFT_STORE, 'readonly')
    const req = tx.objectStore(DRAFT_STORE).get(draftKey)
    req.onsuccess = () => {
      db.close()
      resolve((req.result as DurableDraftRecord<T> | undefined) ?? null)
    }
    req.onerror = () => {
      db.close()
      reject(req.error)
    }
  })
}

async function putDraftRecord<T>(record: DurableDraftRecord<T>): Promise<void> {
  if (typeof window === 'undefined' || typeof indexedDB === 'undefined') return
  const db = await openDraftDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DRAFT_STORE, 'readwrite')
    tx.objectStore(DRAFT_STORE).put(record)
    tx.oncomplete = () => {
      db.close()
      resolve()
    }
    tx.onerror = () => {
      db.close()
      reject(tx.error)
    }
  })
}

async function deleteDraftRecord(draftKey: string): Promise<void> {
  if (typeof window === 'undefined' || typeof indexedDB === 'undefined') return
  const db = await openDraftDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DRAFT_STORE, 'readwrite')
    tx.objectStore(DRAFT_STORE).delete(draftKey)
    tx.oncomplete = () => {
      db.close()
      resolve()
    }
    tx.onerror = () => {
      db.close()
      reject(tx.error)
    }
  })
}

function deepEqual(a: unknown, b: unknown): boolean {
  try {
    return JSON.stringify(a) === JSON.stringify(b)
  } catch {
    return false
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function useDurableDraft<T extends Record<string, unknown>>(
  surfaceId: string,
  recordId: string | null | undefined,
  schema: DurableDraftSchema<T>
) {
  const resolvedRecordId = recordId || 'new'
  const debounceMs = schema.debounceMs ?? 700
  const draftKey = `${schema.tenantId}:${surfaceId}:${resolvedRecordId}`
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const currentDataRef = useRef<T>(schema.defaultData)
  const isMountedRef = useRef(false)

  const [draft, setDraft] = useState<DurableDraftRecord<T> | null>(null)
  const [pendingDraft, setPendingDraft] = useState<DurableDraftRecord<T> | null>(null)
  const [hasDraft, setHasDraft] = useState(false)
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null)

  const writeDraft = useCallback(
    async (data: T) => {
      const now = new Date().toISOString()
      const nextRecord: DurableDraftRecord<T> = {
        draftKey,
        schemaVersion: schema.schemaVersion,
        surfaceId,
        recordId: resolvedRecordId,
        tenantId: schema.tenantId,
        data,
        lastSavedAt: now,
        source: 'LOCAL_DRAFT',
      }

      await putDraftRecord(nextRecord)
      currentDataRef.current = data
      setDraft(nextRecord)
      setHasDraft(true)
      setLastSavedAt(now)
    },
    [draftKey, resolvedRecordId, schema.schemaVersion, schema.tenantId, surfaceId]
  )

  const persistDraft = useCallback(
    async (partialOrFullFormData: Partial<T> | T, options?: PersistOptions) => {
      const nextData = isPlainObject(partialOrFullFormData)
        ? ({ ...currentDataRef.current, ...partialOrFullFormData } as T)
        : (partialOrFullFormData as T)

      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }

      if (options?.immediate) {
        await writeDraft(nextData)
        return
      }

      await new Promise<void>((resolve) => {
        timerRef.current = setTimeout(() => {
          void writeDraft(nextData).finally(resolve)
        }, debounceMs)
      })
    },
    [debounceMs, writeDraft]
  )

  const clearDraft = useCallback(async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    await deleteDraftRecord(draftKey)
    setDraft(null)
    setPendingDraft(null)
    setHasDraft(false)
    setLastSavedAt(null)
  }, [draftKey])

  const discardDraft = useCallback(async () => {
    await clearDraft()
    currentDataRef.current = schema.defaultData
  }, [clearDraft, schema.defaultData])

  const restoreDraft = useCallback(() => {
    const source = pendingDraft ?? draft
    if (!source) return null
    setPendingDraft(null)
    currentDataRef.current = source.data
    trackQolMetric({
      metricKey: 'draft_restored',
      entityType: surfaceId,
      entityId: resolvedRecordId,
      metadata: {
        draftKey,
        draftAgeMs: Math.max(0, Date.now() - new Date(source.lastSavedAt).getTime()),
      },
    })
    return source.data
  }, [draft, draftKey, pendingDraft, resolvedRecordId, surfaceId])

  useEffect(() => {
    isMountedRef.current = true
    void (async () => {
      try {
        const existing = await getDraftRecord<T>(draftKey)
        if (!isMountedRef.current || !existing) return

        setDraft(existing)
        setHasDraft(true)
        setLastSavedAt(existing.lastSavedAt)
        currentDataRef.current = existing.data

        const shouldPromptRestore =
          existing.schemaVersion === schema.schemaVersion &&
          !deepEqual(existing.data, schema.defaultData)

        if (shouldPromptRestore) {
          setPendingDraft(existing)
        }
      } catch {
        // No-op: if draft storage is unavailable, form continues normally.
      }
    })()

    return () => {
      isMountedRef.current = false
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }
  }, [draftKey, schema.defaultData, schema.schemaVersion])

  return useMemo(
    () => ({
      draft,
      hasDraft,
      pendingDraft,
      showRestorePrompt: !!pendingDraft,
      restoreDraft,
      discardDraft,
      persistDraft,
      clearDraft,
      lastSavedAt,
    }),
    [
      clearDraft,
      discardDraft,
      draft,
      hasDraft,
      lastSavedAt,
      pendingDraft,
      persistDraft,
      restoreDraft,
    ]
  )
}
