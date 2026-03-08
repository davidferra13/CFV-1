// Client Quick Request Page
// Clients can quickly request a meal/event and see their request history.

import type { Metadata } from 'next'
import { requireClient } from '@/lib/auth/get-user'
import { getClientRequestHistory, getClientLastMenu } from '@/lib/client-requests/actions'
import { QuickRequestForm } from '@/components/client-requests/quick-request-form'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { ActivityTracker } from '@/components/activity/activity-tracker'

export const metadata: Metadata = { title: 'Quick Request - ChefFlow' }

function getStatusBadge(status: string) {
  const variants: Record<string, { variant: 'default' | 'success' | 'warning' | 'error' | 'info'; label: string }> = {
    pending: { variant: 'warning', label: 'Pending' },
    confirmed: { variant: 'success', label: 'Confirmed' },
    declined: { variant: 'error', label: 'Declined' },
    converted: { variant: 'info', label: 'Booked' },
  }
  const config = variants[status] ?? { variant: 'default', label: status }
  return <Badge variant={config.variant}>{config.label}</Badge>
}

function formatTime(time: string | null) {
  if (!time) return ''
  const labels: Record<string, string> = {
    morning: 'Morning',
    lunch: 'Lunch',
    afternoon: 'Afternoon',
    evening: 'Evening',
  }
  return labels[time] ?? time
}

export default async function QuickRequestPage() {
  await requireClient()

  const [requests, lastMenu] = await Promise.all([
    getClientRequestHistory(),
    getClientLastMenu(),
  ])

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link href="/my-events">
          <Button variant="ghost" size="sm" className="mb-2">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Events
          </Button>
        </Link>
        <h1 className="text-2xl font-bold text-stone-900">Quick Request</h1>
        <p className="text-stone-600 mt-1">
          Skip the full form. Just pick a date and your chef handles the rest.
        </p>
      </div>

      {/* Quick Request Form */}
      <div className="mb-8">
        <QuickRequestForm lastMenu={lastMenu} />
      </div>

      {/* Request History */}
      {requests.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-stone-900 mb-4">Your Requests</h2>
          <div className="space-y-3">
            {requests.map((req) => (
              <Card key={req.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {getStatusBadge(req.status)}
                        {req.requested_time && (
                          <span className="text-xs text-stone-500">{formatTime(req.requested_time)}</span>
                        )}
                      </div>
                      <p className="text-sm font-medium text-stone-900">
                        {format(new Date(req.requested_date), 'EEEE, MMMM d, yyyy')}
                      </p>
                      <p className="text-sm text-stone-600">
                        {req.guest_count} guest{req.guest_count !== 1 ? 's' : ''}
                      </p>
                      {req.notes && (
                        <p className="text-sm text-stone-500 mt-1 truncate">{req.notes}</p>
                      )}
                      {req.status === 'declined' && req.decline_reason && (
                        <p className="text-sm text-red-600 mt-1">
                          Reason: {req.decline_reason}
                        </p>
                      )}
                    </div>
                    <div className="text-xs text-stone-400 shrink-0">
                      {format(new Date(req.created_at), 'MMM d')}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      <ActivityTracker
        eventType="quick_request_page_viewed"
        metadata={{ request_count: requests.length }}
      />
    </div>
  )
}
