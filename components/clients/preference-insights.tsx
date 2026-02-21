'use client'

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Brain, TrendingUp } from 'lucide-react'

type PatternData = {
  patternType: string
  patternValue: string
  confidence: number
  occurrences: number
  lastSeenAt: string
}

type Props = {
  clientName: string
  patterns: PatternData[]
}

const PATTERN_LABELS: Record<string, string> = {
  cuisine_preference: 'Cuisine',
  dietary_need: 'Dietary',
  guest_count_range: 'Typical Guests',
  preferred_day: 'Preferred Day',
  service_style: 'Service Style',
  budget_range: 'Budget Range',
  season_preference: 'Peak Season',
}

function confidenceBadge(confidence: number): 'success' | 'warning' | 'default' {
  if (confidence >= 0.7) return 'success'
  if (confidence >= 0.4) return 'warning'
  return 'default'
}

function confidenceLabel(confidence: number): string {
  if (confidence >= 0.7) return 'High'
  if (confidence >= 0.4) return 'Medium'
  return 'Low'
}

export function PreferenceInsights({ clientName, patterns }: Props) {
  // Group by pattern type
  const grouped = patterns.reduce<Record<string, PatternData[]>>((acc, p) => {
    if (!acc[p.patternType]) acc[p.patternType] = []
    acc[p.patternType].push(p)
    return acc
  }, {})

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Brain className="h-5 w-5 text-stone-400" />
        <div>
          <h2 className="text-lg font-semibold text-stone-900">Client Preferences</h2>
          <p className="text-sm text-stone-500">Learned from {clientName}&apos;s past events</p>
        </div>
      </div>

      {Object.keys(grouped).length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Brain className="h-12 w-12 text-stone-300 mx-auto mb-3" />
            <p className="text-sm text-stone-500">
              No patterns detected yet. Preferences will be learned after more events.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(grouped).map(([type, items]) => (
            <Card key={type}>
              <CardHeader className="py-3">
                <CardTitle className="text-sm text-stone-500 uppercase tracking-wide">
                  {PATTERN_LABELS[type] || type.replace(/_/g, ' ')}
                </CardTitle>
              </CardHeader>
              <CardContent className="py-2 space-y-2">
                {items
                  .sort((a, b) => b.confidence - a.confidence)
                  .map((item, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-stone-900">{item.patternValue}</span>
                        <Badge variant={confidenceBadge(item.confidence)}>
                          {confidenceLabel(item.confidence)}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-stone-400">
                        <TrendingUp className="h-3 w-3" />
                        {item.occurrences}x seen
                      </div>
                    </div>
                  ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
