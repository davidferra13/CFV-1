'use client'

import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { formatCurrency } from '@/lib/utils/currency'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { SplitPublicData } from '@/lib/payments/split-share-actions'

export function SplitBreakdownView({
  data,
  showShareButton,
  onShare,
}: {
  data: SplitPublicData
  showShareButton?: boolean
  onShare?: () => void
}) {
  const [copied, setCopied] = useState(false)

  const handleCopyAmount = async () => {
    const text = formatCurrency(data.perPersonCents)
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for older browsers
      const el = document.createElement('textarea')
      el.value = text
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center pb-2">
        <CardTitle className="text-2xl">{data.eventName}</CardTitle>
        <p className="text-sm text-stone-400 mt-1">
          {format(parseISO(data.eventDate), 'EEEE, MMMM d, yyyy')}
        </p>
        {data.location && <p className="text-sm text-stone-500">{data.location}</p>}
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Total and split */}
        <div className="text-center space-y-1">
          <p className="text-sm text-stone-400">Total</p>
          <p className="text-xl font-semibold text-stone-100">{formatCurrency(data.totalCents)}</p>
          <p className="text-sm text-stone-500">Split {data.guestCount} ways</p>
        </div>

        {/* Per person highlight */}
        <div className="bg-stone-800/50 rounded-xl p-6 text-center">
          <p className="text-sm text-stone-400 mb-1">Per Person</p>
          <p className="text-3xl font-bold text-brand-400">{formatCurrency(data.perPersonCents)}</p>
          <Button variant="secondary" size="sm" className="mt-3" onClick={handleCopyAmount}>
            {copied ? 'Copied!' : 'Copy Amount'}
          </Button>
        </div>

        {/* Split entries (first names + paid status) */}
        {data.splitEntries && data.splitEntries.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-stone-300">Payment Status</p>
            <div className="space-y-1.5">
              {data.splitEntries.map((entry, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-stone-800/30"
                >
                  <span className="text-sm text-stone-200">{entry.firstName}</span>
                  <Badge variant={entry.paid ? 'success' : 'warning'}>
                    {entry.paid ? 'Paid' : 'Pending'}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Chef contact */}
        <div className="border-t border-stone-700 pt-4 text-center space-y-1">
          <p className="text-xs text-stone-500">Questions? Contact your chef:</p>
          <p className="text-sm font-medium text-stone-200">{data.chefName}</p>
          {data.chefEmail && (
            <a
              href={`mailto:${data.chefEmail}`}
              className="text-xs text-brand-500 hover:underline block"
            >
              {data.chefEmail}
            </a>
          )}
          {data.chefPhone && (
            <a
              href={`tel:${data.chefPhone}`}
              className="text-xs text-brand-500 hover:underline block"
            >
              {data.chefPhone}
            </a>
          )}
        </div>

        {/* Share button (client view only) */}
        {showShareButton && onShare && (
          <Button variant="primary" className="w-full" onClick={onShare}>
            Share with Group
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
