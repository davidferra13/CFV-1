'use client'

import { Button } from '@/components/ui/button'
import { usePersistentViewState } from '@/lib/view-state/use-persistent-view-state'

type EventStatus =
  | 'all'
  | 'draft'
  | 'proposed'
  | 'accepted'
  | 'paid'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled'

type ViewMode = 'list' | 'kanban'

export function EventsViewFilterBar({
  initialStatus,
  initialView,
}: {
  initialStatus: EventStatus
  initialView: ViewMode
}) {
  const { state, setState } = usePersistentViewState('events.list', {
    strategy: 'url',
    defaults: { status: initialStatus, view: initialView },
  })

  const status = state.status as EventStatus
  const view = state.view as ViewMode

  return (
    <>
      <div
        data-info="view-toggle"
        className="flex border border-stone-700 rounded-lg overflow-hidden"
      >
        <button
          type="button"
          onClick={() => setState({ view: 'list' })}
          className={`px-3 py-1.5 text-sm font-medium transition-colors ${
            view === 'list'
              ? 'bg-stone-900 text-white'
              : 'bg-stone-900 text-stone-400 hover:bg-stone-800'
          }`}
        >
          List
        </button>
        <button
          type="button"
          onClick={() => setState({ view: 'kanban' })}
          className={`px-3 py-1.5 text-sm font-medium transition-colors ${
            view === 'kanban'
              ? 'bg-stone-900 text-white'
              : 'bg-stone-900 text-stone-400 hover:bg-stone-800'
          }`}
        >
          Board
        </button>
      </div>

      {view === 'list' ? (
        <div className="w-full">
          <div className="flex gap-2 flex-wrap">
            {(
              [
                'all',
                'draft',
                'proposed',
                'accepted',
                'paid',
                'confirmed',
                'in_progress',
                'completed',
                'cancelled',
              ] as const
            ).map((nextStatus) => (
              <Button
                key={nextStatus}
                type="button"
                size="sm"
                variant={status === nextStatus ? 'primary' : 'secondary'}
                onClick={() => setState({ status: nextStatus, view: 'list' })}
              >
                {nextStatus === 'all'
                  ? 'All'
                  : nextStatus === 'in_progress'
                    ? 'In Progress'
                    : nextStatus.charAt(0).toUpperCase() + nextStatus.slice(1)}
              </Button>
            ))}
          </div>
        </div>
      ) : null}
    </>
  )
}
