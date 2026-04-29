import { Button } from '@/components/ui/button'
import { PlatformStatusChip } from './platform-status-chip'
import type { ContextPanelSection as ContextPanelSectionType } from './context-panel-types'

const STATE_COPY: Record<NonNullable<ContextPanelSectionType['state']>, string> = {
  loading: 'Loading source data',
  empty: 'Nothing needs attention',
  error: 'Source unavailable',
  populated: '',
}

export function ContextPanelSection({
  title,
  description,
  state = 'populated',
  status,
  metrics = [],
  actions = [],
}: ContextPanelSectionType) {
  return (
    <section className="rounded-lg border border-stone-800 bg-stone-950/40 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-stone-100">{title}</h3>
          {description ? (
            <p className="mt-1 text-xs leading-5 text-stone-400">{description}</p>
          ) : null}
        </div>
        {status ? <PlatformStatusChip {...status} /> : null}
      </div>

      {state !== 'populated' ? (
        <p
          className={`mt-3 rounded-md border px-2 py-1.5 text-xs ${
            state === 'error'
              ? 'border-red-800/50 bg-red-950/30 text-red-300'
              : state === 'loading'
                ? 'border-stone-700 bg-stone-900 text-stone-300'
                : 'border-stone-800 bg-stone-900/70 text-stone-400'
          }`}
        >
          {STATE_COPY[state]}
        </p>
      ) : null}

      {metrics.length > 0 ? (
        <dl className="mt-3 grid grid-cols-2 gap-2">
          {metrics.map((metric) => (
            <div key={metric.label} className="rounded-md bg-stone-900 px-2 py-2">
              <dt className="truncate text-xxs uppercase tracking-[0.16em] text-stone-500">
                {metric.label}
              </dt>
              <dd className="mt-1 truncate text-sm font-semibold text-stone-100">{metric.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      {actions.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {actions.map((action) => (
            <Button
              key={`${action.href}-${action.label}`}
              href={action.href}
              variant={action.variant ?? 'secondary'}
              size="sm"
              className="min-h-9 px-3 text-xs"
            >
              {action.label}
            </Button>
          ))}
        </div>
      ) : null}
    </section>
  )
}
