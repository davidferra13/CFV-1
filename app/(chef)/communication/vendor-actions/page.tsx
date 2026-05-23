import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import {
  approveVendorExtractedAction,
  dismissVendorExtractedAction,
  extractVendorActionsForCall,
  getVendorActionExtractionWorkbench,
  mergeDuplicateVendorExtractedAction,
} from '@/lib/calling/vendor-action-extraction-actions'

export const metadata: Metadata = { title: 'Vendor Call Actions' }

function statusClass(status: string) {
  switch (status) {
    case 'pending':
      return 'border-amber-700/50 bg-amber-950/30 text-amber-200'
    case 'in_progress':
      return 'border-sky-700/50 bg-sky-950/30 text-sky-200'
    case 'high':
    case 'urgent':
      return 'border-red-700/50 bg-red-950/30 text-red-200'
    default:
      return 'border-stone-700 bg-stone-800 text-stone-200'
  }
}

function extractProof(notes: string | null | undefined) {
  if (!notes) return null
  const match = notes.match(/Transcript evidence:\s*(.+)/)
  return match?.[1] ?? null
}

export default async function VendorCallActionsPage() {
  await requireChef()
  const { sources, pendingApprovals, generatedTasks } = await getVendorActionExtractionWorkbench()

  return (
    <div className="min-h-screen bg-stone-900 px-4 py-8 text-stone-100 sm:px-6">
      <div className="mx-auto max-w-6xl space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Link href="/communication" className="text-sm text-amber-300 hover:text-amber-200">
              Back to communication
            </Link>
            <h1 className="mt-3 text-2xl font-semibold">Vendor Call Actions</h1>
            <p className="mt-1 max-w-2xl text-sm text-stone-400">
              Structured post-call work with transcript, recording, and source-call proof.
            </p>
          </div>
          <Link
            href="/tasks"
            className="rounded border border-stone-700 px-3 py-2 text-sm text-stone-200 hover:border-stone-500"
          >
            Task board
          </Link>
        </div>

        <section>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-sm font-medium uppercase tracking-wide text-stone-400">
              Recent Vendor Calls
            </h2>
            <span className="text-xs text-stone-500">{sources.length} sources</span>
          </div>
          {sources.length === 0 ? (
            <div className="rounded-lg border border-dashed border-stone-700 bg-stone-800/30 p-6 text-sm text-stone-500">
              No completed vendor call sources are visible.
            </div>
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {sources.map((source) => (
                <div
                  key={`${source.sourceType}-${source.id}`}
                  className="rounded-lg border border-stone-700/70 bg-stone-800/35 p-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-stone-700 px-2 py-0.5 text-[11px] uppercase tracking-wide text-stone-400">
                          {source.sourceType.replace('_', ' ')}
                        </span>
                        {source.hasRecording && (
                          <span className="rounded-full border border-emerald-800 px-2 py-0.5 text-[11px] text-emerald-300">
                            recording
                          </span>
                        )}
                      </div>
                      <p className="mt-2 text-sm font-medium text-stone-100">{source.label}</p>
                      <p className="mt-1 text-xs text-stone-500">{source.detail}</p>
                    </div>
                    <form action={extractVendorActionsForCall} className="shrink-0">
                      <input type="hidden" name="sourceType" value={source.sourceType} />
                      <input type="hidden" name="callId" value={source.id} />
                      <button
                        type="submit"
                        className="rounded border border-amber-700/60 px-3 py-1.5 text-xs text-amber-200 hover:border-amber-500"
                      >
                        Extract actions
                      </button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-sm font-medium uppercase tracking-wide text-stone-400">
              Chef Review
            </h2>
            <span className="text-xs text-stone-500">{pendingApprovals.length} pending</span>
          </div>
          {pendingApprovals.length === 0 ? (
            <div className="rounded-lg border border-dashed border-stone-700 bg-stone-800/30 p-6 text-sm text-stone-500">
              No low-confidence or conflicting vendor call actions are pending.
            </div>
          ) : (
            <div className="space-y-3">
              {pendingApprovals.map((approval: any) => {
                const extracted = approval.draft?.payload?.extractedAction
                const taskTitle = approval.draft?.payload?.taskTitle ?? approval.title
                const taskDescription =
                  approval.draft?.payload?.taskDescription ?? approval.preview ?? ''
                return (
                  <div
                    key={approval.id}
                    className="rounded-lg border border-stone-700/70 bg-stone-800/35 p-4"
                  >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full border px-2 py-0.5 text-[11px] uppercase tracking-wide ${statusClass(
                              approval.risk_level
                            )}`}
                          >
                            {approval.risk_level}
                          </span>
                          <span className="text-xs text-stone-500">
                            {Math.round(Number(approval.confidence_score ?? 0) * 100)}%
                          </span>
                        </div>
                        <p className="mt-2 text-sm font-medium text-stone-100">{approval.title}</p>
                        <p className="mt-1 text-xs leading-5 text-stone-400">{approval.reason}</p>
                        {extracted?.evidence?.transcriptSegment && (
                          <p className="mt-3 rounded border border-stone-700/60 bg-stone-900/50 p-3 text-xs leading-5 text-stone-300">
                            {extracted.evidence.transcriptSegment}
                          </p>
                        )}
                      </div>
                      <div className="grid gap-2 lg:w-[360px]">
                        <form action={approveVendorExtractedAction} className="grid gap-2">
                          <input type="hidden" name="approvalId" value={approval.id} />
                          <input
                            name="taskTitle"
                            defaultValue={taskTitle}
                            className="rounded border border-stone-700 bg-stone-950 px-3 py-2 text-xs text-stone-100"
                          />
                          <textarea
                            name="taskDescription"
                            defaultValue={taskDescription}
                            rows={3}
                            className="resize-none rounded border border-stone-700 bg-stone-950 px-3 py-2 text-xs text-stone-100"
                          />
                          <button
                            type="submit"
                            className="rounded border border-emerald-700/60 px-3 py-1.5 text-xs text-emerald-200 hover:border-emerald-500"
                          >
                            Approve task
                          </button>
                        </form>
                        <div className="grid gap-2 sm:grid-cols-2">
                          <form action={dismissVendorExtractedAction}>
                            <input type="hidden" name="approvalId" value={approval.id} />
                            <input type="hidden" name="reason" value="Dismissed by chef." />
                            <button
                              type="submit"
                              className="w-full rounded border border-stone-700 px-3 py-1.5 text-xs text-stone-300 hover:border-stone-500"
                            >
                              Dismiss
                            </button>
                          </form>
                          <form action={mergeDuplicateVendorExtractedAction}>
                            <input type="hidden" name="approvalId" value={approval.id} />
                            <button
                              type="submit"
                              className="w-full rounded border border-sky-700/60 px-3 py-1.5 text-xs text-sky-200 hover:border-sky-500"
                            >
                              Merge duplicate
                            </button>
                          </form>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-sm font-medium uppercase tracking-wide text-stone-400">
              Generated Tasks
            </h2>
            <span className="text-xs text-stone-500">{generatedTasks.length} active</span>
          </div>
          {generatedTasks.length === 0 ? (
            <div className="rounded-lg border border-dashed border-stone-700 bg-stone-800/30 p-6 text-sm text-stone-500">
              No post-call vendor action tasks are active.
            </div>
          ) : (
            <div className="space-y-2">
              {generatedTasks.map((task: any) => (
                <Link
                  key={task.id}
                  href="/tasks"
                  className="block rounded-lg border border-stone-700/70 bg-stone-800/35 p-4 hover:border-stone-500"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[11px] uppercase tracking-wide ${statusClass(
                            task.priority
                          )}`}
                        >
                          {task.priority}
                        </span>
                        <span className="text-xs text-stone-500">{task.status}</span>
                      </div>
                      <p className="mt-2 text-sm font-medium text-stone-100">{task.title}</p>
                      {extractProof(task.notes) && (
                        <p className="mt-2 line-clamp-2 text-xs leading-5 text-stone-400">
                          {extractProof(task.notes)}
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-stone-500">Due {task.due_date ?? 'today'}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
