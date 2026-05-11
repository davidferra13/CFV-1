// Recipe Gap Card
// Shows upcoming events with dishes that have no recipe recorded.
// Forward-looking counterpart to RecipeDebtWidget (which looks backward).

import Link from 'next/link'
import { BookOpen, CheckCircle, AlertCircle } from '@/components/ui/icons'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

type EventGap = {
  eventId: string
  occasion: string | null
  eventDate: string
  clientName: string | null
  gapCount: number
  menuId: string | null
}

type RecipeGapSummary = {
  totalGaps: number
  events: EventGap[]
}

async function getRecipeGapSummary(): Promise<RecipeGapSummary> {
  const user = await requireChef()
  const db: any = createServerClient()

  const todayStr = new Date().toISOString().slice(0, 10)

  // Find components with no recipe on upcoming events
  const { data: components } = await db
    .from('components')
    .select(
      `
      id,
      dish:dishes(
        menu_id,
        menu:menus(
          id,
          event:events(id, occasion, event_date, status, client:clients(full_name))
        )
      )
    `
    )
    .eq('tenant_id', user.tenantId!)
    .is('recipe_id', null)

  // Aggregate gaps per event, filtering to future non-cancelled events
  const eventMap = new Map<string, EventGap>()

  for (const comp of components || []) {
    const dish = comp.dish as {
      menu_id?: string | null
      menu?: {
        id?: string | null
        event?: {
          id?: string
          occasion?: string | null
          event_date?: string
          status?: string
          client?: { full_name?: string | null } | null
        } | null
      } | null
    } | null

    const event = dish?.menu?.event
    if (!event?.id || !event.event_date) continue
    if (event.event_date < todayStr) continue
    if (event.status === 'cancelled' || event.status === 'completed') continue

    const existing = eventMap.get(event.id)
    if (existing) {
      existing.gapCount++
    } else {
      eventMap.set(event.id, {
        eventId: event.id,
        occasion: event.occasion ?? null,
        eventDate: event.event_date,
        clientName: event.client?.full_name ?? null,
        gapCount: 1,
        menuId: dish?.menu?.id ?? null,
      })
    }
  }

  // Sort by event date ascending (soonest first)
  const events = Array.from(eventMap.values()).sort((a, b) =>
    a.eventDate.localeCompare(b.eventDate)
  )

  const totalGaps = events.reduce((sum, e) => sum + e.gapCount, 0)

  return { totalGaps, events }
}

function formatEventDate(dateStr: string): string {
  const date = new Date(`${dateStr}T00:00:00`)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const diffDays = Math.ceil((date.getTime() - today.getTime()) / 86400000)

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Tomorrow'
  if (diffDays <= 6) {
    return date.toLocaleDateString('en-US', { weekday: 'long' })
  }
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export async function RecipeGapCard() {
  let summary: RecipeGapSummary
  try {
    summary = await getRecipeGapSummary()
  } catch (err) {
    console.error('[RecipeGapCard] Failed to load recipe gap summary:', err)
    return null
  }

  // Zero gaps: green celebration state
  if (summary.totalGaps === 0) {
    return (
      <div className="rounded-xl border border-emerald-800/40 bg-emerald-950/20 px-4 py-3 flex items-center gap-3">
        <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0" weight="fill" />
        <p className="text-sm text-emerald-300 font-medium">
          All recipes documented for upcoming events
        </p>
      </div>
    )
  }

  const visibleEvents = summary.events.slice(0, 4)
  const hiddenCount = summary.events.length - visibleEvents.length

  // Urgency: red if any event is within 3 days, amber otherwise
  const now = new Date()
  const todayMs = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const hasUrgent = summary.events.some((e) => {
    const diff = (new Date(`${e.eventDate}T00:00:00`).getTime() - todayMs) / 86400000
    return diff <= 3
  })

  const borderColor = hasUrgent ? 'border-red-800/50' : 'border-amber-800/40'
  const bgColor = hasUrgent ? 'bg-red-950/20' : 'bg-amber-950/20'
  const headlineColor = hasUrgent ? 'text-red-300' : 'text-amber-300'
  const iconColor = hasUrgent ? 'text-red-400' : 'text-amber-400'

  return (
    <div className={`rounded-xl border ${borderColor} ${bgColor} px-4 py-4 space-y-3`}>
      {/* Headline */}
      <div className="flex items-start gap-3">
        <AlertCircle className={`h-5 w-5 mt-0.5 shrink-0 ${iconColor}`} />
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold ${headlineColor}`}>
            {summary.totalGaps} recipe{summary.totalGaps !== 1 ? 's' : ''} needed
          </p>
          <p className="text-xs text-stone-500 mt-0.5">
            {summary.events.length} upcoming event{summary.events.length !== 1 ? 's' : ''} with
            undocumented dishes
          </p>
        </div>
      </div>

      {/* Per-event list */}
      <div className="space-y-1.5 pl-8">
        {visibleEvents.map((event) => {
          const label = event.occasion || event.clientName || formatEventDate(event.eventDate)
          const dateLabel = formatEventDate(event.eventDate)
          const href = event.menuId ? `/menus/${event.menuId}` : `/events/${event.eventId}`

          return (
            <Link
              key={event.eventId}
              href={href}
              className="flex items-center justify-between text-xs group hover:bg-white/[0.04] rounded-lg px-2 py-1.5 -mx-2 transition-colors"
            >
              <span className="text-stone-300 group-hover:text-stone-100 truncate">
                {dateLabel}
                {label !== dateLabel ? ` / ${label}` : ''}
              </span>
              <span
                className={`shrink-0 ml-2 font-medium tabular-nums ${hasUrgent ? 'text-red-400' : 'text-amber-400'}`}
              >
                {event.gapCount} gap{event.gapCount !== 1 ? 's' : ''}
              </span>
            </Link>
          )
        })}

        {hiddenCount > 0 && (
          <Link
            href="/recipes/sprint"
            className="block text-xs text-stone-500 hover:text-stone-300 font-medium px-2 -mx-2 transition-colors"
          >
            +{hiddenCount} more event{hiddenCount !== 1 ? 's' : ''}
          </Link>
        )}
      </div>

      {/* Action link */}
      <div className="pl-8">
        <Link
          href="/recipes/sprint"
          className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md transition-colors ${
            hasUrgent
              ? 'bg-red-600 text-white hover:bg-red-700'
              : 'bg-amber-600 text-white hover:bg-amber-700'
          }`}
        >
          <BookOpen className="h-3.5 w-3.5" />
          Capture Recipes
        </Link>
      </div>
    </div>
  )
}
