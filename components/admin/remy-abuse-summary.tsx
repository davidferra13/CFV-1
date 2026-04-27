'use client'

import { useEffect, useState } from 'react'
import type { AbuseSummary } from '@/lib/actions/admin-abuse-summary'
import { getAbuseSummary } from '@/lib/actions/admin-abuse-summary'

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

function SeverityBadge({ severity }: { severity: string }) {
  const colors: Record<string, string> = {
    critical: 'bg-red-900/50 text-red-300 border-red-700',
    blocked: 'bg-red-900/70 text-red-200 border-red-600',
    warning: 'bg-amber-900/50 text-amber-300 border-amber-700',
  }
  return (
    <span
      className={`inline-block px-1.5 py-0.5 text-[10px] font-medium rounded border ${colors[severity] ?? 'bg-stone-800 text-stone-400 border-stone-700'}`}
    >
      {severity}
    </span>
  )
}

export function RemyAbuseSummary() {
  const [data, setData] = useState<AbuseSummary | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getAbuseSummary()
      .then(setData)
      .catch((e) => setError(e?.message ?? 'Failed to load'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="rounded-lg border border-stone-800 bg-stone-900 p-4 animate-pulse">
        <div className="h-4 w-48 bg-stone-800 rounded mb-3" />
        <div className="h-20 bg-stone-800 rounded" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-900/50 bg-stone-900 p-4">
        <p className="text-sm text-red-400">Abuse summary unavailable: {error}</p>
      </div>
    )
  }

  if (!data) return null

  const maxCount = Math.max(...data.topCategories.map((c) => c.count), 1)
  const hasActivity = data.violations7d > 0

  return (
    <div className="rounded-lg border border-stone-800 bg-stone-900 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-stone-200">Abuse & Safety Log</h3>
        {data.blockedUsers.length > 0 && (
          <span className="px-2 py-0.5 text-xs font-medium rounded bg-red-900/60 text-red-300 border border-red-700">
            {data.blockedUsers.length} blocked
          </span>
        )}
      </div>

      {/* Counters */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded bg-stone-800/60 p-3 text-center">
          <div className="text-xl font-bold text-stone-100">{data.violations24h}</div>
          <div className="text-[10px] text-stone-500 uppercase tracking-wider">24h</div>
        </div>
        <div className="rounded bg-stone-800/60 p-3 text-center">
          <div className="text-xl font-bold text-stone-100">{data.violations7d}</div>
          <div className="text-[10px] text-stone-500 uppercase tracking-wider">7 days</div>
        </div>
        <div className="rounded bg-stone-800/60 p-3 text-center">
          <div
            className={`text-xl font-bold ${data.blockedUsers.length > 0 ? 'text-red-400' : 'text-stone-100'}`}
          >
            {data.blockedUsers.length}
          </div>
          <div className="text-[10px] text-stone-500 uppercase tracking-wider">Blocked</div>
        </div>
      </div>

      {!hasActivity && (
        <p className="text-xs text-stone-500 text-center py-2">No violations in the last 7 days</p>
      )}

      {/* Blocked Users */}
      {data.blockedUsers.length > 0 && (
        <div className="space-y-1">
          <h4 className="text-xs font-medium text-stone-400">Currently Blocked</h4>
          {data.blockedUsers.map((u) => (
            <div
              key={u.tenantId}
              className="flex items-center justify-between rounded bg-red-950/30 border border-red-900/30 px-2 py-1.5 text-xs"
            >
              <span className="text-stone-300">{u.businessName ?? u.tenantId.slice(0, 8)}</span>
              <span className="text-red-400">
                until {new Date(u.blockedUntil).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Top Categories */}
      {data.topCategories.length > 0 && (
        <div className="space-y-1.5">
          <h4 className="text-xs font-medium text-stone-400">Top Categories (7d)</h4>
          {data.topCategories.map((c) => (
            <div key={c.category} className="flex items-center gap-2 text-xs">
              <span className="w-28 truncate text-stone-300">{c.category}</span>
              <div className="flex-1 h-2 bg-stone-800 rounded overflow-hidden">
                <div
                  className="h-full bg-amber-600 rounded"
                  style={{ width: `${(c.count / maxCount) * 100}%` }}
                />
              </div>
              <span className="w-6 text-right text-stone-500">{c.count}</span>
            </div>
          ))}
        </div>
      )}

      {/* Recent Critical Violations */}
      {data.recentViolations.length > 0 && (
        <div className="space-y-1.5">
          <h4 className="text-xs font-medium text-stone-400">Recent Critical Violations</h4>
          <div className="space-y-1">
            {data.recentViolations.map((v) => (
              <div
                key={v.id}
                className="rounded bg-stone-800/40 border border-stone-800 px-2 py-1.5 text-xs space-y-0.5"
              >
                <div className="flex items-center gap-2">
                  <SeverityBadge severity={v.severity} />
                  <span className="text-stone-400">{v.category}</span>
                  {v.guardrailMatched && (
                    <span className="text-stone-600 text-[10px]">{v.guardrailMatched}</span>
                  )}
                  <span className="ml-auto text-stone-600">{formatRelativeTime(v.createdAt)}</span>
                </div>
                <p className="text-stone-500 truncate">{v.blockedMessage}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
