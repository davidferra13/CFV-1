import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getIngredients } from '@/lib/recipes/actions'
import { Card } from '@/components/ui/card'

export const metadata: Metadata = { title: 'Vendor Notes - ChefFlow' }

export default async function VendorNotesPage() {
  await requireChef()
  const ingredients = await getIngredients()

  const withVendor = ingredients.filter((i: any) => i.preferred_vendor)

  // Group by vendor
  const byVendor = new Map<string, typeof withVendor>()
  for (const ing of withVendor) {
    const vendor = ing.preferred_vendor!
    if (!byVendor.has(vendor)) byVendor.set(vendor, [])
    byVendor.get(vendor)!.push(ing)
  }

  const vendors = Array.from(byVendor.entries()).sort((a, b) => a[0].localeCompare(b[0]))

  return (
    <div className="space-y-6">
      <div>
        <Link href="/culinary/ingredients" className="text-sm text-stone-500 hover:text-stone-300">
          ← Ingredients
        </Link>
        <div className="flex items-center gap-3 mt-1">
          <h1 className="text-3xl font-bold text-stone-100">Vendor Notes</h1>
          <span className="bg-stone-800 text-stone-400 text-sm px-2 py-0.5 rounded-full">
            {vendors.length} vendors
          </span>
        </div>
        <p className="text-stone-500 mt-1">Ingredients grouped by preferred vendor</p>
      </div>

      {withVendor.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-stone-400 font-medium">No vendor assignments yet</p>
          <p className="text-stone-400 text-sm mt-1">
            Set a preferred vendor on any ingredient to track sourcing here
          </p>
          <Link
            href="/culinary/ingredients"
            className="text-brand-600 hover:underline text-sm mt-3 inline-block"
          >
            Browse ingredients →
          </Link>
        </Card>
      ) : (
        <div className="space-y-6">
          {vendors.map(([vendor, items]) => (
            <div key={vendor}>
              <div className="flex items-center gap-2 mb-2">
                <h2 className="text-base font-semibold text-stone-200">{vendor}</h2>
                <span className="text-xs text-stone-400">
                  ({items.length} ingredient{items.length !== 1 ? 's' : ''})
                </span>
              </div>
              <Card>
                <div className="divide-y divide-stone-800">
                  {items
                    .sort((a: any, b: any) => a.name.localeCompare(b.name))
                    .map((ing: any) => (
                      <div key={ing.id} className="px-4 py-3 flex items-center gap-4">
                        <div className="flex-1">
                          <span className="font-medium text-stone-100">{ing.name}</span>
                          {ing.is_staple && (
                            <span className="ml-2 text-xs bg-amber-900 text-amber-200 px-1.5 py-0.5 rounded">
                              Staple
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-sm text-stone-500 shrink-0">
                          {ing.default_unit && (
                            <span className="text-stone-400 text-xs">{ing.default_unit}</span>
                          )}
                          {ing.average_price_cents != null ? (
                            <span className="text-stone-300">
                              ${(ing.average_price_cents / 100).toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-stone-300 text-xs">no price</span>
                          )}
                          <span className="text-xs text-stone-400 capitalize">
                            {ing.category?.replace(/_/g, ' ') ?? '—'}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </Card>
            </div>
          ))}
        </div>
      )}

      {ingredients.filter((i: any) => !i.preferred_vendor).length > 0 && (
        <p className="text-xs text-stone-400">
          {ingredients.filter((i: any) => !i.preferred_vendor).length} ingredients without a vendor
          assignment —{' '}
          <Link href="/culinary/ingredients" className="text-brand-600 hover:underline">
            view all
          </Link>
        </p>
      )}
    </div>
  )
}
