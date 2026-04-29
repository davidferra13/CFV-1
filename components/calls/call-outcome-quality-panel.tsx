import type { ScheduledCall } from '@/lib/calls/actions'
import { evaluateCallOutcomeQuality } from '@/lib/calls/outcome-quality'

const LEVEL_CLASS: Record<ReturnType<typeof evaluateCallOutcomeQuality>['level'], string> = {
  missing: 'border-red-800/60 bg-red-950/30 text-red-200',
  weak: 'border-amber-800/60 bg-amber-950/30 text-amber-200',
  usable: 'border-brand-800/60 bg-brand-950/30 text-brand-200',
  strong: 'border-emerald-800/60 bg-emerald-950/30 text-emerald-200',
}

export function CallOutcomeQualityPanel({ call }: { call: ScheduledCall }) {
  if (call.status !== 'completed') return null

  const quality = evaluateCallOutcomeQuality(call)

  return (
    <div className={`rounded-xl border p-4 ${LEVEL_CLASS[quality.level]}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">{quality.label}</p>
          <p className="mt-1 text-sm opacity-80">{quality.summary}</p>
        </div>
        <span className="rounded-full border border-current/20 px-2 py-1 text-xs font-medium">
          {quality.score}/100
        </span>
      </div>

      {quality.nextStep && (
        <p className="mt-3 text-sm">
          <span className="font-medium">Next improvement:</span> {quality.nextStep}
        </p>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide opacity-70">Captured</p>
          {quality.strengths.length > 0 ? (
            <ul className="mt-2 space-y-1 text-sm">
              {quality.strengths.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm opacity-70">No outcome details captured yet.</p>
          )}
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide opacity-70">Gaps</p>
          {quality.gaps.length > 0 ? (
            <ul className="mt-2 space-y-1 text-sm">
              {quality.gaps.slice(0, 4).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm opacity-70">No obvious outcome gaps.</p>
          )}
        </div>
      </div>
    </div>
  )
}
