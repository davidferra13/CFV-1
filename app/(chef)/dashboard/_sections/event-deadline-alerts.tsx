// Event Deadline Alerts - shows events within 14 days missing critical items

import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { AlertTriangle } from '@/components/ui/icons'

function getDaysUntil(dateString: string): number {
  const target = new Date(`${dateString}T00:00:00`)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.ceil((target.getTime() - today.getTime()) / 86400000)
}

function getUrgencyStyle(daysUntil: number) {
  if (daysUntil <= 3) {
    return 'border-l-4 border-l-red-500 bg-red-950/20'
  }
  if (daysUntil <= 7) {
    return 'border-l-4 border-l-amber-500 bg-amber-950/20'
  }
  return 'border-l-4 border-l-stone-600 bg-stone-800/30'
}

type EventRow = {
  id: string
  title: string | null
  occasion: string | null
  event_date: string
  status: string
  guest_count: number | null
  menu_id: string | null
  dietary_restrictions: string | null
  allergies: string[] | null
  client: { full_name: string } | null
}

export async function EventDeadlineAlerts() {
  try {
    const user = await requireChef()
    const db: any = createServerClient()

    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]
    const futureDate = new Date(today)
    futureDate.setDate(futureDate.getDate() + 14)
    const futureStr = futureDate.toISOString().split('T')[0]

    const { data: events, error } = await db
      .from('events')
      .select(
        'id, title, occasion, event_date, status, guest_count, menu_id, dietary_restrictions, allergies, client:clients(full_name)'
      )
      .eq('tenant_id', user.tenantId!)
      .gte('event_date', todayStr)
      .lte('event_date', futureStr)
      .not('status', 'in', '(completed,cancelled)')
      .order('event_date', { ascending: true })

    if (error) {
      console.error('[EventDeadlineAlerts] Query failed:', error)
      return null
    }

    if (!events || events.length === 0) return null

    // Compute missing items for each event
    const eventsWithIssues = (events as EventRow[])
      .map((event) => {
        const missing: string[] = []

        if (!event.menu_id) {
          missing.push('No menu')
        }

        if (event.status === 'draft' || event.status === 'proposed') {
          missing.push('Not confirmed')
        }

        // Check for dietary info: if guests exist but no dietary data captured
        const hasDietaryInfo =
          (event.dietary_restrictions && event.dietary_restrictions.trim().length > 0) ||
          (event.allergies && event.allergies.length > 0)
        if (event.guest_count && event.guest_count > 0 && !hasDietaryInfo) {
          missing.push('No dietary info')
        }

        return { ...event, missing }
      })
      .filter((event) => event.missing.length > 0)

    if (eventsWithIssues.length === 0) return null

    return (
      <Card className="border-stone-800 bg-stone-900/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-medium text-stone-200">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            Approaching Events
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 pt-0">
          {eventsWithIssues.map((event) => {
            const daysUntil = getDaysUntil(event.event_date)
            const urgencyStyle = getUrgencyStyle(daysUntil)
            const displayName =
              event.occasion || event.title || (event.client as any)?.full_name || 'Untitled Event'

            return (
              <Link
                key={event.id}
                href={`/events/${event.id}`}
                className={`block rounded-lg px-4 py-3 transition-colors hover:bg-stone-800/60 ${urgencyStyle}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-stone-200 truncate">{displayName}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {(event.client as any)?.full_name && event.occasion && (
                        <span className="text-xs text-stone-400">
                          {(event.client as any).full_name}
                        </span>
                      )}
                      <span className="text-xs text-stone-500">
                        {format(new Date(`${event.event_date}T00:00:00`), 'MMM d')}
                      </span>
                      {event.guest_count && (
                        <span className="text-xs text-stone-500">
                          {event.guest_count} guest{event.guest_count !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-xs font-medium text-stone-400 whitespace-nowrap">
                    {daysUntil === 0
                      ? 'Today'
                      : daysUntil === 1
                        ? 'Tomorrow'
                        : `${daysUntil}d away`}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {event.missing.map((item) => (
                    <Badge
                      key={item}
                      variant={
                        item === 'No menu'
                          ? 'error'
                          : item === 'Not confirmed'
                            ? 'warning'
                            : 'default'
                      }
                    >
                      {item}
                    </Badge>
                  ))}
                </div>
              </Link>
            )
          })}
        </CardContent>
      </Card>
    )
  } catch (err) {
    console.error('[EventDeadlineAlerts] Unexpected error:', err)
    return null
  }
}
