'use client'

import { Card, CardContent } from '@/components/ui/card'
import { MessageSquare, Clock, Zap, BarChart3 } from 'lucide-react'
import type { CommStats } from '@/lib/communications/comm-log-actions'

interface CommStatsCardsProps {
  stats: CommStats
}

export function CommStatsCards({ stats }: CommStatsCardsProps) {
  const daysSinceContact = stats.lastContactDate
    ? Math.floor((Date.now() - new Date(stats.lastContactDate).getTime()) / (1000 * 60 * 60 * 24))
    : null

  const lastContactLabel =
    daysSinceContact === null
      ? 'Never'
      : daysSinceContact === 0
        ? 'Today'
        : daysSinceContact === 1
          ? 'Yesterday'
          : `${daysSinceContact} days ago`

  const channelLabel = stats.preferredChannel
    ? stats.preferredChannel.charAt(0).toUpperCase() + stats.preferredChannel.slice(1)
    : 'N/A'

  // Compute a simple response rate: inbound vs total (rough proxy)
  const totalChannels = Object.values(stats.channelBreakdown).reduce((a, b) => a + b, 0)

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Card>
        <CardContent className="py-4 px-4 flex items-start gap-3">
          <MessageSquare className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-2xl font-bold">{stats.totalInteractions}</p>
            <p className="text-xs text-muted-foreground">Total Interactions</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="py-4 px-4 flex items-start gap-3">
          <Clock className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-2xl font-bold">{lastContactLabel}</p>
            <p className="text-xs text-muted-foreground">Last Contact</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="py-4 px-4 flex items-start gap-3">
          <Zap className="h-5 w-5 text-purple-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-2xl font-bold">{channelLabel}</p>
            <p className="text-xs text-muted-foreground">Preferred Channel</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="py-4 px-4 flex items-start gap-3">
          <BarChart3 className="h-5 w-5 text-orange-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-2xl font-bold">{totalChannels}</p>
            <p className="text-xs text-muted-foreground">Logged Entries</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
