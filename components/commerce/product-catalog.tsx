'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'
import { Search } from 'lucide-react'
import { PRODUCT_CATEGORY_LABELS } from '@/lib/commerce/constants'
import type { ProductCategory } from '@/lib/commerce/constants'

type Props = {
  products: any[]
}

export function ProductCatalog({ products }: Props) {
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    if (!search) return products
    const s = search.toLowerCase()
    return products.filter(
      (p: any) =>
        p.name.toLowerCase().includes(s) ||
        (p.category && p.category.toLowerCase().includes(s)) ||
        (p.sku && p.sku.toLowerCase().includes(s))
    )
  }, [products, search])

  if (products.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-stone-500">
            No products yet. Create your first product to start selling.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" />
        <Input
          type="search"
          placeholder="Search by name, category, or SKU..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Cost</TableHead>
              <TableHead>Margin</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((product: any) => {
              const margin =
                product.cost_cents && product.price_cents > 0
                  ? Math.round(
                      ((product.price_cents - product.cost_cents) / product.price_cents) * 100
                    )
                  : null

              return (
                <TableRow key={product.id}>
                  <TableCell>
                    <div>
                      <span className="text-stone-200 font-medium">{product.name}</span>
                      {product.sku && (
                        <span className="text-stone-500 text-xs ml-2">SKU: {product.sku}</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-stone-400">
                      {product.category
                        ? (PRODUCT_CATEGORY_LABELS[product.category as ProductCategory] ??
                          product.category)
                        : '—'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-stone-200">
                      ${(product.price_cents / 100).toFixed(2)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-stone-400">
                      {product.cost_cents ? `$${(product.cost_cents / 100).toFixed(2)}` : '—'}
                    </span>
                  </TableCell>
                  <TableCell>
                    {margin !== null ? (
                      <span
                        className={
                          margin >= 60
                            ? 'text-emerald-400'
                            : margin >= 30
                              ? 'text-amber-400'
                              : 'text-red-400'
                        }
                      >
                        {margin}%
                      </span>
                    ) : (
                      <span className="text-stone-500">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={product.is_active ? 'success' : 'default'}>
                      {product.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}
