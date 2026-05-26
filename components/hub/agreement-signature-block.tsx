'use client'

import { useState, useTransition } from 'react'
import type { AgreementHost } from '@/lib/hub/agreement-types'
import { signAgreement } from '@/lib/hub/agreement-actions'

interface AgreementSignatureBlockProps {
  agreementId: string
  hosts: AgreementHost[]
  currentProfileId: string
  allItemsAssigned: boolean
}

export function AgreementSignatureBlock({
  agreementId,
  hosts,
  currentProfileId,
  allItemsAssigned,
}: AgreementSignatureBlockProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const currentHost = hosts.find((h) => h.profileId === currentProfileId)
  const hasCurrentSigned = currentHost?.hasSigned || false
  const allSigned = hosts.every((h) => h.hasSigned)

  const handleSign = () => {
    setError(null)
    startTransition(async () => {
      const result = await signAgreement(agreementId)
      if (!result.success) setError(result.error || 'Failed to sign')
    })
  }

  return (
    <div className="space-y-4 rounded-lg border border-stone-700 bg-stone-800/50 p-4">
      <h3 className="text-sm font-semibold text-stone-200">Signatures</h3>

      {/* Signature status per host */}
      <div className="space-y-2">
        {hosts.map((host) => (
          <div key={host.profileId} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className={`h-2 w-2 rounded-full ${
                  host.hasSigned ? 'bg-green-500' : 'bg-stone-600'
                }`}
              />
              <span className="text-sm text-stone-300">
                {host.displayName}
                <span className="ml-1 text-xs text-stone-500">({host.label})</span>
              </span>
            </div>
            {host.hasSigned && host.signedAt && (
              <span className="text-xs text-stone-500">
                {new Date(host.signedAt).toLocaleDateString()}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Sign button */}
      {!hasCurrentSigned && (
        <div className="space-y-2">
          {!allItemsAssigned && (
            <p className="text-xs text-amber-400">All items must be assigned before signing.</p>
          )}
          <button
            onClick={handleSign}
            disabled={isPending || !allItemsAssigned}
            className="w-full rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? 'Signing...' : 'I agree to this collaboration agreement'}
          </button>
          <p className="text-center text-xs text-stone-500">
            By signing, you acknowledge and agree to the responsibilities and compensation outlined
            above.
          </p>
        </div>
      )}

      {hasCurrentSigned && !allSigned && (
        <p className="text-center text-xs text-stone-400">Waiting for other co-hosts to sign.</p>
      )}

      {allSigned && (
        <div className="rounded-lg bg-green-900/20 p-3 text-center">
          <p className="text-sm font-medium text-green-400">
            Agreement active. All parties have signed.
          </p>
        </div>
      )}

      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}
