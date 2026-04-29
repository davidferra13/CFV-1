import {
  EVENT_MOBILE_RUN_MODES,
  buildEventMobileRunModeHref,
} from '@/lib/events/operation-registry'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

type EventRunModeRailProps = {
  eventId: string
  status: string
  compact?: boolean
  showPrintCenter?: boolean
  showDocuments?: boolean
  currentModeId?: string
  className?: string
}

type RailAction = {
  id: string
  title: string
  description: string
  moment: string
  href: string
  disabledReason?: string
}

function getModeDisabledReason(modeId: string, status: string): string | undefined {
  if (status === 'cancelled') return 'Cancelled event'
  if (modeId === 'closeout' && status !== 'completed') return 'Complete event first'
  if (modeId === 'dop' && status === 'draft') return 'Confirm event first'
  return undefined
}

function buildRailActions(
  eventId: string,
  status: string,
  showPrintCenter: boolean,
  showDocuments: boolean
): RailAction[] {
  const modeActions = EVENT_MOBILE_RUN_MODES.map((mode) => ({
    id: mode.id,
    title: mode.title,
    description: mode.description,
    moment: mode.moment,
    href: buildEventMobileRunModeHref(eventId, mode),
    disabledReason: getModeDisabledReason(mode.id, status),
  }))

  const printActions: RailAction[] = []
  if (showPrintCenter) {
    printActions.push({
      id: 'print',
      title: 'Print Center',
      description: 'Kitchen, service, handoff, and safety packet launcher.',
      moment: 'Print',
      href: `/events/${eventId}/print`,
      disabledReason: status === 'cancelled' ? 'Cancelled event' : undefined,
    })
  }
  if (showDocuments) {
    printActions.push({
      id: 'documents',
      title: 'Document Archive',
      description: 'Versioned PDFs, packet history, and document recovery.',
      moment: 'Archive',
      href: `/events/${eventId}/documents`,
    })
  }

  return [...modeActions, ...printActions]
}

export function EventRunModeRail({
  eventId,
  status,
  compact = false,
  showPrintCenter = true,
  showDocuments = true,
  currentModeId,
  className = '',
}: EventRunModeRailProps) {
  const actions = buildRailActions(eventId, status, showPrintCenter, showDocuments)

  if (compact) {
    return (
      <div className={`flex flex-wrap items-center gap-2 ${className}`}>
        {actions.map((action) => {
          const active = currentModeId === action.id
          if (action.disabledReason) {
            return (
              <Button
                key={action.id}
                variant="secondary"
                size="sm"
                disabled
                tooltip={action.disabledReason}
              >
                {action.title}
              </Button>
            )
          }

          return (
            <Button
              key={action.id}
              href={action.href}
              variant={active ? 'primary' : 'secondary'}
              size="sm"
            >
              {action.title}
            </Button>
          )
        })}
      </div>
    )
  }

  return (
    <section className={`space-y-3 ${className}`}>
      <div>
        <h2 className="text-xl font-semibold text-stone-100">Run Modes</h2>
        <p className="text-sm text-stone-400">
          Phone-first and packet-first surfaces for the next operational move.
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {actions.map((action) => {
          const active = currentModeId === action.id
          return (
            <div
              key={action.id}
              className={`flex min-h-[150px] flex-col rounded-lg border p-4 ${
                active ? 'border-brand-500/70 bg-brand-950/20' : 'border-stone-800 bg-stone-900/40'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                    {action.moment}
                  </p>
                  <h3 className="mt-1 font-semibold text-stone-100">{action.title}</h3>
                </div>
                {active ? <Badge variant="info">Current</Badge> : null}
              </div>
              <p className="mt-2 text-sm text-stone-400">{action.description}</p>
              <div className="mt-auto pt-4">
                {action.disabledReason ? (
                  <Button variant="secondary" size="sm" disabled tooltip={action.disabledReason}>
                    {action.disabledReason}
                  </Button>
                ) : (
                  <Button href={action.href} variant={active ? 'primary' : 'secondary'} size="sm">
                    Open
                  </Button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
