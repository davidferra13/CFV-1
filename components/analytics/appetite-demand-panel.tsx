import Link from 'next/link'
import { ArrowUpRight, Sparkles } from 'lucide-react'
import type {
  AppetiteDemandConfidence,
  AppetiteDemandPanelModel,
} from '@/lib/analytics/appetite-demand'

const CONFIDENCE_LABEL: Record<AppetiteDemandConfidence, string> = {
  early: 'Early signal',
  growing: 'Growing',
  strong: 'Strong signal',
}

export function AppetiteDemandPanel({
  model,
  loadFailed = false,
  days = 30,
}: {
  model: AppetiteDemandPanelModel | null
  loadFailed?: boolean
  days?: number
}) {
  return (
    <section className="rounded-2xl border border-stone-700/60 bg-stone-900/60 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-brand-300">
            <Sparkles className="h-4 w-4" />
            Appetite demand
          </p>
          <h2 className="mt-2 text-xl font-semibold text-stone-100">
            What people are leaning toward
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-stone-400">
            Aggregate food-discovery behavior from the last {days} days. Use it to spot demand
            before it becomes a booking pattern.
          </p>
        </div>
        <span className="rounded-full border border-stone-700 px-3 py-1 text-xs text-stone-500">
          Aggregate behavior only
        </span>
      </div>

      {loadFailed ? (
        <div className="mt-5 rounded-xl border border-amber-800/50 bg-amber-950/20 p-4">
          <p className="text-sm font-medium text-amber-100">
            Appetite demand is temporarily unavailable.
          </p>
          <p className="mt-1 text-xs text-amber-200/70">
            Seasonal booking demand below is still available.
          </p>
        </div>
      ) : !model?.hasDemand ? (
        <div className="mt-5 rounded-xl border border-stone-800 bg-stone-950/60 p-4">
          <p className="text-sm font-medium text-stone-200">No appetite demand signal yet.</p>
          <p className="mt-1 text-xs text-stone-500">
            This fills in as people spin, open, and shortlist food through /eat.
          </p>
        </div>
      ) : (
        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <div>
            <h3 className="text-sm font-semibold text-stone-200">Top signals</h3>
            <div className="mt-3 space-y-2">
              {model.topSignals.map((signal) => (
                <Link
                  key={signal.tagId}
                  href={signal.href}
                  className="flex min-h-12 cursor-pointer items-center justify-between gap-3 rounded-xl border border-stone-800 bg-stone-950/70 px-3 py-2 transition-colors hover:border-stone-700"
                >
                  <div>
                    <p className="text-sm font-medium text-stone-100">{signal.label}</p>
                    <p className="mt-0.5 text-[11px] capitalize text-stone-500">{signal.domain}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-stone-400">
                      {CONFIDENCE_LABEL[signal.confidence]}
                    </span>
                    <ArrowUpRight className="h-4 w-4 text-stone-500" />
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-stone-200">Combinations gaining interest</h3>
            <div className="mt-3 space-y-2">
              {model.topBundles.map((bundle) => (
                <Link
                  key={bundle.tagIds.join('|')}
                  href={bundle.href}
                  className="flex min-h-12 cursor-pointer items-center justify-between gap-3 rounded-xl border border-stone-800 bg-stone-950/70 px-3 py-2 transition-colors hover:border-stone-700"
                >
                  <p className="text-sm font-medium text-stone-100">{bundle.label}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-stone-400">
                      {CONFIDENCE_LABEL[bundle.confidence]}
                    </span>
                    <ArrowUpRight className="h-4 w-4 text-stone-500" />
                  </div>
                </Link>
              ))}
              {model.topBundles.length === 0 && (
                <p className="rounded-xl border border-stone-800 bg-stone-950/60 p-3 text-xs text-stone-500">
                  Compound demand will appear after people act on combinations of appetite tags.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
