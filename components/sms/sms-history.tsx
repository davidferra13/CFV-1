'use client'

import { useState, useEffect, useTransition } from 'react'
import { toast } from 'sonner'
import { MessageSquare, RefreshCw } from '@/components/ui/icons'
import { Badge } from '@/components/ui/badge'
import { getSMSHistory, getSMSStats } from '@/lib/sms/sms-actions'

type SMSMessage = {
  id: string
  to_phone: string
  message: string
  message_type: string
  status: string
  created_at: string
  sent_at: string | null
  error_message: string | null
}

type SMSStatsData = {
  total: number
  sent: number
  delivered: number
  failed: number
  pending: number
  deliveryRate: number
  byType: Record<string, number>
}

const TYPE_LABELS: Record<string, string> = {
  order_ready: 'Order Ready',
  table_ready: 'Table Ready',
  delivery_eta: 'Delivery ETA',
  reservation_confirm: 'Reservation',
  reservation_remind: 'Reminder',
  feedback_request: 'Feedback',
  custom: 'Custom',
}

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'error' | 'default' | 'info'> = {
  sent: 'success',
  delivered: 'success',
  pending: 'warning',
  failed: 'error',
}

export function SMSHistory() {
  const [messages, setMessages] = useState<SMSMessage[]>([])
  const [stats, setStats] = useState<SMSStatsData | null>(null)
  const [filterType, setFilterType] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [loading, startLoad] = useTransition()
  const [loadError, setLoadError] = useState<string | null>(null)

  function loadData() {
    setLoadError(null)
    startLoad(async () => {
      try {
        const [historyResult, statsResult] = await Promise.all([getSMSHistory(30), getSMSStats()])

        if (!historyResult.success) {
          setLoadError(historyResult.error || 'Failed to load SMS history')
          return
        }

        setMessages(historyResult.data as SMSMessage[])

        if (statsResult.success) {
          setStats(statsResult.stats)
        }
      } catch {
        setLoadError('Failed to load SMS data')
        toast.error('Failed to load SMS data')
      }
    })
  }

  useEffect(() => {
    loadData()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = messages.filter((m) => {
    if (filterType !== 'all' && m.message_type !== filterType) return false
    if (filterStatus !== 'all' && m.status !== filterStatus) return false
    return true
  })

  if (loadError) {
    return (
      <div className="rounded-lg border border-red-800 bg-red-950/30 p-4 text-sm text-red-400">
        Could not load SMS history: {loadError}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-lg border border-stone-800 bg-stone-900/50 p-3">
            <p className="text-xs text-stone-500">Sent (30d)</p>
            <p className="text-xl font-semibold text-stone-200">{stats.total}</p>
          </div>
          <div className="rounded-lg border border-stone-800 bg-stone-900/50 p-3">
            <p className="text-xs text-stone-500">Delivered</p>
            <p className="text-xl font-semibold text-emerald-400">{stats.sent + stats.delivered}</p>
          </div>
          <div className="rounded-lg border border-stone-800 bg-stone-900/50 p-3">
            <p className="text-xs text-stone-500">Failed</p>
            <p className="text-xl font-semibold text-red-400">{stats.failed}</p>
          </div>
          <div className="rounded-lg border border-stone-800 bg-stone-900/50 p-3">
            <p className="text-xs text-stone-500">Delivery Rate</p>
            <p className="text-xl font-semibold text-stone-200">{stats.deliveryRate}%</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-3 py-1.5 bg-stone-800 border border-stone-700 rounded-md text-sm text-stone-300 focus:outline-none focus:ring-1 focus:ring-amber-500"
        >
          <option value="all">All Types</option>
          {Object.entries(TYPE_LABELS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-1.5 bg-stone-800 border border-stone-700 rounded-md text-sm text-stone-300 focus:outline-none focus:ring-1 focus:ring-amber-500"
        >
          <option value="all">All Statuses</option>
          <option value="sent">Sent</option>
          <option value="delivered">Delivered</option>
          <option value="pending">Pending</option>
          <option value="failed">Failed</option>
        </select>

        <button
          onClick={loadData}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-800 border border-stone-700 rounded-md text-sm text-stone-300 hover:bg-stone-700 disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Message Table */}
      {filtered.length === 0 ? (
        <div className="text-center py-8 text-stone-500">
          <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">No SMS messages yet</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-stone-800">
          <table className="w-full text-sm">
            <thead className="bg-stone-900/50">
              <tr className="text-left text-stone-500">
                <th className="px-3 py-2 font-medium">Date</th>
                <th className="px-3 py-2 font-medium">To</th>
                <th className="px-3 py-2 font-medium">Message</th>
                <th className="px-3 py-2 font-medium">Type</th>
                <th className="px-3 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800">
              {filtered.map((msg) => (
                <tr key={msg.id} className="hover:bg-stone-800/30">
                  <td className="px-3 py-2 text-stone-400 whitespace-nowrap">
                    {new Date(msg.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </td>
                  <td className="px-3 py-2 text-stone-300 whitespace-nowrap">{msg.to_phone}</td>
                  <td className="px-3 py-2 text-stone-400 max-w-[250px] truncate">{msg.message}</td>
                  <td className="px-3 py-2">
                    <Badge variant="info">
                      {TYPE_LABELS[msg.message_type] || msg.message_type}
                    </Badge>
                  </td>
                  <td className="px-3 py-2">
                    <Badge variant={STATUS_VARIANT[msg.status] || 'default'}>{msg.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
