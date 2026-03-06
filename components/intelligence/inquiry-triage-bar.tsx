import { getInquiryTriage } from '@/lib/intelligence/inquiry-triage'
import { getCommunicationCadence } from '@/lib/intelligence/client-communication-cadence'

export async function InquiryTriageBar() {
  const [triage, cadence] = await Promise.all([
    getInquiryTriage().catch(() => null),
    getCommunicationCadence().catch(() => null),
  ])

  if (!triage && !cadence) return null

  return (
    <div className="space-y-2">
      {/* Silent Pipeline Alerts */}
      {cadence && cadence.pipelineAtRisk > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-800/40 bg-amber-950/30 px-3 py-2">
          <span className="text-amber-400 text-sm mt-0.5">!</span>
          <div>
            <p className="text-sm font-medium text-amber-300">
              {cadence.pipelineAtRisk} inquiries at risk — client went silent
            </p>
            <p className="text-xs text-amber-400/70">
              {cadence.openInquiriesWithoutReply > 0
                ? `${cadence.openInquiriesWithoutReply} awaiting your reply`
                : 'All replied — waiting on client responses'}
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Your Response Speed */}
        {cadence && (
          <div className="rounded-lg border border-stone-700/40 bg-stone-900/60 px-3 py-2">
            <p className="text-xs text-stone-500">Your Avg Response</p>
            <p
              className={`text-lg font-bold ${
                cadence.avgChefResponseHours <= 4
                  ? 'text-emerald-400'
                  : cadence.avgChefResponseHours <= 12
                    ? 'text-amber-400'
                    : 'text-red-400'
              }`}
            >
              {cadence.avgChefResponseHours < 1
                ? `${Math.round(cadence.avgChefResponseHours * 60)}m`
                : `${cadence.avgChefResponseHours.toFixed(1)}h`}
            </p>
            <p className="text-xs text-stone-500">inquiry response time</p>
          </div>
        )}

        {/* Urgent Inquiries */}
        {triage && (
          <div className="rounded-lg border border-stone-700/40 bg-stone-900/60 px-3 py-2">
            <p className="text-xs text-stone-500">Urgent</p>
            <p
              className={`text-lg font-bold ${triage.urgentCount > 0 ? 'text-red-400' : 'text-stone-100'}`}
            >
              {triage.urgentCount}
            </p>
            <p className="text-xs text-stone-500">of {triage.totalOpenInquiries} open</p>
          </div>
        )}

        {/* Silent Clients */}
        {cadence && cadence.silentClients.length > 0 && (
          <div className="rounded-lg border border-stone-700/40 bg-stone-900/60 px-3 py-2">
            <p className="text-xs text-stone-500">Gone Silent</p>
            <p className="text-lg font-bold text-amber-400">{cadence.silentClients.length}</p>
            <p className="text-xs text-stone-500 truncate">
              {cadence.silentClients
                .slice(0, 2)
                .map((c) => c.clientName)
                .join(', ')}
            </p>
          </div>
        )}

        {/* Oldest Unanswered */}
        {triage && triage.oldestUnansweredHours > 0 && (
          <div className="rounded-lg border border-stone-700/40 bg-stone-900/60 px-3 py-2">
            <p className="text-xs text-stone-500">Oldest Unanswered</p>
            <p
              className={`text-lg font-bold ${triage.oldestUnansweredHours > 24 ? 'text-red-400' : triage.oldestUnansweredHours > 12 ? 'text-amber-400' : 'text-stone-100'}`}
            >
              {triage.oldestUnansweredHours < 24
                ? `${Math.round(triage.oldestUnansweredHours)}h`
                : `${Math.round(triage.oldestUnansweredHours / 24)}d`}
            </p>
            <p className="text-xs text-stone-500">waiting for response</p>
          </div>
        )}
      </div>
    </div>
  )
}
