'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import type { ShoppingListResult } from '@/lib/culinary/shopping-list-actions'
import {
  formatPlainText,
  formatPerVendorText,
  emailShoppingList,
} from '@/lib/culinary/shopping-list-export'

type Props = {
  result: ShoppingListResult
}

export function ExportToolbar({ result }: Props) {
  const [copied, setCopied] = useState(false)
  const [emailTo, setEmailTo] = useState('')
  const [showEmailInput, setShowEmailInput] = useState(false)
  const [emailSent, setEmailSent] = useState<boolean | null>(null)
  const [exportMode, setExportMode] = useState<'all' | 'vendor'>('all')
  const [isPending, startTransition] = useTransition()

  async function copyToClipboard() {
    const text =
      exportMode === 'vendor'
        ? formatPerVendorText(result, { shortagesOnly: true })
        : formatPlainText(result, { shortagesOnly: true })

    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for older browsers
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.left = '-9999px'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  function handlePrint() {
    window.open(
      `/culinary/prep/shopping/print?startDate=${result.startDate}&endDate=${result.endDate}`,
      '_blank'
    )
  }

  function handleEmail() {
    if (!emailTo.trim()) return
    setEmailSent(null)
    startTransition(async () => {
      try {
        const res = await emailShoppingList(result, emailTo.trim())
        setEmailSent(res.success)
        if (res.success) {
          setTimeout(() => {
            setShowEmailInput(false)
            setEmailSent(null)
          }, 2000)
        }
      } catch {
        setEmailSent(false)
      }
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        title="Export format"
        value={exportMode}
        onChange={(e) => setExportMode(e.target.value as 'all' | 'vendor')}
        className="rounded-md border border-stone-600 bg-stone-900 px-2 py-1.5 text-sm text-stone-300"
      >
        <option value="all">Full List</option>
        <option value="vendor">Per Vendor</option>
      </select>

      <Button variant="secondary" onClick={copyToClipboard} className="text-sm">
        {copied ? 'Copied!' : 'Copy to Clipboard'}
      </Button>

      <Button variant="secondary" onClick={() => setShowEmailInput((v) => !v)} className="text-sm">
        Email
      </Button>

      <Button variant="secondary" onClick={handlePrint} className="text-sm">
        Print View
      </Button>

      {showEmailInput && (
        <div className="flex items-center gap-2">
          <input
            type="email"
            placeholder="Email address"
            value={emailTo}
            onChange={(e) => setEmailTo(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleEmail()}
            className="rounded-md border border-stone-600 bg-stone-900 px-2 py-1.5 text-sm text-stone-300 w-56"
          />
          <Button onClick={handleEmail} disabled={isPending || !emailTo.trim()} className="text-sm">
            {isPending ? 'Sending...' : 'Send'}
          </Button>
          {emailSent === true && <span className="text-xs text-green-400">Sent!</span>}
          {emailSent === false && <span className="text-xs text-red-400">Failed to send</span>}
        </div>
      )}
    </div>
  )
}
