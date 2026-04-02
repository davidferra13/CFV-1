'use client'

import {
  USAGE_STAGES,
  POTENTIAL_FUTURE_USES,
  CATEGORY_DISTINCTIONS,
  type OpenClawUsageStage,
  type OpenClawStageStatus,
} from '@/lib/openclaw/developer-usage-map'

const STATUS_LABELS: Record<OpenClawStageStatus, string> = {
  used: 'Used',
  active: 'Active',
  planned: 'Planned',
  potential: 'Potential',
}

const STATUS_COLORS: Record<OpenClawStageStatus, string> = {
  used: 'bg-green-950 text-green-400 border-green-800',
  active: 'bg-blue-950 text-blue-400 border-blue-800',
  planned: 'bg-yellow-950 text-yellow-500 border-yellow-800',
  potential: 'bg-stone-800 text-stone-400 border-stone-600',
}

function StatusBadge({ status }: { status: OpenClawStageStatus }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${STATUS_COLORS[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  )
}

function StageCard({ stage }: { stage: OpenClawUsageStage }) {
  return (
    <div
      className={`rounded-xl border bg-stone-950 p-5 space-y-3 ${stage.separateCategory ? 'border-orange-800' : 'border-stone-700'}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-xs font-mono text-stone-600 shrink-0">{stage.order}.</span>
          <h3 className="text-sm font-semibold text-stone-100">{stage.title}</h3>
          {stage.separateCategory && (
            <span className="text-xs text-orange-400 border border-orange-800 px-1.5 py-0.5 rounded shrink-0">
              separate category
            </span>
          )}
        </div>
        <StatusBadge status={stage.status} />
      </div>
      <p className="text-xs text-stone-400 leading-relaxed">{stage.summary}</p>
      <ul className="space-y-1">
        {stage.details.map((d, i) => (
          <li key={i} className="text-xs text-stone-500 flex gap-2">
            <span className="text-stone-700 shrink-0">-</span>
            {d}
          </li>
        ))}
      </ul>
    </div>
  )
}

const used = USAGE_STAGES.filter((s) => s.status === 'used')
const active = USAGE_STAGES.filter((s) => s.status === 'active')
const planned = USAGE_STAGES.filter((s) => s.status === 'planned')

export function OpenClawUsagePage() {
  return (
    <div className="space-y-10 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-stone-100">Data Engine</h1>
        <p className="text-sm text-stone-400 mt-1">
          Internal map of what the data engine does for this website, what it will do next, and what
          it could do later.
        </p>
      </div>

      {/* Immutable setup banner */}
      <div className="rounded-lg border border-orange-800 bg-orange-950/40 px-5 py-4">
        <p className="text-sm font-medium text-orange-300">
          Current Raspberry Pi setup is intentionally left untouched.
        </p>
        <p className="text-xs text-orange-400 mt-1">
          This page documents usage. It does not change runtime behavior, trigger syncs, run
          scrapers, or modify any configuration.
        </p>
      </div>

      {/* Full lifecycle */}
      <section className="space-y-4">
        <div className="section-label">Lifecycle (13 Stages)</div>
        <div className="space-y-3">
          {USAGE_STAGES.map((stage) => (
            <StageCard key={stage.id} stage={stage} />
          ))}
        </div>
      </section>

      {/* Category distinction callout */}
      <section className="space-y-4">
        <div className="section-label">Category Distinctions</div>
        <div className="rounded-xl border border-stone-700 bg-stone-950 p-5 space-y-3">
          <p className="text-sm font-semibold text-stone-100">
            Yes. Prospecting is a different category from testing. Lead discovery is different from
            qualification and outreach.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {CATEGORY_DISTINCTIONS.map((c) => (
              <div key={c.title} className="space-y-0.5">
                <p className="text-xs font-medium text-stone-300">{c.title}</p>
                <p className="text-xs text-stone-500">{c.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Status summary grid */}
      <section className="space-y-4">
        <div className="section-label">Status Summary</div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-stone-700 bg-stone-950 p-4 space-y-2">
            <p className="text-xs font-semibold text-green-400 uppercase tracking-wide">
              Already Used
            </p>
            <ul className="space-y-1">
              {used.map((s) => (
                <li key={s.id} className="text-xs text-stone-300">
                  {s.order}. {s.title}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-stone-700 bg-stone-950 p-4 space-y-2">
            <p className="text-xs font-semibold text-blue-400 uppercase tracking-wide">
              Active / Planned Next
            </p>
            <ul className="space-y-1">
              {[...active, ...planned].map((s) => (
                <li key={s.id} className="text-xs text-stone-300">
                  {s.order}. {s.title}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-stone-700 bg-stone-950 p-4 space-y-2">
            <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide">
              Potential Later
            </p>
            <ul className="space-y-1">
              {POTENTIAL_FUTURE_USES.map((g) => (
                <li key={g.id} className="text-xs text-stone-400">
                  {g.title}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Potential future uses */}
      <section className="space-y-4">
        <div className="section-label">Potential Future Uses</div>
        <div className="grid gap-3 sm:grid-cols-2">
          {POTENTIAL_FUTURE_USES.map((group) => (
            <div
              key={group.id}
              className="rounded-xl border border-stone-700 bg-stone-950 p-4 space-y-2"
            >
              <p className="text-xs font-semibold text-stone-300">{group.title}</p>
              <p className="text-xs text-stone-500">{group.summary}</p>
              <ul className="space-y-0.5">
                {group.items.map((item, i) => (
                  <li key={i} className="text-xs text-stone-600 flex gap-2">
                    <span className="shrink-0">-</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Boundaries */}
      <section className="space-y-4">
        <div className="section-label">Boundaries</div>
        <div className="rounded-xl border border-stone-700 bg-stone-950 p-5 space-y-2">
          <ul className="space-y-1.5">
            {[
              'This page does not run the data engine or trigger any Raspberry Pi operations.',
              'This page does not edit Pi configuration, cron jobs, or sync settings.',
              'This page does not replace technical documentation or spec files.',
              'This page does not expose private internals publicly.',
              'For sharing externally: take a screenshot or use screen-sharing.',
            ].map((item, i) => (
              <li key={i} className="text-xs text-stone-400 flex gap-2">
                <span className="text-stone-700 shrink-0">-</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  )
}
