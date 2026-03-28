'use client'

// ProductLookupPanel - Search Open Food Facts for packaged ingredient details.
// Shows product name, brand, allergens, and nutrition highlights.
// Helps chefs track allergens when adding ingredients to recipes.

import { useState, useTransition } from 'react'
import { searchFoodProductsAction, getFoodProductByBarcodeAction } from '@/lib/food/actions'
import type { FoodProduct } from '@/lib/food/open-food-facts'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

interface ProductLookupPanelProps {
  /** Pre-fill the search with the ingredient name */
  defaultQuery?: string
  /** Callback when allergens are found - parent can use for warnings */
  onAllergensFound?: (allergens: string[]) => void
}

function AllergenBadge({ allergen }: { allergen: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border border-orange-200 text-orange-700 bg-orange-950">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        className="w-3 h-3"
      >
        <path
          fillRule="evenodd"
          d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
          clipRule="evenodd"
        />
      </svg>
      {allergen}
    </span>
  )
}

function NutriScoreBadge({ grade }: { grade: string }) {
  const colors: Record<string, string> = {
    a: 'bg-green-600',
    b: 'bg-lime-500',
    c: 'bg-yellow-400 text-stone-900',
    d: 'bg-orange-500',
    e: 'bg-red-600',
  }
  const bg = colors[grade.toLowerCase()] ?? 'bg-stone-400'
  return (
    <span
      className={`inline-flex items-center justify-center w-6 h-6 rounded text-white text-xs font-bold uppercase ${bg}`}
    >
      {grade}
    </span>
  )
}

function ProductDetail({ product, onBack }: { product: FoodProduct; onBack: () => void }) {
  return (
    <div className="mt-3 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-3 min-w-0">
          {product.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.imageUrl}
              alt=""
              width={56}
              height={56}
              className="rounded object-cover flex-shrink-0"
            />
          )}
          <div className="min-w-0">
            <p className="text-sm font-semibold text-stone-100 truncate">{product.name}</p>
            {product.brand && <p className="text-xs text-stone-500 truncate">{product.brand}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {product.nutriScore && <NutriScoreBadge grade={product.nutriScore} />}
          <button
            type="button"
            onClick={onBack}
            className="text-xs text-stone-400 hover:text-stone-200"
          >
            Back
          </button>
        </div>
      </div>

      {/* Allergens */}
      {product.allergens.length > 0 && (
        <div className="bg-orange-950/50 border border-orange-900 rounded-lg px-3 py-2">
          <p className="text-xs font-semibold text-orange-400 mb-1.5">Allergens detected</p>
          <div className="flex flex-wrap gap-1.5">
            {product.allergens.map((a) => (
              <AllergenBadge key={a} allergen={a} />
            ))}
          </div>
        </div>
      )}

      {/* Ingredients text */}
      {product.ingredients && (
        <div>
          <p className="text-xs font-semibold text-stone-400 mb-1">Ingredients</p>
          <p className="text-xs text-stone-500 leading-relaxed">{product.ingredients}</p>
        </div>
      )}

      {/* Nutrition highlights */}
      <div>
        <p className="text-xs font-semibold text-stone-400 mb-1">Nutrition (per 100g)</p>
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: 'Cal', value: product.nutrition.calories, unit: 'kcal' },
            { label: 'Protein', value: product.nutrition.protein, unit: 'g' },
            { label: 'Fat', value: product.nutrition.fat, unit: 'g' },
            { label: 'Carbs', value: product.nutrition.carbs, unit: 'g' },
          ].map(
            (n) =>
              n.value != null && (
                <div key={n.label} className="text-center bg-stone-800 rounded px-2 py-1.5">
                  <p className="text-xs text-stone-500">{n.label}</p>
                  <p className="text-sm font-medium text-stone-200">
                    {Math.round(n.value)}
                    <span className="text-xs text-stone-500 ml-0.5">{n.unit}</span>
                  </p>
                </div>
              )
          )}
        </div>
      </div>

      {/* Categories */}
      {product.categories.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {product.categories.slice(0, 5).map((c) => (
            <Badge key={c} variant="default">
              {c.replace(/-/g, ' ')}
            </Badge>
          ))}
        </div>
      )}

      <p className="text-xxs text-stone-600 text-right">
        Source: Open Food Facts {product.barcode && `(${product.barcode})`}
      </p>
    </div>
  )
}

export function ProductLookupPanel({
  defaultQuery = '',
  onAllergensFound,
}: ProductLookupPanelProps) {
  const [mode, setMode] = useState<'name' | 'barcode'>('name')
  const [query, setQuery] = useState(defaultQuery)
  const [results, setResults] = useState<FoodProduct[]>([])
  const [selected, setSelected] = useState<FoodProduct | null>(null)
  const [isPending, startTransition] = useTransition()
  const [searched, setSearched] = useState(false)

  const handleSearch = () => {
    if (!query.trim()) return
    setSearched(true)
    setSelected(null)

    if (mode === 'barcode') {
      startTransition(async () => {
        try {
          const product = await getFoodProductByBarcodeAction(query.trim())
          setResults(product ? [product] : [])
        } catch (err) {
          toast.error('Failed to look up barcode')
        }
      })
    } else {
      startTransition(async () => {
        try {
          const products = await searchFoodProductsAction(query.trim())
          setResults(products)
        } catch (err) {
          toast.error('Failed to search products')
        }
      })
    }
  }

  const handleSelect = (product: FoodProduct) => {
    setSelected(product)
    if (product.allergens.length > 0 && onAllergensFound) {
      onAllergensFound(product.allergens)
    }
  }

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-stone-100">Product Lookup</h3>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setMode('name')}
            className={`text-xs px-2 py-0.5 rounded-full transition-colors ${
              mode === 'name'
                ? 'bg-brand-950 text-brand-400 border border-brand-700'
                : 'text-stone-500 hover:text-stone-300'
            }`}
          >
            By name
          </button>
          <button
            type="button"
            onClick={() => setMode('barcode')}
            className={`text-xs px-2 py-0.5 rounded-full transition-colors ${
              mode === 'barcode'
                ? 'bg-brand-950 text-brand-400 border border-brand-700'
                : 'text-stone-500 hover:text-stone-300'
            }`}
          >
            By barcode
          </button>
        </div>
      </div>
      <p className="text-xs text-stone-500 mb-3">
        Search packaged products for allergens, nutrition, and ingredient details
      </p>

      <div className="flex gap-2 mb-3">
        <input
          type={mode === 'barcode' ? 'text' : 'search'}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder={mode === 'barcode' ? 'Enter barcode...' : 'Search product name...'}
          className="flex-1 rounded-md border border-stone-600 px-3 py-2 text-sm bg-stone-900 text-stone-100 placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <Button variant="secondary" onClick={handleSearch} loading={isPending}>
          {isPending ? 'Searching...' : 'Search'}
        </Button>
      </div>

      {/* No results */}
      {searched && !isPending && results.length === 0 && !selected && (
        <p className="text-sm text-stone-500 text-center py-3">
          No products found. Try a different search term.
        </p>
      )}

      {/* Results list */}
      {results.length > 0 && !selected && (
        <ul className="divide-y divide-stone-800 border border-stone-700 rounded-md overflow-hidden max-h-64 overflow-y-auto">
          {results.map((p, i) => (
            <li key={`${p.barcode}-${i}`}>
              <button
                type="button"
                onClick={() => handleSelect(p)}
                className="w-full text-left px-3 py-2 hover:bg-stone-800 flex items-center gap-3 transition-colors"
              >
                {p.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.imageUrl}
                    alt=""
                    width={36}
                    height={36}
                    className="rounded object-cover flex-shrink-0"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-stone-100 truncate">
                    {p.name || 'Unknown product'}
                  </p>
                  {p.brand && <p className="text-xs text-stone-500 truncate">{p.brand}</p>}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {p.allergens.length > 0 && (
                    <span className="text-xs text-orange-500 font-medium">
                      {p.allergens.length} allergen{p.allergens.length !== 1 ? 's' : ''}
                    </span>
                  )}
                  {p.nutriScore && <NutriScoreBadge grade={p.nutriScore} />}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Selected product detail */}
      {selected && <ProductDetail product={selected} onBack={() => setSelected(null)} />}
    </Card>
  )
}
