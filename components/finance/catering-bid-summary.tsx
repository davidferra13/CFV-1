'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert } from '@/components/ui/alert'
import type { BidResult } from '@/lib/finance/catering-bid-actions'

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

function getFoodCostRating(
  foodCostCents: number,
  totalCents: number
): { label: string; color: 'success' | 'warning' | 'error'; percent: number } {
  if (totalCents === 0) return { label: 'N/A', color: 'warning', percent: 0 }
  const percent = Math.round((foodCostCents / totalCents) * 100)
  if (percent < 30) return { label: 'Excellent', color: 'success', percent }
  if (percent <= 40) return { label: 'Acceptable', color: 'warning', percent }
  return { label: 'High', color: 'error', percent }
}

export function CateringBidSummary({
  result,
  guestCount,
  bidName,
  onQuoteCreated,
}: {
  result: BidResult
  guestCount: number
  bidName?: string
  onQuoteCreated?: (quoteId: string) => void
}) {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)

  const foodCostRating = getFoodCostRating(
    result.foodCostCents,
    result.totalCents
  )

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="space-y-6 print:space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between print:block">
        <div>
          <h2 className="text-xl font-semibold">
            {bidName || 'Catering Bid'}
          </h2>
          <p className="text-sm text-gray-500">
            {guestCount} guests - Generated{' '}
            {new Date().toLocaleDateString()}
          </p>
        </div>
        <div className="flex gap-2 print:hidden">
          <Button variant="ghost" onClick={handlePrint}>
            Print
          </Button>
        </div>
      </div>

      {/* Warnings */}
      {result.warnings.length > 0 && (
        <Alert variant="warning" className="print:hidden">
          <ul className="text-sm space-y-1">
            {result.warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </Alert>
      )}

      {/* Per-person highlight */}
      <Card>
        <CardContent className="py-6 text-center">
          <p className="text-sm text-gray-500 uppercase tracking-wide">
            Total bid
          </p>
          <p className="text-3xl font-bold mt-1">
            {formatCents(result.totalCents)}
          </p>
          <p className="text-lg text-gray-600 mt-1">
            {formatCents(result.perPersonCents)} per person
          </p>
          <div className="mt-3 inline-flex items-center gap-2">
            <span className="text-sm text-gray-500">Food cost ratio:</span>
            <Badge variant={foodCostRating.color}>
              {foodCostRating.percent}% - {foodCostRating.label}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Recipe breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Recipe Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {result.breakdown.map((item) => (
              <div
                key={item.recipeId}
                className="flex items-center justify-between py-2 border-b last:border-b-0"
              >
                <div>
                  <p className="font-medium text-sm">{item.recipeName}</p>
                  <p className="text-xs text-gray-500">
                    {item.servings} servings
                    {item.yieldQuantity
                      ? ` (recipe yields ${item.yieldQuantity})`
                      : ''}
                    {!item.hasAllPrices && (
                      <span className="ml-1 text-amber-600">
                        * incomplete pricing
                      </span>
                    )}
                  </p>
                </div>
                <span className="font-medium text-sm">
                  {formatCents(item.scaledCostCents)}
                </span>
              </div>
            ))}
            <div className="flex items-center justify-between pt-2 font-semibold text-sm">
              <span>Total Food Cost</span>
              <span>{formatCents(result.foodCostCents)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cost summary */}
      <Card>
        <CardHeader>
          <CardTitle>Cost Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <LineItem label="Food" amount={result.foodCostCents} />
            <LineItem label="Labor" amount={result.laborCostCents} />
            {result.travelCostCents > 0 && (
              <LineItem label="Travel" amount={result.travelCostCents} />
            )}
            {result.equipmentCostCents > 0 && (
              <LineItem label="Equipment" amount={result.equipmentCostCents} />
            )}
            <LineItem label="Overhead" amount={result.overheadCents} />
            <div className="border-t pt-2">
              <LineItem
                label="Subtotal"
                amount={result.subtotalCents}
                bold
              />
            </div>
            <LineItem label="Profit" amount={result.profitCents} />
            <div className="border-t pt-2">
              <LineItem
                label="Total"
                amount={result.totalCents}
                bold
                large
              />
            </div>
            <div className="text-right text-sm text-gray-500">
              {formatCents(result.perPersonCents)} per person
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <Alert variant="error">
          <p>{error}</p>
        </Alert>
      )}

      {/* Actions */}
      {saved && (
        <Alert variant="success">
          <p>Bid saved as quote successfully.</p>
        </Alert>
      )}
    </div>
  )
}

function LineItem({
  label,
  amount,
  bold = false,
  large = false,
}: {
  label: string
  amount: number
  bold?: boolean
  large?: boolean
}) {
  return (
    <div
      className={`flex items-center justify-between ${
        bold ? 'font-semibold' : ''
      } ${large ? 'text-lg' : 'text-sm'}`}
    >
      <span>{label}</span>
      <span>{formatCents(amount)}</span>
    </div>
  )
}
