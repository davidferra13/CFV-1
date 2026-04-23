import { formatCurrency } from '@/lib/utils/currency'
import type {
  PassiveChefSourceContext,
  PassiveEventSource,
  PassiveMenuSource,
  PassiveProductDraft,
  PassiveRecipeSource,
  PassiveStoreSourceBundle,
} from './types'

function positiveNumbers(values: Array<number | null | undefined>): number[] {
  return values.filter(
    (value): value is number => typeof value === 'number' && Number.isFinite(value) && value > 0
  )
}

function uniqueStrings(values: Array<string | null | undefined>): string[] {
  const seen = new Set<string>()
  const output: string[] = []

  for (const raw of values) {
    const value = String(raw ?? '').trim()
    if (!value) continue
    const key = value.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    output.push(value)
  }

  return output
}

function slugFragment(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
}

function clampCents(value: number, floor: number, ceiling: number): number {
  return Math.max(floor, Math.min(ceiling, value))
}

function roundCents(value: number, step = 500): number {
  return Math.max(step, Math.round(value / step) * step)
}

function sentenceCase(value: string | null | undefined): string | null {
  const trimmed = String(value ?? '').trim()
  if (!trimmed) return null
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1)
}

function compactDescription(parts: Array<string | null | undefined>): string {
  return parts
    .map((part) => String(part ?? '').trim())
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function getBookingReferenceTotal(
  chef: PassiveChefSourceContext,
  guestCount?: number | null
): number | null {
  if (!chef.bookingBasePriceCents || chef.bookingBasePriceCents <= 0) return null

  if (chef.bookingPricingType === 'per_person' && guestCount && guestCount > 0) {
    return chef.bookingBasePriceCents * guestCount
  }

  return chef.bookingBasePriceCents
}

function deriveDepositReference(
  chef: PassiveChefSourceContext,
  totalCents: number | null
): number | null {
  if (chef.bookingDepositType === 'fixed' && (chef.bookingDepositFixedCents ?? 0) > 0) {
    return chef.bookingDepositFixedCents ?? null
  }

  if (
    chef.bookingDepositType === 'percent' &&
    totalCents &&
    (chef.bookingDepositPercent ?? 0) > 0
  ) {
    return Math.round(totalCents * ((chef.bookingDepositPercent ?? 0) / 100))
  }

  return totalCents ? Math.round(totalCents * 0.3) : null
}

function describeDishNames(dishes: PassiveMenuSource['dishes'], count = 3): string | null {
  const names = uniqueStrings(dishes.map((dish) => dish.name || dish.course_name)).slice(0, count)
  if (names.length === 0) return null
  if (names.length === 1) return names[0]
  if (names.length === 2) return `${names[0]} and ${names[1]}`
  return `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`
}

function buildMenuTitle(menu: PassiveMenuSource): string {
  const base = menu.name?.trim() || 'Signature'
  return /menu pack$/i.test(base) ? base : `${base} Menu Pack`
}

function buildMenuDescription(menu: PassiveMenuSource): string {
  const guestText =
    menu.target_guest_count && menu.target_guest_count > 0
      ? `built around a ${menu.target_guest_count}-guest service`
      : 'built from a real client-ready menu'
  const cuisineText = sentenceCase(menu.cuisine_type)
  const serviceStyleText = sentenceCase(menu.service_style)
  const dishLine = describeDishNames(menu.dishes)

  return compactDescription([
    cuisineText || serviceStyleText
      ? `${cuisineText ?? 'Private chef'}${serviceStyleText ? ` ${serviceStyleText.toLowerCase()}` : ''} menu pack`
      : 'Chef-approved menu pack',
    `${guestText}.`,
    dishLine ? `Includes dish structure for ${dishLine}.` : null,
    menu.description ? menu.description : 'Delivered as an instant digital reference.',
  ])
}

function deriveMenuPrice(menu: PassiveMenuSource, chef: PassiveChefSourceContext): number {
  const guestCount =
    menu.target_guest_count && menu.target_guest_count > 0 ? menu.target_guest_count : 4
  const serviceValue = positiveNumbers([
    menu.price_per_person_cents ? menu.price_per_person_cents * guestCount : null,
    getBookingReferenceTotal(chef, guestCount),
  ])[0]
  const dishCount = Math.max(menu.dishes.length, 3)
  const reference = serviceValue ?? 12000 + dishCount * 2200

  return clampCents(roundCents(reference * 0.08, 500), 2900, 14900)
}

function buildMenuPackProducts(bundle: PassiveStoreSourceBundle): PassiveProductDraft[] {
  return bundle.menus
    .slice()
    .sort((a, b) => {
      const showcaseDiff = Number(b.is_showcase === true) - Number(a.is_showcase === true)
      if (showcaseDiff !== 0) return showcaseDiff
      return (b.times_used ?? 0) - (a.times_used ?? 0)
    })
    .slice(0, 4)
    .map((menu) => {
      const title = buildMenuTitle(menu)
      return {
        chef_id: bundle.chef.chefId,
        product_key: `menu:${menu.id}`,
        source_type: 'menu',
        source_id: menu.id,
        product_type: 'digital',
        title,
        description: buildMenuDescription(menu),
        price: deriveMenuPrice(menu, bundle.chef),
        fulfillment_type: 'download',
        preview_image_url: bundle.chef.profileImageUrl,
        metadata: {
          label: 'Menu Pack',
          dish_count: menu.dishes.length,
          guest_count: menu.target_guest_count,
          cuisine_type: menu.cuisine_type,
          service_style: menu.service_style,
          times_used: menu.times_used ?? 0,
          menu_id: menu.id,
        },
        generated_payload: {
          kind: 'menu_pack',
          menu_id: menu.id,
          menu_name: menu.name,
          guest_count: menu.target_guest_count,
          cuisine_type: menu.cuisine_type,
          service_style: menu.service_style,
          times_used: menu.times_used ?? 0,
          dishes: menu.dishes.map((dish) => ({
            id: dish.id,
            name: dish.name || dish.course_name || 'Dish',
            course_name: dish.course_name,
            course_number: dish.course_number,
            description: dish.description,
          })),
          notes: uniqueStrings([
            menu.description,
            menu.cuisine_type ? `${menu.cuisine_type} profile` : null,
            menu.service_style ? `${menu.service_style} service flow` : null,
          ]),
        },
      }
    })
}

type RecipeCollection = {
  key: string
  label: string
  sourceId: string
  recipes: PassiveRecipeSource[]
}

function buildRecipeCollections(recipes: PassiveRecipeSource[]): RecipeCollection[] {
  const grouped = new Map<string, RecipeCollection>()

  for (const recipe of recipes) {
    const label = recipe.cuisine || recipe.category || recipe.meal_type || null
    if (!label) continue
    const key = slugFragment(label)
    const current = grouped.get(key) ?? {
      key,
      label,
      sourceId: recipe.id,
      recipes: [],
    }
    current.recipes.push(recipe)
    grouped.set(key, current)
  }

  const collections = Array.from(grouped.values())
    .filter((collection) => collection.recipes.length >= 2)
    .sort((a, b) => {
      const aWeight = a.recipes.reduce((sum, recipe) => sum + (recipe.times_cooked ?? 0), 0)
      const bWeight = b.recipes.reduce((sum, recipe) => sum + (recipe.times_cooked ?? 0), 0)
      if (b.recipes.length !== a.recipes.length) return b.recipes.length - a.recipes.length
      return bWeight - aWeight
    })
    .slice(0, 3)

  if (collections.length > 0) return collections
  if (recipes.length === 0) return []

  const fallback = recipes
    .slice()
    .sort((a, b) => (b.times_cooked ?? 0) - (a.times_cooked ?? 0))
    .slice(0, 5)

  return [
    {
      key: 'signature',
      label: 'Signature',
      sourceId: fallback[0].id,
      recipes: fallback,
    },
  ]
}

function buildRecipeCollectionDescription(collection: RecipeCollection): string {
  const sampleNames = uniqueStrings(collection.recipes.map((recipe) => recipe.name)).slice(0, 3)
  const recipeCount = collection.recipes.length

  return compactDescription([
    `${collection.label} recipe collection with ${recipeCount} proven dishes.`,
    sampleNames.length > 0 ? `Includes ${sampleNames.join(', ')}.` : null,
    "Delivered as an instant digital reference built from the chef's existing recipe library.",
  ])
}

function deriveRecipeCollectionPrice(collection: RecipeCollection): number {
  const recipeCostReference = collection.recipes.reduce((sum, recipe) => {
    const reference =
      recipe.total_cost_cents ??
      (recipe.cost_per_serving_cents ? recipe.cost_per_serving_cents * 4 : null) ??
      1800
    return sum + reference
  }, 0)

  return clampCents(roundCents(recipeCostReference * 0.35, 500), 1900, 9900)
}

function buildRecipeCollectionProducts(bundle: PassiveStoreSourceBundle): PassiveProductDraft[] {
  const collections = buildRecipeCollections(bundle.recipes)

  return collections.map((collection) => {
    const previewImageUrl =
      collection.recipes.find((recipe) => recipe.photo_url)?.photo_url ??
      bundle.chef.profileImageUrl

    return {
      chef_id: bundle.chef.chefId,
      product_key: `recipe:${collection.key}`,
      source_type: 'recipe',
      source_id: collection.sourceId,
      product_type: 'digital',
      title: `${collection.label} Recipe Collection`,
      description: buildRecipeCollectionDescription(collection),
      price: deriveRecipeCollectionPrice(collection),
      fulfillment_type: 'download',
      preview_image_url: previewImageUrl,
      metadata: {
        label: 'Recipe Collection',
        recipe_count: collection.recipes.length,
        recipe_ids: collection.recipes.map((recipe) => recipe.id),
        collection_key: collection.key,
      },
      generated_payload: {
        kind: 'recipe_collection',
        collection_key: collection.key,
        collection_label: collection.label,
        recipes: collection.recipes.map((recipe) => ({
          id: recipe.id,
          name: recipe.name,
          description: recipe.description,
          category: recipe.category,
          cuisine: recipe.cuisine,
          meal_type: recipe.meal_type,
          occasion_tags: recipe.occasion_tags ?? [],
          times_cooked: recipe.times_cooked ?? 0,
          total_cost_cents: recipe.total_cost_cents,
          cost_per_serving_cents: recipe.cost_per_serving_cents,
        })),
      },
    }
  })
}

function buildExperienceTitle(event: PassiveEventSource): string {
  const occasion = event.occasion?.trim()
  if (occasion) return `${occasion} Prepaid Experience`

  if (event.service_style?.trim()) {
    return `${event.service_style.trim()} Prepaid Experience`
  }

  if (event.guest_count && event.guest_count > 0) {
    return `${event.guest_count}-Guest Prepaid Experience`
  }

  return 'Prepaid Chef Experience'
}

function buildExperienceDescription(event: PassiveEventSource): string {
  const guestText =
    event.guest_count && event.guest_count > 0
      ? `for ${event.guest_count} guests`
      : 'for a future private chef booking'
  const menuText = event.menu?.name ? `Inspired by the ${event.menu.name} service.` : null
  const dateText = event.event_date ? `Based on a completed event from ${event.event_date}.` : null

  return compactDescription([
    `${buildExperienceTitle(event).replace(/ Prepaid Experience$/, '')} credit ${guestText}.`,
    'Purchase now and apply the full amount toward a future event with this chef.',
    menuText,
    dateText,
  ])
}

function deriveExperiencePrice(event: PassiveEventSource, chef: PassiveChefSourceContext): number {
  const quoted = event.quoted_price_cents ?? null
  const deposit = positiveNumbers([
    event.deposit_amount_cents,
    deriveDepositReference(chef, quoted),
  ])[0]
  const reference = deposit ?? quoted ?? getBookingReferenceTotal(chef, event.guest_count) ?? 25000

  return clampCents(roundCents(reference, 2500), 10000, 75000)
}

function buildExperienceProducts(bundle: PassiveStoreSourceBundle): PassiveProductDraft[] {
  return bundle.events
    .slice()
    .sort((a, b) => {
      const priceDiff = (b.quoted_price_cents ?? 0) - (a.quoted_price_cents ?? 0)
      if (priceDiff !== 0) return priceDiff
      return String(b.event_date ?? '').localeCompare(String(a.event_date ?? ''))
    })
    .slice(0, 2)
    .map((event) => ({
      chef_id: bundle.chef.chefId,
      product_key: `event:${event.id}`,
      source_type: 'event',
      source_id: event.id,
      product_type: 'service',
      title: buildExperienceTitle(event),
      description: buildExperienceDescription(event),
      price: deriveExperiencePrice(event, bundle.chef),
      fulfillment_type: 'booking',
      preview_image_url: bundle.chef.profileImageUrl,
      metadata: {
        label: 'Prepaid Experience',
        event_id: event.id,
        event_date: event.event_date,
        occasion: event.occasion,
        guest_count: event.guest_count,
        quoted_price_cents: event.quoted_price_cents,
      },
      generated_payload: {
        kind: 'prepaid_experience',
        event_id: event.id,
        event_date: event.event_date,
        occasion: event.occasion,
        service_style: event.service_style,
        guest_count: event.guest_count,
        quoted_price_cents: event.quoted_price_cents,
        deposit_amount_cents: event.deposit_amount_cents,
        menu_name: event.menu?.name ?? null,
        redemption_copy: 'Applied as booking credit toward a future event with this chef.',
      },
    }))
}

function buildGiftCardAmounts(bundle: PassiveStoreSourceBundle): number[] {
  const menuValues = bundle.menus.map((menu) => {
    if (!menu.price_per_person_cents || !menu.target_guest_count) return null
    return menu.price_per_person_cents * menu.target_guest_count
  })
  const eventValues = bundle.events.map((event) => event.quoted_price_cents)
  const bookingValue = getBookingReferenceTotal(bundle.chef, 4)
  const reference =
    positiveNumbers([...menuValues, ...eventValues, bookingValue]).sort((a, b) => a - b)[0] ?? 30000

  const candidates = [
    clampCents(roundCents(reference * 0.25, 2500), 5000, 25000),
    clampCents(roundCents(reference * 0.5, 2500), 10000, 50000),
    clampCents(roundCents(reference, 2500), 25000, 100000),
  ]

  return [...new Set(candidates)]
}

function buildGiftCardProducts(bundle: PassiveStoreSourceBundle): PassiveProductDraft[] {
  const labels = ['Tasting', 'Signature Dinner', 'Celebration']
  const amounts = buildGiftCardAmounts(bundle)

  return amounts.map((amount, index) => ({
    chef_id: bundle.chef.chefId,
    product_key: `gift-card:${amount}`,
    source_type: 'generic',
    source_id: `gift-card-${amount}`,
    product_type: 'gift_card',
    title: `${labels[index] ?? 'Chef'} Gift Card`,
    description: compactDescription([
      `${formatCurrency(amount)} in prepaid credit for ${bundle.chef.chefName}.`,
      'Delivered instantly with a code that can be applied to a future booking.',
    ]),
    price: amount,
    fulfillment_type: 'code',
    preview_image_url: bundle.chef.profileImageUrl,
    metadata: {
      label: 'Gift Card',
      amount_cents: amount,
    },
    generated_payload: {
      kind: 'gift_card',
      amount_cents: amount,
      redemption_copy: 'Redeem as booking credit with the chef.',
    },
  }))
}

export function buildPassiveProducts(bundle: PassiveStoreSourceBundle): PassiveProductDraft[] {
  return [
    ...buildMenuPackProducts(bundle),
    ...buildRecipeCollectionProducts(bundle),
    ...buildExperienceProducts(bundle),
    ...buildGiftCardProducts(bundle),
  ]
}
