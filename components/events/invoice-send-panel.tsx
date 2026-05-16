'use client'

// Invoice Send/Resend Panel for Chef
// Shows send history and allows resending invoice with optional CC.

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Mail, CheckCircle, Clock } from '@/components/ui/icons'
import { sendInvoiceToClient } from '@/lib/invoices/delivery-actions'
import type { InvoiceSendHistory } from '@/lib/invoices/delivery-actions'
import { format } from 'date-fns'

type Props = {
  eventId: string
  clientEmail: string
  sendHistory: InvoiceSendHistory[]
}

export function InvoiceSendPanel({ eventId, clientEmail, sendHistory }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [ccEmail, setCcEmail] = useState('')
  const [result, setResult] = useState<{ status: string; message?: string } | null>(null)
  const [isPending, startTransition] = useTransition()
  const [history, setHistory] = useState(sendHistory)

  function handleSend() {
    setResult(null)
    startTransition(async () => {
      try {
        const res = await sendInvoiceToClient(eventId, {
          ccEmail: ccEmail || undefined,
        })
        if (res.status === 'sent') {
          setResult({ status: 'sent' })
          setShowForm(false)
          setCcEmail('')
          setHistory((prev) => [res.record, ...prev])
        } else {
          setResult({ status: 'error', message: res.message })
        }
      } catch {
        setResult({ status: 'error', message: 'Failed to send' })
      }
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-stone-300">Invoice Delivery</h3>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setShowForm(!showForm)}
          className="gap-2"
        >
          <Mail className="h-4 w-4" />
          {history.length > 0 ? 'Resend' : 'Send to Client'}
        </Button>
      </div>

      {showForm && (
        <div className="rounded-xl border border-stone-700 bg-stone-950/70 p-4 space-y-3">
          <p className="text-sm text-stone-400">
            Send invoice PDF to <span className="text-stone-200">{clientEmail}</span>
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="text-xs font-medium text-stone-500" htmlFor="cc-invoice">
                CC (optional)
              </label>
              <input
                id="cc-invoice"
                type="email"
                placeholder="accounting@company.com"
                value={ccEmail}
                onChange={(e) => setCcEmail(e.target.value)}
                className="mt-1 w-full rounded-lg border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-100 outline-none focus:border-brand-500"
              />
            </div>
            <Button onClick={handleSend} disabled={isPending} size="sm">
              {isPending ? 'Sending...' : 'Send Invoice'}
            </Button>
          </div>
          {result?.status === 'error' && <p className="text-sm text-red-400">{result.message}</p>}
        </div>
      )}

      {result?.status === 'sent' && (
        <p className="inline-flex items-center gap-2 text-sm text-emerald-400">
          <CheckCircle className="h-4 w-4" />
          Invoice sent to {clientEmail}
        </p>
      )}

      {history.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
            Send History
          </p>
          <div className="space-y-1.5">
            {history.slice(0, 5).map((entry) => (
              <div key={entry.id} className="flex items-center gap-3 text-xs text-stone-400">
                <Clock className="h-3 w-3 text-stone-600" />
                <span>{format(new Date(entry.sentAt), 'MMM d, yyyy h:mm a')}</span>
                <span className="text-stone-600">to</span>
                <span className="text-stone-300">{entry.sentTo}</span>
                {entry.ccTo && (
                  <>
                    <span className="text-stone-600">cc</span>
                    <span className="text-stone-300">{entry.ccTo}</span>
                  </>
                )}
                <span className="rounded-full bg-stone-800 px-2 py-0.5 text-stone-500">
                  {entry.sentBy === 'system' ? 'auto' : entry.sentBy}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
