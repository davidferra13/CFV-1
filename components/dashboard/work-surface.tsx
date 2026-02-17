// Dashboard Work Surface — Renders categorized preparable work
// Server component. No client-side state.

import Link from 'next/link'
import { format, formatDistanceToNow } from 'date-fns'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { DashboardWorkSurface, WorkItem, WorkCategory, WorkUrgency } from '@/lib/workflow/types'

// ============================================
// SUMMARY BAR
// ============================================

function SummaryBar({ surface }: { surface: DashboardWorkSurface }) {
  const { summary } = surface

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card>
        <CardContent className="pt-6">
          <div className="text-sm font-medium text-stone-500">Active Events</div>
          <div className="text-3xl font-bold text-stone-900 mt-2">{summary.totalActiveEvents}</div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="text-sm font-medium text-stone-500">Preparable Now</div>
          <div className="text-3xl font-bold text-brand-600 mt-2">{summary.totalPreparableActions}</div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="text-sm font-medium text-stone-500">Blocked</div>
          <div className="text-3xl font-bold text-stone-400 mt-2">{summary.totalBlockedActions}</div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="text-sm font-medium text-amber-600">Fragile if Delayed</div>
          <div className="text-3xl font-bold text-amber-600 mt-2">{summary.totalFragileActions}</div>
        </CardContent>
      </Card>
    </div>
  )
}

// ============================================
// WORK ITEM ROW
// ============================================

const URGENCY_STYLES: Record<WorkUrgency, string> = {
  fragile: 'border-l-4 border-l-amber-500 bg-amber-50',
  normal: 'border-l-4 border-l-brand-400',
  low: 'border-l-4 border-l-stone-300'
}

const CATEGORY_BADGE: Record<WorkCategory, { label: string; variant: 'default' | 'success' | 'warning' | 'error' | 'info' }> = {
  blocked: { label: 'Blocked', variant: 'error' },
  preparable: { label: 'Ready', variant: 'success' },
  optional_early: { label: 'Optional', variant: 'info' }
}

function WorkItemRow({ item }: { item: WorkItem }) {
  const eventDate = new Date(item.eventDate)
  const timeUntil = formatDistanceToNow(eventDate, { addSuffix: true })
  const badge = CATEGORY_BADGE[item.category]

  return (
    <Link
      href={`/events/${item.eventId}`}
      className={`block rounded-lg p-4 hover:shadow-sm transition-all ${URGENCY_STYLES[item.urgency]}`}
    >
      <div className="flex justify-between items-start gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-stone-900 text-sm">{item.title}</span>
            <Badge variant={badge.variant}>{badge.label}</Badge>
            {item.urgency === 'fragile' && (
              <Badge variant="warning">Fragile</Badge>
            )}
          </div>
          <p className="text-sm text-stone-600 mt-1">{item.description}</p>
          {item.blockedBy && (
            <p className="text-xs text-red-600 mt-1">Waiting on: {item.blockedBy}</p>
          )}
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-sm font-medium text-stone-900 truncate max-w-[140px]">{item.eventOccasion}</p>
          <p className="text-xs text-stone-500">{item.clientName}</p>
          <p className="text-xs text-stone-400 mt-1">{timeUntil}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 mt-2">
        <span className="text-xs text-stone-400">
          Stage {item.stageNumber}: {item.stageLabel}
        </span>
        <span className="text-xs text-stone-300">|</span>
        <span className="text-xs text-stone-400">
          {format(eventDate, 'MMM d, yyyy')}
        </span>
      </div>
    </Link>
  )
}

// ============================================
// WORK SECTION
// ============================================

function WorkSection({
  title,
  description,
  items,
  emptyMessage,
  defaultCollapsed = false
}: {
  title: string
  description: string
  items: WorkItem[]
  emptyMessage: string
  defaultCollapsed?: boolean
}) {
  if (items.length === 0 && defaultCollapsed) return null

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>{title} ({items.length})</CardTitle>
            <p className="text-sm text-stone-500 mt-1">{description}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-stone-400 py-4 text-center">{emptyMessage}</p>
        ) : (
          <div className="space-y-3">
            {items.map(item => (
              <WorkItemRow key={item.id} item={item} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================
// MAIN EXPORT
// ============================================

export function DashboardWorkSurfaceView({ surface }: { surface: DashboardWorkSurface }) {
  const hasNoEvents = surface.summary.totalActiveEvents === 0 &&
    surface.byEvent.every(e => e.facts.isTerminal)

  if (hasNoEvents && surface.byEvent.length === 0) {
    return (
      <div className="space-y-6">
        <SummaryBar surface={surface} />
        <Card className="p-12 text-center">
          <h3 className="text-lg font-medium text-stone-900">No active events</h3>
          <p className="text-stone-500 mt-2">
            Create your first event to see preparable work here.
          </p>
          <Link
            href="/events/new"
            className="inline-flex items-center justify-center mt-4 px-4 py-2 bg-brand-600 text-white rounded-md hover:bg-brand-700 transition-colors font-medium text-sm"
          >
            Create Event
          </Link>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <SummaryBar surface={surface} />

      {/* Fragile items — top priority, always visible */}
      {surface.fragile.length > 0 && (
        <WorkSection
          title="Fragile if Delayed"
          description="These will cause stacking or stress if not handled soon."
          items={surface.fragile}
          emptyMessage=""
        />
      )}

      {/* Preparable work — the main answer */}
      <WorkSection
        title="Preparable Now"
        description="Work you can safely do right now based on confirmed facts."
        items={surface.preparable}
        emptyMessage="Nothing to prepare right now. All active work is either blocked or optional."
      />

      {/* Blocked work — what is waiting */}
      <WorkSection
        title="Blocked"
        description="Waiting on missing information or external actions."
        items={surface.blocked}
        emptyMessage="Nothing is blocked. All facts are confirmed."
      />

      {/* Optional early — stress reducers */}
      <WorkSection
        title="Stress Reducers"
        description="Optional early work that reduces future pressure."
        items={surface.optionalEarly}
        emptyMessage="No optional early work available."
        defaultCollapsed
      />
    </div>
  )
}
