import Link from 'next/link'
import {
  approveBusinessHistoryFinding,
  dismissBusinessHistoryFinding,
} from '@/lib/business-history-import/actions'
import type { BusinessHistoryFinding } from '@/lib/business-history-import/types'

const destinationHref: Record<string, string> = {
  clients: '/clients',
  events: '/events',
  inquiries: '/inquiries',
  finance: '/finance',
  preferences: '/clients',
  tasks: '/tasks',
  review_only: '/inbox/history-scan',
}

function confidenceClass(confidence: string): string {
  if (confidence === 'high') return 'bg-emerald-950 text-emerald-400'
  if (confidence === 'medium') return 'bg-amber-950 text-amber-400'
  return 'bg-stone-800 text-stone-400'
}

export function BusinessHistoryReviewQueue({ findings }: { findings: BusinessHistoryFinding[] }) {
  const pending = findings.filter((finding) => finding.status === 'pending')
  const reviewed = findings.filter((finding) => finding.status !== 'pending').slice(0, 25)

  return (
    <section id="review" className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-stone-100">Unified review queue</h2>
        <p className="mt-1 text-sm text-stone-500">
          Gmail recovery and organized imports converge here before anything becomes canonical.
        </p>
      </div>

      {pending.length === 0 ? (
        <div className="rounded-lg border border-dashed border-stone-700 bg-stone-900 p-8 text-center">
          <p className="text-sm font-medium text-stone-200">No staged business history records</p>
          <p className="mt-1 text-sm text-stone-500">
            Start Gmail recovery or use organized import to add reviewable records.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {pending.map((finding) => (
            <FindingReviewCard key={finding.id} finding={finding} />
          ))}
        </div>
      )}

      {reviewed.length > 0 && (
        <details className="rounded-lg border border-stone-800 bg-stone-900 p-4">
          <summary className="cursor-pointer text-sm font-medium text-stone-200">
            Reviewed history ({reviewed.length})
          </summary>
          <div className="mt-3 space-y-2">
            {reviewed.map((finding) => (
              <div key={finding.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="min-w-0 truncate text-stone-400">{finding.summary}</span>
                <span className="shrink-0 capitalize text-stone-500">{finding.status}</span>
              </div>
            ))}
          </div>
        </details>
      )}
    </section>
  )
}

function FindingReviewCard({ finding }: { finding: BusinessHistoryFinding }) {
  const approveLabel =
    finding.category === 'inquiry' || finding.category === 'existing_thread'
      ? 'Approve as inquiry'
      : 'Mark reviewed'

  return (
    <div className="rounded-lg border border-stone-800 bg-stone-900 p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-stone-800 px-2 py-0.5 text-xs capitalize text-stone-300">
              {finding.category.replace(/_/g, ' ')}
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-xs ${confidenceClass(finding.confidence)}`}
            >
              {finding.confidence}
            </span>
            <span className="text-xs text-stone-500">{finding.sourceLabel}</span>
          </div>
          <h3 className="mt-2 text-base font-medium text-stone-100">{finding.summary}</h3>
          {finding.detail && (
            <p className="mt-1 line-clamp-3 text-sm leading-6 text-stone-400">{finding.detail}</p>
          )}
          <div className="mt-2 flex flex-wrap gap-3 text-xs text-stone-500">
            {finding.fromAddress && <span>{finding.fromAddress}</span>}
            {finding.receivedAt && <span>{new Date(finding.receivedAt).toLocaleDateString()}</span>}
            <Link
              href={destinationHref[finding.proposedDestination] ?? '/import'}
              className="text-brand-400 hover:text-brand-300"
            >
              Proposed destination: {finding.proposedDestination.replace(/_/g, ' ')}
            </Link>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          {finding.sourceUrl && (
            <a
              href={finding.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md border border-stone-700 px-3 py-1.5 text-xs font-medium text-stone-300 hover:bg-stone-800"
            >
              Source
            </a>
          )}
          <form action={approveBusinessHistoryFinding}>
            <input type="hidden" name="findingId" value={finding.id} />
            <button className="rounded-md bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-500">
              {approveLabel}
            </button>
          </form>
          <form action={dismissBusinessHistoryFinding}>
            <input type="hidden" name="findingId" value={finding.id} />
            <button className="rounded-md border border-stone-700 px-3 py-1.5 text-xs font-medium text-stone-300 hover:bg-stone-800">
              Dismiss
            </button>
          </form>
        </div>
      </div>

      {finding.duplicateHints.length > 0 && (
        <div className="mt-3 rounded-md border border-stone-800 bg-stone-950 p-3">
          <p className="text-xs font-medium text-stone-300">Merge and dedupe hints</p>
          <ul className="mt-2 space-y-1">
            {finding.duplicateHints.map((hint) => (
              <li key={`${hint.entityType}-${hint.entityId}`} className="text-xs text-stone-500">
                {hint.label}: {hint.reason} ({hint.strength})
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
