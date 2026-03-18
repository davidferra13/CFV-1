'use client'

// Contract Signing Client Component
// Renders Markdown body + signature pad + submit.
// Runs entirely client-side for real-time canvas interaction.

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { SignaturePad } from '@/components/contracts/signature-pad'
import { ContractStatusBadge } from '@/components/contracts/contract-status-badge'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { signContract } from '@/lib/contracts/actions'

type Props = {
  contractId: string
  bodyMarkdown: string
  status: 'draft' | 'sent' | 'viewed' | 'signed' | 'voided'
  signedAt: string | null
  eventId: string
}

export function ContractSigningClient({
  contractId,
  bodyMarkdown,
  status,
  signedAt,
  eventId,
}: Props) {
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
      <div className="rounded-xl border border-red-200 bg-red-950 p-6 text-center space-y-2">
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
      <div className="rounded-xl border border-green-200 bg-green-950 p-6 text-center space-y-3">
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
            className="inline-flex items-center rounded-lg border border-stone-600 bg-stone-900 px-4 py-2 text-sm font-medium text-stone-300 hover:bg-stone-800"
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
      {/* Contract body */}
      <div className="rounded-xl border border-stone-700 bg-stone-900 p-6 prose prose-invert prose-sm max-w-none prose-headings:text-stone-100 prose-p:text-stone-200 prose-li:text-stone-200 prose-strong:text-stone-100">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{bodyMarkdown}</ReactMarkdown>
      </div>

      {/* Signature section */}
      <div className="rounded-xl border border-stone-700 bg-stone-900 p-6 space-y-4">
        <h2 className="text-base font-semibold text-stone-100">Your Signature</h2>
        <SignaturePad onChange={setSignatureDataUrl} />

        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            id="agree"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-1 rounded border-stone-600"
          />
          <label htmlFor="agree" className="text-sm text-stone-300">
            I have read and agree to all terms in this Service Agreement. I understand this is a
            legally binding document.
          </label>
        </div>

        {error && <Alert variant="error">{error}</Alert>}

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
