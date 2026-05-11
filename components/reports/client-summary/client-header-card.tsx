import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import type { ClientSummaryReport } from '@/lib/reports/client-summary'

export function ClientHeaderCard({ report }: { report: ClientSummaryReport }) {
  return (
    <Card className="print:shadow-none print:border-stone-300">
      <CardContent className="pt-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-stone-100 print:text-stone-900">
                {report.fullName}
              </h2>
              <Badge
                variant={report.status === 'active' ? 'success' : 'default'}
                className="print:border print:border-stone-400"
              >
                {report.status}
              </Badge>
            </div>
            <div className="space-y-1 text-sm text-stone-400 print:text-stone-600">
              {report.email && <p>{report.email}</p>}
              {report.phone && <p>{report.phone}</p>}
              <p>Client since {format(new Date(report.clientSince), 'MMMM d, yyyy')}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 text-center sm:text-right">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                Events
              </p>
              <p className="text-2xl font-bold text-stone-100 print:text-stone-900">
                {report.totalEventsCompleted}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                Upcoming
              </p>
              <p className="text-2xl font-bold text-stone-100 print:text-stone-900">
                {report.upcomingEventsCount}
              </p>
            </div>
            {report.averageRating !== null && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                  Avg Rating
                </p>
                <p className="text-2xl font-bold text-amber-400 print:text-amber-600">
                  {report.averageRating}/5
                </p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
