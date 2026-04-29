import Link from 'next/link'
import { AlertCircle, ArrowRight, PhoneCall } from '@/components/ui/icons'
import type {
  CallIntelligenceSnapshot,
  CallIntelligenceUrgency,
} from '@/lib/calls/intelligence'

export function DashboardCallIntelligenceWidget({
  snapshot,
}: {
  snapshot: CallIntelligenceSnapshot
}) {
  const topIntervention = snapshot.humanInterventions[0] ?? null
  const hasSourceErrors = snapshot.sourceErrors.length > 0
  const missingOutcomes = snapshot.automationCoverage.humanCallsMissingOutcomes
  const missingTranscripts = snapshot.automationCoverage.voiceRecordsMissingTranscripts

  if (
    !topIntervention &&
    !hasSourceErrors &&
    missingOutcomes === 0 &&
    missingTranscripts === 0
  ) {
    return null
  }

  return (
    <div className="rounded-xl border border-stone-800 bg-stone-900 shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-stone-800 px-5 pb-3 pt-5">
        <div className="flex items-center gap-2">
          <PhoneCall className="h-4 w-4 text-brand-500" />
          <h3 className="text-sm font-semibold text-stone-100">Call Intelligence</h3>
        </div>
        <Link
          href="/calls"
          className="flex items-center gap-1 text-xs font-medium text-brand-500 hover:text-brand-300"
        >
          Open
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="space-y-3 px-5 py-4">
        {hasSourceErrors ? (
          <div className="flex items-start gap-2 rounded-lg border border-amber-900/70 bg-amber-950/40 p-3 text-xs text-amber-200">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>Some call metrics are unavailable.</span>
          </div>
        ) : null}

        {topIntervention ? (
          <Link
            href={topIntervention.href}
            className="block rounded-lg border border-stone-800 bg-stone-950 p-3 transition-colors hover:border-stone-700"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className={urgencyClass(topIntervention.urgency)}>
                {topIntervention.urgency}
              </span>
              <span className="text-sm font-medium text-stone-100">{topIntervention.label}</span>
            </div>
            <p className="mt-1 text-sm text-stone-400">{topIntervention.target}</p>
            <p className="mt-1 text-xs text-brand-300">{topIntervention.nextStep}</p>
          </Link>
        ) : (
          <p className="text-sm text-stone-400">
            No urgent human call is queued, but call coverage still needs attention.
          </p>
        )}

        <div className="grid grid-cols-2 gap-2 text-xs">
          <Metric label="Active signals" value={snapshot.humanInterventions.length} />
          <Metric label="Overdue calls" value={snapshot.stats.humanOverdue} />
          <Metric label="Missing outcomes" value={missingOutcomes} />
          <Metric label="Missing transcripts" value={missingTranscripts} />
        </div>
      </div>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="rounded-lg border border-stone-800 bg-stone-950 p-2">
      <p className="text-stone-500">{label}</p>
      <p className="mt-1 font-semibold text-stone-100">{value === null ? 'Unavailable' : value}</p>
    </div>
  )
}

function urgencyClass(urgency: CallIntelligenceUrgency): string {
  const base = 'rounded-full px-2 py-0.5 text-[11px] font-medium uppercase'
  if (urgency === 'critical') return `${base} bg-red-950 text-red-300`
  if (urgency === 'high') return `${base} bg-amber-950 text-amber-300`
  return `${base} bg-stone-800 text-stone-300`
}
