// Culinary Hub Page
// Feature cards with culinary gradients and integrated stats.
// Stats stream in via Suspense. Tiles render immediately.

import type { Metadata } from 'next'
import { Suspense } from 'react'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getRecipes } from '@/lib/recipes/actions'
import { getMenus } from '@/lib/menus/actions'
import { getIngredients } from '@/lib/recipes/actions'
import { listVendors } from '@/lib/vendors/actions'
import { Card, CardContent } from '@/components/ui/card'
import { AnimatedCounter } from '@/components/ui/animated-counter'
import { PriceAlertsWidget } from '@/components/culinary/price-alerts-widget'
import { BatchOpportunitiesCard } from '@/components/grocery/batch-opportunities-card'

export const metadata: Metadata = { title: 'Culinary' }

// ---------------------------------------------------------------------------
// Tile config - gradient + icon per feature
// ---------------------------------------------------------------------------

const primaryTiles = [
  {
    href: '/culinary/recipes',
    label: 'Recipe Book',
    description: 'Your full library of documented recipes with costing and yield',
    icon: '📖',
    statKey: 'recipes' as const,
    gradient: 'from-amber-950/40 via-stone-900/20 to-stone-900/0',
    accentBorder: 'hover:border-amber-700/40',
  },
  {
    href: '/menus',
    label: 'Menus',
    description: 'Event menus and reusable templates',
    icon: '🍽️',
    statKey: 'menus' as const,
    gradient: 'from-purple-950/30 via-stone-900/20 to-stone-900/0',
    accentBorder: 'hover:border-purple-700/40',
  },
]

const secondaryTiles = [
  {
    href: '/culinary/ingredients',
    label: 'Ingredients',
    description: 'Pantry database and price library',
    icon: '🧅',
    statKey: 'ingredients' as const,
    gradient: 'from-emerald-950/30 via-stone-900/10 to-stone-900/0',
    accentBorder: 'hover:border-emerald-700/40',
  },
  {
    href: '/culinary/costing',
    label: 'Food Costing',
    description: 'Recipe and menu cost breakdowns at a glance',
    icon: '💰',
    statKey: null,
    gradient: 'from-yellow-950/30 via-stone-900/10 to-stone-900/0',
    accentBorder: 'hover:border-yellow-700/40',
  },
  {
    href: '/culinary/prep',
    label: 'Prep Overview',
    description: 'All make-ahead components sorted by lead time',
    icon: '⏱️',
    statKey: null,
    gradient: 'from-sky-950/30 via-stone-900/10 to-stone-900/0',
    accentBorder: 'hover:border-sky-700/40',
  },
  {
    href: '/culinary/vendors',
    label: 'Vendor Directory',
    description: 'Your go-to suppliers, farms, and specialty purveyors',
    icon: '🏪',
    statKey: 'vendors' as const,
    gradient: 'from-rose-950/30 via-stone-900/10 to-stone-900/0',
    accentBorder: 'hover:border-rose-700/40',
  },
  {
    href: '/recipes/import',
    label: 'Import Recipes',
    description: 'Bulk-import from CSV, URL, photo, or brain dump',
    icon: '📥',
    statKey: null,
    gradient: 'from-teal-950/30 via-stone-900/10 to-stone-900/0',
    accentBorder: 'hover:border-teal-700/40',
  },
]

type StatKey = 'recipes' | 'menus' | 'ingredients' | 'vendors'

type TileConfig = {
  href: string
  label: string
  description: string
  icon: string
  statKey: StatKey | null
  gradient: string
  accentBorder: string
}

// ---------------------------------------------------------------------------
// Feature tile component
// ---------------------------------------------------------------------------

function FeatureTile({
  tile,
  stat,
  size,
}: {
  tile: TileConfig
  stat?: { value: number; label: string } | null
  size: 'primary' | 'secondary'
}) {
  const isPrimary = size === 'primary'

  return (
    <Link href={tile.href} className="group block h-full">
      <Card
        interactive
        className={`h-full relative overflow-hidden transition-all duration-200 ${tile.accentBorder}`}
      >
        {/* Gradient overlay */}
        <div
          className={`absolute inset-0 bg-gradient-to-br ${tile.gradient} opacity-60 group-hover:opacity-100 transition-opacity duration-300`}
        />

        <CardContent className={`relative z-10 ${isPrimary ? 'pt-6 pb-6' : 'pt-5 pb-5'}`}>
          <div className="flex items-start gap-3">
            <span className={`${isPrimary ? 'text-3xl' : 'text-2xl'} shrink-0`}>{tile.icon}</span>
            <div className="min-w-0 flex-1">
              <p
                className={`font-semibold text-stone-100 group-hover:text-brand-400 transition-colors ${isPrimary ? 'text-lg' : ''}`}
              >
                {tile.label}
              </p>
              <p className="text-sm text-stone-500 mt-0.5">{tile.description}</p>

              {/* Integrated stat badge */}
              {stat && (
                <div className="mt-3 inline-flex items-baseline gap-1.5 rounded-lg bg-stone-800/60 px-3 py-1.5 border border-stone-700/40">
                  <AnimatedCounter
                    value={stat.value.toLocaleString()}
                    className="text-lg font-bold text-stone-100"
                  />
                  <span className="text-xs text-stone-500">{stat.label}</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>

        {/* Subtle corner decoration */}
        <div className="absolute -bottom-4 -right-4 w-24 h-24 rounded-full bg-white/[0.02] group-hover:bg-white/[0.04] transition-colors duration-300" />
      </Card>
    </Link>
  )
}

// ---------------------------------------------------------------------------
// Stats-integrated tiles (streamed via Suspense)
// ---------------------------------------------------------------------------

async function CulinaryTilesWithStats({
  tiles,
  size,
}: {
  tiles: TileConfig[]
  size: 'primary' | 'secondary'
}) {
  const [recipes, menus, ingredients, vendors] = await Promise.all([
    getRecipes().catch(() => []),
    getMenus().catch(() => []),
    getIngredients().catch(() => []),
    listVendors().catch(() => []),
  ])

  const activeMenus = menus.filter((m: any) => m.status !== 'archived')

  const statsMap: Record<StatKey, { value: number; label: string }> = {
    recipes: { value: recipes.length, label: 'recipes' },
    menus: { value: activeMenus.length, label: 'active menus' },
    ingredients: { value: ingredients.length, label: 'ingredients' },
    vendors: { value: vendors.length, label: 'vendors' },
  }

  return (
    <>
      {tiles.map((tile) => (
        <FeatureTile
          key={tile.href}
          tile={tile}
          stat={tile.statKey ? statsMap[tile.statKey] : null}
          size={size}
        />
      ))}
    </>
  )
}

// ---------------------------------------------------------------------------
// Skeleton tiles for Suspense fallback
// ---------------------------------------------------------------------------

function TileSkeleton({ tile, size }: { tile: TileConfig; size: 'primary' | 'secondary' }) {
  return <FeatureTile tile={tile} stat={tile.statKey ? undefined : null} size={size} />
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function CulinaryHubPage() {
  await requireChef()

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-stone-100">Culinary</h1>
          <p className="text-stone-500 mt-1">Recipes, menus, ingredients, costing, and suppliers</p>
        </div>
        <Link
          href="/menus/new"
          className="shrink-0 inline-flex items-center gap-2 rounded-md bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 transition-colors"
        >
          <span>+</span> Create Menu
        </Link>
      </div>

      {/* Primary features - 2 column */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Suspense
          fallback={primaryTiles.map((t) => (
            <TileSkeleton key={t.href} tile={t} size="primary" />
          ))}
        >
          <CulinaryTilesWithStats tiles={primaryTiles} size="primary" />
        </Suspense>
      </div>

      {/* Secondary features - 3 column */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 stagger-grid">
        <Suspense
          fallback={secondaryTiles.map((t) => (
            <TileSkeleton key={t.href} tile={t} size="secondary" />
          ))}
        >
          <CulinaryTilesWithStats tiles={secondaryTiles} size="secondary" />
        </Suspense>
      </div>

      {/* Price alerts */}
      <PriceAlertsWidget />

      {/* Batch opportunities */}
      <BatchOpportunitiesCard />
    </div>
  )
}
