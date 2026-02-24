'use client'

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Eye, Clock, MousePointer } from 'lucide-react'

type ProposalViewData = {
  totalViews: number
  uniqueViews: number
  avgTimeSeconds: number
  mostViewedSections: { section: string; views: number }[]
  recentViews: { viewedAt: string; timeOnPageSeconds: number }[]
}

type Props = {
  data: ProposalViewData
  quoteName?: string
}

function formatTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}m ${secs}s`
}

export function ViewAnalytics({ data, quoteName }: Props) {
  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="py-3">
            <div className="flex items-center gap-2 mb-1">
              <Eye className="h-4 w-4 text-stone-400" />
              <p className="text-xs text-stone-500">Total Views</p>
            </div>
            <p className="text-2xl font-semibold text-stone-100">{data.totalViews}</p>
            <p className="text-xs text-stone-400">{data.uniqueViews} unique</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-stone-400" />
              <p className="text-xs text-stone-500">Avg. Time on Page</p>
            </div>
            <p className="text-2xl font-semibold text-stone-100">
              {formatTime(data.avgTimeSeconds)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3">
            <div className="flex items-center gap-2 mb-1">
              <MousePointer className="h-4 w-4 text-stone-400" />
              <p className="text-xs text-stone-500">Sections Viewed</p>
            </div>
            <p className="text-2xl font-semibold text-stone-100">
              {data.mostViewedSections.length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Section Heatmap */}
      {data.mostViewedSections.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Section Interest</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.mostViewedSections.map((s) => {
              const maxViews = Math.max(...data.mostViewedSections.map((ms) => ms.views))
              const pct = maxViews > 0 ? (s.views / maxViews) * 100 : 0
              return (
                <div key={s.section}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-stone-300">{s.section}</span>
                    <span className="text-xs text-stone-500">{s.views} views</span>
                  </div>
                  <div className="w-full bg-stone-800 rounded-full h-2">
                    <div
                      className="bg-brand-9500 h-2 rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      {/* Recent Views */}
      {data.recentViews.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Views</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-stone-800">
              {data.recentViews.map((v, i) => (
                <div key={i} className="px-6 py-3 flex items-center justify-between">
                  <span className="text-sm text-stone-300">
                    {new Date(v.viewedAt).toLocaleString()}
                  </span>
                  <Badge variant="default">{formatTime(v.timeOnPageSeconds)}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
