'use client'

import { useState, useTransition } from 'react'
import type { QuarantinedPrice, SyncAuditEntry } from '@/lib/admin/openclaw-health-actions'
import { reviewQuarantinedPrice, bulkReviewQuarantined } from '@/lib/admin/openclaw-health-actions'

interface Props {
  initialQuarantined: QuarantinedPrice[]
  initialSyncLog: SyncAuditEntry[]
}

export function OpenClawHealthClient({ initialQuarantined, initialSyncLog }: Props) {
  const [tab, setTab] = useState<'quarantine' | 'sync'>('quarantine')

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-1 mb-4">
        <button
          onClick={() => setTab('quarantine')}
          className={`px-4 py-2 text-sm rounded-lg transition ${
            tab === 'quarantine'
              ? 'bg-stone-700 text-stone-100 font-medium'
              : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'
          }`}
        >
          Quarantine Queue ({initialQuarantined.filter((p) => !p.reviewed).length})
        </button>
        <button
          onClick={() => setTab('sync')}
          className={`px-4 py-2 text-sm rounded-lg transition ${
            tab === 'sync'
              ? 'bg-stone-700 text-stone-100 font-medium'
              : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'
          }`}
        >
          Sync History ({initialSyncLog.length})
        </button>
      </div>

      {tab === 'quarantine' ? (
        <QuarantineTable items={initialQuarantined} />
      ) : (
        <SyncLogTable entries={initialSyncLog} />
      )}
    </div>
  )
}

// --- Quarantine Table ---

function QuarantineTable({ items }: { items: QuarantinedPrice[] }) {
  const [rows, setRows] = useState(items)
  const [isPending, startTransition] = useTransition()
  const [bulkPending, setBulkPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const unreviewed = rows.filter((r) => !r.reviewed)

  async function handleReview(input: {
    id: number
    action: 'approved' | 'rejected' | 'corrected'
    correctedPriceCents?: number
  }) {
    setError(null)
    const prev = [...rows]
    setRows(
      rows.map((r) =>
        r.id === input.id
          ? {
              ...r,
              reviewed: true,
              reviewed_action: input.action,
              price_cents: input.correctedPriceCents ?? r.price_cents,
            }
          : r
      )
    )
    startTransition(async () => {
      try {
        const result = await reviewQuarantinedPrice(input)
        if (!result.success) {
          setRows(prev)
          setError(result.error ?? 'Failed to apply quarantine review.')
        }
      } catch {
        setRows(prev)
        setError('Failed to apply quarantine review.')
      }
    })
  }

  function handleCorrect(row: QuarantinedPrice) {
    const defaultValue =
      row.price_cents != null && Number.isFinite(row.price_cents)
        ? (row.price_cents / 100).toFixed(2)
        : ''
    const nextValue = window.prompt('Corrected price in dollars', defaultValue)
    if (nextValue === null) return

    const normalized = nextValue.trim().replace(/^\$/, '')
    const correctedDollars = Number(normalized)
    if (!Number.isFinite(correctedDollars) || correctedDollars <= 0) {
      setError('Corrected price must be a positive dollar amount.')
      return
    }

    handleReview({
      id: row.id,
      action: 'corrected',
      correctedPriceCents: Math.round(correctedDollars * 100),
    })
  }

  async function handleBulkReject() {
    if (!confirm(`Reject all ${unreviewed.length} unreviewed quarantined prices?`)) return
    setBulkPending(true)
    const prev = [...rows]
    setRows(
      rows.map((r) => (!r.reviewed ? { ...r, reviewed: true, reviewed_action: 'rejected' } : r))
    )
    try {
      const result = await bulkReviewQuarantined('rejected')
      if (!result.success) {
        setRows(prev)
      }
    } catch {
      setRows(prev)
    } finally {
      setBulkPending(false)
    }
  }

  if (unreviewed.length === 0 && rows.length === 0) {
    return (
      <div className="bg-stone-900 rounded-xl border border-stone-700 p-8 text-center">
        <p className="text-stone-400">No quarantined prices. Validation gate is clean.</p>
      </div>
    )
  }

  return (
    <div className="bg-stone-900 rounded-xl border border-stone-700 overflow-hidden">
      {unreviewed.length > 0 && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-stone-800">
          <span className="text-sm text-stone-400">{unreviewed.length} unreviewed</span>
          <button
            onClick={handleBulkReject}
            disabled={bulkPending}
            className="text-xs px-3 py-1.5 rounded bg-red-900/50 text-red-300 hover:bg-red-900 transition disabled:opacity-50"
          >
            {bulkPending ? 'Processing...' : 'Reject All'}
          </button>
        </div>
      )}
      {error && (
        <div className="border-b border-stone-800 px-4 py-3 text-sm text-amber-300 flex items-center gap-3">
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="px-3 py-1 bg-stone-700 hover:bg-stone-600 rounded text-xs text-stone-200 transition-colors"
          >
            Dismiss
          </button>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-stone-500 uppercase tracking-wide border-b border-stone-800">
              <th className="px-4 py-2">Ingredient</th>
              <th className="px-4 py-2">Price</th>
              <th className="px-4 py-2">Old Price</th>
              <th className="px-4 py-2">Source</th>
              <th className="px-4 py-2">Reason</th>
              <th className="px-4 py-2">When</th>
              <th className="px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-800">
            {rows.map((row) => (
              <tr
                key={row.id}
                className={`${row.reviewed ? 'opacity-40' : 'hover:bg-stone-800/50'}`}
              >
                <td className="px-4 py-2 text-stone-200 max-w-[180px] truncate">
                  {row.ingredient_name || '(unknown)'}
                </td>
                <td className="px-4 py-2 text-stone-300 font-mono">
                  {row.price_cents != null ? `$${(row.price_cents / 100).toFixed(2)}` : '-'}
                </td>
                <td className="px-4 py-2 text-stone-500 font-mono">
                  {row.old_price_cents != null ? `$${(row.old_price_cents / 100).toFixed(2)}` : '-'}
                </td>
                <td className="px-4 py-2 text-stone-400 text-xs">
                  {row.source.replace('openclaw_', '')}
                </td>
                <td
                  className="px-4 py-2 text-stone-400 text-xs max-w-[260px] truncate"
                  title={row.rejection_reason}
                >
                  {simplifyReason(row.rejection_reason)}
                </td>
                <td className="px-4 py-2 text-stone-500 text-xs whitespace-nowrap">
                  {formatDate(row.quarantined_at)}
                </td>
                <td className="px-4 py-2">
                  {row.reviewed ? (
                    <span
                      className={`text-xs ${
                        row.reviewed_action === 'approved'
                          ? 'text-emerald-400'
                          : row.reviewed_action === 'corrected'
                            ? 'text-amber-300'
                            : 'text-red-400'
                      }`}
                    >
                      {row.reviewed_action}
                    </span>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {!row.writeback_ready && (
                        <span className="text-[11px] text-amber-400">
                          Legacy row: reject only until a fresh sync regenerates review context.
                        </span>
                      )}
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleReview({ id: row.id, action: 'approved' })}
                          disabled={isPending || !row.writeback_ready}
                          title={
                            row.writeback_ready
                              ? 'Write this quarantined price into authoritative price history.'
                              : 'Legacy quarantine rows cannot be approved safely.'
                          }
                          className="text-xs px-2 py-1 rounded bg-emerald-900/50 text-emerald-300 hover:bg-emerald-900 transition disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => handleCorrect(row)}
                          disabled={isPending || !row.writeback_ready}
                          title={
                            row.writeback_ready
                              ? 'Correct the price before writing it back into authoritative history.'
                              : 'Legacy quarantine rows cannot be corrected safely.'
                          }
                          className="text-xs px-2 py-1 rounded bg-amber-900/50 text-amber-300 hover:bg-amber-900 transition disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Correct
                        </button>
                        <button
                          onClick={() => handleReview({ id: row.id, action: 'rejected' })}
                          disabled={isPending}
                          className="text-xs px-2 py-1 rounded bg-red-900/50 text-red-300 hover:bg-red-900 transition"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// --- Sync Log Table ---

function SyncLogTable({ entries }: { entries: SyncAuditEntry[] }) {
  if (entries.length === 0) {
    return (
      <div className="bg-stone-900 rounded-xl border border-stone-700 p-8 text-center">
        <p className="text-stone-400">No sync history recorded yet.</p>
      </div>
    )
  }

  return (
    <div className="bg-stone-900 rounded-xl border border-stone-700 overflow-hidden overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-stone-500 uppercase tracking-wide border-b border-stone-800">
            <th className="px-4 py-2">Type</th>
            <th className="px-4 py-2">Started</th>
            <th className="px-4 py-2">Processed</th>
            <th className="px-4 py-2">Accepted</th>
            <th className="px-4 py-2">Quarantined</th>
            <th className="px-4 py-2">Skipped</th>
            <th className="px-4 py-2">Rate</th>
            <th className="px-4 py-2">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-800">
          {entries.map((entry) => {
            const rate =
              entry.records_processed > 0
                ? Math.round((entry.records_accepted / entry.records_processed) * 100)
                : 100
            const hasError = !!entry.error_message
            return (
              <tr key={entry.id} className="hover:bg-stone-800/50">
                <td className="px-4 py-2 text-stone-300 text-xs">
                  {entry.sync_type.replace(/_/g, ' ')}
                </td>
                <td className="px-4 py-2 text-stone-400 text-xs whitespace-nowrap">
                  {formatDate(entry.started_at)}
                </td>
                <td className="px-4 py-2 text-stone-300 font-mono">{entry.records_processed}</td>
                <td className="px-4 py-2 text-emerald-400 font-mono">{entry.records_accepted}</td>
                <td className="px-4 py-2 text-amber-400 font-mono">
                  {entry.records_quarantined || 0}
                </td>
                <td className="px-4 py-2 text-stone-500 font-mono">{entry.records_skipped || 0}</td>
                <td className="px-4 py-2">
                  <span
                    className={`text-xs font-medium ${
                      rate >= 90
                        ? 'text-emerald-400'
                        : rate >= 70
                          ? 'text-amber-400'
                          : 'text-red-400'
                    }`}
                  >
                    {rate}%
                  </span>
                </td>
                <td className="px-4 py-2">
                  {hasError ? (
                    <span className="text-xs text-red-400" title={entry.error_message || ''}>
                      Error
                    </span>
                  ) : (
                    <span className="text-xs text-emerald-400">OK</span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// --- Helpers ---

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function simplifyReason(reason: string): string {
  if (reason.includes('spike')) return 'Price spike'
  if (reason.includes('crash')) return 'Price crash'
  if (reason.includes('$500')) return 'Over $500 cap'
  if (reason.includes('1 cent')) return 'Placeholder (1c)'
  if (reason.includes('> 0')) return 'Zero/negative'
  if (reason.includes('Null')) return 'Null price'
  return reason.slice(0, 50)
}
