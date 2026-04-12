// Menu Board Display
// Full-screen, large-text read-only view of today's event menu organized by course.
// Designed to be left open on a kitchen display or tablet during service.
// Refreshes every 60 seconds via meta refresh.

import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = { title: 'Menu Board' }

// Dietary tag display abbreviations
const DIETARY_SHORT: Record<string, string> = {
  vegan: 'VE',
  vegetarian: 'V',
  'gluten-free': 'GF',
  'dairy-free': 'DF',
  'nut-free': 'NF',
  halal: 'HL',
  kosher: 'KO',
  pescatarian: 'PE',
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

function formatTime(timeStr: string): string {
  const [h, m] = timeStr.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${displayH}:${String(m).padStart(2, '0')} ${period}`
}

interface Dish {
  id: string
  course_number: number
  course_name: string
  name: string
  description: string | null
  dietary_tags: string[]
  allergen_flags: string[]
  chef_notes: string | null
}

interface EventWithMenu {
  id: string
  occasion: string | null
  event_date: string
  serve_time: string | null
  guest_count: number | null
  status: string
  clientName: string | null
  courses: Array<{
    course_number: number
    course_name: string
    dishes: Dish[]
  }>
}

async function getTodayEventWithMenu(): Promise<EventWithMenu | null> {
  const user = await requireChef()
  const db: any = createServerClient()
  const tenantId = user.tenantId!
  const _mbp = new Date()
  const today = `${_mbp.getFullYear()}-${String(_mbp.getMonth() + 1).padStart(2, '0')}-${String(_mbp.getDate()).padStart(2, '0')}`

  // Find today's most relevant event (in_progress first, then confirmed)
  const { data: events } = await db
    .from('events')
    .select('id, occasion, event_date, serve_time, guest_count, status, client_id')
    .eq('tenant_id', tenantId)
    .in('status', ['in_progress', 'confirmed'])
    .gte('event_date', today + 'T00:00:00')
    .lte('event_date', today + 'T23:59:59')
    .limit(5)

  if (!events?.length) return null

  const inProgress = (events as any[]).find((e: any) => e.status === 'in_progress')
  const targetEvent = inProgress ?? events[0]

  // Fetch client name
  let clientName: string | null = null
  if (targetEvent.client_id) {
    const { data: client } = await db
      .from('clients')
      .select('full_name')
      .eq('id', targetEvent.client_id)
      .eq('tenant_id', tenantId)
      .single()
    clientName = client?.full_name ?? null
  }

  // Get linked menu
  const { data: eventMenus } = await db
    .from('event_menus')
    .select('menu_id')
    .eq('event_id', targetEvent.id)
    .limit(1)

  if (!eventMenus?.length) {
    return {
      ...targetEvent,
      clientName,
      courses: [],
    }
  }

  const menuId = eventMenus[0].menu_id

  // Fetch dishes ordered by course
  const { data: dishes } = await db
    .from('dishes')
    .select(
      'id, course_number, course_name, name, description, dietary_tags, allergen_flags, chef_notes'
    )
    .eq('menu_id', menuId)
    .eq('tenant_id', tenantId)
    .order('course_number', { ascending: true })

  // Group dishes by course_name (section label), preserving order by min course_number
  const courseMap = new Map<
    string,
    { course_number: number; course_name: string; dishes: Dish[] }
  >()
  for (const dish of dishes ?? []) {
    const key = dish.course_name
    if (!courseMap.has(key)) {
      courseMap.set(key, {
        course_number: dish.course_number,
        course_name: dish.course_name,
        dishes: [],
      })
    } else {
      // Track minimum course_number so section order is stable
      const existing = courseMap.get(key)!
      if (dish.course_number < existing.course_number) {
        existing.course_number = dish.course_number
      }
    }
    courseMap.get(key)!.dishes.push(dish)
  }

  const courses = Array.from(courseMap.values()).sort((a, b) => a.course_number - b.course_number)

  return {
    ...targetEvent,
    clientName,
    courses,
  }
}

export default async function MenuBoardPage() {
  await requireChef()
  const event = await getTodayEventWithMenu()

  if (!event) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="text-5xl">🍽️</div>
        <h1 className="text-2xl font-bold text-stone-100">No Event Today</h1>
        <p className="text-stone-400 text-sm">
          Menu board shows the menu for your confirmed or in-progress event today. No events are
          active right now.
        </p>
        <div className="flex justify-center gap-3 mt-4">
          <Link href="/events">
            <Button variant="secondary" size="sm">
              View Events
            </Button>
          </Link>
          <Link href="/stations">
            <Button variant="ghost" size="sm">
              Back to Stations
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  const eventLabel = [
    event.occasion ?? 'Private Event',
    event.clientName ? `for ${event.clientName}` : null,
  ]
    .filter(Boolean)
    .join(' ')

  const hasDishes = event.courses.length > 0

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-stone-100">{eventLabel}</h1>
          <p className="mt-1 text-stone-400 text-sm">
            {formatDate(event.event_date)}
            {event.serve_time ? ` · Service at ${formatTime(event.serve_time)}` : ''}
            {event.guest_count ? ` · ${event.guest_count} guests` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Badge variant={event.status === 'in_progress' ? 'success' : 'warning'}>
            {event.status === 'in_progress' ? 'Live' : 'Confirmed'}
          </Badge>
          <Link href="/stations">
            <Button variant="ghost" size="sm">
              Back
            </Button>
          </Link>
        </div>
      </div>

      {/* No menu attached */}
      {!hasDishes && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-stone-400 text-sm">No menu linked to this event yet.</p>
            <Link href={`/events/${event.id}`} className="mt-3 inline-block">
              <Button variant="secondary" size="sm">
                Add Menu to Event
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Course display */}
      {hasDishes && (
        <div className="space-y-6">
          {event.courses.map((course) => (
            <section key={course.course_number}>
              {/* Course header */}
              <div className="flex items-center gap-3 mb-3">
                <span className="text-xs font-semibold uppercase tracking-widest text-stone-500">
                  Course {course.course_number}
                </span>
                <h2 className="text-lg font-semibold text-stone-200">{course.course_name}</h2>
                <div className="flex-1 border-t border-stone-700" />
              </div>

              {/* Dishes in this course */}
              <div className="space-y-3">
                {course.dishes.map((dish) => {
                  const dietaryLabels = (dish.dietary_tags ?? []).map(
                    (t: string) => DIETARY_SHORT[t] ?? t.toUpperCase()
                  )
                  const allergens = dish.allergen_flags ?? []

                  return (
                    <Card key={dish.id} className="border-stone-700">
                      <CardContent className="pt-4 pb-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-base font-semibold text-stone-100 leading-tight">
                              {dish.name}
                            </p>
                            {dish.description && (
                              <p className="mt-0.5 text-sm text-stone-400 leading-relaxed">
                                {dish.description}
                              </p>
                            )}
                            {dish.chef_notes && (
                              <p className="mt-1.5 text-xs text-amber-400/80 italic">
                                {dish.chef_notes}
                              </p>
                            )}
                          </div>
                          {(dietaryLabels.length > 0 || allergens.length > 0) && (
                            <div className="flex flex-wrap gap-1 flex-shrink-0 justify-end max-w-[120px]">
                              {dietaryLabels.map((label: string) => (
                                <span
                                  key={label}
                                  className="inline-block text-xxs font-bold px-1.5 py-0.5 rounded bg-emerald-900/40 text-emerald-400 border border-emerald-800/40"
                                >
                                  {label}
                                </span>
                              ))}
                              {allergens.map((a: string) => (
                                <span
                                  key={a}
                                  className="inline-block text-xxs font-bold px-1.5 py-0.5 rounded bg-red-900/40 text-red-400 border border-red-800/40"
                                >
                                  {a.toUpperCase()}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Footer nav */}
      <div className="flex items-center justify-between pt-2 text-xs text-stone-600 border-t border-stone-800">
        <Link href={`/events/${event.id}`} className="hover:text-stone-400 transition-colors">
          View full event
        </Link>
        <Link href="/kitchen" className="hover:text-stone-400 transition-colors">
          Kitchen Mode
        </Link>
      </div>
    </div>
  )
}
