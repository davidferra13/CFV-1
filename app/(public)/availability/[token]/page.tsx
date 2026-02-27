import { createServerClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'

export default async function PublicAvailabilityPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const supabase = createServerClient()

  const { data: shareToken } = await supabase
    .from('chef_availability_share_tokens')
    .select('*, chefs(display_name)')
    .eq('token', token)
    .eq('is_active', true)
    .single()

  if (!shareToken) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-stone-800">
            <svg
              className="h-7 w-7 text-stone-300"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m9.86-2.314a4.5 4.5 0 0 0-1.242-7.244l4.5-4.5a4.5 4.5 0 0 1 6.364 6.364l-1.757 1.757"
              />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-stone-100">Link Not Found</h1>
          <p className="text-sm text-stone-500 mt-2">
            This availability link is invalid or has been revoked.
          </p>
          <p className="text-xs text-stone-300 mt-4">
            Please contact your chef directly for an updated link.
          </p>
        </div>
      </div>
    )
  }

  if (shareToken.expires_at && new Date(shareToken.expires_at) < new Date()) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-stone-800">
            <svg
              className="h-7 w-7 text-stone-300"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
              />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-stone-100">Link Expired</h1>
          <p className="text-sm text-stone-500 mt-2">
            This availability link has expired. Please request a new one from your chef.
          </p>
        </div>
      </div>
    )
  }

  // Fetch events for next 60 days (only dates, no details)
  const now = new Date()
  const sixtyDaysOut = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000)
  const { data: events } = await supabase
    .from('events')
    .select('event_date')
    .eq('tenant_id', shareToken.tenant_id)
    .gte('event_date', now.toISOString().split('T')[0])
    .lte('event_date', sixtyDaysOut.toISOString().split('T')[0])
    .not('status', 'eq', 'cancelled')

  const busyDates = new Set((events ?? []).map((e) => e.event_date))

  // Generate calendar grid for next 60 days
  const days: { date: string; dayOfWeek: number; busy: boolean }[] = []
  for (let i = 0; i < 60; i++) {
    const d = new Date(now.getTime() + i * 24 * 60 * 60 * 1000)
    const dateStr = d.toISOString().split('T')[0]
    days.push({
      date: dateStr,
      dayOfWeek: d.getDay(),
      busy: busyDates.has(dateStr),
    })
  }

  const chefName = (shareToken as any).chefs?.display_name || 'Chef'

  return (
    <div className="max-w-2xl mx-auto py-12 px-4 space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-stone-100">{chefName}&apos;s Availability</h1>
        <p className="text-sm text-stone-500 mt-1">Next 60 days</p>
      </div>

      <Card>
        <CardContent className="py-4">
          <div className="flex gap-4 mb-4 text-xs text-stone-500">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-stone-900 border border-stone-700" />
              <span>Available</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-stone-300" />
              <span>Unavailable</span>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-xs">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d} className="font-medium text-stone-300 py-1">
                {d}
              </div>
            ))}
            {/* Pad first row */}
            {Array.from({ length: days[0]?.dayOfWeek ?? 0 }).map((_, i) => (
              <div key={`pad-${i}`} />
            ))}
            {days.map((day) => (
              <div
                key={day.date}
                className={`py-2 rounded text-xs ${
                  day.busy
                    ? 'bg-stone-300 text-stone-500'
                    : 'bg-stone-900 border border-stone-700 text-stone-300'
                }`}
              >
                {new Date(day.date + 'T12:00:00').getDate()}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <p className="text-center text-xs text-stone-300">
        Contact {chefName} directly to book an available date.
      </p>
    </div>
  )
}
