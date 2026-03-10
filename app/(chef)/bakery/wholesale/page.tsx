import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import {
  getWholesaleAccounts,
  getWholesaleOrders,
  getAccountBalances,
} from '@/lib/bakery/wholesale-actions'
import { WholesaleManager } from '@/components/bakery/wholesale-manager'

export const metadata: Metadata = {
  title: 'Wholesale / B2B | ChefFlow',
}

export default async function WholesalePage() {
  await requireChef()

  const [accounts, orders, balances] = await Promise.all([
    getWholesaleAccounts(),
    getWholesaleOrders(),
    getAccountBalances(),
  ])

  return (
    <div className="container max-w-5xl py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Wholesale / B2B</h1>
        <p className="text-muted-foreground">
          Manage wholesale accounts, recurring orders, and invoicing
        </p>
      </div>

      <WholesaleManager
        initialAccounts={accounts}
        initialOrders={orders}
        initialBalances={balances}
      />
    </div>
  )
}
