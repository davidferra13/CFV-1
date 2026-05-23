import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import {
  approveRemyCommunicationDraft,
  denyRemyCommunicationDraft,
  getRemyCommunicationApprovalWorkbench,
  requestRemyCommunicationRevision,
  type RemyCommunicationApprovalRow,
} from '@/lib/communication/control-plane'

export const metadata: Metadata = { title: 'Remy Communication Approvals' }

function statusClass(status: string) {
  switch (status) {
    case 'pending':
      return 'border-amber-700/50 bg-amber-950/30 text-amber-200'
    case 'approved':
    case 'sent':
      return 'border-emerald-700/50 bg-emerald-950/30 text-emerald-200'
    case 'blocked':
    case 'failed':
    case 'rejected':
    case 'cancelled':
      return 'border-red-700/50 bg-red-950/30 text-red-200'
    default:
      return 'border-stone-700 bg-stone-800 text-stone-200'
  }
}

function sourceHref(source: RemyCommunicationApprovalRow['draft']['sourceEvidence'][number]) {
  if (source.href) return source.href
  switch (source.type) {
    case 'event':
      return `/events/${source.id}`
    case 'client':
      return `/clients/${source.id}`
    case 'call':
    case 'vendor':
      return '/communication/vendor-actions'
    case 'task':
      return '/tasks'
    default:
      return '/inbox'
  }
}

function ApprovalCard({ approval }: { approval: RemyCommunicationApprovalRow }) {
  const draft = approval.draft

  return (
    <article className="rounded-lg border border-stone-700/70 bg-stone-800/40 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide ${statusClass(
                approval.status
              )}`}
            >
              {approval.status}
            </span>
            <span className="rounded-full border border-stone-700 px-2 py-0.5 text-[11px] uppercase tracking-wide text-stone-400">
              {draft.channel}
            </span>
            <span className="text-xs text-stone-500">
              {Math.round(approval.confidenceScore * 100)}%
            </span>
          </div>
          <h2 className="mt-2 text-base font-semibold text-stone-100">{approval.title}</h2>
          <p className="mt-1 text-xs leading-5 text-stone-400">{approval.reason}</p>
        </div>
        <Link
          href="/communication"
          className="rounded border border-stone-700 px-3 py-2 text-center text-xs text-stone-300 hover:border-stone-500"
        >
          Control plane
        </Link>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_360px]">
        <form action={approveRemyCommunicationDraft} className="grid gap-3">
          <input type="hidden" name="approvalId" value={approval.id} />
          <label className="grid gap-1 text-xs text-stone-400">
            Subject
            <input
              name="subject"
              defaultValue={draft.subject ?? ''}
              className="min-h-10 rounded border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-100"
            />
          </label>
          <label className="grid gap-1 text-xs text-stone-400">
            Draft
            <textarea
              name="body"
              defaultValue={draft.body}
              rows={8}
              className="min-h-[180px] resize-y rounded border border-stone-700 bg-stone-950 px-3 py-2 text-sm leading-6 text-stone-100"
            />
          </label>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <button
              type="submit"
              className="min-h-11 rounded border border-emerald-700/70 px-3 py-2 text-sm text-emerald-200 hover:border-emerald-500"
            >
              Approve and schedule
            </button>
          </div>
        </form>

        <div className="space-y-3">
          <div className="rounded border border-stone-700/60 bg-stone-900/45 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-stone-500">Guardrails</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {draft.approvalClasses.length === 0 ? (
                <span className="rounded-full border border-stone-700 px-2 py-0.5 text-xs text-stone-400">
                  manual review
                </span>
              ) : (
                draft.approvalClasses.map((approvalClass) => (
                  <span
                    key={approvalClass}
                    className="rounded-full border border-red-800/70 px-2 py-0.5 text-xs text-red-200"
                  >
                    {approvalClass.replaceAll('_', ' ')}
                  </span>
                ))
              )}
            </div>
            <p className="mt-3 text-xs leading-5 text-stone-400">{draft.policyReason}</p>
            <p className="mt-2 text-xs leading-5 text-stone-500">
              Next action: {draft.proposedNextAction}
            </p>
          </div>

          <div className="rounded border border-stone-700/60 bg-stone-900/45 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-stone-500">
              Source Evidence
            </p>
            <div className="mt-2 space-y-2">
              {draft.sourceEvidence.length === 0 ? (
                <p className="text-xs text-stone-500">No source evidence attached.</p>
              ) : (
                draft.sourceEvidence.map((source) => (
                  <Link
                    key={`${source.type}-${source.id}`}
                    href={sourceHref(source)}
                    className="block rounded border border-stone-700 px-2.5 py-2 text-xs text-stone-300 hover:border-stone-500"
                  >
                    {source.label}
                  </Link>
                ))
              )}
            </div>
          </div>

          <form action={requestRemyCommunicationRevision} className="grid gap-2">
            <input type="hidden" name="approvalId" value={approval.id} />
            <textarea
              name="revisionRequest"
              placeholder="Tell Remy what to revise"
              rows={3}
              className="resize-y rounded border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-100 placeholder:text-stone-500"
            />
            <button
              type="submit"
              className="min-h-11 rounded border border-sky-700/70 px-3 py-2 text-sm text-sky-200 hover:border-sky-500"
            >
              Ask Remy to revise
            </button>
          </form>

          <form action={denyRemyCommunicationDraft} className="grid gap-2">
            <input type="hidden" name="approvalId" value={approval.id} />
            <input
              name="reason"
              placeholder="Denial reason"
              className="min-h-10 rounded border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-100 placeholder:text-stone-500"
            />
            <button
              type="submit"
              className="min-h-11 rounded border border-red-800/70 px-3 py-2 text-sm text-red-200 hover:border-red-600"
            >
              Deny draft
            </button>
          </form>
        </div>
      </div>
    </article>
  )
}

export default async function RemyCommunicationApprovalsPage() {
  await requireChef()
  const workbench = await getRemyCommunicationApprovalWorkbench()

  return (
    <div className="min-h-screen bg-stone-900 px-4 py-8 text-stone-100 sm:px-6">
      <div className="mx-auto max-w-6xl space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Link href="/communication" className="text-sm text-amber-300 hover:text-amber-200">
              Back to communication
            </Link>
            <h1 className="mt-3 text-2xl font-semibold">Remy Communication Approvals</h1>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-stone-400">
              Remy can draft, rank, summarize, and recommend. Sensitive or uncertain external
              communication stays here until a chef reviews it.
            </p>
          </div>
          <div className="rounded-lg border border-stone-700 bg-stone-800/50 px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-stone-500">Pending</p>
            <p className="mt-1 text-2xl font-semibold text-stone-100">{workbench.pending.length}</p>
          </div>
        </div>

        <section className="space-y-3">
          {workbench.pending.length === 0 ? (
            <div className="rounded-lg border border-dashed border-stone-700 bg-stone-800/30 p-6 text-sm text-stone-500">
              No Remy communication drafts are waiting for chef approval.
            </div>
          ) : (
            workbench.pending.map((approval) => (
              <ApprovalCard key={approval.id} approval={approval} />
            ))
          )}
        </section>

        <section>
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-stone-400">
            Approval Audit
          </h2>
          {workbench.audit.length === 0 ? (
            <div className="rounded-lg border border-dashed border-stone-700 bg-stone-800/30 p-6 text-sm text-stone-500">
              No Remy approval audit rows are visible.
            </div>
          ) : (
            <div className="space-y-2">
              {workbench.audit.slice(0, 12).map((approval) => (
                <div
                  key={`audit-${approval.id}`}
                  className="rounded-lg border border-stone-700/60 bg-stone-800/35 p-3"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[11px] uppercase tracking-wide ${statusClass(
                            approval.status
                          )}`}
                        >
                          {approval.status}
                        </span>
                        {approval.draft.revisedAt && (
                          <span className="rounded-full border border-sky-800/70 px-2 py-0.5 text-[11px] text-sky-200">
                            revised
                          </span>
                        )}
                      </div>
                      <p className="mt-2 truncate text-sm text-stone-100">{approval.title}</p>
                      <p className="mt-1 line-clamp-2 text-xs text-stone-500">
                        {approval.rejectionReason ?? approval.reason}
                      </p>
                    </div>
                    <span className="text-xs text-stone-500">
                      {approval.reviewedAt
                        ? new Date(approval.reviewedAt).toLocaleString()
                        : new Date(approval.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
