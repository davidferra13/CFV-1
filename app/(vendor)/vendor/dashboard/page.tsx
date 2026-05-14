import { requireVendor } from '@/lib/auth/get-user'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { vendors, purchaseOrders, vendorInvoices } from '@/lib/db/schema/schema'
import { eq, and, inArray, sql, count } from 'drizzle-orm'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ClipboardList, FileText, Package } from '@/components/ui/icons'

export const metadata = { title: 'Dashboard' }

export default async function VendorDashboardPage() {
  let user
  try {
    user = await requireVendor()
  } catch {
    redirect('/auth/signin?portal=vendor')
  }

  const [vendor] = await db
    .select({ name: vendors.name })
    .from(vendors)
    .where(eq(vendors.id, user.vendorId))
    .limit(1)

  const [openOrdersResult] = await db
    .select({ value: count() })
    .from(purchaseOrders)
    .where(
      and(
        eq(purchaseOrders.vendorId, user.vendorId),
        inArray(purchaseOrders.status, ['sent', 'acknowledged'])
      )
    )

  const [pendingInvoicesResult] = await db
    .select({ value: count() })
    .from(vendorInvoices)
    .where(and(eq(vendorInvoices.vendorId, user.vendorId), eq(vendorInvoices.status, 'pending')))

  const openOrders = openOrdersResult?.value ?? 0
  const pendingInvoices = pendingInvoicesResult?.value ?? 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-100">Welcome, {vendor?.name ?? 'Vendor'}</h1>
        <p className="text-sm text-stone-400 mt-1">Your vendor portal overview</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link href="/vendor/orders">
          <Card className="bg-stone-900 border-stone-700 hover:border-stone-500 transition-colors cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-stone-400">Open Orders</CardTitle>
              <ClipboardList size={18} className="text-stone-500" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-stone-100">{openOrders}</p>
              <p className="text-xs text-stone-500 mt-1">Sent or acknowledged</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/vendor/invoices">
          <Card className="bg-stone-900 border-stone-700 hover:border-stone-500 transition-colors cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-stone-400">Pending Invoices</CardTitle>
              <FileText size={18} className="text-stone-500" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-stone-100">{pendingInvoices}</p>
              <p className="text-xs text-stone-500 mt-1">Awaiting processing</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/vendor/catalog">
          <Card className="bg-stone-900 border-stone-700 hover:border-stone-500 transition-colors cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-stone-400">Catalog</CardTitle>
              <Package size={18} className="text-stone-500" />
            </CardHeader>
            <CardContent>
              <p className="text-lg font-semibold text-stone-100">Manage Items</p>
              <p className="text-xs text-stone-500 mt-1">View your product catalog</p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  )
}
