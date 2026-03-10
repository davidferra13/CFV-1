import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { requirePro } from '@/lib/billing/require-pro'
import { getContainerInventory, getContainerHistory } from '@/lib/meal-prep/container-actions'
import { ContainerDashboard } from '@/components/meal-prep/container-dashboard'
import Link from 'next/link'
import { ArrowLeft } from '@/components/ui/icons'

export const metadata: Metadata = { title: 'Container Inventory - ChefFlow' }

export default async function ContainersPage() {
  await requireChef()
  await requirePro('operations')

  const [inventory, transactions] = await Promise.all([
    getContainerInventory(),
    getContainerHistory(),
  ])

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/meal-prep" className="p-2 hover:bg-stone-800 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5 text-stone-400" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-stone-100">Container Inventory</h1>
          <p className="text-sm text-stone-500 mt-1">
            Track container types, stock levels, and deployment across clients.
          </p>
        </div>
      </div>

      <ContainerDashboard inventory={inventory} transactions={transactions} />
    </div>
  )
}
