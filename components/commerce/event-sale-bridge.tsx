// Event-Sale Bridge — shows linked commerce sale on event detail page
'use client'

import { useState, useTransition } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ShoppingCart, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { createSaleFromEvent } from '@/lib/commerce/event-bridge-actions'
import { SALE_STATUS_LABELS, SALE_STATUS_COLORS } from '@/lib/commerce/constants'
import type { SaleStatus } from '@/lib/commerce/constants'

type Props = {
  eventId: string
  existingSale: {
    id: string
    sale_number: string | null
    status: string
    total_cents: number
    created_at: string
  } | null
}

export function EventSaleBridge({ eventId, existingSale }: Props) {
  const [isPending, startTransition] = useTransition()
  const [sale, setSale] = useState(existingSale)
  const [error, setError] = useState<string | null>(null)

  const handleCreateSale = () => {
    setError(null)
    startTransition(async () => {
      try {
        const result = await createSaleFromEvent(eventId)
        setSale({
          id: result.saleId,
          sale_number: result.saleNumber,
          status: result.paymentsLinked > 0 ? 'settled' : 'draft',
          total_cents: result.totalCents,
          created_at: new Date().toISOString(),
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create sale')
      }
    })
  }

  if (!sale) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="w-4 h-4" />
            Commerce Sale
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-stone-500 text-sm mb-3">
            No commerce sale linked to this event. Create one to track through the Commerce Engine.
          </p>
          {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
          <Button onClick={handleCreateSale} disabled={isPending} variant="secondary" size="sm">
            {isPending ? 'Creating...' : 'Create Commerce Sale'}
          </Button>
        </CardContent>
      </Card>
    )
  }

  const status = sale.status as SaleStatus

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShoppingCart className="w-4 h-4" />
          Commerce Sale
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div>
            <span className="text-stone-200 font-medium">{sale.sale_number ?? 'Draft'}</span>
            <Badge variant={SALE_STATUS_COLORS[status] as any} className="ml-2">
              {SALE_STATUS_LABELS[status] ?? status}
            </Badge>
            <span className="text-stone-500 text-sm ml-3">
              ${((sale.total_cents ?? 0) / 100).toFixed(2)}
            </span>
          </div>
          <Link href={`/commerce/sales/${sale.id}`}>
            <Button variant="ghost" size="sm">
              <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
              View Sale
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
