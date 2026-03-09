'use client'

import { useMemo, useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { generateClientTipCheckoutUrl } from '@/lib/events/tip-payment-actions'

const PRESET_AMOUNTS = [2500, 5000, 10000]

function formatAmount(amountCents: number) {
  return `$${(amountCents / 100).toFixed(2)}`
}

type TipAfterReviewCardProps = {
  eventId: string
}

export function TipAfterReviewCard({ eventId }: TipAfterReviewCardProps) {
  const [selectedAmount, setSelectedAmount] = useState<number>(PRESET_AMOUNTS[0])
  const [customAmount, setCustomAmount] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const resolvedAmount = useMemo(() => {
    const trimmed = customAmount.trim()
    if (!trimmed) return selectedAmount
    const parsed = Number(trimmed)
    if (!Number.isFinite(parsed) || parsed <= 0) return 0
    return Math.round(parsed * 100)
  }, [customAmount, selectedAmount])

  function handleCheckout() {
    if (!Number.isInteger(resolvedAmount) || resolvedAmount <= 0) {
      setError('Enter a valid tip amount')
      return
    }

    setError(null)

    startTransition(async () => {
      try {
        const result = await generateClientTipCheckoutUrl(eventId, resolvedAmount)
        window.location.assign(result.url)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to start tip checkout')
      }
    })
  }

  return (
    <Card className="border-amber-700 bg-amber-950/40">
      <CardContent className="space-y-4 pt-6">
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-stone-100">Want to add a tip?</h3>
          <p className="text-sm text-stone-400">
            Optional, but appreciated. Tips go through secure checkout and are recorded directly to
            your event.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {PRESET_AMOUNTS.map((amount) => {
            const isActive = !customAmount.trim() && resolvedAmount === amount
            return (
              <button
                key={amount}
                type="button"
                onClick={() => {
                  setCustomAmount('')
                  setSelectedAmount(amount)
                }}
                className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                  isActive
                    ? 'border-amber-500 bg-amber-500/15 text-amber-300'
                    : 'border-stone-700 bg-stone-900 text-stone-300 hover:border-stone-500'
                }`}
              >
                {formatAmount(amount)}
              </button>
            )
          })}
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-stone-300" htmlFor="tip-custom-amount">
            Custom amount
          </label>
          <Input
            id="tip-custom-amount"
            inputMode="decimal"
            placeholder="50.00"
            value={customAmount}
            onChange={(event) => setCustomAmount(event.target.value)}
          />
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <div className="flex items-center justify-between gap-3">
          <div className="text-sm text-stone-400">
            Tip amount{' '}
            <span className="font-semibold text-stone-200">{formatAmount(resolvedAmount)}</span>
          </div>
          <Button
            type="button"
            onClick={handleCheckout}
            disabled={isPending || resolvedAmount <= 0}
          >
            {isPending ? 'Opening checkout...' : 'Add Tip'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
