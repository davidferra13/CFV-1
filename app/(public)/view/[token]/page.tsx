import { format } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getViewerEventByToken } from '@/lib/sharing/actions'
import { TokenExpiredPage } from '@/components/ui/token-expired-page'
import { ViewerIntentForm } from '@/components/sharing/viewer-intent-form'

export default async function ViewerSharePage({ params }: { params: { token: string } }) {
  const data = await getViewerEventByToken(params.token)

  if (!data) {
    return <TokenExpiredPage reason="not_found" noun="event" />
  }

  const statusLabel =
    data.status === 'confirmed' || data.status === 'paid'
      ? 'Confirmed'
      : data.status === 'completed'
        ? 'Completed'
        : 'Upcoming'

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-50 to-white">
      <div className="max-w-2xl mx-auto px-4 py-8 sm:py-12 space-y-6">
        <div className="text-center">
          {data.chefName && (
            <p className="text-sm font-medium text-brand-600 mb-2">By {data.chefName}</p>
          )}
          <h1 className="text-3xl sm:text-4xl font-bold text-stone-100 mb-3">
            {data.occasion || 'Private Dinner'}
          </h1>
          <Badge variant="success">{statusLabel}</Badge>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Event Preview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {data.eventDate && (
                <div>
                  <div className="text-sm text-stone-500 mb-1">Date</div>
                  <div className="font-medium text-stone-100">
                    {format(new Date(data.eventDate), 'EEEE, MMMM do, yyyy')}
                  </div>
                </div>
              )}
              {data.serveTime && (
                <div>
                  <div className="text-sm text-stone-500 mb-1">Time</div>
                  <div className="font-medium text-stone-100">{data.serveTime.slice(0, 5)}</div>
                </div>
              )}
              {data.guestCount && (
                <div>
                  <div className="text-sm text-stone-500 mb-1">Expected Guests</div>
                  <div className="font-medium text-stone-100">{data.guestCount} guests</div>
                </div>
              )}
              {data.serviceStyle && (
                <div>
                  <div className="text-sm text-stone-500 mb-1">Service Style</div>
                  <div className="font-medium text-stone-100 capitalize">
                    {data.serviceStyle.replace('_', ' ')}
                  </div>
                </div>
              )}
            </div>

            {data.location && (
              <div className="pt-3 border-t border-stone-800">
                <div className="text-sm text-stone-500 mb-1">Location</div>
                <div className="font-medium text-stone-100">
                  {[
                    data.location.address,
                    data.location.city,
                    data.location.state,
                    data.location.zip,
                  ]
                    .filter(Boolean)
                    .join(', ')}
                </div>
                {data.location.notes && (
                  <p className="text-sm text-stone-300 mt-1">{data.location.notes}</p>
                )}
              </div>
            )}

            {data.menus.length > 0 && (
              <div className="pt-3 border-t border-stone-800">
                <div className="text-sm text-stone-500 mb-2">Menu</div>
                <div className="space-y-2">
                  {data.menus.map((menu) => (
                    <div key={menu.id}>
                      <p className="font-medium text-stone-100">{menu.name}</p>
                      {menu.description && (
                        <p className="text-sm text-stone-300">{menu.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {data.inviteNote && (
              <div className="pt-3 border-t border-stone-800">
                <div className="text-sm text-stone-500 mb-1">Invite Note</div>
                <div className="text-sm text-stone-300">{data.inviteNote}</div>
              </div>
            )}
          </CardContent>
        </Card>

        <ViewerIntentForm
          viewerToken={params.token}
          allowJoinRequest={data.permissions.allow_join_request}
          allowBookOwn={data.permissions.allow_book_own}
          rsvpDeadlineAt={data.settings.rsvp_deadline_at}
        />

        {data.chefProfileUrl && (
          <div className="text-center">
            <a
              href={data.chefProfileUrl}
              className="inline-block rounded-md border border-stone-700 px-4 py-2 text-sm text-stone-300 hover:border-stone-600"
            >
              View Chef Profile
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
