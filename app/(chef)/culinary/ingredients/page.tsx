import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import { requireChef } from '@/lib/auth/get-user'
import { getIngredients } from '@/lib/recipes/actions'
import { getFlaggedPrices } from '@/lib/pricing/get-flagged-prices'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'
import { formatCurrency } from '@/lib/utils/currency'
import { PriceAttribution } from '@/components/pricing/price-attribution'
import { PriceFlagBanner } from '@/components/pricing/price-flag-banner'
import { AddIngredientForm } from '@/components/culinary/add-ingredient-form'
import { PriceWatchList } from '@/components/pricing/price-watch-list'
import { ImageWithFallback } from '@/components/pricing/image-with-fallback'
import { EnrichImagesButton } from '@/components/culinary/enrich-images-button'
import { WidgetErrorBoundary } from '@/components/ui/widget-error-boundary'
import { PricingIntelligenceBar } from '@/components/intelligence/pricing-intelligence-bar'
import { CrossContactBadges } from '@/components/dietary/cross-contact-badges'
import { InventoryMatchPanel } from '@/components/recipes/inventory-match-panel'

export const metadata: Metadata = { title: 'Ingredients' }

const CATEGORY_STYLES: Record<string, string> = {
  protein: 'bg-red-900 text-red-700',
  produce: 'bg-green-900 text-green-700',
  dairy: 'bg-brand-900 text-brand-700',
  pantry: 'bg-stone-800 text-stone-300',
  spice: 'bg-amber-900 text-amber-700',
  oil: 'bg-yellow-900 text-yellow-700',
  alcohol: 'bg-purple-900 text-purple-700',
  baking: 'bg-orange-900 text-orange-700',
  frozen: 'bg-brand-900 text-brand-700',
  canned: 'bg-stone-800 text-stone-400',
  fresh_herb: 'bg-emerald-900 text-emerald-700',
  dry_herb: 'bg-lime-900 text-lime-700',
  condiment: 'bg-teal-900 text-teal-700',
  beverage: 'bg-brand-900 text-brand-700',
  specialty: 'bg-pink-900 text-pink-700',
  other: 'bg-stone-800 text-stone-400',
}

export default async function IngredientsPage() {
  await requireChef()
  const ingredients = await getIngredients()
  const flaggedPrices = await getFlaggedPrices()

  const stapleCount = ingredients.filter((i: any) => i.is_staple).length
  const pricedCount = ingredients.filter((i: any) => i.average_price_cents != null).length

  return (
    <div className="space-y-6">
      <div>
        <Link href="/culinary" className="text-sm text-stone-500 hover:text-stone-300">
          ← Culinary
        </Link>
        <div className="flex items-center justify-between mt-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-stone-100">Ingredients</h1>
            <span className="bg-stone-800 text-stone-400 text-sm px-2 py-0.5 rounded-full">
              {ingredients.length}
            </span>
          </div>
          <div className="flex gap-2">
            <EnrichImagesButton />
            <Link href="/culinary/ingredients/receipt-scan">
              <Button variant="secondary" size="sm">
                Scan Receipt
              </Button>
            </Link>
            <AddIngredientForm />
          </div>
        </div>
        <p className="text-stone-500 mt-1">Your pantry and ingredient price library</p>
      </div>

      <PriceFlagBanner flagged={flaggedPrices} />

      {ingredients.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card className="p-4">
            <p className="text-2xl font-bold text-stone-100">{ingredients.length}</p>
            <p className="text-sm text-stone-500 mt-1">Total ingredients</p>
          </Card>
          <Card className="p-4">
            <p className="text-2xl font-bold text-green-700">{stapleCount}</p>
            <p className="text-sm text-stone-500 mt-1">Staples</p>
          </Card>
          <Card className="p-4">
            <p className="text-2xl font-bold text-amber-700">{pricedCount}</p>
            <p className="text-sm text-stone-500 mt-1">With price data</p>
          </Card>
        </div>
      )}

      {ingredients.length > 0 && (
        <WidgetErrorBoundary name="Pricing Intelligence" compact>
          <Suspense fallback={null}>
            <PricingIntelligenceBar />
          </Suspense>
        </WidgetErrorBoundary>
      )}

      {ingredients.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-stone-400 font-medium mb-1">No ingredients yet</p>
          <p className="text-stone-400 text-sm mb-4">
            Add ingredients manually or they&apos;ll appear automatically when you build recipes
          </p>
          <Link href="/culinary/recipes/new">
            <Button variant="secondary" size="sm">
              Add a Recipe
            </Button>
          </Link>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ingredient</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Default Unit</TableHead>
                <TableHead>Staple</TableHead>
                <TableHead>Avg Price</TableHead>
                <TableHead>Used In</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ingredients.map((ing: any) => (
                <TableRow key={ing.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <ImageWithFallback
                        src={ing.image_url ?? null}
                        alt={ing.name}
                        category={ing.category}
                        className="h-8 w-8 rounded flex-shrink-0"
                      />
                      <div>
                        <span className="flex items-center gap-1">
                          {ing.name}
                          <CrossContactBadges ingredientName={ing.name} compact />
                        </span>
                        {ing.preferred_vendor && (
                          <p className="text-xs text-stone-400 mt-0.5">
                            Vendor: {ing.preferred_vendor}
                          </p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${CATEGORY_STYLES[ing.category] ?? 'bg-stone-800 text-stone-400'}`}
                    >
                      {ing.category.replace(/_/g, ' ')}
                    </span>
                  </TableCell>
                  <TableCell className="text-stone-400 text-sm">{ing.default_unit}</TableCell>
                  <TableCell>
                    {ing.is_staple ? (
                      <span className="text-xs bg-green-900 text-green-700 px-2 py-0.5 rounded-full">
                        Staple
                      </span>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell className="text-stone-400 text-sm">
                    {ing.average_price_cents != null || ing.last_price_cents != null ? (
                      <PriceAttribution
                        priceCents={ing.average_price_cents ?? ing.last_price_cents}
                        priceUnit={ing.price_unit ?? ing.default_unit}
                        store={ing.last_price_store}
                        confidence={
                          ing.last_price_confidence ? Number(ing.last_price_confidence) : null
                        }
                        trendDirection={ing.price_trend_direction}
                        trendPct={ing.price_trend_pct ? Number(ing.price_trend_pct) : null}
                        lastPriceDate={ing.last_price_date}
                        source={ing.last_price_source ?? null}
                        compact
                      />
                    ) : (
                      <Link
                        href={`/culinary/price-catalog?q=${encodeURIComponent(ing.name)}`}
                        className="text-stone-500 hover:text-brand-600 text-xs underline underline-offset-2"
                      >
                        Find price
                      </Link>
                    )}
                  </TableCell>
                  <TableCell className="text-stone-400 text-sm">
                    {(ing as any).usage_count > 0
                      ? `${(ing as any).usage_count} recipe${(ing as any).usage_count > 1 ? 's' : ''}`
                      : '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Inventory Match */}
      {ingredients.length > 0 && <InventoryMatchPanel />}

      {/* Price Watch List */}
      <PriceWatchList />
    </div>
  )
}
