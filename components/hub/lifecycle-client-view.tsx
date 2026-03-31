'use client'

interface ClientCheckpoint {
  label: string
  status: string
  value?: string
}

interface ClientStageView {
  stageNumber: number
  stageName: string
  checkpoints: ClientCheckpoint[]
}

interface LifecycleClientViewProps {
  stages: ClientStageView[]
}

function ClientCheckIcon({ status }: { status: string }) {
  if (status === 'confirmed' || status === 'auto_detected') {
    return (
      <svg className="h-5 w-5 text-emerald-500 shrink-0" viewBox="0 0 20 20" fill="currentColor">
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.06l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
          clipRule="evenodd"
        />
      </svg>
    )
  }
  if (status === 'skipped' || status === 'not_applicable') {
    return (
      <svg className="h-5 w-5 text-stone-400 shrink-0" viewBox="0 0 20 20" fill="currentColor">
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zM6.75 9.25a.75.75 0 000 1.5h6.5a.75.75 0 000-1.5h-6.5z"
          clipRule="evenodd"
        />
      </svg>
    )
  }
  // not_started
  return <div className="h-5 w-5 rounded-full border-2 border-stone-300 shrink-0" />
}

export function LifecycleClientView({ stages }: LifecycleClientViewProps) {
  if (stages.length === 0) {
    return null
  }

  const allCheckpoints = stages.flatMap((s) => s.checkpoints)
  const completed = allCheckpoints.filter(
    (cp) => cp.status === 'confirmed' || cp.status === 'auto_detected'
  ).length

  return (
    <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
      <div className="p-5 border-b border-stone-100">
        <h3 className="text-base font-semibold text-stone-800">Your Dinner Status</h3>
        {allCheckpoints.length > 0 && (
          <p className="text-sm text-stone-500 mt-1">
            {completed} of {allCheckpoints.length} details confirmed
          </p>
        )}
      </div>

      <div className="p-5 space-y-3">
        {allCheckpoints.map((cp, i) => (
          <div key={i} className="flex items-start gap-3">
            <ClientCheckIcon status={cp.status} />
            <div>
              <p
                className={`text-sm ${
                  cp.status === 'confirmed' || cp.status === 'auto_detected'
                    ? 'text-stone-700'
                    : 'text-stone-400'
                }`}
              >
                {cp.label}
              </p>
              {cp.value && <p className="text-xs text-stone-500 mt-0.5">{cp.value}</p>}
            </div>
          </div>
        ))}
      </div>

      <div className="px-5 py-4 bg-stone-50 border-t border-stone-100">
        <p className="text-xs text-stone-500">
          Need to update anything? Reply to this thread or message your chef directly.
        </p>
      </div>
    </div>
  )
}
