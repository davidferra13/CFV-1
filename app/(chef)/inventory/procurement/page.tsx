import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import {
  getProcurementOrders,
  getProcurementReferenceData,
  getSupplierDirectoryData,
} from '@/lib/procurement/actions'
import { SupplierDirectory } from '@/components/procurement/SupplierDirectory'
import { PurchaseOrders } from '@/components/procurement/PurchaseOrders'

export const metadata: Metadata = { title: 'Procurement' }

export default async function ProcurementPage() {
  await requireChef()

  const [suppliers, orders, references] = await Promise.all([
    getSupplierDirectoryData().catch(() => []),
    getProcurementOrders().catch(() => []),
    getProcurementReferenceData().catch(() => ({
      suppliers: [],
      ingredients: [],
      events: [],
    })),
  ])

  return (
    <div className="space-y-6">
      <div>
        <Link href="/inventory" className="text-sm text-stone-500 hover:text-stone-300">
          &larr; Inventory
        </Link>
        <h1 className="text-3xl font-bold text-stone-100 mt-1">Procurement Hub</h1>
        <p className="text-stone-500 mt-1">
          Manage suppliers, create purchase orders, and receive stock with inventory updates.
        </p>
      </div>

      <SupplierDirectory initialSuppliers={suppliers} />
      <PurchaseOrders initialOrders={orders} references={references} />
    </div>
  )
}
