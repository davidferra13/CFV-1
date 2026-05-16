import { notFound } from 'next/navigation'
import Image from 'next/image'
import { RecipeScalingPanel } from '@/components/ai/recipe-scaling-panel'
import { RecipeScalingPreview } from '@/components/culinary/recipe-scaling-preview'
import Link from 'next/link'
import { getRecipeById } from '@/lib/recipes/actions'
import { requireChef } from '@/lib/auth/get-user'
import { resolvePricesBatch } from '@/lib/pricing/resolve-price'
import { getPlaceholderImage } from '@/lib/images/placeholder-actions'
import { formatCurrency } from '@/lib/utils/currency'
import { PriceBadgeFromFlat } from '@/components/pricing/price-badge'
import { NutritionLookupPanel } from '@/components/recipes/nutrition-lookup-panel'
import { FoodPlaceholderImage } from '@/components/ui/food-placeholder-image'
import { Badge } from '@/components/ui/badge'
import { RecipeStatusBadge } from '@/components/recipes/recipe-status-badge'
import { RecipeLineage } from '@/components/recipes/recipe-lineage'
import { getRecipeLifecycleStatus } from '@/lib/recipes/lifecycle-actions'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { getIngredientKnowledgeBatch } from '@/lib/openclaw/ingredient-knowledge-queries'
import { IngredientSourcingToggle } from '@/components/recipes/ingredient-sourcing-toggle'
import { IngredientPiePopover } from '@/components/pricing/ingredient-pie-popover'
import { getRecipeStockCoverage } from '@/lib/inventory/stock-lookup-actions'
import { StockStatusBadge, StockCoverageSummary } from '@/components/inventory/stock-status-badge'
import { getEventsUsingRecipe } from '@/lib/recipes/recipe-events-action'
import { ScaleForEventButton } from '@/components/recipes/scale-for-event-button'
import { RecipeSlideshow } from '@/components/recipes/recipe-slideshow'
import { StepPhotoGallery } from '@/components/recipes/step-photo-gallery'
import { getRecipeStepPhotos } from '@/lib/recipes/recipe-photo-actions'

const VOLUME_UNITS = new Set([
  'cup',
  'cups',
  'ml',
  'l',
  'liter',
  'litre',
  'tbsp',
  'tsp',
  'fl oz',
  'floz',
  'gallon',
  'qt',
  'quart',
  'pint',
  'pt',
])
const WEIGHT_UNITS = new Set([
  'g',
  'gram',
  'grams',
  'kg',
  'kilogram',
  'kilograms',
  'oz',
  'ounce',
  'ounces',
  'lb',
  'lbs',
  'pound',
  'pounds',
])
const COUNT_UNITS = new Set([
  'ea',
  'each',
  'piece',
  'pieces',
  'pc',
  'pcs',
  'unit',
  'units',
  'whole',
  'bunch',
  'bunches',
  'head',
  'heads',
  'clove',
  'cloves',
  'slice',
  'slices',
  'stalk',
  'stalks',
  'sprig',
  'sprigs',
])

type RecipeStepPhoto = Awaited<ReturnType<typeof getRecipeStepPhotos>>[number]

function buildRecipePhotoSteps(recipe: any, stepPhotos: RecipeStepPhoto[]) {
  if (stepPhotos.length === 0) return []

  const methodText = recipe.method_detailed || recipe.method || ''
  const methodLines = methodText
    .split(/\r?\n/)
    .map((line: string) => line.trim())
    .filter(Boolean)

  const photosByStep = new Map<number, RecipeStepPhoto[]>()
  for (const photo of stepPhotos) {
    const existing = photosByStep.get(photo.step_number) ?? []
    existing.push(photo)
    photosByStep.set(photo.step_number, existing)
  }

  return Array.from(photosByStep.entries())
    .sort(([a], [b]) => a - b)
    .map(([stepNumber, photos]) => ({
      number: stepNumber,
      instruction: methodLines[stepNumber - 1] ?? `Step ${stepNumber}`,
      photos: photos
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((photo) => ({
          id: photo.id,
          photo_url: photo.photo_url,
          caption: photo.caption,
        })),
    }))
}

function unitCategory(unit: string | null | undefined): string | null {
  if (!unit) return null
  const u = unit.toLowerCase().trim()
  if (VOLUME_UNITS.has(u)) return 'volume'
  if (WEIGHT_UNITS.has(u)) return 'weight'
  if (COUNT_UNITS.has(u)) return 'count'
  return null
}

function unitMismatch(
  recipeUnit: string | null | undefined,
  priceUnit: string | null | undefined
): boolean {
  const rc = unitCategory(recipeUnit)
  const pc = unitCategory(priceUnit)
  if (!rc || !pc) return false
  return rc !== pc
}

export default async function ChefRecipeDetailPage({ params }: { params: { id: string } }) {
  let recipe: Awaited<ReturnType<typeof getRecipeById>> = null
  try {
    recipe = await getRecipeById(params.id)
  } catch {
    notFound()
  }
  if (!recipe) notFound()

  const r = recipe as any
  const user = await requireChef()
  const totalMinutes =
    r.total_time_minutes ?? (r.prep_time_minutes ?? 0) + (r.cook_time_minutes ?? 0)

  // If recipe has its own photo, use that. Otherwise fetch a stock placeholder.
  const hasOwnPhoto = !!r.photo_url

  // Batch-fetch ingredient knowledge for all recipe ingredients
  const ingredientNames: string[] = (r.recipe_ingredients ?? [])
    .map((ri: any) => ri.ingredient?.name)
    .filter(Boolean)

  // Collect ingredient IDs for live PIE price resolution
  const ingredientIds: string[] = (r.recipe_ingredients ?? [])
    .map((ri: any) => ri.ingredient?.id)
    .filter(Boolean)

  // Build stock coverage input from recipe ingredients
  const stockInput = (r.recipe_ingredients ?? [])
    .filter((ri: any) => ri.ingredient?.id)
    .map((ri: any) => ({
      ingredientId: ri.ingredient.id,
      ingredientName: ri.ingredient.name ?? 'Unknown',
      quantity: ri.quantity,
      unit: ri.unit,
    }))

  const [
    placeholderImage,
    ingredientKnowledge,
    stockCoverage,
    livePrices,
    recipeEvents,
    lifecycle,
    stepPhotos,
  ] = await Promise.all([
    hasOwnPhoto ? Promise.resolve(null) : getPlaceholderImage(r.name),
    getIngredientKnowledgeBatch(ingredientNames).catch(() => new Map()),
    getRecipeStockCoverage(stockInput).catch(
      () => [] as Awaited<ReturnType<typeof getRecipeStockCoverage>>
    ),
    ingredientIds.length > 0
      ? resolvePricesBatch(ingredientIds, user.tenantId!).catch(() => new Map<string, any>())
      : Promise.resolve(new Map<string, any>()),
    getEventsUsingRecipe(params.id).catch(() => []),
    getRecipeLifecycleStatus(params.id).catch(() => null),
    getRecipeStepPhotos(params.id).catch(() => []),
  ])

  // Compute live total from PIE prices
  let liveTotalCents = 0
  let livePricedCount = 0
  for (const ri of r.recipe_ingredients ?? []) {
    const livePrice = ri.ingredient?.id ? livePrices.get(ri.ingredient.id) : null
    if (livePrice && ri.quantity) {
      liveTotalCents += Math.round(ri.quantity * livePrice.cents)
      livePricedCount++
    }
  }

  // Build a lookup map for stock status by ingredient ID
  const stockByIngredient = new Map(stockCoverage.map((s) => [s.ingredientId, s]))
  const photoSteps = buildRecipePhotoSteps(r, stepPhotos)
  const stepNumbersWithPhotos = Array.from(
    new Set(stepPhotos.map((photo) => photo.step_number))
  ).sort((a, b) => a - b)

  return (
    <div className="space-y-6">
      {/* Hero image - own photo or stock placeholder */}
      {hasOwnPhoto ? (
        <div className="relative w-full rounded-xl overflow-hidden" style={{ aspectRatio: '21/9' }}>
          <Image
            src={r.photo_url}
            alt={r.name}
            fill
            sizes="(max-width: 768px) 100vw, 800px"
            className="object-cover"
            priority
          />
        </div>
      ) : (
        <FoodPlaceholderImage image={placeholderImage} size="hero" />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-stone-100">{r.name}</h1>
            {lifecycle && (
              <RecipeStatusBadge
                status={lifecycle.status as 'stub' | 'draft' | 'active' | 'archived'}
              />
            )}
          </div>
          {lifecycle && (
            <RecipeLineage
              recipeId={r.id}
              forkedFrom={
                lifecycle.forkedFromId && lifecycle.forkedFromName
                  ? { id: lifecycle.forkedFromId, name: lifecycle.forkedFromName }
                  : null
              }
              forkCount={lifecycle.forkCount}
              versionNumber={lifecycle.versionNumber}
              versionNote={lifecycle.versionNote}
            />
          )}
          <div className="flex flex-wrap items-center gap-2 mt-1">
            {r.category && <Badge variant="info">{r.category.replace(/_/g, ' ')}</Badge>}
            {r.archived && <Badge variant="error">Archived</Badge>}
            {(r.dietary_tags ?? []).map((tag: string) => (
              <Badge key={tag} variant="default">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/culinary/recipes/${r.id}/edit`}>
            <Button variant="secondary" size="sm">
              Edit Recipe
            </Button>
          </Link>
          <Link href="/culinary/recipes">
            <Button variant="ghost" size="sm">
              ← Recipes
            </Button>
          </Link>
        </div>
      </div>

      {/* Recipe Cost Summary Card */}
      {liveTotalCents > 0 &&
        (() => {
          const servings = r.yield_quantity ?? r.servings ?? r.default_servings ?? 4
          const costPerServing = Math.round(liveTotalCents / servings)
          const coveragePct =
            ingredientIds.length > 0
              ? Math.round((livePricedCount / ingredientIds.length) * 100)
              : 0

          // Find oldest confirmedAt across all priced ingredients
          let oldestConfirmed: Date | null = null
          for (const ri of r.recipe_ingredients ?? []) {
            const lp = ri.ingredient?.id ? livePrices.get(ri.ingredient.id) : null
            if (lp?.confirmedAt) {
              const d = new Date(lp.confirmedAt)
              if (!oldestConfirmed || d < oldestConfirmed) oldestConfirmed = d
            }
          }
          const freshnessLabel = oldestConfirmed
            ? (() => {
                const days = Math.floor(
                  (Date.now() - oldestConfirmed.getTime()) / (1000 * 60 * 60 * 24)
                )
                if (days <= 7) return 'Fresh (< 1 week)'
                if (days <= 30) return `${days}d old`
                return `${Math.floor(days / 30)}mo old`
              })()
            : null

          return (
            <Card className="p-4 bg-stone-900 border-stone-800">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-6">
                  {/* Total Cost */}
                  <div>
                    <p className="text-xs text-stone-500 uppercase tracking-wide">Total Cost</p>
                    <p className="text-lg font-semibold text-stone-100">
                      {formatCurrency(liveTotalCents)}
                    </p>
                  </div>

                  {/* Per Serving */}
                  <div>
                    <p className="text-xs text-stone-500 uppercase tracking-wide">Per Serving</p>
                    <p className="text-lg font-semibold text-stone-100">
                      {formatCurrency(costPerServing)}
                      <span className="text-xs text-stone-500 font-normal ml-1">
                        / {servings} srv
                      </span>
                    </p>
                  </div>

                  {/* Food Cost % */}
                  <div>
                    <p className="text-xs text-stone-500 uppercase tracking-wide">Food Cost %</p>
                    <p className="text-sm text-stone-400">Set selling price to see food cost %</p>
                  </div>

                  {/* Price Coverage */}
                  <div>
                    <p className="text-xs text-stone-500 uppercase tracking-wide">Coverage</p>
                    <p className="text-lg font-semibold text-stone-100">
                      {coveragePct}%
                      <span className="text-xs text-stone-500 font-normal ml-1">
                        ({livePricedCount}/{ingredientIds.length})
                      </span>
                    </p>
                  </div>

                  {/* Freshness */}
                  {freshnessLabel && (
                    <div>
                      <p className="text-xs text-stone-500 uppercase tracking-wide">Freshness</p>
                      <p className="text-sm font-medium text-stone-200">{freshnessLabel}</p>
                    </div>
                  )}
                </div>

                {/* Shop link */}
                <Link href="/culinary/prep/shopping">
                  <Button variant="secondary" size="sm">
                    Shop for This
                  </Button>
                </Link>
              </div>
            </Card>
          )
        })()}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Recipe Details */}
        <Card className="p-5 space-y-4">
          <h2 className="text-base font-semibold text-stone-100">Details</h2>

          {r.description && (
            <p className="text-sm text-stone-300 whitespace-pre-wrap">{r.description}</p>
          )}

          <dl className="space-y-2">
            {totalMinutes > 0 && (
              <div className="flex justify-between">
                <dt className="text-sm text-stone-500">Total time</dt>
                <dd className="text-sm font-medium text-stone-100">{totalMinutes} min</dd>
              </div>
            )}
            {r.prep_time_minutes != null && (
              <div className="flex justify-between">
                <dt className="text-sm text-stone-500">Prep</dt>
                <dd className="text-sm text-stone-100">{r.prep_time_minutes} min</dd>
              </div>
            )}
            {r.cook_time_minutes != null && (
              <div className="flex justify-between">
                <dt className="text-sm text-stone-500">Cook</dt>
                <dd className="text-sm text-stone-100">{r.cook_time_minutes} min</dd>
              </div>
            )}
            {r.yield_description && (
              <div className="flex justify-between">
                <dt className="text-sm text-stone-500">Yield</dt>
                <dd className="text-sm text-stone-100">{r.yield_description}</dd>
              </div>
            )}
            {r.times_cooked > 0 && (
              <div className="flex justify-between">
                <dt className="text-sm text-stone-500">Times cooked</dt>
                <dd className="text-sm text-stone-100">{r.times_cooked}</dd>
              </div>
            )}
          </dl>

          {r.method && (
            <div>
              <h3 className="text-sm font-medium text-stone-300 mb-1">Method</h3>
              <p className="text-sm text-stone-400 whitespace-pre-wrap">{r.method}</p>
            </div>
          )}

          {photoSteps.length > 0 && (
            <div className="border-t border-stone-800 pt-4">
              <RecipeSlideshow recipeName={r.name} steps={photoSteps} />
            </div>
          )}

          {stepNumbersWithPhotos.length > 0 && (
            <div className="space-y-4 border-t border-stone-800 pt-4">
              <p className="text-sm font-medium text-stone-300">Step Photos</p>
              {stepNumbersWithPhotos.map((stepNumber) => (
                <div key={stepNumber} className="space-y-2">
                  <p className="text-xs font-medium text-stone-500">Step {stepNumber}</p>
                  <StepPhotoGallery
                    recipeId={r.id}
                    stepNumber={stepNumber}
                    photos={stepPhotos.filter((photo) => photo.step_number === stepNumber)}
                  />
                </div>
              ))}
            </div>
          )}

          {r.notes && (
            <div>
              <h3 className="text-sm font-medium text-stone-300 mb-1">Notes</h3>
              <p className="text-sm text-stone-500 whitespace-pre-wrap">{r.notes}</p>
            </div>
          )}
        </Card>

        {/* Ingredients & Cost */}
        <Card className="p-5 space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <h2 className="text-base font-semibold text-stone-100">Ingredients</h2>
              <div className="flex items-center gap-3">
                {liveTotalCents > 0 && (
                  <span className="text-sm text-stone-400">
                    Live cost:{' '}
                    <span className="font-medium text-stone-100">
                      {formatCurrency(liveTotalCents)}
                    </span>
                    {livePricedCount < ingredientIds.length && (
                      <span className="text-xs text-stone-600 ml-1">
                        ({livePricedCount}/{ingredientIds.length} priced)
                      </span>
                    )}
                  </span>
                )}
                {liveTotalCents === 0 && (r as any).costSummary?.total_cost_cents != null && (
                  <span className="text-sm text-stone-500">
                    Est. cost:{' '}
                    <span className="font-medium text-stone-100">
                      {formatCurrency((r as any).costSummary.total_cost_cents)}
                    </span>
                  </span>
                )}
              </div>
            </div>
            {stockCoverage.length > 0 && <StockCoverageSummary items={stockCoverage} />}
          </div>

          {r.recipe_ingredients?.length > 0 ? (
            <ul className="divide-y divide-stone-800">
              {r.recipe_ingredients.map((ri: any) => {
                const iName = ri.ingredient?.name
                const know = iName ? ingredientKnowledge.get(iName) : undefined
                const livePrice = ri.ingredient?.id ? livePrices.get(ri.ingredient.id) : null
                const hasPriceUnit = livePrice || ri.ingredient?.average_price_cents != null
                const hasUnitMismatch =
                  hasPriceUnit &&
                  unitMismatch(ri.unit, livePrice?.unit ?? ri.ingredient?.default_unit)
                const lineTotal =
                  livePrice && ri.quantity ? Math.round(ri.quantity * livePrice.cents) : null
                return (
                  <li key={ri.id} className="py-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-sm text-stone-100">
                          {ri.quantity != null && `${ri.quantity} ${ri.unit ?? ''} `}
                          <span className="font-medium">{iName ?? 'Unknown'}</span>
                          {ri.is_optional && (
                            <span className="ml-1 text-xs text-stone-400">(optional)</span>
                          )}
                          {lineTotal != null && (
                            <span className="text-xs text-stone-500 ml-2">
                              {formatCurrency(lineTotal)}
                            </span>
                          )}
                        </span>
                        {ri.preparation_notes && (
                          <p className="text-xs text-stone-500 mt-0.5">{ri.preparation_notes}</p>
                        )}
                        {hasUnitMismatch && (
                          <p className="text-xs text-amber-400 mt-0.5">
                            Unit mismatch: recipe uses {ri.unit}, price is per{' '}
                            {livePrice?.unit ?? ri.ingredient.default_unit}. Cost estimate may be
                            inaccurate.
                          </p>
                        )}
                        {/* Stock status from inventory */}
                        {ri.ingredient?.id && stockByIngredient.get(ri.ingredient.id) && (
                          <div className="mt-1">
                            <StockStatusBadge item={stockByIngredient.get(ri.ingredient.id)!} />
                          </div>
                        )}
                      </div>
                      {livePrice ? (
                        <PriceBadgeFromFlat
                          priceCents={livePrice.cents}
                          priceUnit={livePrice.unit}
                          store={livePrice.store}
                          confidence={livePrice.effectiveConfidence}
                          source={livePrice.source}
                          lastPriceDate={livePrice.confirmedAt}
                          ingredientId={ri.ingredient.id}
                          compact
                        />
                      ) : ri.ingredient?.average_price_cents != null ? (
                        <PriceBadgeFromFlat
                          priceCents={ri.ingredient.average_price_cents}
                          priceUnit={ri.ingredient.default_unit ?? 'unit'}
                          store={ri.ingredient.last_price_store}
                          confidence={
                            ri.ingredient.last_price_confidence
                              ? Number(ri.ingredient.last_price_confidence)
                              : null
                          }
                          source={ri.ingredient.last_price_source ?? null}
                          lastPriceDate={ri.ingredient.last_price_date}
                          ingredientId={ri.ingredient.id}
                          compact
                        />
                      ) : (
                        iName && <IngredientSourcingToggle ingredientName={iName} />
                      )}
                      {ri.ingredient?.id && (
                        <IngredientPiePopover
                          ingredientId={ri.ingredient.id}
                          ingredientName={ri.ingredient.name}
                          className="ml-1"
                        />
                      )}
                    </div>
                    {/* Inline knowledge: dietary flags + pairings hint */}
                    {know && (know.dietaryFlags.length > 0 || know.flavorProfile) && (
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        {know.dietaryFlags.slice(0, 3).map((f: string) => (
                          <span
                            key={f}
                            className="text-xs bg-emerald-950/50 text-emerald-400 border border-emerald-900/50 px-1.5 py-0.5 rounded-full capitalize"
                          >
                            {f}
                          </span>
                        ))}
                        {know.flavorProfile && (
                          <span className="text-xs text-stone-600 capitalize">
                            {know.flavorProfile}
                          </span>
                        )}
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="text-sm text-stone-400">No ingredients added yet.</p>
          )}
        </Card>
      </div>

      {/* Cross-domain: Events using this recipe */}
      {recipeEvents.length > 0 && (
        <Card className="p-5">
          <h2 className="text-base font-semibold text-stone-100 mb-3">
            Used in Events
            <span className="ml-2 text-xs bg-stone-800 text-stone-400 px-2 py-0.5 rounded-full">
              {recipeEvents.length}
            </span>
          </h2>
          <div className="space-y-2">
            {recipeEvents.map((event) => (
              <Link
                key={event.event_id}
                href={`/events/${event.event_id}`}
                className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-stone-800/50 group"
              >
                <div>
                  <span className="text-sm text-stone-200 group-hover:text-stone-100 font-medium">
                    {event.event_name}
                  </span>
                  {event.menu_name && (
                    <span className="text-xs text-stone-500 ml-2">via {event.menu_name}</span>
                  )}
                </div>
                {event.event_date && (
                  <span className="text-xs text-stone-500">
                    {new Date(event.event_date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                )}
              </Link>
            ))}
          </div>
        </Card>
      )}

      {/* Scale for upcoming events */}
      {recipeEvents
        .filter(
          (ev) =>
            ev.guest_count &&
            ev.guest_count > 0 &&
            ev.event_date &&
            new Date(ev.event_date) >= new Date()
        )
        .map((ev) => (
          <ScaleForEventButton
            key={ev.event_id}
            recipeId={params.id}
            eventName={ev.event_name}
            guestCount={ev.guest_count!}
          />
        ))}

      {/* Nutrition Lookup - Open Food Facts */}
      <NutritionLookupPanel defaultQuery={r.name} />

      {/* Deterministic Scaling Preview */}
      {(r.recipe_ingredients ?? []).length > 0 && (
        <Card className="p-5">
          <RecipeScalingPreview
            ingredients={(r.recipe_ingredients ?? [])
              .filter((ri: any) => ri.ingredient)
              .map((ri: any) => ({
                ingredientId: ri.ingredient.id ?? ri.ingredient_id,
                name: ri.ingredient.name,
                quantity: ri.quantity,
                unit: ri.unit,
                ingredientCategory: ri.ingredient.category ?? 'other',
              }))}
            baseYield={r.yield_quantity ?? r.servings ?? 4}
            yieldUnit={r.yield_unit ?? 'servings'}
          />
        </Card>
      )}

      {/* AI Recipe Scaling */}
      <RecipeScalingPanel
        recipeId={params.id}
        defaultServings={r.default_servings ?? r.servings ?? 4}
      />
    </div>
  )
}
