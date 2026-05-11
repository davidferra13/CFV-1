// Data Quality Settings Page
// Detect and resolve duplicate clients, ingredients, and recipes.

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import {
  findDuplicateClients,
  findDuplicateIngredients,
  findDuplicateRecipes,
} from '@/lib/data-quality/duplicates'
import { DuplicateSummaryCard } from '@/components/data-quality/duplicate-summary'
import { DuplicateTabs } from '@/components/data-quality/duplicate-tabs'
import {
  ClientDuplicateList,
  IngredientDuplicateList,
  RecipeDuplicateList,
} from '@/components/data-quality/duplicate-lists'

export const metadata: Metadata = { title: 'Data Quality' }

export default async function DataQualityPage() {
  await requireChef()

  const [clientPairs, ingredientPairs, recipePairs] = await Promise.all([
    findDuplicateClients().catch(() => []),
    findDuplicateIngredients().catch(() => []),
    findDuplicateRecipes().catch(() => []),
  ])

  const summary = {
    clients: clientPairs.length,
    ingredients: ingredientPairs.length,
    recipes: recipePairs.length,
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6 space-y-3">
        <div className="flex items-center gap-2 text-xs text-stone-500">
          <Link href="/settings" className="hover:text-stone-300 transition-colors">
            Settings
          </Link>
          <span>/</span>
          <span className="text-stone-300">Data Quality</span>
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-stone-100">Data Quality</h1>
          <p className="text-sm text-stone-300">
            Find and merge duplicate clients, ingredients, and recipes. Similar names, shared emails,
            and overlapping ingredient lists are all checked.
          </p>
        </div>
      </div>

      {/* Summary */}
      <div className="mb-6">
        <DuplicateSummaryCard summary={summary} />
      </div>

      {/* Tabs with duplicate pairs */}
      <DuplicateTabs
        tabs={[
          {
            key: 'clients',
            label: 'Clients',
            count: summary.clients,
            content: <ClientDuplicateList pairs={clientPairs} />,
          },
          {
            key: 'ingredients',
            label: 'Ingredients',
            count: summary.ingredients,
            content: <IngredientDuplicateList pairs={ingredientPairs} />,
          },
          {
            key: 'recipes',
            label: 'Recipes',
            count: summary.recipes,
            content: <RecipeDuplicateList pairs={recipePairs} />,
          },
        ]}
      />
    </div>
  )
}
