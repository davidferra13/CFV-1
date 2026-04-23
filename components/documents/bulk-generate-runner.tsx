'use client'

import { useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { overrideReadinessForTransition, type ReadinessResult } from '@/lib/events/readiness'
import type { OperationalDocumentType } from '@/lib/documents/document-definitions'

const DOC_LABELS: Record<OperationalDocumentType, string> = {
  summary: 'Event Summary',
  grocery: 'Grocery List',
  foh: 'Front-of-House Menu',
  prep: 'Prep Sheet',
  execution: 'Execution Sheet',
  checklist: 'Non-Negotiables Checklist',
  packing: 'Packing List',
  reset: 'Post-Service Reset Checklist',
  travel: 'Travel Route',
  shots: 'Content Asset Capture Sheet',
}

type BulkRunResultRow = {
  type: OperationalDocumentType
  status: 'succeeded' | 'failed'
  httpStatus: number
  generationJobId: string | null
  reusedJob: boolean
  snapshotId: string | null
  error: string | null
}

type BulkRunResponse = {
  success: boolean
  runId: string
  startedAt: string
  completedAt: string
  total: number
  succeeded: number
  failed: number
  results: BulkRunResultRow[]
}

type BulkGenerateRunnerProps = {
  eventId: string
  readiness: ReadinessResult | null
  recommendedTypes: OperationalDocumentType[]
  readyRecommendedTypes: OperationalDocumentType[]
  missingArchiveTypes: OperationalDocumentType[]
  initialLatestFailedTypes?: OperationalDocumentType[]
  historicalRetryRuns?: Array<{
    runId: string
    failedTypes: OperationalDocumentType[]
    label: string
  }>
}

function dedupeTypes(types: OperationalDocumentType[]): OperationalDocumentType[] {
  return Array.from(new Set(types))
}

function appendReturnTo(route: string, returnTo: string) {
  const separator = route.includes('?') ? '&' : '?'
  return `${route}${separator}returnTo=${encodeURIComponent(returnTo)}`
}

export function BulkGenerateRunner({
  eventId,
  readiness,
  recommendedTypes,
  readyRecommendedTypes,
  missingArchiveTypes,
  initialLatestFailedTypes = [],
  historicalRetryRuns = [],
}: BulkGenerateRunnerProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isRunning, setIsRunning] = useState(false)
  const [lastRun, setLastRun] = useState<BulkRunResponse | null>(null)
  const [retryTypes, setRetryTypes] = useState<OperationalDocumentType[]>(
    dedupeTypes(initialLatestFailedTypes)
  )
  const [pendingTypes, setPendingTypes] = useState<OperationalDocumentType[] | null>(null)

  const defaultTypes = useMemo(() => {
    if (missingArchiveTypes.length > 0) return dedupeTypes(missingArchiveTypes)
    if (readyRecommendedTypes.length > 0) return dedupeTypes(readyRecommendedTypes)
    return dedupeTypes(recommendedTypes)
  }, [missingArchiveTypes, readyRecommendedTypes, recommendedTypes])
  const primaryLabel =
    missingArchiveTypes.length > 0 ? 'Generate Missing PDFs' : 'Generate Ready PDFs'
  const returnTo = (() => {
    const query = searchParams.toString()
    return `${pathname}${query ? `?${query}` : ''}`
  })()

  async function runBulk(types: OperationalDocumentType[], readinessOverride = false) {
    const normalizedTypes = dedupeTypes(types)
    if (normalizedTypes.length === 0) {
      toast.error('No document types selected for this run.')
      return
    }

    setIsRunning(true)
    try {
      const response = await fetch(`/api/documents/${eventId}/bulk-generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          types: normalizedTypes,
          runId: crypto.randomUUID(),
          readinessOverride,
        }),
      })

      const payload = (await response.json()) as unknown
      if (!response.ok) {
        const payloadError =
          payload &&
          typeof payload === 'object' &&
          'error' in payload &&
          typeof (payload as { error?: unknown }).error === 'string'
            ? (payload as { error?: string }).error
            : null
        const errorMessage =
          payloadError && payloadError.trim() ? payloadError : 'Bulk generation failed'
        throw new Error(errorMessage)
      }

      const run = payload as BulkRunResponse
      setLastRun(run)
      const failedTypes = run.results
        .filter((row) => row.status === 'failed')
        .map((row) => row.type)
      setRetryTypes(dedupeTypes(failedTypes))

      if (run.failed > 0) {
        toast.error(`Saved ${run.succeeded}/${run.total}. ${run.failed} need retry.`)
      } else {
        toast.success(`Saved ${run.succeeded} document${run.succeeded === 1 ? '' : 's'}.`)
      }
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Bulk generation failed')
    } finally {
      setIsRunning(false)
    }
  }

  async function confirmRunWithReadiness() {
    if (!pendingTypes) return

    const nextTypes = pendingTypes
    setPendingTypes(null)
    try {
      const hasBlockers = Boolean(readiness && readiness.counts.blockers > 0)
      if (hasBlockers) {
        await overrideReadinessForTransition(eventId, 'documents')
      }
      await runBulk(nextTypes, hasBlockers)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to override readiness blockers')
    }
  }

  function requestRun(types: OperationalDocumentType[]) {
    if (
      readiness &&
      (readiness.counts.blockers > 0 || readiness.counts.risks > 0 || readiness.counts.stale > 0)
    ) {
      setPendingTypes(types)
      return
    }

    void runBulk(types)
  }

  return (
    <div className="space-y-3 rounded border border-stone-800 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="primary"
          size="sm"
          loading={isRunning}
          onClick={() => requestRun(defaultTypes)}
          disabled={defaultTypes.length === 0}
        >
          {primaryLabel} ({defaultTypes.length})
        </Button>
        {retryTypes.length > 0 && (
          <Button
            variant="secondary"
            size="sm"
            loading={isRunning}
            onClick={() => requestRun(retryTypes)}
            disabled={retryTypes.length === 0}
          >
            Retry Failed ({retryTypes.length})
          </Button>
        )}
      </div>
      <p className="text-xs-tight text-stone-500">
        {defaultTypes.length > 0
          ? `${defaultTypes.length} document${defaultTypes.length === 1 ? '' : 's'} queued in the main run.`
          : 'No documents ready to generate yet.'}
      </p>

      {lastRun && (
        <div className="space-y-2">
          <p className="text-xs text-stone-400">
            Last run: {lastRun.succeeded} of {lastRun.total} completed
            {lastRun.failed > 0 ? `, ${lastRun.failed} need retry` : ''}
          </p>
          <div className="space-y-1">
            {lastRun.results.map((row) => (
              <div
                key={`${lastRun.runId}-${row.type}`}
                className="flex items-center justify-between rounded border border-stone-800 px-2 py-1"
              >
                <p className="text-xs text-stone-200">{DOC_LABELS[row.type]}</p>
                <div className="flex items-center gap-2">
                  <p
                    className={`text-xs ${row.status === 'succeeded' ? 'text-emerald-400' : 'text-rose-400'}`}
                  >
                    {row.status === 'succeeded' ? 'Saved' : (row.error ?? 'Needs retry')}
                  </p>
                  {row.snapshotId && (
                    <a
                      href={`/api/documents/snapshots/${row.snapshotId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs-tight text-stone-400 hover:text-stone-200 hover:underline"
                    >
                      Open
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <details className="rounded border border-stone-800 px-3 py-2">
        <summary className="cursor-pointer text-xs-tight text-stone-400">More options</summary>
        <div className="mt-2 space-y-2">
          <div className="flex flex-wrap gap-2">
            <Button
              variant="ghost"
              size="sm"
              loading={isRunning}
              onClick={() =>
                requestRun(
                  readyRecommendedTypes.length > 0 ? readyRecommendedTypes : recommendedTypes
                )
              }
              disabled={recommendedTypes.length === 0}
            >
              Generate Full Recommended Set ({recommendedTypes.length})
            </Button>
          </div>

          {historicalRetryRuns.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs-tight text-stone-500">Retry failed items from earlier runs:</p>
              <div className="flex flex-wrap gap-2">
                {historicalRetryRuns.map((run) => (
                  <Button
                    key={run.runId}
                    variant="ghost"
                    size="sm"
                    loading={isRunning}
                    disabled={run.failedTypes.length === 0}
                    onClick={() => requestRun(run.failedTypes)}
                  >
                    Retry {run.label} ({run.failedTypes.length})
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
      </details>

      <ConfirmModal
        open={Boolean(pendingTypes && readiness)}
        title={
          readiness?.counts.blockers
            ? 'Document generation needs an explicit override'
            : 'Generate documents with current readiness signal?'
        }
        description={
          readiness
            ? `Confidence ${readiness.confidence}%. ${readiness.counts.blockers} blockers, ${readiness.counts.risks} risks, ${readiness.counts.stale} stale.`
            : undefined
        }
        confirmLabel={readiness?.counts.blockers ? 'Override and Generate' : 'Generate Anyway'}
        cancelLabel="Go Back"
        loading={isRunning}
        onCancel={() => setPendingTypes(null)}
        onConfirm={() => {
          void confirmRunWithReadiness()
        }}
        maxWidth="max-w-xl"
      >
        {readiness ? (
          <div className="space-y-2">
            {readiness.gates
              .filter((gate) => gate.status !== 'verified')
              .map((gate) => (
                <div
                  key={gate.gate}
                  className="rounded border border-stone-800 bg-stone-950/60 px-3 py-2"
                >
                  <p className="text-sm font-medium text-stone-100">{gate.label}</p>
                  <p className="mt-1 text-sm text-stone-400">{gate.details || gate.description}</p>
                  <div className="mt-2">
                    <Button
                      href={appendReturnTo(gate.verifyRoute, returnTo)}
                      variant="ghost"
                      size="sm"
                    >
                      {gate.ctaLabel}
                    </Button>
                  </div>
                </div>
              ))}
          </div>
        ) : null}
      </ConfirmModal>
    </div>
  )
}
