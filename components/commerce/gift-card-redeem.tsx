'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils/currency'
import { toast } from 'sonner'
import { lookupGiftCard, redeemGiftCard, type GiftCard } from '@/lib/commerce/gift-card-actions'

export function GiftCardRedeem() {
  const [pending, startTransition] = useTransition()
  const [code, setCode] = useState('')
  const [card, setCard] = useState<GiftCard | null>(null)
  const [lookupDone, setLookupDone] = useState(false)
  const [redeemDollars, setRedeemDollars] = useState('')
  const [redeemResult, setRedeemResult] = useState<{
    success: boolean
    remainingCents: number
    error?: string
  } | null>(null)

  function handleLookup() {
    if (!code.trim()) return
    setLookupDone(false)
    setCard(null)
    setRedeemResult(null)

    startTransition(async () => {
      try {
        const found = await lookupGiftCard(code)
        setCard(found)
        setLookupDone(true)
        if (!found) {
          toast.error('Gift card not found')
        }
      } catch (err: any) {
        toast.error(err?.message || 'Lookup failed')
        setLookupDone(true)
      }
    })
  }

  function handleRedeem() {
    if (!card) return
    const cents = Math.round(parseFloat(redeemDollars) * 100)
    if (!cents || cents <= 0) {
      toast.error('Enter a valid amount')
      return
    }

    startTransition(async () => {
      try {
        const result = await redeemGiftCard(card.code, cents)
        setRedeemResult(result)
        if (result.success) {
          toast.success(
            `Redeemed ${formatCurrency(cents)}. Remaining: ${formatCurrency(result.remainingCents)}`
          )
          setCard({ ...card, currentBalanceCents: result.remainingCents })
          setRedeemDollars('')
        } else {
          toast.error(result.error || 'Redemption failed')
        }
      } catch (err: any) {
        toast.error(err?.message || 'Redemption failed')
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Redeem Gift Card</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Code lookup */}
        <div className="flex gap-2">
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="Enter code (e.g., GC-A7X9K2)"
            className="flex-1 px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-stone-100 text-sm font-mono"
            onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
          />
          <Button variant="secondary" onClick={handleLookup} disabled={pending}>
            {pending ? '...' : 'Look Up'}
          </Button>
        </div>

        {/* Card info */}
        {lookupDone && card && (
          <div className="bg-stone-800/50 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-sm text-stone-200">{card.code}</span>
              <Badge variant={card.status === 'active' ? 'success' : 'default'}>
                {card.status}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-stone-500">Balance</span>
                <p className="text-stone-100 font-semibold text-lg">
                  {formatCurrency(card.currentBalanceCents)}
                </p>
              </div>
              <div>
                <span className="text-stone-500">Original Value</span>
                <p className="text-stone-300">{formatCurrency(card.initialValueCents)}</p>
              </div>
            </div>
            {card.recipientName && (
              <div className="text-xs text-stone-400">Recipient: {card.recipientName}</div>
            )}
            {card.expiresAt && (
              <div className="text-xs text-stone-400">
                Expires: {new Date(card.expiresAt).toLocaleDateString()}
              </div>
            )}

            {/* Redeem form */}
            {card.status === 'active' && card.currentBalanceCents > 0 && (
              <div className="flex gap-2 pt-2 border-t border-stone-700">
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={card.currentBalanceCents / 100}
                  value={redeemDollars}
                  onChange={(e) => setRedeemDollars(e.target.value)}
                  placeholder="Amount ($)"
                  className="flex-1 px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-stone-100 text-sm"
                />
                <Button variant="primary" onClick={handleRedeem} disabled={pending}>
                  {pending ? '...' : 'Redeem'}
                </Button>
              </div>
            )}

            {/* Result feedback */}
            {redeemResult && !redeemResult.success && (
              <p className="text-sm text-red-400">{redeemResult.error}</p>
            )}
          </div>
        )}

        {lookupDone && !card && (
          <p className="text-sm text-stone-500 text-center py-4">
            No gift card found with that code.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
