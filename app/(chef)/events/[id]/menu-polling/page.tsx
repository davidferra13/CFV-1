import Link from 'next/link'
import { format } from 'date-fns'
import { notFound } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { getCircleForContext } from '@/lib/hub/circle-lookup'
import {
  getDinnerCircleMenuPollingState,
  type DinnerCircleMenuPollingState,
} from '@/lib/hub/menu-poll-actions'
import { EventMenuPollingClient } from './menu-polling-client'

type CanonicalDishSummary = {
  id: string
  name: string
  course: string | null
  description: string | null
  dietary_tags: string[] | null
  allergen_flags: string[] | null
  linked_recipe_id: string | null
}

export default async function EventMenuPollingPage({ params }: { params: { id: string } }) {
  const user = await requireChef()
  const db: any = createServerClient({ admin: true })

  const { data: event } = await db
    .from('events')
    .select('id, tenant_id, occasion, event_date, guest_count, course_count, menu_id')
    .eq('id', params.id)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!event) notFound()

  const [{ data: dishes }, circle] = await Promise.all([
    db
      .from('dish_index')
      .select('id, name, course, description, dietary_tags, allergen_flags, linked_recipe_id')
      .eq('tenant_id', user.tenantId!)
      .eq('archived', false)
      .order('course', { ascending: true })
      .order('name', { ascending: true }),
    getCircleForContext({ eventId: params.id }),
  ])

  let currentState: DinnerCircleMenuPollingState | null = null
  if (circle) {
    currentState = await getDinnerCircleMenuPollingState({
      eventId: params.id,
      groupId: circle.groupId,
      groupToken: circle.groupToken,
    }).catch(() => null)
  }

  const eventLabel = [event.occasion ?? 'Dinner event']
  if (event.event_date) {
    eventLabel.push(format(new Date(event.event_date), 'MMMM d, yyyy'))
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            href={`/events/${params.id}/menu-approval`}
            className="text-sm text-stone-500 hover:text-stone-300"
          >
            Back to menu approval
          </Link>
          <h1 className="mt-2 text-3xl font-bold text-stone-100">Dinner Circle Menu Polling</h1>
          <p className="mt-1 text-sm text-stone-400">{eventLabel.join(' | ')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/events/${params.id}`}>
            <Button variant="secondary">Back to event</Button>
          </Link>
          {circle ? (
            <Link href={`/hub/g/${circle.groupToken}`} target="_blank" rel="noopener noreferrer">
              <Button variant="secondary">Open Dinner Circle</Button>
            </Link>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-5">
          <div className="text-xs uppercase tracking-[0.2em] text-stone-500">Dish Index</div>
          <div className="mt-2 text-2xl font-semibold text-stone-100">
            {(dishes ?? []).length.toLocaleString()}
          </div>
          <p className="mt-2 text-sm text-stone-400">
            Only canonical dishes from your Dish Index can be published into Dinner Circle polls.
          </p>
        </Card>
        <Card className="p-5">
          <div className="text-xs uppercase tracking-[0.2em] text-stone-500">Live Iteration</div>
          <div className="mt-2 text-2xl font-semibold text-stone-100">
            {currentState?.courses.length ?? 0}
          </div>
          <p className="mt-2 text-sm text-stone-400">
            {currentState?.isFullyLocked
              ? 'Final selections are locked into the event menu.'
              : currentState?.courses.length
                ? 'Course polls are currently live inside the Dinner Circle.'
                : 'No menu poll iteration is live yet.'}
          </p>
        </Card>
        <Card className="p-5">
          <div className="text-xs uppercase tracking-[0.2em] text-stone-500">Dinner Circle</div>
          <div className="mt-2 text-lg font-semibold text-stone-100">
            {circle ? 'Connected' : 'Auto-create on publish'}
          </div>
          <p className="mt-2 text-sm text-stone-400">
            Publishing a menu poll iteration will post course polls directly into the existing
            Dinner Circle feed and preserve revision history.
          </p>
        </Card>
      </div>

      <EventMenuPollingClient
        eventId={event.id}
        groupToken={circle?.groupToken ?? null}
        initialState={currentState}
        initialCourseCount={Math.max(event.course_count ?? 1, 1)}
        dishes={(dishes ?? []) as CanonicalDishSummary[]}
      />
    </div>
  )
}
