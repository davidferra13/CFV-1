'use client'

// Invoice Actions for Client Portal
// Download PDF and request email delivery (with optional CC for accounting).
// Token-based: no auth session required.

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Download, Mail, CheckCircle } from '@/components/ui/icons'

type InvoiceActionsProps = {
  eventId: string
  token: string
  hasCharges: boolean
}

export function PortalInvoiceActions({ eventId, token, hasCharges }: InvoiceActionsProps) {
  const [showEmailForm, setShowEmailForm] = useState(false)
  const [ccEmail, setCcEmail] = useState('')
  const [emailSent, setEmailSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  if (!hasCharges) return null

  const pdfUrl = `/api/client-portal/invoice-pdf/${eventId}?token=${encodeURIComponent(token)}`

  function handleEmailRequest() {
    setError(null)
    startTransition(async () => {
      try {
        const res = await fetch('/api/client-portal/invoice-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, eventId, ccEmail: ccEmail || undefined }),
        })
        const data = await res.json()
        if (data.status === 'sent') {
          setEmailSent(true)
          setShowEmailForm(false)
        } else {
          setError(data.message || 'Failed to send')
        }
      } catch {
        setError('Network error. Try again.')
      }
    })
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <a
          href={pdfUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg border border-stone-600 bg-stone-900/50 px-4 py-2 text-sm font-medium text-stone-200 transition-colors hover:border-stone-500 hover:bg-stone-800"
        >
          <Download className="h-4 w-4" />
          Download Invoice (PDF)
        </a>

        {emailSent ? (
          <span className="inline-flex items-center gap-2 text-sm text-emerald-400">
            <CheckCircle className="h-4 w-4" />
            Invoice emailed
          </span>
        ) : (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowEmailForm(!showEmailForm)}
            className="gap-2"
          >
            <Mail className="h-4 w-4" />
            Email Invoice
          </Button>
        )}
      </div>

      {showEmailForm && (
        <div className="rounded-xl border border-stone-700 bg-stone-950/70 p-4 space-y-3">
          <p className="text-sm text-stone-300">
            Send the invoice PDF to your email on file. Optionally CC an accounting address.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="text-xs font-medium text-stone-500" htmlFor="cc-email">
                CC (optional)
              </label>
              <input
                id="cc-email"
                type="email"
                placeholder="accounting@company.com"
                value={ccEmail}
                onChange={(e) => setCcEmail(e.target.value)}
                className="mt-1 w-full rounded-lg border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-100 outline-none focus:border-brand-500"
              />
            </div>
            <Button onClick={handleEmailRequest} disabled={isPending} size="sm">
              {isPending ? 'Sending...' : 'Send'}
            </Button>
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
        </div>
      )}
    </div>
  )
}
