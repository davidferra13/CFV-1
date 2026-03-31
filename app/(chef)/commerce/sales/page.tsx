// Sales History Page - filterable list of all sales
import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { requirePro } from '@/lib/billing/require-pro'
import { listSales } from '@/lib/commerce/sale-actions'
import { SalesTable } from '@/components/commerce/sales-table'
import { Badge } from '@/components/ui/badge'

export const metadata: Metadata = { title: 'Sales' }

export default async function SalesPage() {
  await requireChef()
  await requirePro('commerce')

  const { sales, total } = await listSales({ limit: 50 })

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-3xl font-bold text-stone-100">Sales</h1>
        <Badge variant="default">{total}</Badge>
      </div>

      <SalesTable sales={sales} />
    </div>
  )
}
