'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Mail,
  Smartphone,
  Bell,
  Phone,
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import type {
  CommunicationHealthDashboard,
  ChannelStatus,
  RecentFailure,
} from '@/lib/communication/health-metrics'

function rateColor(rate: number): string {
  if (rate >= 95) return 'text-emerald-400'
  if (rate >= 80) return 'text-amber-400'
  return 'text-red-400'
}

function rateBgColor(rate: number): string {
  if (rate >= 95) return 'bg-emerald-500'
  if (rate >= 80) return 'bg-amber-500'
  return 'bg-red-500'
}

function rateBorderColor(rate: number): string {
  if (rate >= 95) return 'border-emerald-800/40'
  if (rate >= 80) return 'border-amber-800/40'
  return 'border-red-800/40'
}

function rateLabel(rate: number): string {
  if (rate >= 95) return 'Healthy'
  if (rate >= 80) return 'Degraded'
  return 'Critical'
}

const channelIcons: Record<string, typeof Mail> = {
  email: Mail,
  sms: Smartphone,
  push: Bell,
  voice: Phone,
}

const channelLabels: Record<string, string> = {
  email: 'Email',
  sms: 'SMS',
  push: 'Push',
  voice: 'Voice',
}

function relativeTime(isoDate: string): string {
  const now = Date.now()
  const then = new Date(isoDate).getTime()
  const diffMs = now - then
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  const diffDay = Math.floor(diffHr / 24)
  return `${diffDay}d ago`
}

function ChannelCard({ channel }: { channel: ChannelStatus }) {
  const Icon = channelIcons[channel.channel] ?? Mail
  const label = channelLabels[channel.channel] ?? channel.channel
  const displayRate = channel.deliveryRate === -1 ? null : channel.deliveryRate

  return (
    <Card>
      <CardContent className="py-4">
        <div className="flex items-center gap-2 mb-3">
          <Icon className="h-4 w-4 text-stone-400" />
          <span className="text-sm font-medium text-stone-200">{label}</span>
          <span className="ml-auto">
            {channel.configured ? (
              <span className="flex items-center gap-1 text-xs text-emerald-400">
                <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" />
                Active
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs text-red-400">
                <span className="h-2 w-2 rounded-full bg-red-500 inline-block" />
                Not configured
              </span>
            )}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-3 text-center">
          <div>
            <div className="text-lg font-bold text-stone-100 tabular-nums">
              {channel.sent30d.toLocaleString()}
            </div>
            <div className="text-xs text-stone-500">Sent</div>
          </div>
          <div>
            <div className="text-lg font-bold text-stone-100 tabular-nums">
              {channel.failed30d.toLocaleString()}
            </div>
            <div className="text-xs text-stone-500">Failed</div>
          </div>
        </div>

        {displayRate !== null ? (
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-stone-500">Delivery rate</span>
              <span className={`text-xs font-medium tabular-nums ${rateColor(displayRate)}`}>
                {displayRate.toFixed(1)}%
              </span>
            </div>
            <div className="h-1.5 bg-stone-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${rateBgColor(displayRate)} transition-all duration-500`}
                style={{ width: `${Math.max(2, displayRate)}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="text-xs text-stone-500 text-center">No sends in the last 30 days</div>
        )}
      </CardContent>
    </Card>
  )
}

function FailureRow({ failure }: { failure: RecentFailure }) {
  const channelLabel = channelLabels[failure.channel] ?? failure.channel
  const variant =
    failure.channel === 'email' ? 'info' : failure.channel === 'sms' ? 'warning' : 'default'

  return (
    <div className="flex items-start gap-3 py-2 border-b border-stone-800 last:border-0">
      <XCircle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-0.5">
          <Badge variant={variant} className="text-[10px] px-1.5 py-0.5">
            {channelLabel}
          </Badge>
          {failure.errorCode && (
            <span className="text-xs text-stone-500 font-mono">{failure.errorCode}</span>
          )}
          <span className="text-xs text-stone-600 ml-auto shrink-0">
            {relativeTime(failure.occurredAt)}
          </span>
        </div>
        {failure.errorMessage && (
          <p className="text-xs text-stone-400 truncate">{failure.errorMessage}</p>
        )}
      </div>
    </div>
  )
}

export function CommunicationHealthPanel({ data }: { data: CommunicationHealthDashboard }) {
  const [failuresExpanded, setFailuresExpanded] = useState(false)
  const visibleFailures = failuresExpanded
    ? data.recentFailures.slice(0, 10)
    : data.recentFailures.slice(0, 3)

  return (
    <div className="space-y-4">
      {/* Section 1: Overall Health Score */}
      <div
        className={`rounded-xl border ${rateBorderColor(data.overallDeliveryRate)} bg-stone-900/50 p-5`}
      >
        <div className="flex items-center gap-2 mb-3">
          <CheckCircle className={`h-4 w-4 ${rateColor(data.overallDeliveryRate)}`} />
          <span className="text-xs uppercase tracking-wide text-stone-500 font-medium">
            Communication Health
          </span>
          <span className={`text-xs ml-auto ${rateColor(data.overallDeliveryRate)}`}>
            {rateLabel(data.overallDeliveryRate)}
          </span>
        </div>

        <div className="flex items-baseline gap-2 mb-3">
          <span
            className={`text-4xl font-bold tabular-nums ${rateColor(data.overallDeliveryRate)}`}
          >
            {data.overallDeliveryRate.toFixed(1)}
          </span>
          <span className="text-sm text-stone-500">% delivery rate</span>
        </div>

        <div className="h-2 bg-stone-800 rounded-full overflow-hidden mb-3">
          <div
            className={`h-full rounded-full ${rateBgColor(data.overallDeliveryRate)} transition-all duration-500`}
            style={{ width: `${Math.max(2, data.overallDeliveryRate)}%` }}
          />
        </div>

        <div className="flex gap-6 text-sm">
          <div>
            <span className="text-stone-400">Sent: </span>
            <span className="text-stone-200 font-medium tabular-nums">
              {data.totalSent30d.toLocaleString()}
            </span>
          </div>
          <div>
            <span className="text-stone-400">Failed: </span>
            <span
              className={`font-medium tabular-nums ${data.totalFailed30d > 0 ? 'text-red-400' : 'text-stone-200'}`}
            >
              {data.totalFailed30d.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Section 2: Channel Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        {data.channels.map((ch) => (
          <ChannelCard key={ch.channel} channel={ch} />
        ))}
      </div>

      {/* Section 3: Active Queue */}
      <Card>
        <CardContent className="py-4">
          <h3 className="text-sm font-medium text-stone-300 mb-3">Active Queue</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <Clock
                className={`h-5 w-5 ${data.scheduledPending > 0 ? 'text-amber-400' : 'text-stone-500'}`}
              />
              <div>
                <div
                  className={`text-lg font-bold tabular-nums ${data.scheduledPending > 0 ? 'text-amber-400' : 'text-stone-200'}`}
                >
                  {data.scheduledPending}
                </div>
                <div className="text-xs text-stone-500">Scheduled pending</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-stone-500" />
              <div>
                <div className="text-lg font-bold text-stone-200 tabular-nums">
                  {data.unreadInbox}
                </div>
                <div className="text-xs text-stone-500">Unread inbox</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 4: Recent Failures */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle
              className={`h-4 w-4 ${data.recentFailures.length > 0 ? 'text-red-400' : 'text-stone-500'}`}
            />
            <h3 className="text-sm font-medium text-stone-300">Recent Failures</h3>
            {data.recentFailures.length > 0 && (
              <Badge variant="error" className="ml-auto">
                {data.recentFailures.length}
              </Badge>
            )}
          </div>

          {data.recentFailures.length === 0 ? (
            <p className="text-sm text-stone-500">No recent failures</p>
          ) : (
            <>
              <div className="max-h-64 overflow-y-auto">
                {visibleFailures.map((f) => (
                  <FailureRow key={f.id} failure={f} />
                ))}
              </div>
              {data.recentFailures.length > 3 && (
                <button
                  type="button"
                  onClick={() => setFailuresExpanded(!failuresExpanded)}
                  className="flex items-center gap-1 mt-2 text-xs text-stone-500 hover:text-stone-300 transition-colors"
                >
                  {failuresExpanded ? (
                    <>
                      <ChevronUp className="h-3 w-3" />
                      Show less
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-3 w-3" />
                      Show all ({data.recentFailures.length})
                    </>
                  )}
                </button>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
