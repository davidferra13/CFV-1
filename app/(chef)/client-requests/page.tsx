// Chef Quick Requests Page
// View and manage client quick requests (pending, confirmed, declined, converted).

import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { getQuickRequests } from '@/lib/client-requests/actions'
import { RequestQueue } from '@/components/client-requests/request-queue'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Zap } from 'lucide-react'

export const metadata: Metadata = { title: 'Client Requests - ChefFlow' }

export default async function ClientRequestsPage() {
  await requireChef()

  const requests = await getQuickRequests()
  const pending = requests.filter((r) => r.status === 'pending')
  const others = requests.filter((r) => r.status !== 'pending')

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-stone-900 flex items-center gap-2">
          <Zap className="h-6 w-6 text-amber-500" />
          Client Quick Requests
        </h1>
        <p className="text-stone-600 mt-1">
          Requests from your recurring clients. Convert to events or confirm directly.
        </p>
      </div>

      {/* Pending requests */}
      {pending.length > 0 ? (
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wide mb-3">
            Pending ({pending.length})
          </h2>
          <RequestQueue requests={pending} />
        </section>
      ) : (
        <Card className="mb-8">
          <CardContent className="p-8 text-center">
            <p className="text-stone-500">No pending requests right now.</p>
          </CardContent>
        </Card>
      )}

      {/* Past requests */}
      {others.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wide mb-3">
            Past Requests ({others.length})
          </h2>
          <div className="space-y-2">
            {others.map((req) => {
              const statusConfig: Record<string, { variant: 'default' | 'success' | 'error' | 'info'; label: string }> = {
                confirmed: { variant: 'success', label: 'Confirmed' },
                declined: { variant: 'error', label: 'Declined' },
                converted: { variant: 'info', label: 'Converted to Event' },
              }
              const config = statusConfig[req.status] ?? { variant: 'default', label: req.status }
              return (
                <Card key={req.id} className="opacity-75">
                  <CardContent className="p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge variant={config.variant}>{config.label}</Badge>
                      <span className="text-sm text-stone-700">{req.client.full_name}</span>
                      <span className="text-sm text-stone-500">{req.requested_date}</span>
                      <span className="text-sm text-stone-500">{req.guest_count} guests</span>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}
