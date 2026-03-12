import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getIngredients } from '@/lib/recipes/actions'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { AddIngredientForm } from '@/components/culinary/add-ingredient-form'
import { IngredientsTable } from './ingredients-table'

export const metadata: Metadata = { title: 'Ingredients - ChefFlow' }

export default async function IngredientsPage() {
  await requireChef()
  const ingredients = await getIngredients()

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
          <AddIngredientForm />
        </div>
        <p className="text-stone-500 mt-1">Your pantry and ingredient price library</p>
      </div>

      {ingredients.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <Card className="p-4">
            <p className="text-2xl font-bold text-stone-100">{ingredients.length}</p>
            <p className="text-sm text-stone-500 mt-1">Total ingredients</p>
          </Card>
          <Card className="p-4">
            <p className="text-2xl font-bold text-green-200">{stapleCount}</p>
            <p className="text-sm text-stone-500 mt-1">Staples</p>
          </Card>
          <Card className="p-4">
            <p className="text-2xl font-bold text-amber-200">{pricedCount}</p>
            <p className="text-sm text-stone-500 mt-1">With price data</p>
          </Card>
        </div>
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
        <IngredientsTable ingredients={ingredients as any} />
      )}
    </div>
  )
}
