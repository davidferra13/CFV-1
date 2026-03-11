'use client'

// VendorInvoiceMatcher — Side-by-side invoice item matching UI.
// Lets chefs match invoice line items to known ingredients and flags price changes.

import { useState, useTransition } from 'react'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select } from '@/components/ui/select'
import { FileText, Link2, Unlink, AlertTriangle, Check } from '@/components/ui/icons'
import { matchInvoiceItems } from '@/lib/inventory/vendor-invoice-actions'
import { toast } from 'sonner'

export type VendorInvoice = {
  id: string
  vendorName?: string
  invoiceNumber: string
  invoiceDate: string
  totalCents: number
  status: string
  items: {
    id: string
    itemName: string
    quantity: number
    unitPriceCents: number
    totalCents: number
    matchedIngredientId?: string
    priceChanged: boolean
  }[]
}

type KnownPrice = {
  ingredientId: string
  name: string
  lastPriceCents: number
}

function formatMoney(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

export function VendorInvoiceMatcher({
  invoice,
  knownPrices,
}: {
  invoice: VendorInvoice
  knownPrices: KnownPrice[]
}) {
  const [pending, startTransition] = useTransition()
  const [matches, setMatches] = useState<Record<string, string>>(
    Object.fromEntries(
      invoice.items
        .filter((item) => item.matchedIngredientId)
        .map((item) => [item.id, item.matchedIngredientId!])
    )
  )
  const [saved, setSaved] = useState(false)

  const ingredientOptions = knownPrices.map((kp) => ({
    value: kp.ingredientId,
    label: `${kp.name} (${formatMoney(kp.lastPriceCents)}/unit)`,
  }))

  function handleMatch(itemId: string, ingredientId: string) {
    setMatches((prev) => {
      if (!ingredientId) {
        const next = { ...prev }
        delete next[itemId]
        return next
      }
      return { ...prev, [itemId]: ingredientId }
    })
    setSaved(false)
  }

  function handleUnmatch(itemId: string) {
    setMatches((prev) => {
      const next = { ...prev }
      delete next[itemId]
      return next
    })
    setSaved(false)
  }

  function handleSave() {
    setSaved(false)
    startTransition(async () => {
      try {
        const matchEntries = Object.entries(matches).map(([itemId, ingredientId]) => ({
          itemId,
          ingredientId,
        }))
        await matchInvoiceItems(invoice.id, matchEntries)
        setSaved(true)
      } catch (err) {
        toast.error('Failed to save invoice matches')
      }
    })
  }

  const matchedCount = Object.keys(matches).length
  const totalItems = invoice.items.length

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-stone-400" />
            Invoice Matcher
          </CardTitle>
          <Badge variant={invoice.status === 'matched' ? 'success' : 'default'}>
            {invoice.status}
          </Badge>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-stone-500">
          {invoice.vendorName && <span>Vendor: {invoice.vendorName}</span>}
          <span>Invoice #{invoice.invoiceNumber}</span>
          <span>{new Date(invoice.invoiceDate).toLocaleDateString()}</span>
          <span className="font-medium text-stone-300">
            Total: {formatMoney(invoice.totalCents)}
          </span>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="divide-y divide-stone-800">
          {invoice.items.map((item) => {
            const matchedId = matches[item.id]
            const knownPrice = matchedId
              ? knownPrices.find((kp) => kp.ingredientId === matchedId)
              : null
            const hasPriceChange =
              item.priceChanged || (knownPrice && knownPrice.lastPriceCents !== item.unitPriceCents)

            return (
              <div
                key={item.id}
                className={`px-6 py-4 grid grid-cols-1 lg:grid-cols-2 gap-4 ${
                  hasPriceChange ? 'bg-amber-950/50' : ''
                }`}
              >
                {/* Left side: Invoice item details */}
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-stone-100">{item.itemName}</span>
                    {hasPriceChange && (
                      <Badge variant="warning">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Price Changed
                      </Badge>
                    )}
                    {matchedId && (
                      <Badge variant="success">
                        <Check className="h-3 w-3 mr-1" />
                        Matched
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-4 text-sm text-stone-500">
                    <span>Qty: {item.quantity}</span>
                    <span>Unit: {formatMoney(item.unitPriceCents)}</span>
                    <span className="font-medium text-stone-300">
                      Line Total: {formatMoney(item.totalCents)}
                    </span>
                  </div>
                  {hasPriceChange && knownPrice && (
                    <p className="mt-1 text-xs text-amber-200">
                      Previous price: {formatMoney(knownPrice.lastPriceCents)} per unit (
                      {item.unitPriceCents > knownPrice.lastPriceCents ? '+' : ''}
                      {formatMoney(item.unitPriceCents - knownPrice.lastPriceCents)})
                    </p>
                  )}
                </div>

                {/* Right side: Ingredient matcher */}
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <Select
                      options={ingredientOptions}
                      value={matchedId || ''}
                      onChange={(e) => handleMatch(item.id, e.target.value)}
                      className="text-sm"
                    />
                  </div>
                  {matchedId ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleUnmatch(item.id)}
                      title="Unmatch"
                    >
                      <Unlink className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button variant="ghost" size="sm" disabled title="No match">
                      <Link2 className="h-4 w-4 text-stone-300" />
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>

      <CardFooter className="flex items-center justify-between">
        <p className="text-sm text-stone-500">
          {matchedCount} of {totalItems} items matched
        </p>
        <div className="flex items-center gap-3">
          {saved && <span className="text-sm text-emerald-600">Matches saved.</span>}
          <Button
            variant="primary"
            onClick={handleSave}
            loading={pending}
            disabled={pending || matchedCount === 0}
          >
            Save Matches
          </Button>
        </div>
      </CardFooter>
    </Card>
  )
}
