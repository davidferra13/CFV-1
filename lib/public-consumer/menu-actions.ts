'use server'

import { unstable_cache } from 'next/cache'
import { createServerClient } from '@/lib/db/server'

export interface SpotlightDish {
  id: string
  name: string
  description: string | null
  course_label: string | null
  dietary_tags: string[]
  sort_order: number
}

export interface SpotlightMenu {
  id: string
  name: string
  description: string | null
  cuisine_type: string | null
  service_style: string | null
  guest_range: string | null
  price_label: string | null
  dish_count: number
  dishes: SpotlightDish[]
  source: 'featured' | 'showcase'
}

export interface SpotlightPackage {
  id: string
  name: string
  description: string | null
  package_type: string
  base_price_cents: number
  min_guests: number | null
  max_guests: number | null
  duration_hours: number | null
  includes: string[]
  cuisine_types: string[]
}

export interface SpotlightMealPrepItem {
  id: string
  name: string
  description: string | null
  category: string
  price_cents: number
  dietary_tags: string[]
  photo_url: string | null
  serving_size: string | null
  is_available: boolean
}

export interface ChefMenuSpotlight {
  featuredMenu: SpotlightMenu | null
  showcaseMenus: SpotlightMenu[]
  packages: SpotlightPackage[]
  mealPrepItems: SpotlightMealPrepItem[]
}

function cleanStrings(values: unknown): string[] {
  return Array.isArray(values)
    ? values.filter(
        (value): value is string => typeof value === 'string' && value.trim().length > 0
      )
    : []
}

function formatMoney(cents: number | null | undefined) {
  if (!cents || cents <= 0) return null
  return `$${Math.round(cents / 100)}`
}

function formatGuestRange(count: number | null | undefined) {
  if (!count || count <= 0) return null
  return `${count} guest${count === 1 ? '' : 's'}`
}

async function fetchMenuWithDishes(
  db: ReturnType<typeof createServerClient>,
  menuId: string,
  source: 'featured' | 'showcase'
): Promise<SpotlightMenu | null> {
  const { data: menu, error } = await db
    .from('menus')
    .select(
      'id, name, description, cuisine_type, service_style, target_guest_count, price_per_person_cents, status'
    )
    .eq('id', menuId)
    .neq('status', 'archived')
    .maybeSingle()

  if (error || !menu) return null

  const { data: dishes } = await db
    .from('dishes')
    .select('id, name, course_name, course_number, description, dietary_tags, sort_order')
    .eq('menu_id', menuId)
    .order('course_number', { ascending: true })
    .order('sort_order', { ascending: true })
    .limit(8)

  const spotlightDishes = (dishes || []).map((dish: any) => ({
    id: dish.id,
    name: dish.name || dish.course_name || 'Dish',
    description: dish.description ?? null,
    course_label: dish.course_name ?? null,
    dietary_tags: cleanStrings(dish.dietary_tags),
    sort_order: dish.sort_order ?? 0,
  }))

  const price = formatMoney(menu.price_per_person_cents)

  return {
    id: menu.id,
    name: menu.name,
    description: menu.description ?? null,
    cuisine_type: menu.cuisine_type ?? null,
    service_style: menu.service_style ?? null,
    guest_range: formatGuestRange(menu.target_guest_count),
    price_label: price ? `From ${price}/person` : null,
    dish_count: spotlightDishes.length,
    dishes: spotlightDishes,
    source,
  }
}

async function getChefMenuSpotlightUncached(chefId: string): Promise<ChefMenuSpotlight> {
  const db = createServerClient({ admin: true })
  const result: ChefMenuSpotlight = {
    featuredMenu: null,
    showcaseMenus: [],
    packages: [],
    mealPrepItems: [],
  }

  const { data: chef } = await db
    .from('chefs')
    .select('featured_booking_menu_id')
    .eq('id', chefId)
    .maybeSingle()

  if (chef?.featured_booking_menu_id) {
    result.featuredMenu = await fetchMenuWithDishes(db, chef.featured_booking_menu_id, 'featured')
  }

  const { data: showcaseMenus } = await db
    .from('menus')
    .select('id')
    .eq('tenant_id', chefId)
    .eq('is_showcase', true)
    .neq('status', 'archived')
    .order('times_used', { ascending: false })
    .limit(3)

  for (const menuRow of showcaseMenus || []) {
    if (result.featuredMenu?.id === menuRow.id) continue
    const menu = await fetchMenuWithDishes(db, menuRow.id, 'showcase')
    if (menu) result.showcaseMenus.push(menu)
  }

  const { data: packages } = await db
    .from('experience_packages')
    .select(
      'id, name, description, package_type, base_price_cents, min_guests, max_guests, duration_hours, includes, cuisine_types'
    )
    .eq('tenant_id', chefId)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .limit(6)

  result.packages = (packages || []).map((pkg: any) => ({
    id: pkg.id,
    name: pkg.name,
    description: pkg.description ?? null,
    package_type: pkg.package_type,
    base_price_cents: pkg.base_price_cents,
    min_guests: pkg.min_guests ?? null,
    max_guests: pkg.max_guests ?? null,
    duration_hours: pkg.duration_hours == null ? null : Number(pkg.duration_hours),
    includes: cleanStrings(pkg.includes),
    cuisine_types: cleanStrings(pkg.cuisine_types),
  }))

  const { data: mealPrepItems } = await db
    .from('meal_prep_items')
    .select(
      'id, name, description, category, price_cents, dietary_tags, photo_url, serving_size, is_available'
    )
    .eq('chef_id', chefId)
    .eq('is_available', true)
    .order('name', { ascending: true })
    .limit(12)

  result.mealPrepItems = (mealPrepItems || []).map((item: any) => ({
    id: item.id,
    name: item.name,
    description: item.description ?? null,
    category: item.category,
    price_cents: item.price_cents,
    dietary_tags: cleanStrings(item.dietary_tags),
    photo_url: item.photo_url ?? null,
    serving_size: item.serving_size ?? null,
    is_available: item.is_available ?? true,
  }))

  return result
}

export const getChefMenuSpotlight = unstable_cache(
  getChefMenuSpotlightUncached,
  ['chef-menu-spotlight'],
  { revalidate: 600, tags: ['chef-menu-spotlight'] }
)
