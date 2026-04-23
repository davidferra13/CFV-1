import Link from 'next/link'
import { ArrowRight } from '@/components/ui/icons'
import type { SurfaceActionTask } from '@/lib/interface/action-layer'

const TONE_STYLES = {
  brand: {
    panel: 'border-brand-700/50 bg-gradient-to-br from-brand-950/70 via-stone-950 to-stone-950',
    badge: 'border-brand-700/60 bg-brand-950/70 text-brand-200',
    cta: 'bg-brand-500 text-white hover:bg-brand-400',
    chip: 'border-brand-800/60 bg-brand-950/50 text-brand-200',
  },
  sky: {
    panel: 'border-sky-800/60 bg-gradient-to-br from-sky-950/55 via-stone-950 to-stone-950',
    badge: 'border-sky-800/60 bg-sky-950/70 text-sky-200',
    cta: 'bg-sky-500 text-slate-950 hover:bg-sky-400',
    chip: 'border-sky-900/70 bg-sky-950/40 text-sky-100',
  },
  emerald: {
    panel:
      'border-emerald-800/60 bg-gradient-to-br from-emerald-950/55 via-stone-950 to-stone-950',
    badge: 'border-emerald-800/60 bg-emerald-950/70 text-emerald-200',
    cta: 'bg-emerald-500 text-slate-950 hover:bg-emerald-400',
    chip: 'border-emerald-900/70 bg-emerald-950/40 text-emerald-100',
  },
  rose: {
    panel: 'border-rose-800/60 bg-gradient-to-br from-rose-950/60 via-stone-950 to-stone-950',
    badge: 'border-rose-800/60 bg-rose-950/70 text-rose-200',
    cta: 'bg-rose-500 text-white hover:bg-rose-400',
    chip: 'border-rose-900/70 bg-rose-950/45 text-rose-100',
  },
  amber: {
    panel: 'border-amber-800/60 bg-gradient-to-br from-amber-950/60 via-stone-950 to-stone-950',
    badge: 'border-amber-800/60 bg-amber-950/70 text-amber-200',
    cta: 'bg-amber-400 text-slate-950 hover:bg-amber-300',
    chip: 'border-amber-900/70 bg-amber-950/45 text-amber-100',
  },
  slate: {
    panel: 'border-stone-700/70 bg-gradient-to-br from-stone-900 via-stone-950 to-black',
    badge: 'border-stone-700/80 bg-stone-900/70 text-stone-200',
    cta: 'bg-stone-100 text-stone-950 hover:bg-white',
    chip: 'border-stone-700/70 bg-stone-900/70 text-stone-200',
  },
} as const

export function ActionSurfaceCard({
  sectionLabel,
  task,
}: {
  sectionLabel: string
  task: SurfaceActionTask
}) {
  const toneStyles = TONE_STYLES[task.tone]

  return (
    <section
      className={`overflow-hidden rounded-[28px] border p-5 shadow-[var(--shadow-card-hover)] sm:p-6 ${toneStyles.panel}`}
    >
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${toneStyles.badge}`}
            >
              {task.badge}
            </span>
            {task.remainingCount > 0 ? (
              <span className="text-xs font-medium text-stone-400">
                {task.remainingCount}{' '}
                {task.remainingLabel ?? 'more waiting after this'}
              </span>
            ) : null}
          </div>
          <div className="mt-4 space-y-2">
            <div className="section-label text-stone-400">{sectionLabel}</div>
            <h2 className="text-2xl font-display tracking-tight text-stone-50 sm:text-3xl">
              {task.title}
            </h2>
            <p className="max-w-2xl text-sm leading-6 text-stone-300 sm:text-base">
              {task.description}
            </p>
          </div>
          {task.context.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {task.context.map((item) => (
                <span
                  key={item}
                  className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${toneStyles.chip}`}
                >
                  {item}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        <Link
          href={task.href}
          className={`inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold transition-colors ${toneStyles.cta}`}
        >
          <span>{task.ctaLabel}</span>
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  )
}
