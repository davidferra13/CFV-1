'use client'

import { useEffect, useState, useCallback } from 'react'
import type {
  RoutineMatchAuditRow,
  RoutineExecutionAuditRow,
  RoutineActionEventRow,
} from '@/lib/remy/routines/types'

// ---- Types ----

interface ObservabilityProps {
  /** Server action to fetch recent execution audit rows */
  fetchRecentActivity: (limit?: number) => Promise<RoutineExecutionAuditRow[]>
  /** Server action to fetch match audit rows for a specific routine */
  fetchMatchHistory?: (routineId: string, limit?: number) => Promise<RoutineMatchAuditRow[]>
  /** Server action to fetch action events for a specific execution */
  fetchActionEvents?: (executionId: string) => Promise<RoutineActionEventRow[]>
  /** Polling interval in ms (0 to disable) */
  pollIntervalMs?: number
}

type TabId = 'triggers' | 'blocks' | 'audit'

// ---- Helpers ----

function formatTimestamp(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  } catch {
    return iso
  }
}

function statusBadge(status: string): string {
  switch (status) {
    case 'success':
      return 'bg-green-100 text-green-800'
    case 'error':
      return 'bg-red-100 text-red-800'
    case 'blocked':
      return 'bg-orange-100 text-orange-800'
    case 'approval_required':
      return 'bg-yellow-100 text-yellow-800'
    case 'skipped':
      return 'bg-gray-100 text-gray-600'
    case 'running':
      return 'bg-blue-100 text-blue-800'
    default:
      return 'bg-gray-100 text-gray-600'
  }
}

// ---- Component ----

export default function RoutineObservability({
  fetchRecentActivity,
  fetchMatchHistory,
  fetchActionEvents,
  pollIntervalMs = 0,
}: ObservabilityProps) {
  const [activeTab, setActiveTab] = useState<TabId>('triggers')
  const [rows, setRows] = useState<RoutineExecutionAuditRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setError(null)
      const data = await fetchRecentActivity(100)
      setRows(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load activity')
    } finally {
      setLoading(false)
    }
  }, [fetchRecentActivity])

  useEffect(() => {
    load()
    if (pollIntervalMs > 0) {
      const interval = setInterval(load, pollIntervalMs)
      return () => clearInterval(interval)
    }
  }, [load, pollIntervalMs])

  // Derived lists
  const recentTriggers = rows.filter((r) => r.status === 'success' || r.status === 'running')
  const safetyBlocks = rows.filter((r) => r.status === 'blocked')

  const tabs: { id: TabId; label: string; count: number }[] = [
    { id: 'triggers', label: 'Recent Triggers', count: recentTriggers.length },
    { id: 'blocks', label: 'Safety Blocks', count: safetyBlocks.length },
    { id: 'audit', label: 'Audit Trail', count: rows.length },
  ]

  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div className="flex gap-1 border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className="ml-1.5 text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Error state */}
      {error && <div className="p-3 bg-red-50 text-red-700 text-sm rounded-md">{error}</div>}

      {/* Loading state */}
      {loading && <div className="text-sm text-gray-500 py-8 text-center">Loading activity...</div>}

      {/* Recent Triggers */}
      {!loading && activeTab === 'triggers' && <TriggerList rows={recentTriggers} />}

      {/* Safety Blocks */}
      {!loading && activeTab === 'blocks' && <BlocksList rows={safetyBlocks} />}

      {/* Full Audit Trail */}
      {!loading && activeTab === 'audit' && <AuditTable rows={rows} />}
    </div>
  )
}

// ---- Sub-components ----

function TriggerList({ rows }: { rows: RoutineExecutionAuditRow[] }) {
  if (rows.length === 0) {
    return <EmptyState message="No recent triggers." />
  }

  return (
    <ul className="divide-y divide-gray-100">
      {rows.map((row) => (
        <li key={row.id} className="py-3 flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-gray-900 truncate">
              Routine {row.routine_id ?? 'unknown'}
            </p>
            <p className="text-xs text-gray-500">
              {formatTimestamp(row.started_at)}
              {row.duration_ms != null && ` (${row.duration_ms}ms)`}
            </p>
          </div>
          <span className={`text-xs px-2 py-0.5 rounded-full ${statusBadge(row.status)}`}>
            {row.status}
          </span>
        </li>
      ))}
    </ul>
  )
}

function BlocksList({ rows }: { rows: RoutineExecutionAuditRow[] }) {
  if (rows.length === 0) {
    return <EmptyState message="No safety blocks recorded." />
  }

  return (
    <ul className="divide-y divide-gray-100">
      {rows.map((row) => (
        <li key={row.id} className="py-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-900">
              Routine {row.routine_id ?? 'unknown'}
            </p>
            <span className={`text-xs px-2 py-0.5 rounded-full ${statusBadge('blocked')}`}>
              blocked
            </span>
          </div>
          {row.error_message && <p className="text-xs text-red-600 mt-1">{row.error_message}</p>}
          <p className="text-xs text-gray-400 mt-0.5">{formatTimestamp(row.started_at)}</p>
        </li>
      ))}
    </ul>
  )
}

function AuditTable({ rows }: { rows: RoutineExecutionAuditRow[] }) {
  if (rows.length === 0) {
    return <EmptyState message="No audit entries." />
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left text-xs text-gray-500 uppercase tracking-wider">
            <th className="py-2 pr-3">Timestamp</th>
            <th className="py-2 pr-3">Routine</th>
            <th className="py-2 pr-3">Trigger</th>
            <th className="py-2 pr-3">Result</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {rows.map((row) => (
            <tr key={row.id} className="hover:bg-gray-50">
              <td className="py-2 pr-3 text-xs text-gray-500 whitespace-nowrap">
                {formatTimestamp(row.started_at)}
              </td>
              <td className="py-2 pr-3 text-gray-900 truncate max-w-[180px]">
                {row.routine_id ?? 'N/A'}
              </td>
              <td className="py-2 pr-3 text-gray-600">
                {row.execution_id ? `exec:${row.execution_id.slice(0, 8)}` : 'N/A'}
              </td>
              <td className="py-2 pr-3">
                <span className={`text-xs px-2 py-0.5 rounded-full ${statusBadge(row.status)}`}>
                  {row.status}
                </span>
                {row.error_message && (
                  <span className="text-xs text-red-500 ml-2 truncate max-w-[200px] inline-block align-middle">
                    {row.error_message}
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return <div className="py-8 text-center text-sm text-gray-400">{message}</div>
}
