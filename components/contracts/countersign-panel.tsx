'use client'

// Countersign Panel - Chef signature after client has signed.
// Shows when contract status is "signed" (client signed, chef hasn't).
// Uses existing SignaturePad component for drawing.

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { SignaturePad } from '@/components/contracts/signature-pad'
import { countersignContract } from '@/lib/contracts/countersign-actions'
import { toast } from 'sonner'

type Props = {
  contractId: string
  contractStatus: string
  chefSignedAt: string | null
}

export function CountersignPanel({ contractId, contractStatus, chefSignedAt }: Props) {
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [signed, setSigned] = useState(!!chefSignedAt)

  // Only show when client has signed but chef has not
  if (contractStatus !== 'signed' || signed) {
    if (signed) {
      return (
        <div className="rounded-lg border border-emerald-800 bg-emerald-950/30 p-4">
          <div className="flex items-center gap-2">
            <svg
              className="h-5 w-5 text-emerald-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <p className="text-sm font-medium text-emerald-300">
              Contract fully executed. Both parties have signed.
            </p>
          </div>
        </div>
      )
    }
    return null
  }

  function handleCountersign() {
    if (!signatureDataUrl) {
      toast.error('Please draw your signature first')
      return
    }

    startTransition(async () => {
      try {
        const result = await countersignContract(contractId, signatureDataUrl)
        if (!result.success) {
          toast.error(result.error || 'Failed to countersign')
          return
        }
        toast.success('Contract countersigned successfully')
        setSigned(true)
      } catch {
        toast.error('Something went wrong')
      }
    })
  }

  return (
    <div className="rounded-lg border border-amber-800 bg-amber-950/20 p-4 space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-amber-300">Awaiting Your Signature</h3>
        <p className="text-sm text-stone-400 mt-1">
          The client has signed this contract. Draw your signature below to countersign and finalize
          the agreement.
        </p>
      </div>

      <SignaturePad onChange={setSignatureDataUrl} />

      <Button
        variant="primary"
        size="sm"
        onClick={handleCountersign}
        loading={isPending}
        disabled={!signatureDataUrl}
      >
        Countersign Contract
      </Button>
    </div>
  )
}
