import {
  PUBLIC_INTAKE_LANE_CONFIG,
  type PublicIntakeLaneKey,
} from '@/lib/public/intake-lane-config'

type Props = {
  className?: string
  lane: PublicIntakeLaneKey
  layout?: 'cards' | 'stack'
}

function getFactGridClass(layout: 'cards' | 'stack') {
  return layout === 'cards' ? 'grid gap-4 md:grid-cols-3' : 'space-y-3'
}

function getFactCardClass(layout: 'cards' | 'stack') {
  return layout === 'cards'
    ? 'rounded-2xl border border-stone-700 bg-stone-950/80 p-5'
    : 'rounded-xl border border-stone-700 bg-stone-800/70 px-4 py-4'
}

export function IntakeLaneExpectations({ className = '', lane, layout = 'cards' }: Props) {
  const expectation = PUBLIC_INTAKE_LANE_CONFIG[lane].expectation

  return (
    <div
      className={`rounded-[1.75rem] border border-stone-700 bg-stone-900/60 p-6 sm:p-8 ${className}`.trim()}
    >
      <div className="max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-300">
          {expectation.eyebrow}
        </p>
        <h2 className="mt-3 font-display text-2xl font-bold tracking-[-0.04em] text-stone-100 md:text-3xl">
          {expectation.title}
        </h2>
        <p className="mt-3 text-sm leading-6 text-stone-300 md:text-base">{expectation.summary}</p>
      </div>

      <div className={`mt-8 ${getFactGridClass(layout)}`}>
        {expectation.facts.map((fact) => (
          <div key={fact.label} className={getFactCardClass(layout)}>
            <p className="text-xs uppercase tracking-wide text-stone-500">{fact.label}</p>
            <p className="mt-2 text-sm font-semibold text-stone-100">{fact.value}</p>
            <p className="mt-2 text-xs leading-relaxed text-stone-400">{fact.detail}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
