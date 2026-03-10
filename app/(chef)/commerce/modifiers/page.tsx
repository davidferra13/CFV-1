// Modifier Group Management Page
import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { requirePro } from '@/lib/billing/require-pro'
import { getModifierGroups } from '@/lib/commerce/modifier-actions'
import { ModifierGroupManager } from '@/components/commerce/modifier-group-manager'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowLeft } from '@/components/ui/icons'

export const metadata: Metadata = { title: 'Product Modifiers - ChefFlow' }

export default async function ModifiersPage() {
  await requireChef()
  await requirePro('commerce')

  const groups = await getModifierGroups()

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/commerce/products">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Products
          </Button>
        </Link>
        <h1 className="text-3xl font-bold text-stone-100">Product Modifiers</h1>
      </div>
      <p className="text-stone-400">
        Create modifier groups (like Temperature, Side Choice, Add-ons) and assign them to products.
        Customers will see these options when ordering.
      </p>
      <ModifierGroupManager groups={groups} />
    </div>
  )
}
