'use client'

// Send Contract Button
// Placed on the chef event detail page.
// Handles the full "generate → send" flow with template selection.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ContractStatusBadge } from './contract-status-badge'
import {
  generateEventContract,
  sendContractToClient,
  sendContractViaDocuSign,
  voidContract,
} from '@/lib/contracts/actions'

type Template = { id: string; name: string; is_default: boolean }

type ContractStatus = 'draft' | 'sent' | 'viewed' | 'signed' | 'voided'

type ExistingContract = {
  id: string
  status: ContractStatus
  sent_at: string | null
  signed_at: string | null
  viewed_at: string | null
}

type Props = {
  eventId: string
  templates: Template[]
  contract: ExistingContract | null
  docusignConnected?: boolean
}

export function SendContractButton({
  eventId,
  templates,
  contract,
  docusignConnected = false,
}: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    templates.find((t) => t.is_default)?.id ?? templates[0]?.id ?? ''
  )
  const [error, setError] = useState<string | null>(null)
  const [showVoidConfirm, setShowVoidConfirm] = useState(false)

  async function handleGenerate() {
    setLoading(true)
    setError(null)
    try {
      await generateEventContract(eventId, selectedTemplateId || undefined)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate contract')
    } finally {
      setLoading(false)
    }
  }

  async function handleSend() {
    if (!contract) return
    setLoading(true)
    setError(null)
    try {
      await sendContractToClient(contract.id)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send contract')
    } finally {
      setLoading(false)
    }
  }

  async function handleSendViaDocuSign() {
    if (!contract) return
    setLoading(true)
    setError(null)
    try {
      await sendContractViaDocuSign(contract.id)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send via DocuSign')
    } finally {
      setLoading(false)
    }
  }

  async function handleVoid() {
    if (!contract) return
    setLoading(true)
    setError(null)
    try {
      await voidContract(contract.id)
      setShowVoidConfirm(false)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to void contract')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-stone-300">Contract</span>
        {contract && <ContractStatusBadge status={contract.status} />}
      </div>

      {/* No contract yet - generate one */}
      {!contract && (
        <div className="flex flex-wrap items-center gap-2">
          {templates.length > 1 && (
            <select
              value={selectedTemplateId}
              onChange={(e) => setSelectedTemplateId(e.target.value)}
              title="Contract template"
              className="rounded-lg border border-stone-600 px-3 py-2 text-sm"
            >
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
              <option value="">Use built-in template</option>
            </select>
          )}
          <Button size="sm" onClick={handleGenerate} disabled={loading}>
            {loading ? 'Generating…' : 'Generate Contract'}
          </Button>
        </div>
      )}

      {/* Draft - ready to send */}
      {contract?.status === 'draft' && (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" onClick={handleSend} disabled={loading}>
              {loading ? 'Sending…' : 'Send to Client'}
            </Button>
            {docusignConnected && (
              <Button
                size="sm"
                variant="secondary"
                onClick={handleSendViaDocuSign}
                disabled={loading}
              >
                {loading ? 'Sending…' : 'Send via DocuSign'}
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowVoidConfirm(true)}
              disabled={loading}
            >
              Discard
            </Button>
            <a
              href={`/api/documents/contract/${contract.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-stone-400 underline hover:text-stone-300"
            >
              Preview PDF ↗
            </a>
          </div>
        </div>
      )}

      {/* Sent or Viewed - can resend or void */}
      {(contract?.status === 'sent' || contract?.status === 'viewed') && (
        <div className="space-y-2">
          <p className="text-xs text-stone-500">
            {contract.status === 'viewed'
              ? 'Client has viewed the contract - awaiting signature.'
              : `Sent ${contract.sent_at ? new Date(contract.sent_at).toLocaleDateString() : ''}. Awaiting client review.`}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="secondary" onClick={handleSend} disabled={loading}>
              Resend email
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowVoidConfirm(true)}
              disabled={loading}
            >
              Void & regenerate
            </Button>
            <a
              href={`/api/documents/contract/${contract.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-stone-400 underline hover:text-stone-300"
            >
              Preview PDF ↗
            </a>
          </div>
        </div>
      )}

      {/* Signed - read-only with PDF download */}
      {contract?.status === 'signed' && (
        <div className="flex items-center gap-3">
          <p className="text-sm text-green-700">
            Signed {contract.signed_at ? new Date(contract.signed_at).toLocaleDateString() : ''}
          </p>
          <a
            href={`/api/documents/contract/${contract.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-stone-400 underline hover:text-stone-100"
          >
            Download PDF
          </a>
        </div>
      )}

      {/* Voided - can generate new one */}
      {contract?.status === 'voided' && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-stone-500">Previous contract voided.</span>
          <Button size="sm" variant="secondary" onClick={handleGenerate} disabled={loading}>
            Generate New Contract
          </Button>
        </div>
      )}

      {/* Void confirmation */}
      {showVoidConfirm && (
        <div className="rounded-lg border border-red-200 bg-red-950 p-3 space-y-2">
          <p className="text-sm text-red-700">
            Void this contract? The client will not be able to sign it.
          </p>
          <div className="flex gap-2">
            <Button size="sm" variant="danger" onClick={handleVoid} disabled={loading}>
              {loading ? 'Voiding…' : 'Void Contract'}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowVoidConfirm(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}
