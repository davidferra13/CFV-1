'use client'

interface AgreementTicketGateProps {
  groupId: string
  onSetupAgreement: () => void
}

export function AgreementTicketGate({ groupId, onSetupAgreement }: AgreementTicketGateProps) {
  return (
    <div className="rounded-lg border border-amber-700/50 bg-amber-900/10 p-4">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 text-amber-400">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-amber-300">Collaboration agreement required</p>
          <p className="mt-1 text-xs text-stone-400">
            All co-hosts must sign the collaboration agreement before tickets can go live.
          </p>
          <button
            onClick={onSetupAgreement}
            className="mt-3 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-500"
          >
            Set up agreement
          </button>
        </div>
      </div>
    </div>
  )
}
