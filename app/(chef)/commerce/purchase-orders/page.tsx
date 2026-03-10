// Purchase Orders — List and create purchase orders for vendors
import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { requirePro } from '@/lib/billing/require-pro'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Package, Plus, ArrowLeft } from '@/components/ui/icons'
import { getPurchaseOrders } from '@/lib/commerce/purchase-order-actions'
import { POListClient } from './po-list-client'

export const metadata: Metadata = { title: 'Purchase Orders - ChefFlow' }

async function safe<T>(label: string, fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn()
  } catch (err) {
    console.error(`[purchase-orders] ${label} failed:`, err)
    return fallback
  }
}

const STATUS_COLORS: Record<string, 'default' | 'success' | 'warning' | 'error' | 'info'> = {
  draft: 'default',
  sent: 'info',
  acknowledged: 'info',
  partially_received: 'warning',
  received: 'success',
  cancelled: 'error',
}

export default async function PurchaseOrdersPage() {
  await requireChef()
  await requirePro('commerce')

  const orders = await safe('list', () => getPurchaseOrders(), [])

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/commerce" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Purchase Orders</h1>
            <p className="text-sm text-muted-foreground">
              Create, send, and track orders from your vendors
            </p>
          </div>
        </div>
        <POListClient />
      </div>

      {/* Orders list */}
      {orders.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No purchase orders yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Create a purchase order to start ordering from your vendors.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {orders.map((po) => (
            <Link key={po.id} href={`/commerce/purchase-orders/${po.id}`}>
              <Card className="hover:bg-muted/30 transition-colors cursor-pointer">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Package className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <div className="font-medium">{po.po_number}</div>
                        <div className="text-sm text-muted-foreground">
                          {(po.vendor as any)?.name || 'Unknown Vendor'}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="font-medium">${(po.total_cents / 100).toFixed(2)}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(po.order_date).toLocaleDateString()}
                        </div>
                      </div>
                      <Badge variant={STATUS_COLORS[po.status] || 'default'}>
                        {po.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
