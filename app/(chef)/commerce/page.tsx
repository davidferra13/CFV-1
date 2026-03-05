// Commerce Hub — dashboard showing today's sales, active register, order queue
import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { requireFocusAccess } from '@/lib/billing/require-focus-access'
import { requirePro } from '@/lib/billing/require-pro'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import {
  ShoppingCart,
  Store,
  Package,
  ClipboardCheck,
  DollarSign,
  Percent,
  AlertTriangle,
  CreditCard,
  MapPin,
} from 'lucide-react'
import { getCurrentRegisterSession } from '@/lib/commerce/register-actions'
import { listSales } from '@/lib/commerce/sale-actions'
import { listProducts } from '@/lib/commerce/product-actions'

export const metadata: Metadata = { title: 'Commerce — ChefFlow' }

async function safe<T>(label: string, fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn()
  } catch (err) {
    console.error(`[commerce-hub] ${label} failed:`, err)
    return fallback
  }
}

export default async function CommerceDashboardPage() {
  await requireChef()
  await requireFocusAccess()
  await requirePro('commerce')

  const [registerSession, salesData, productsData] = await Promise.all([
    safe('register', () => getCurrentRegisterSession(), null),
    safe('sales', () => listSales({ limit: 5 }), { sales: [], total: 0 }),
    safe('products', () => listProducts({ limit: 0 }), { products: [], total: 0 }),
  ])

  const todaySales = salesData.sales.filter((s: any) => {
    const created = new Date(s.created_at)
    const today = new Date()
    return created.toDateString() === today.toDateString()
  })

  const todayRevenue = todaySales.reduce((sum: number, s: any) => sum + (s.total_cents ?? 0), 0)

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start gap-4">
        <div>
          <h1 className="text-3xl font-bold text-stone-100">Commerce</h1>
          <p className="text-stone-400 mt-1">POS register, products, and sales</p>
        </div>
        <div className="flex gap-2">
          <Link href="/commerce/virtual-terminal">
            <Button variant="secondary">
              <CreditCard className="w-4 h-4 mr-2" />
              Virtual Terminal
            </Button>
          </Link>
          <Link href="/commerce/register">
            <Button variant="primary">
              <ShoppingCart className="w-4 h-4 mr-2" />
              Open Register
            </Button>
          </Link>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-stone-500 text-sm">Register</p>
            <div className="flex items-center gap-2 mt-1">
              {registerSession ? (
                <Badge variant={(registerSession as any).status === 'open' ? 'success' : 'warning'}>
                  {(registerSession as any).status === 'open' ? 'Open' : 'Suspended'}
                </Badge>
              ) : (
                <span className="text-stone-400 text-sm">Closed</span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-stone-500 text-sm">Today&apos;s Sales</p>
            <p className="text-2xl font-bold text-stone-100 mt-1">{todaySales.length}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-stone-500 text-sm">Today&apos;s Revenue</p>
            <p className="text-2xl font-bold text-emerald-400 mt-1">
              ${(todayRevenue / 100).toFixed(2)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-stone-500 text-sm">Products</p>
            <p className="text-2xl font-bold text-stone-100 mt-1">{productsData.total}</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-4">
        <Link href="/commerce/register">
          <Card interactive>
            <CardContent className="p-4 flex items-center gap-3">
              <ShoppingCart className="w-5 h-5 text-brand-500" />
              <span className="text-stone-200 font-medium">POS Register</span>
            </CardContent>
          </Card>
        </Link>
        <Link href="/commerce/virtual-terminal">
          <Card interactive>
            <CardContent className="p-4 flex items-center gap-3">
              <CreditCard className="w-5 h-5 text-brand-500" />
              <span className="text-stone-200 font-medium">Virtual Terminal</span>
            </CardContent>
          </Card>
        </Link>
        <Link href="/commerce/products">
          <Card interactive>
            <CardContent className="p-4 flex items-center gap-3">
              <Package className="w-5 h-5 text-brand-500" />
              <span className="text-stone-200 font-medium">Products</span>
            </CardContent>
          </Card>
        </Link>
        <Link href="/commerce/orders">
          <Card interactive>
            <CardContent className="p-4 flex items-center gap-3">
              <ClipboardCheck className="w-5 h-5 text-brand-500" />
              <span className="text-stone-200 font-medium">Order Queue</span>
            </CardContent>
          </Card>
        </Link>
        <Link href="/commerce/sales">
          <Card interactive>
            <CardContent className="p-4 flex items-center gap-3">
              <DollarSign className="w-5 h-5 text-brand-500" />
              <span className="text-stone-200 font-medium">Sales History</span>
            </CardContent>
          </Card>
        </Link>
        <Link href="/commerce/table-service">
          <Card interactive>
            <CardContent className="p-4 flex items-center gap-3">
              <MapPin className="w-5 h-5 text-brand-500" />
              <span className="text-stone-200 font-medium">Table Service</span>
            </CardContent>
          </Card>
        </Link>
        <Link href="/commerce/promotions">
          <Card interactive>
            <CardContent className="p-4 flex items-center gap-3">
              <Percent className="w-5 h-5 text-brand-500" />
              <span className="text-stone-200 font-medium">Promotions</span>
            </CardContent>
          </Card>
        </Link>
        <Link href="/commerce/observability">
          <Card interactive>
            <CardContent className="p-4 flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-brand-500" />
              <span className="text-stone-200 font-medium">Observability</span>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Recent Sales */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Recent Sales</CardTitle>
            <Link href="/commerce/sales" className="text-sm text-brand-500 hover:underline">
              View all
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {salesData.sales.length === 0 ? (
            <p className="text-stone-500 text-sm py-4 text-center">
              No sales yet. Open the register to start selling.
            </p>
          ) : (
            <div className="space-y-2">
              {salesData.sales.map((sale: any) => (
                <Link
                  key={sale.id}
                  href={`/commerce/sales/${sale.id}`}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-stone-800 transition-colors"
                >
                  <div>
                    <span className="text-stone-200 font-medium">
                      {sale.sale_number ?? 'Draft'}
                    </span>
                    <span className="text-stone-500 text-sm ml-3">
                      {new Date(sale.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge
                      variant={
                        sale.status === 'captured' || sale.status === 'settled'
                          ? 'success'
                          : sale.status === 'voided'
                            ? 'error'
                            : 'default'
                      }
                    >
                      {sale.status}
                    </Badge>
                    <span className="text-stone-200 font-medium">
                      ${((sale.total_cents ?? 0) / 100).toFixed(2)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
