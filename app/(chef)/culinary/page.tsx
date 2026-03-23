// Culinary Hub Page
// Nav tiles render immediately. Stats stream in via Suspense.

import type { Metadata } from 'next'
import { Suspense } from 'react'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getRecipes } from '@/lib/recipes/actions'
import { getMenus } from '@/lib/menus/actions'
import { getIngredients } from '@/lib/recipes/actions'
import { listVendors } from '@/lib/vendors/actions'
import { Card, CardContent } from '@/components/ui/card'
import { PriceAlertsWidget } from '@/components/culinary/price-alerts-widget'

export const metadata: Metadata = { title: 'Culinary | ChefFlow' }

const tiles = [
  {
    href: '/culinary/recipes',
    label: 'Recipe Book',
    description: 'Your full library of documented recipes with costing and yield',
    icon: '📖',
  },
  {
    href: '/menus',
    label: 'Menus',
    description: 'Event menus and reusable templates',
    icon: '🍽️',
  },
  {
    href: '/culinary/ingredients',
    label: 'Ingredients',
    description: 'Pantry database and price library',
    icon: '🧅',
  },
  {
    href: '/culinary/costing',
    label: 'Food Costing',
    description: 'Recipe and menu cost breakdowns at a glance',
    icon: '💰',
  },
  {
    href: '/culinary/prep',
    label: 'Prep Overview',
    description: 'All make-ahead components sorted by lead time',
    icon: '⏱️',
  },
  {
    href: '/culinary/vendors',
    label: 'Vendor Directory',
    description: 'Your go-to suppliers, farms, and specialty purveyors',
    icon: '🏪',
  },
]

async function CulinaryStats() {
  const [recipes, menus, ingredients, vendors] = await Promise.all([
    getRecipes(),
    getMenus(),
    getIngredients(),
    listVendors(),
  ])

  const activeMenus = menus.filter((m: any) => m.status !== 'archived')

  const stats = [
    { label: 'Recipes', value: recipes.length },
    { label: 'Menus', value: activeMenus.length },
    { label: 'Ingredients', value: ingredients.length },
    { label: 'Vendors', value: vendors.length },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {stats.map((s) => (
        <Card key={s.label}>
          <CardContent className="pt-4 pb-4">
            <p className="text-2xl font-bold text-stone-100">{s.value}</p>
            <p className="text-sm text-stone-500 mt-0.5">{s.label}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

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

      {/* Nav tiles render immediately */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {tiles.map((tile) => (
          <Link key={tile.href} href={tile.href}>
            <Card className="h-full hover:shadow-md transition-shadow cursor-pointer group">
              <CardContent className="pt-5 pb-5">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{tile.icon}</span>
                  <div>
                    <p className="font-semibold text-stone-100 group-hover:text-brand-400 transition-colors">
                      {tile.label}
                    </p>
                    <p className="text-sm text-stone-500 mt-0.5">{tile.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Stats stream in after tiles are visible */}
      <Suspense
        fallback={
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {['Recipes', 'Menus', 'Ingredients', 'Vendors'].map((label) => (
              <Card key={label}>
                <CardContent className="pt-4 pb-4">
                  <div className="h-8 w-12 bg-stone-800 rounded animate-pulse mb-1" />
                  <p className="text-sm text-stone-500">{label}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        }
      >
        <CulinaryStats />
      </Suspense>

      {/* Price alerts */}
      <PriceAlertsWidget />
    </div>
  )
}
