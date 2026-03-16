// Queue Summary Bar - Stats cards showing urgency breakdown
// Server component.

import { Card, CardContent } from '@/components/ui/card'
import type { QueueSummary } from '@/lib/queue/types'

interface Props {
  summary: QueueSummary
}

export function QueueSummaryBar({ summary }: Props) {
  const domainsActive = Object.values(summary.byDomain).filter((n) => n > 0).length

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card>
        <CardContent className="pt-6">
          <div className="text-sm font-medium text-stone-500">Total Items</div>
          <div className="text-3xl font-bold text-stone-100 mt-2">{summary.totalItems}</div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="text-sm font-medium text-red-600">Critical</div>
          <div className="text-3xl font-bold text-red-600 mt-2">{summary.byUrgency.critical}</div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="text-sm font-medium text-amber-600">High Priority</div>
          <div className="text-3xl font-bold text-amber-600 mt-2">{summary.byUrgency.high}</div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="text-sm font-medium text-brand-600">Domains Active</div>
          <div className="text-3xl font-bold text-brand-600 mt-2">{domainsActive}</div>
        </CardContent>
      </Card>
    </div>
  )
}
