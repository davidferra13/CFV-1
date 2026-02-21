import { createServerClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'

export default async function PublicAvailabilityPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const supabase = await createServerClient()

  const { data: shareToken } = await (supabase as any)
    .from('chef_availability_share_tokens')
    .select('*, chefs(display_name)')
    .eq('token', token)
    .eq('is_active', true)
    .single()

  if (!shareToken) {
    return (
      <div className="max-w-md mx-auto mt-20 text-center">
        <h1 className="text-xl font-bold text-stone-900">Link Not Found</h1>
        <p className="text-sm text-stone-500 mt-2">
          This availability link is invalid or has been revoked.
        </p>
      </div>
    )
  }

  if (shareToken.expires_at && new Date(shareToken.expires_at) < new Date()) {
    return (
      <div className="max-w-md mx-auto mt-20 text-center">
        <h1 className="text-xl font-bold text-stone-900">Link Expired</h1>
        <p className="text-sm text-stone-500 mt-2">
          This availability link has expired. Please request a new one.
        </p>
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
        <h1 className="text-2xl font-bold text-stone-900">{chefName}&apos;s Availability</h1>
        <p className="text-sm text-stone-500 mt-1">Next 60 days</p>
      </div>

      <Card>
        <CardContent className="py-4">
          <div className="flex gap-4 mb-4 text-xs text-stone-500">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-white border border-stone-200" />
              <span>Available</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-stone-300" />
              <span>Unavailable</span>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-xs">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d} className="font-medium text-stone-400 py-1">
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
                    : 'bg-white border border-stone-200 text-stone-700'
                }`}
              >
                {new Date(day.date + 'T12:00:00').getDate()}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <p className="text-center text-xs text-stone-400">
        Contact {chefName} directly to book an available date.
      </p>
    </div>
  )
}
