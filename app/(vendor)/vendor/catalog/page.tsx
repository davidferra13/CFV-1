import { requireVendor } from '@/lib/auth/get-user'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { vendorItems } from '@/lib/db/schema/schema'
import { eq } from 'drizzle-orm'

export const metadata = { title: 'Catalog' }

export default async function VendorCatalogPage() {
  let user
  try {
    user = await requireVendor()
  } catch {
    redirect('/auth/signin?portal=vendor')
  }

  const items = await db
    .select({
      id: vendorItems.id,
      vendorItemName: vendorItems.vendorItemName,
      unitPriceCents: vendorItems.unitPriceCents,
      unitSize: vendorItems.unitSize,
      unitMeasure: vendorItems.unitMeasure,
      vendorSku: vendorItems.vendorSku,
    })
    .from(vendorItems)
    .where(eq(vendorItems.vendorId, user.vendorId))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-100">Catalog</h1>
        <p className="text-sm text-stone-400 mt-1">Your product catalog</p>
      </div>

      {items.length === 0 ? (
        <div className="rounded-lg border border-stone-700 bg-stone-900 p-8 text-center">
          <p className="text-stone-400">No catalog items yet.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <div key={item.id} className="rounded-lg border border-stone-700 bg-stone-900 p-4">
              <p className="text-sm font-semibold text-stone-100 truncate">{item.vendorItemName}</p>
              <p className="text-lg font-bold text-stone-200 mt-1">
                ${(item.unitPriceCents / 100).toFixed(2)}
              </p>
              <div className="flex items-center gap-2 mt-2 text-xs text-stone-400">
                {item.unitSize && item.unitMeasure && (
                  <span>
                    {item.unitSize} {item.unitMeasure}
                  </span>
                )}
                {item.vendorSku && <span className="text-stone-500">SKU: {item.vendorSku}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
