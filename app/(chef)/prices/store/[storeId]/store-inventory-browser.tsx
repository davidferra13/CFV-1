'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { getStoreInventory, type StoreProduct } from '@/lib/openclaw/store-catalog-actions'
import { toast } from 'sonner'

type Props = {
  storeId: string
  initialProducts: StoreProduct[]
  initialTotal: number
  departments: string[]
}

function formatPrice(cents: number) {
  return `$${(cents / 100).toFixed(2)}`
}

function freshnessIndicator(lastSeen: string) {
  const hours = (Date.now() - new Date(lastSeen).getTime()) / (1000 * 60 * 60)
  if (hours < 24)
    return (
      <span className="inline-block h-2 w-2 rounded-full bg-green-500" title="Updated within 24h" />
    )
  if (hours < 168)
    return (
      <span
        className="inline-block h-2 w-2 rounded-full bg-yellow-500"
        title="Updated within 7 days"
      />
    )
  return (
    <span className="inline-block h-2 w-2 rounded-full bg-stone-600" title="Older than 7 days" />
  )
}

export function StoreInventoryBrowser({
  storeId,
  initialProducts,
  initialTotal,
  departments,
}: Props) {
  const [products, setProducts] = useState(initialProducts)
  const [total, setTotal] = useState(initialTotal)
  const [page, setPage] = useState(1)
  const [department, setDepartment] = useState('')
  const [search, setSearch] = useState('')
  const [foodOnly, setFoodOnly] = useState(true)
  const [pending, startTransition] = useTransition()
  const limit = 50
  const totalPages = Math.ceil(total / limit)

  const fetchProducts = (
    newPage: number,
    newDept?: string,
    newSearch?: string,
    newFoodOnly?: boolean
  ) => {
    const dept = newDept ?? department
    const srch = newSearch ?? search
    const food = newFoodOnly ?? foodOnly

    startTransition(async () => {
      try {
        const result = await getStoreInventory({
          storeId,
          department: dept || undefined,
          search: srch || undefined,
          foodOnly: food,
          page: newPage,
          limit,
        })
        setProducts(result.products)
        setTotal(result.total)
        setPage(newPage)
      } catch {
        toast.error('Failed to load products')
      }
    })
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardContent className="py-3">
          <div className="flex flex-wrap gap-3 items-center">
            <input
              type="text"
              placeholder="Search products..."
              className="rounded-lg border border-stone-700 bg-stone-900 px-3 py-1.5 text-sm text-stone-100 placeholder:text-stone-500 flex-1 min-w-[180px] focus:outline-none focus:ring-2 focus:ring-brand-500"
              defaultValue={search}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const val = (e.target as HTMLInputElement).value
                  setSearch(val)
                  fetchProducts(1, undefined, val)
                }
              }}
            />
            {departments.length > 0 && (
              <select
                value={department}
                onChange={(e) => {
                  setDepartment(e.target.value)
                  fetchProducts(1, e.target.value)
                }}
                aria-label="Filter by department"
                className="rounded-lg border border-stone-700 bg-stone-900 px-3 py-1.5 text-sm text-stone-300"
              >
                <option value="">All Departments</option>
                {departments.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            )}
            <label className="flex items-center gap-1.5 text-xs text-stone-400 cursor-pointer">
              <input
                type="checkbox"
                checked={foodOnly}
                onChange={(e) => {
                  setFoodOnly(e.target.checked)
                  fetchProducts(1, undefined, undefined, e.target.checked)
                }}
                className="rounded border-stone-600"
              />
              Food only
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Product table */}
      <Card>
        <CardHeader>
          <CardTitle>
            {total > 0 ? `${total.toLocaleString()} products` : 'No products found'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {products.length === 0 ? (
            <p className="text-center text-stone-500 py-8">
              {total === 0 && !search && !department
                ? 'No products cataloged yet for this store. Data is being collected.'
                : 'No products match your filters.'}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-stone-700 text-left text-xs text-stone-400">
                    <th className="pb-2 pr-3">Product</th>
                    <th className="pb-2 pr-3">Size</th>
                    <th className="pb-2 pr-3">Price</th>
                    <th className="pb-2 pr-3">Stock</th>
                    <th className="pb-2 pr-3">Department</th>
                    <th className="pb-2">Fresh</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => (
                    <tr
                      key={p.id}
                      className={`border-b border-stone-800 hover:bg-stone-900/50 ${!p.inStock ? 'opacity-50' : ''}`}
                    >
                      <td className="py-2 pr-3">
                        <div className="flex items-center gap-2">
                          {p.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={p.imageUrl}
                              alt=""
                              className="h-8 w-8 rounded object-cover flex-shrink-0 bg-stone-800"
                              onError={(e) => {
                                ;(e.currentTarget as HTMLImageElement).style.display = 'none'
                              }}
                            />
                          ) : (
                            <div className="h-8 w-8 rounded bg-stone-800 flex-shrink-0" />
                          )}
                          <div>
                            <span className="font-medium text-stone-200">{p.productName}</span>
                            {p.brand && (
                              <span className="text-xs text-stone-500 ml-1.5">{p.brand}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-1 mt-0.5 ml-10">
                          {p.isOrganic && <Badge variant="success">Organic</Badge>}
                          {p.isStoreBrand && <Badge variant="default">Store Brand</Badge>}
                        </div>
                      </td>
                      <td className="py-2 pr-3 text-stone-400 text-xs">{p.size ?? '-'}</td>
                      <td className="py-2 pr-3">
                        {p.salePriceCents != null ? (
                          <div>
                            <span className="line-through text-stone-500 text-xs">
                              {formatPrice(p.priceCents)}
                            </span>
                            <span className="text-red-400 font-medium ml-1">
                              {formatPrice(p.salePriceCents)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-stone-200 font-medium">
                            {formatPrice(p.priceCents)}
                          </span>
                        )}
                      </td>
                      <td className="py-2 pr-3">
                        {p.inStock ? (
                          <span className="text-xs text-green-400">In Stock</span>
                        ) : (
                          <span className="text-xs text-red-400">Out of Stock</span>
                        )}
                      </td>
                      <td className="py-2 pr-3 text-xs text-stone-400">
                        {p.department ?? p.categoryName ?? '-'}
                      </td>
                      <td className="py-2">{freshnessIndicator(p.lastSeenAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-stone-800">
              <p className="text-xs text-stone-500">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page <= 1 || pending}
                  onClick={() => fetchProducts(page - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page >= totalPages || pending}
                  onClick={() => fetchProducts(page + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
