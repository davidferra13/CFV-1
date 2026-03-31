import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import { checkRateLimit } from '@/lib/rateLimit'
import { getStaffEventView } from '@/lib/staff/staff-event-portal-actions'
import { StaffEventView } from '@/components/staff/staff-event-view'
import { Card, CardContent } from '@/components/ui/card'

export const metadata: Metadata = {
  title: 'Event Briefing',
  description: 'Staff event briefing portal.',
  robots: { index: false, follow: false, nocache: true },
}

export default async function StaffPortalPage({ params }: { params: { id: string } }) {
  const headersList = await headers()
  const ip = headersList.get('x-forwarded-for')?.split(',')[0] || 'unknown'

  try {
    await checkRateLimit(`staff-portal:${ip}`, 60, 15 * 60 * 1000)
  } catch {
    return (
      <div className="min-h-screen flex items-center justify-center text-stone-400">
        Too many requests. Please try again later.
      </div>
    )
  }

  const result = await getStaffEventView(params.id)

  if (result.state === 'invalid') {
    notFound()
  }

  if (result.state === 'revoked') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-stone-950 to-stone-900 flex items-center justify-center px-4">
        <Card className="max-w-sm w-full">
          <CardContent className="py-8 text-center">
            <div className="text-3xl mb-3">🚫</div>
            <h1 className="text-lg font-semibold text-stone-100 mb-2">Access Revoked</h1>
            <p className="text-sm text-stone-400">
              This portal link has been revoked by the chef. Contact them directly if you need event
              details.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (result.state === 'expired') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-stone-950 to-stone-900 flex items-center justify-center px-4">
        <Card className="max-w-sm w-full">
          <CardContent className="py-8 text-center">
            <div className="text-3xl mb-3">⏰</div>
            <h1 className="text-lg font-semibold text-stone-100 mb-2">Link Expired</h1>
            <p className="text-sm text-stone-400">
              This portal link has expired. Ask the chef to send you a new one.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-950 to-stone-900">
      <div className="max-w-lg mx-auto px-4 py-6">
        <StaffEventView eventData={result.data} token={params.id} />
      </div>
    </div>
  )
}
