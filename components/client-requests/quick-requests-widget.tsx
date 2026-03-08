import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import Link from 'next/link'
import { Zap, ArrowRight, Calendar, Users } from 'lucide-react'
import type { QuickRequestWithClient } from '@/lib/client-requests/actions'

interface QuickRequestsWidgetProps {
  requests: QuickRequestWithClient[]
}

export function QuickRequestsWidget({ requests }: QuickRequestsWidgetProps) {
  const pending = requests.filter((r) => r.status === 'pending')

  if (pending.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-500" />
            Quick Requests
            <Badge variant="warning">{pending.length}</Badge>
          </CardTitle>
          <Link
            href="/client-requests"
            className="text-sm text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1"
          >
            View all <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {pending.slice(0, 5).map((req) => (
            <div
              key={req.id}
              className="flex items-center justify-between p-3 bg-stone-50 rounded-lg"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-stone-900 truncate">
                  {req.client.full_name}
                </p>
                <div className="flex items-center gap-3 text-xs text-stone-500 mt-0.5">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(req.requested_date), 'MMM d')}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {req.guest_count}
                  </span>
                </div>
              </div>
              <Link
                href="/client-requests"
                className="text-xs text-brand-600 hover:text-brand-700 font-medium shrink-0"
              >
                Review
              </Link>
            </div>
          ))}
          {pending.length > 5 && (
            <p className="text-xs text-stone-400 text-center">
              +{pending.length - 5} more pending
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
