'use client'

// Contract Signing Client Component
// Renders Markdown body + signature pad + submit.
// Runs entirely client-side for real-time canvas interaction.

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { SignaturePad } from '@/components/contracts/signature-pad'
import { ContractStatusBadge } from '@/components/contracts/contract-status-badge'
import { Button } from '@/components/ui/button'
import { signContract } from '@/lib/contracts/actions'

type Props = {
  contractId: string
  bodyMarkdown: string
  status: 'draft' | 'sent' | 'viewed' | 'signed' | 'voided'
  signedAt: string | null
  eventId: string
}

export function ContractSigningClient({ contractId, bodyMarkdown, status, signedAt, eventId }: Props) {
  const router = useRouter()
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null)
  const [agreed, setAgreed] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(status === 'signed')

  useEffect(() => {
    setDone(status === 'signed')
  }, [status])

  async function handleSign() {
    if (!signatureDataUrl || !agreed) return
    setSubmitting(true)
    setError(null)

    try {
      await signContract({
        contract_id: contractId,
        signature_data_url: signatureDataUrl,
        signer_user_agent: navigator.userAgent,
      })
      setDone(true)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signing failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (status === 'voided') {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center space-y-2">
        <ContractStatusBadge status="voided" />
        <p className="text-sm text-red-700">
          This contract has been voided. Please contact your chef for an updated agreement.
        </p>
        <Button variant="secondary" onClick={() => router.push(`/my-events/${eventId}`)}>
          Back to Event
        </Button>
      </div>
    )
  }

  if (done) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-6 text-center space-y-3">
        <div className="text-4xl">✓</div>
        <ContractStatusBadge status="signed" />
        <p className="text-sm text-green-700 font-medium">
          You signed this agreement{signedAt ? ` on ${signedAt}` : ''}.
        </p>
        <p className="text-xs text-stone-500">
          Your chef has been notified. You can view this contract any time from your event page.
        </p>
        <div className="flex justify-center gap-3">
          <a
            href={`/api/documents/contract/${contractId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
          >
            Download PDF
          </a>
          <Button variant="secondary" onClick={() => router.push(`/my-events/${eventId}`)}>
            Back to Event
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Contract body — rendered as plain markdown text, readable without a parser */}
      <div className="rounded-xl border border-stone-200 bg-white p-6">
        <pre className="whitespace-pre-wrap font-sans text-sm text-stone-800 leading-relaxed">
          {bodyMarkdown}
        </pre>
      </div>

      {/* Signature section */}
      <div className="rounded-xl border border-stone-200 bg-white p-6 space-y-4">
        <h2 className="text-base font-semibold text-stone-900">Your Signature</h2>
        <SignaturePad onChange={setSignatureDataUrl} />

        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            id="agree"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-1 rounded border-stone-300"
          />
          <label htmlFor="agree" className="text-sm text-stone-700">
            I have read and agree to all terms in this Service Agreement. I understand this is a
            legally binding document.
          </label>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <Button
          onClick={handleSign}
          disabled={!signatureDataUrl || !agreed || submitting}
          className="w-full"
        >
          {submitting ? 'Signing…' : 'Sign Agreement'}
        </Button>
      </div>
    </div>
  )
}
