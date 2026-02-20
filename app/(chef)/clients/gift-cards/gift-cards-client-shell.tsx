'use client'

// Client-side interactive shell for the Gift Cards management page.
// Contains modals for issuing, sending, and deactivating incentive codes.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { IssueIncentiveForm } from '@/components/incentives/issue-incentive-form'
import { SendIncentiveForm } from '@/components/incentives/send-incentive-form'
import { deactivateIncentive } from '@/lib/loyalty/voucher-actions'

type Client = { id: string; full_name: string | null }
type Incentive = {
  id: string
  code: string
  title: string
  type: 'gift_card' | 'voucher'
  is_active: boolean
}

// ─── Issue button + modal ────────────────────────────────────────────────────

function IssueButton({ clients }: { clients: Client[] }) {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"
      >
        + Issue Gift Card / Voucher
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200">
              <h2 className="text-lg font-semibold text-stone-900">Issue Gift Card or Voucher</h2>
              <button
                onClick={() => setOpen(false)}
                className="text-stone-400 hover:text-stone-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="px-6 py-5">
              <IssueIncentiveForm
                clients={clients}
                onSuccess={() => {
                  setOpen(false)
                  router.refresh()
                }}
                onCancel={() => setOpen(false)}
              />
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ─── Row action buttons (Send / Deactivate) ──────────────────────────────────

function RowActions({ incentive }: { incentive: Incentive }) {
  const [sendOpen, setSendOpen] = useState(false)
  const [deactivating, setDeactivating] = useState(false)
  const router = useRouter()

  async function handleDeactivate() {
    if (!confirm(`Deactivate code ${incentive.code}? It will no longer be redeemable.`)) return
    setDeactivating(true)
    try {
      await deactivateIncentive(incentive.id)
      router.refresh()
    } catch {
      alert('Failed to deactivate. Please try again.')
    } finally {
      setDeactivating(false)
    }
  }

  return (
    <>
      <div className="flex items-center justify-end gap-2">
        {incentive.is_active && (
          <button
            onClick={() => setSendOpen(true)}
            className="text-xs text-brand-600 hover:text-brand-700 font-medium"
          >
            Send
          </button>
        )}
        {incentive.is_active && (
          <button
            onClick={handleDeactivate}
            disabled={deactivating}
            className="text-xs text-stone-400 hover:text-red-600 transition-colors font-medium"
          >
            {deactivating ? '…' : 'Deactivate'}
          </button>
        )}
        {!incentive.is_active && (
          <span className="text-xs text-stone-300">Inactive</span>
        )}
      </div>

      {/* Send modal */}
      {sendOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200">
              <h2 className="text-lg font-semibold text-stone-900">Send Code</h2>
              <button
                onClick={() => setSendOpen(false)}
                className="text-stone-400 hover:text-stone-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="px-6 py-5">
              <SendIncentiveForm
                incentiveId={incentive.id}
                incentiveCode={incentive.code}
                incentiveTitle={incentive.title}
                onSuccess={() => {
                  setSendOpen(false)
                  router.refresh()
                }}
                onCancel={() => setSendOpen(false)}
              />
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// Export as a namespace so server components can reference sub-components
export const GiftCardsClientShell = {
  IssueButton,
  RowActions,
}
