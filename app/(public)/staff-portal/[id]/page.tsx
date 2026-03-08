import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getStaffEventView } from '@/lib/staff/staff-event-portal-actions'
import { getChefBrand } from '@/lib/chef/brand'
import { StaffEventView } from '@/components/staff/staff-event-view'
import { Card, CardContent } from '@/components/ui/card'

export const metadata: Metadata = {
  title: 'Event Briefing',
  description: 'Staff event briefing portal.',
  robots: { index: false, follow: false, nocache: true },
}

export default async function StaffPortalPage({ params }: { params: { id: string } }) {
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

  const brand = await getChefBrand(result.chefId)

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-950 to-stone-900">
      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Chef brand header */}
        <div className="flex items-center gap-3 mb-4">
          {brand.mode === 'full' && brand.logoUrl && (
            <img
              src={brand.logoUrl}
              alt={brand.businessName}
              className="h-10 w-10 rounded-lg object-cover"
            />
          )}
          <span className="text-lg font-semibold text-stone-100">{brand.businessName}</span>
        </div>
        <StaffEventView eventData={result.data} token={params.id} />
        {/* Powered by ChefFlow footer (free tier only) */}
        {brand.showPoweredBy && (
          <p className="text-center text-xs text-stone-500 mt-6">
            Powered by{' '}
            <a
              href="https://cheflowhq.com"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-stone-400"
            >
              ChefFlow
            </a>
          </p>
        )}
      </div>
    </div>
  )
}
