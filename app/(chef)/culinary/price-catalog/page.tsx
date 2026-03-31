import { requireChef } from '@/lib/auth/get-user'
import { redirect } from 'next/navigation'
import { CatalogBrowser } from './catalog-browser'

export const metadata = { title: 'Food Catalog' }

export default async function PriceCatalogPage() {
  try {
    await requireChef()
  } catch {
    redirect('/sign-in')
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-stone-100">Food Catalog</h1>
        <p className="text-sm text-stone-500">
          Browse ingredients by store, compare prices, and build your shopping list
        </p>
      </div>
      <CatalogBrowser />
    </div>
  )
}
