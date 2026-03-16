// Commerce Product Form - create/edit products
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { createProduct, updateProduct } from '@/lib/commerce/product-actions'
import {
  PRODUCT_CATEGORIES,
  PRODUCT_CATEGORY_LABELS,
  TAX_CLASSES,
  TAX_CLASS_LABELS,
} from '@/lib/commerce/constants'
import type { ProductCategory, TaxClass } from '@/lib/commerce/constants'
import { parseCurrencyToCents } from '@/lib/utils/currency'

type Props = {
  product?: any // existing product for edit mode
}

export function ProductForm({ product }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const isEdit = !!product

  const [name, setName] = useState(product?.name ?? '')
  const [description, setDescription] = useState(product?.description ?? '')
  const [category, setCategory] = useState(product?.category ?? '')
  const [sku, setSku] = useState(product?.sku ?? '')
  const [price, setPrice] = useState(product ? (product.price_cents / 100).toFixed(2) : '')
  const [cost, setCost] = useState(product?.cost_cents ? (product.cost_cents / 100).toFixed(2) : '')
  const [taxClass, setTaxClass] = useState<TaxClass>(product?.tax_class ?? 'standard')
  const [trackInventory, setTrackInventory] = useState(product?.track_inventory ?? false)
  const [availableQty, setAvailableQty] = useState(product?.available_qty?.toString() ?? '')
  const [lowStockThreshold, setLowStockThreshold] = useState(
    product?.low_stock_threshold?.toString() ?? ''
  )

  function handleSubmit() {
    if (!name.trim()) {
      toast.error('Product name is required')
      return
    }
    const priceCents = parseCurrencyToCents(price || '0')
    if (priceCents <= 0) {
      toast.error('Price must be greater than $0.00')
      return
    }

    const costCents = cost ? parseCurrencyToCents(cost) : undefined

    startTransition(async () => {
      try {
        if (isEdit) {
          await updateProduct({
            id: product.id,
            name: name.trim(),
            description: description.trim() || undefined,
            category: category || undefined,
            sku: sku.trim() || undefined,
            priceCents,
            costCents,
            taxClass,
            trackInventory,
            availableQty: trackInventory && availableQty ? parseInt(availableQty, 10) : undefined,
            lowStockThreshold:
              trackInventory && lowStockThreshold ? parseInt(lowStockThreshold, 10) : undefined,
          })
          toast.success('Product updated')
        } else {
          await createProduct({
            name: name.trim(),
            description: description.trim() || undefined,
            category: category || undefined,
            sku: sku.trim() || undefined,
            priceCents,
            costCents,
            taxClass,
            trackInventory,
            availableQty: trackInventory && availableQty ? parseInt(availableQty, 10) : undefined,
            lowStockThreshold:
              trackInventory && lowStockThreshold ? parseInt(lowStockThreshold, 10) : undefined,
          })
          toast.success('Product created')
        }
        router.push('/commerce/products')
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to save product')
      }
    })
  }

  const margin =
    cost && price
      ? Math.round(
          ((parseCurrencyToCents(price) - parseCurrencyToCents(cost)) /
            parseCurrencyToCents(price)) *
            100
        )
      : null

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{isEdit ? 'Edit Product' : 'New Product'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Name */}
          <div>
            <label className="text-stone-400 text-sm block mb-1">
              Product Name <span className="text-red-400">*</span>
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Chocolate Croissant"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-stone-400 text-sm block mb-1">Description</label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
            />
          </div>

          {/* Category + SKU row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-stone-400 text-sm block mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-md border border-stone-700 bg-stone-900 text-stone-200 px-3 py-2 text-sm"
              >
                <option value="">None</option>
                {PRODUCT_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {PRODUCT_CATEGORY_LABELS[cat as ProductCategory]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-stone-400 text-sm block mb-1">SKU</label>
              <Input value={sku} onChange={(e) => setSku(e.target.value)} placeholder="Optional" />
            </div>
          </div>

          {/* Price + Cost row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-stone-400 text-sm block mb-1">
                Price ($) <span className="text-red-400">*</span>
              </label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="text-stone-400 text-sm block mb-1">Cost ($)</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                placeholder="0.00"
              />
              {margin !== null && (
                <p className="text-xs mt-1">
                  <span
                    className={
                      margin >= 60
                        ? 'text-emerald-400'
                        : margin >= 30
                          ? 'text-amber-400'
                          : 'text-red-400'
                    }
                  >
                    {margin}% margin
                  </span>
                </p>
              )}
            </div>
          </div>

          {/* Tax class */}
          <div>
            <label className="text-stone-400 text-sm block mb-1">Tax Class</label>
            <select
              value={taxClass}
              onChange={(e) => setTaxClass(e.target.value as TaxClass)}
              className="w-full rounded-md border border-stone-700 bg-stone-900 text-stone-200 px-3 py-2 text-sm"
            >
              {TAX_CLASSES.map((tc) => (
                <option key={tc} value={tc}>
                  {TAX_CLASS_LABELS[tc as TaxClass]}
                </option>
              ))}
            </select>
          </div>

          {/* Inventory tracking */}
          <div className="space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={trackInventory}
                onChange={(e) => setTrackInventory(e.target.checked)}
                className="rounded border-stone-600"
              />
              <span className="text-stone-300 text-sm">Track inventory</span>
            </label>

            {trackInventory && (
              <div className="grid grid-cols-2 gap-4 pl-6">
                <div>
                  <label className="text-stone-400 text-sm block mb-1">Stock Quantity</label>
                  <Input
                    type="number"
                    min="0"
                    value={availableQty}
                    onChange={(e) => setAvailableQty(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="text-stone-400 text-sm block mb-1">Low Stock Alert</label>
                  <Input
                    type="number"
                    min="0"
                    value={lowStockThreshold}
                    onChange={(e) => setLowStockThreshold(e.target.value)}
                    placeholder="5"
                  />
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-3 justify-end">
        <Button variant="ghost" onClick={() => router.push('/commerce/products')}>
          Cancel
        </Button>
        <Button variant="primary" onClick={handleSubmit} disabled={isPending}>
          {isPending ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Product'}
        </Button>
      </div>
    </div>
  )
}
