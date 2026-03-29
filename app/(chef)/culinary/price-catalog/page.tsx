import { requireChef } from '@/lib/auth/get-user'
import { redirect } from 'next/navigation'
import { CatalogBrowser } from './catalog-browser'

export const metadata = { title: 'Food Catalog | ChefFlow' }

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
        <p className="text-sm text-stone-500">Browse 15,000+ ingredients across 39 local stores</p>
      </div>
      <CatalogBrowser />
    </div>
  )
}
