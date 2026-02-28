'use client'

// Historical Findings List
// Three-tab view: Pending | Imported | Dismissed.
// Per-finding cards with import and dismiss actions.

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  importHistoricalFinding,
  dismissHistoricalFinding,
  dismissAllFindings,
} from '@/lib/gmail/historical-scan-actions'
import type { HistoricalFinding } from '@/lib/gmail/historical-scan-actions'
import { ConfirmModal } from '@/components/ui/confirm-modal'

type Tab = 'pending' | 'imported' | 'dismissed'

interface HistoricalFindingsListProps {
  pending: HistoricalFinding[]
  imported: HistoricalFinding[]
  dismissed: HistoricalFinding[]
}

export function HistoricalFindingsList({
  pending,
  imported,
  dismissed,
}: HistoricalFindingsListProps) {
  const [activeTab, setActiveTab] = useState<Tab>('pending')
  const router = useRouter()

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: 'pending', label: 'Pending', count: pending.length },
    { key: 'imported', label: 'Imported', count: imported.length },
    { key: 'dismissed', label: 'Dismissed', count: dismissed.length },
  ]

  const findings =
    activeTab === 'pending' ? pending : activeTab === 'imported' ? imported : dismissed

  return (
    <div>
      {/* Tabs */}
      <div className="flex border-b border-stone-700 mb-4">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`
              px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors
              ${
                activeTab === tab.key
                  ? 'border-brand-600 text-brand-400'
                  : 'border-transparent text-stone-500 hover:text-stone-300'
              }
            `}
          >
            {tab.label}
            {tab.count > 0 && (
              <span
                className={`ml-2 rounded-full px-2 py-0.5 text-xs ${
                  activeTab === tab.key
                    ? 'bg-brand-900 text-brand-400'
                    : 'bg-stone-800 text-stone-500'
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Batch dismiss (pending tab only) */}
      {activeTab === 'pending' && pending.length > 0 && (
        <div className="mb-4 flex justify-end">
          <BatchDismissButton onDone={() => router.refresh()} />
        </div>
      )}

      {/* Findings */}
      {findings.length === 0 ? (
        <div className="py-12 text-center text-sm text-stone-400">
          {activeTab === 'pending'
            ? 'No pending findings yet. The scan will surface potential inquiries as it progresses.'
            : activeTab === 'imported'
              ? 'No imported findings yet.'
              : 'No dismissed findings.'}
        </div>
      ) : (
        <div className="space-y-3">
          {findings.map((finding) => (
            <FindingCard
              key={finding.id}
              finding={finding}
              showActions={activeTab === 'pending'}
              onActionDone={() => router.refresh()}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Finding Card ─────────────────────────────────────────────────────────────

function FindingCard({
  finding,
  showActions,
  onActionDone,
}: {
  finding: HistoricalFinding
  showActions: boolean
  onActionDone: () => void
}) {
  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState<{
    type: 'imported' | 'dismissed'
    inquiryId?: string
  } | null>(null)
  const [error, setError] = useState<string | null>(null)

  function handleImport() {
    setError(null)
    startTransition(async () => {
      try {
        const res = await importHistoricalFinding(finding.id)
        setResult({ type: 'imported', inquiryId: res.inquiryId })
        onActionDone()
      } catch (err: any) {
        setError(err.message || 'Failed to import')
      }
    })
  }

  function handleDismiss() {
    setError(null)
    startTransition(async () => {
      try {
        await dismissHistoricalFinding(finding.id)
        setResult({ type: 'dismissed' })
        onActionDone()
      } catch (err: any) {
        setError(err.message || 'Failed to dismiss')
      }
    })
  }

  // Format sender display
  const senderDisplay = finding.fromAddress || 'Unknown sender'

  // Format date
  const dateDisplay = finding.receivedAt
    ? new Date(finding.receivedAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null

  if (result) {
    return (
      <div className="rounded-lg border border-stone-700 bg-stone-800 px-4 py-3 text-sm text-stone-500">
        {result.type === 'imported' ? (
          <>
            Imported as inquiry.{' '}
            {result.inquiryId && (
              <Link
                href={`/inquiries/${result.inquiryId}`}
                className="font-medium text-brand-600 hover:underline"
              >
                View inquiry &rarr;
              </Link>
            )}
          </>
        ) : (
          'Dismissed.'
        )}
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-stone-700 bg-stone-900 p-4">
      {/* Header row */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-stone-100 truncate">{senderDisplay}</span>
            {dateDisplay && <span className="text-xs text-stone-400 shrink-0">{dateDisplay}</span>}
          </div>
          {finding.subject && (
            <p className="text-sm text-stone-400 mt-0.5 truncate">{finding.subject}</p>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <ClassificationBadge classification={finding.classification} />
          <ConfidenceBadge confidence={finding.confidence} />
        </div>
      </div>

      {/* Body preview */}
      {finding.bodyPreview && (
        <p className="text-xs text-stone-500 leading-relaxed line-clamp-3 mb-3">
          {finding.bodyPreview}
        </p>
      )}

      {/* AI reasoning (collapsed) */}
      {finding.aiReasoning && (
        <p className="text-xs text-stone-400 italic mb-3">{finding.aiReasoning}</p>
      )}

      {error && <p className="text-xs text-red-600 mb-2">{error}</p>}

      {/* Actions */}
      {showActions && (
        <div className="flex items-center gap-2">
          <button
            onClick={handleImport}
            disabled={isPending}
            className="px-3 py-1.5 text-xs font-medium rounded-md bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50 transition-colors"
          >
            {isPending ? 'Importing…' : 'Import as Inquiry'}
          </button>
          <button
            onClick={handleDismiss}
            disabled={isPending}
            className="px-3 py-1.5 text-xs font-medium rounded-md bg-stone-800 text-stone-300 hover:bg-stone-700 disabled:opacity-50 transition-colors"
          >
            Dismiss
          </button>
          {/* Deep link to Gmail */}
          <a
            href={`https://mail.google.com/mail/u/0/#inbox/${finding.gmailMessageId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 text-xs font-medium text-stone-400 hover:text-stone-400 transition-colors"
          >
            Open in Gmail &uarr;
          </a>
        </div>
      )}

      {/* Read-only status for non-pending */}
      {!showActions && (
        <div className="flex items-center gap-2">
          {finding.status === 'imported' && finding.importedInquiryId && (
            <Link
              href={`/inquiries/${finding.importedInquiryId}`}
              className="text-xs text-brand-600 hover:underline"
            >
              View inquiry &rarr;
            </Link>
          )}
          {finding.reviewedAt && (
            <span className="text-xs text-stone-400">
              Reviewed {new Date(finding.reviewedAt).toLocaleDateString()}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Batch Dismiss Button ─────────────────────────────────────────────────────

function BatchDismissButton({ onDone }: { onDone: () => void }) {
  const [isPending, startTransition] = useTransition()
  const [dismissed, setDismissed] = useState<number | null>(null)
  const [showDismissConfirm, setShowDismissConfirm] = useState(false)

  function handleDismissAll() {
    setShowDismissConfirm(true)
  }

  function handleConfirmedDismissAll() {
    setShowDismissConfirm(false)
    startTransition(async () => {
      try {
        const result = await dismissAllFindings({})
        setDismissed(result.count)
        onDone()
      } catch (err) {
        toast.error('Failed to dismiss findings')
      }
    })
  }

  if (dismissed !== null) {
    return (
      <span className="text-xs text-stone-500">
        {dismissed} finding{dismissed !== 1 ? 's' : ''} dismissed.
      </span>
    )
  }

  return (
    <>
      <button
        onClick={handleDismissAll}
        disabled={isPending}
        className="text-xs text-stone-400 hover:text-stone-400 disabled:opacity-50 transition-colors"
      >
        {isPending ? 'Dismissing…' : 'Dismiss all'}
      </button>
      <ConfirmModal
        open={showDismissConfirm}
        title="Dismiss all pending findings?"
        description="This cannot be undone. You can still find these emails directly in Gmail."
        confirmLabel="Dismiss All"
        variant="danger"
        loading={isPending}
        onConfirm={handleConfirmedDismissAll}
        onCancel={() => setShowDismissConfirm(false)}
      />
    </>
  )
}

// ─── Badge Components ─────────────────────────────────────────────────────────

function ClassificationBadge({ classification }: { classification: string }) {
  const styles: Record<string, string> = {
    inquiry: 'bg-emerald-900 text-emerald-700',
    existing_thread: 'bg-blue-900 text-blue-700',
  }
  const labels: Record<string, string> = {
    inquiry: 'inquiry',
    existing_thread: 'existing thread',
  }
  return (
    <span
      className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${styles[classification] ?? 'bg-stone-800 text-stone-400'}`}
    >
      {labels[classification] ?? classification}
    </span>
  )
}

function ConfidenceBadge({ confidence }: { confidence: string }) {
  const styles: Record<string, string> = {
    high: 'bg-emerald-950 text-emerald-600',
    medium: 'bg-amber-950 text-amber-600',
    low: 'bg-stone-800 text-stone-500',
  }
  return (
    <span
      className={`inline-block px-1.5 py-0.5 rounded text-[10px] ${styles[confidence] ?? 'bg-stone-800 text-stone-500'}`}
    >
      {confidence}
    </span>
  )
}
