'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { Crosshair, Phone, Users, ArrowRight, TrendingUp } from '@/components/ui/icons'
import type { ProspectStats } from '@/lib/prospecting/types'

interface ProspectingWidgetProps {
  stats: ProspectStats
  hotPipelineCount: number
}

export function ProspectingWidget({ stats, hotPipelineCount }: ProspectingWidgetProps) {
  // Don't render if no prospects at all
  if (stats.total === 0) return null

  const activeCount = stats.new + stats.queued + stats.called + stats.follow_up
  const conversionRate =
    stats.converted > 0 && stats.total > 0 ? Math.round((stats.converted / stats.total) * 100) : 0

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            <Crosshair className="h-4 w-4 text-brand-500" />
            Prospecting
          </CardTitle>
          <Link
            href="/prospecting"
            className="inline-flex items-center gap-1 text-sm text-brand-600 hover:text-brand-400"
          >
            Hub <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {/* Active Pipeline */}
          <div>
            <div className="text-2xl font-bold text-stone-100">{activeCount}</div>
            <p className="text-xs text-stone-500">active in pipeline</p>
          </div>

          {/* Conversion Rate */}
          <div>
            <div className="text-2xl font-bold text-stone-100">{conversionRate}%</div>
            <p className="text-xs text-stone-500">conversion rate</p>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-stone-800 space-y-1.5">
          {stats.follow_up > 0 && (
            <Link
              href="/prospecting?status=follow_up"
              className="flex items-center justify-between text-sm hover:bg-stone-800 rounded-md px-1 py-0.5 transition-colors"
            >
              <span className="flex items-center gap-1.5 text-amber-500">
                <Phone className="h-3.5 w-3.5" />
                {stats.follow_up} follow-up{stats.follow_up !== 1 ? 's' : ''} due
              </span>
              <span className="text-xs text-stone-500">→</span>
            </Link>
          )}

          {hotPipelineCount > 0 && (
            <Link
              href="/prospecting/pipeline"
              className="flex items-center justify-between text-sm hover:bg-stone-800 rounded-md px-1 py-0.5 transition-colors"
            >
              <span className="flex items-center gap-1.5 text-brand-400">
                <TrendingUp className="h-3.5 w-3.5" />
                {hotPipelineCount} hot lead{hotPipelineCount !== 1 ? 's' : ''} (responded/meeting)
              </span>
              <span className="text-xs text-stone-500">→</span>
            </Link>
          )}

          {stats.converted > 0 && (
            <div className="flex items-center gap-1.5 text-sm text-emerald-500 px-1">
              <Users className="h-3.5 w-3.5" />
              {stats.converted} converted to client{stats.converted !== 1 ? 's' : ''}
            </div>
          )}

          {stats.new > 0 && (
            <Link
              href="/prospecting/queue"
              className="flex items-center justify-between text-sm hover:bg-stone-800 rounded-md px-1 py-0.5 transition-colors"
            >
              <span className="text-stone-400">
                {stats.new} new lead{stats.new !== 1 ? 's' : ''} to call
              </span>
              <span className="text-xs text-stone-500">→</span>
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
