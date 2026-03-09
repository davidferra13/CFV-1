import { Badge } from '@/components/ui/badge'
import {
  Car,
  ChefHat,
  CheckCircle,
  ClipboardList,
  Flame,
  Package,
  ShoppingCart,
  Sparkles,
  Utensils,
  Wrench,
} from '@/components/ui/icons'
import {
  PREP_TIMELINE_LABELS,
  type PrepTimelineStatus,
  type PrepTimelineStepKey,
} from '@/lib/events/prep-timeline-constants'

type PrepTimelineClientProps = {
  steps: Array<{
    id: string
    step_key: PrepTimelineStepKey
    status: PrepTimelineStatus
    started_at: string | null
    completed_at: string | null
    client_visible_note: string | null
  }>
}

const iconMap: Record<PrepTimelineStepKey, any> = {
  menu_planning: ClipboardList,
  ingredient_sourcing: ShoppingCart,
  prep_work: ChefHat,
  packing: Package,
  travel: Car,
  setup: Wrench,
  cooking: Flame,
  serving: Utensils,
  cleanup: Sparkles,
  complete: CheckCircle,
}

function formatTimestamp(value: string | null) {
  if (!value) return null
  return new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function getStatusBadge(status: PrepTimelineStatus) {
  if (status === 'completed') return <Badge variant="success">Completed</Badge>
  if (status === 'in_progress') return <Badge variant="warning">In Progress</Badge>
  if (status === 'skipped') return <Badge variant="info">Skipped</Badge>
  return <Badge variant="default">Pending</Badge>
}

export function PrepTimelineClient({ steps }: PrepTimelineClientProps) {
  if (!steps.length) {
    return null
  }

  return (
    <div className="space-y-4">
      {steps.map((step, index) => {
        const Icon = iconMap[step.step_key] ?? ClipboardList
        const timestamp = formatTimestamp(step.completed_at ?? step.started_at)
        const isComplete = step.status === 'completed'
        const isActive = step.status === 'in_progress'

        return (
          <div key={step.id} className="flex gap-4">
            <div className="flex flex-col items-center">
              <div
                className={[
                  'flex h-10 w-10 items-center justify-center rounded-full border',
                  isComplete
                    ? 'border-emerald-700 bg-emerald-950 text-emerald-400'
                    : isActive
                      ? 'border-amber-700 bg-amber-950 text-amber-400'
                      : 'border-stone-700 bg-stone-900 text-stone-400',
                ].join(' ')}
              >
                {isComplete ? <CheckCircle className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
              </div>
              {index < steps.length - 1 && <div className="mt-2 h-full min-h-8 w-px bg-stone-800" />}
            </div>

            <div className="flex-1 pb-4">
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="font-medium text-stone-100">{PREP_TIMELINE_LABELS[step.step_key]}</h4>
                {getStatusBadge(step.status)}
              </div>
              {timestamp && <p className="mt-1 text-xs text-stone-400">{timestamp}</p>}
              {step.client_visible_note && (
                <p className="mt-2 text-sm text-stone-300">{step.client_visible_note}</p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
