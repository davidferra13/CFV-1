import Link from 'next/link'
import { AlertCircle, Bot, FileText, PhoneCall, Radio } from '@/components/ui/icons'
import type {
  CallIntelligenceSnapshot,
  CallIntelligenceUrgency,
} from '@/lib/calls/intelligence'

type Props = {
  snapshot: CallIntelligenceSnapshot
}

export function CallIntelligencePanel({ snapshot }: Props) {
  const stats = [
    { label: 'Human calls tracked', value: snapshot.stats.humanScheduled },
    { label: 'Overdue human calls', value: snapshot.stats.humanOverdue },
    { label: 'Outcomes logged', value: snapshot.stats.outcomesLogged },
    { label: 'Voice recordings', value: snapshot.stats.recordings },
    { label: 'Voice transcripts', value: snapshot.stats.transcripts },
    { label: 'AI/vendor calls', value: snapshot.stats.totalVoiceRecords },
  ]

  return (
    <section className="rounded-xl border border-stone-800 bg-stone-950/80 p-4 space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold text-stone-100">
            <PhoneCall className="h-5 w-5 text-brand-500" />
            Call Intelligence
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-stone-400">
            Human call timing, automated voice coverage, transcripts, recordings, and intervention
            signals from the current call system.
          </p>
        </div>
        <Link
          href="/culinary/call-sheet?tab=log"
          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-stone-700 px-3 py-2 text-sm font-medium text-stone-200 transition-colors hover:bg-stone-900"
        >
          <Radio className="h-4 w-4" />
          Voice log
        </Link>
      </div>

      {snapshot.sourceErrors.length > 0 && (
        <div className="rounded-lg border border-amber-900/70 bg-amber-950/40 p-3 text-sm text-amber-200">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <div>
              <p className="font-medium">Some call sources could not be read.</p>
              <p className="mt-1 text-amber-200/80">
                Metrics from failed sources are marked unavailable instead of shown as zero.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-lg border border-stone-800 bg-stone-900 p-3">
            <p className="text-xs text-stone-500">{stat.label}</p>
            <p className="mt-1 text-xl font-semibold text-stone-100">{formatMetric(stat.value)}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-stone-400">
              Human intervention queue
            </h3>
            <span className="text-xs text-stone-600">
              {snapshot.humanInterventions.length} active
            </span>
          </div>

          {snapshot.humanInterventions.length === 0 ? (
            <div className="rounded-lg border border-dashed border-stone-800 p-4 text-sm text-stone-500">
              No immediate human intervention signals found in the connected call sources.
            </div>
          ) : (
            <div className="space-y-2">
              {snapshot.humanInterventions.slice(0, 5).map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  className="block rounded-lg border border-stone-800 bg-stone-900 p-3 transition-colors hover:border-stone-700 hover:bg-stone-800"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={urgencyClass(item.urgency)}>{item.urgency}</span>
                    <span className="text-sm font-medium text-stone-100">{item.label}</span>
                    <span className="text-xs text-stone-500">{item.target}</span>
                  </div>
                  <p className="mt-1 text-sm text-stone-400">{item.reason}</p>
                  <p className="mt-1 text-xs text-brand-300">{item.nextStep}</p>
                  {item.evidence && (
                    <p className="mt-2 line-clamp-2 text-xs text-stone-600">{item.evidence}</p>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div className="rounded-lg border border-stone-800 bg-stone-900 p-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-stone-200">
              <Bot className="h-4 w-4 text-cyan-400" />
              Automation boundary
            </h3>
            <p className="mt-2 text-sm text-stone-400">{snapshot.automationCoverage.aiAllowedOnlyFor}</p>
          </div>

          <div className="rounded-lg border border-stone-800 bg-stone-900 p-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-stone-200">
              <FileText className="h-4 w-4 text-emerald-400" />
              Coverage gaps
            </h3>
            <ul className="mt-2 space-y-1 text-sm text-stone-400">
              {snapshot.engineGaps.map((gap) => (
                <li key={gap}>{gap}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {snapshot.lifecycleTrace.length > 0 && (
        <div className="rounded-lg border border-stone-800 bg-stone-900 p-3">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-stone-400">
              Intervention lifecycle trace
            </h3>
            <span className="text-xs text-stone-600">
              {snapshot.lifecycleTrace.length} recent records
            </span>
          </div>
          <div className="mt-3 space-y-2">
            {snapshot.lifecycleTrace.slice(0, 6).map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className="block rounded-lg border border-stone-800 bg-stone-950/70 p-3 transition-colors hover:border-stone-700"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-stone-800 px-2 py-0.5 text-[11px] uppercase text-stone-300">
                    {item.source.replace(/_/g, ' ')}
                  </span>
                  <span className="text-sm font-medium text-stone-100">{item.target}</span>
                  <span className="text-xs text-stone-600">
                    {new Date(item.occurredAt).toLocaleString()}
                  </span>
                </div>
                <div className="mt-2 grid gap-2 text-xs text-stone-400 md:grid-cols-5">
                  <LifecycleCell label="Trigger" value={item.trigger} />
                  <LifecycleCell label="Action" value={item.action} />
                  <LifecycleCell label="Result" value={item.result} />
                  <LifecycleCell label="State" value={item.stateChange} />
                  <LifecycleCell label="Next" value={item.nextStep} />
                </div>
                {item.evidence && (
                  <p className="mt-2 line-clamp-2 text-xs text-stone-600">{item.evidence}</p>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-stone-600">
        Snapshot generated {new Date(snapshot.generatedAt).toLocaleString()}.
      </p>
    </section>
  )
}

function LifecycleCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-medium text-stone-500">{label}</p>
      <p className="mt-0.5 leading-snug text-stone-300">{value}</p>
    </div>
  )
}

function formatMetric(value: number | null): string {
  return value === null ? 'Unavailable' : value.toLocaleString()
}

function urgencyClass(urgency: CallIntelligenceUrgency): string {
  const base = 'rounded-full px-2 py-0.5 text-[11px] font-medium uppercase'
  if (urgency === 'critical') return `${base} bg-red-950 text-red-300`
  if (urgency === 'high') return `${base} bg-amber-950 text-amber-300`
  return `${base} bg-stone-800 text-stone-300`
}
