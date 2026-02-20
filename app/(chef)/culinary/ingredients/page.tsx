import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getIngredients } from '@/lib/recipes/actions'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { formatCurrency } from '@/lib/utils/currency'

export const metadata: Metadata = { title: 'Ingredients - ChefFlow' }

const CATEGORY_STYLES: Record<string, string> = {
  protein: 'bg-red-100 text-red-700',
  produce: 'bg-green-100 text-green-700',
  dairy: 'bg-blue-100 text-blue-700',
  pantry: 'bg-stone-100 text-stone-700',
  spice: 'bg-amber-100 text-amber-700',
  oil: 'bg-yellow-100 text-yellow-700',
  alcohol: 'bg-purple-100 text-purple-700',
  baking: 'bg-orange-100 text-orange-700',
  frozen: 'bg-sky-100 text-sky-700',
  canned: 'bg-stone-100 text-stone-600',
  fresh_herb: 'bg-emerald-100 text-emerald-700',
  dry_herb: 'bg-lime-100 text-lime-700',
  condiment: 'bg-teal-100 text-teal-700',
  beverage: 'bg-indigo-100 text-indigo-700',
  specialty: 'bg-pink-100 text-pink-700',
  other: 'bg-stone-100 text-stone-600',
}

export default async function IngredientsPage() {
  await requireChef()
  const ingredients = await getIngredients()

  const stapleCount = ingredients.filter(i => i.is_staple).length
  const pricedCount = ingredients.filter(i => i.average_price_cents != null).length

  return (
    <div className="space-y-6">
      <div>
        <Link href="/culinary" className="text-sm text-stone-500 hover:text-stone-700">
          ← Culinary
        </Link>
        <div className="flex items-center justify-between mt-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-stone-900">Ingredients</h1>
            <span className="bg-stone-100 text-stone-600 text-sm px-2 py-0.5 rounded-full">
              {ingredients.length}
            </span>
          </div>
        </div>
        <p className="text-stone-500 mt-1">Your pantry and ingredient price library</p>
      </div>

      {ingredients.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <Card className="p-4">
            <p className="text-2xl font-bold text-stone-900">{ingredients.length}</p>
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

      {ingredients.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-stone-600 font-medium mb-1">No ingredients yet</p>
          <p className="text-stone-400 text-sm mb-4">
            Ingredients are added automatically when you build recipes — no manual entry needed
          </p>
          <Link href="/culinary/recipes/new">
            <Button variant="secondary" size="sm">Add a Recipe</Button>
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
              {ingredients.map(ing => (
                <TableRow key={ing.id}>
                  <TableCell className="font-medium">
                    {ing.name}
                    {ing.preferred_vendor && (
                      <p className="text-xs text-stone-400 mt-0.5">Vendor: {ing.preferred_vendor}</p>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${CATEGORY_STYLES[ing.category] ?? 'bg-stone-100 text-stone-600'}`}>
                      {ing.category.replace(/_/g, ' ')}
                    </span>
                  </TableCell>
                  <TableCell className="text-stone-600 text-sm">{ing.default_unit}</TableCell>
                  <TableCell>
                    {ing.is_staple ? (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Staple</span>
                    ) : '—'}
                  </TableCell>
                  <TableCell className="text-stone-600 text-sm">
                    {ing.average_price_cents != null
                      ? `${formatCurrency(ing.average_price_cents)} / ${ing.default_unit}`
                      : <span className="text-stone-400">Not set</span>}
                  </TableCell>
                  <TableCell className="text-stone-600 text-sm">
                    {(ing as any).usage_count > 0
                      ? `${(ing as any).usage_count} recipe${(ing as any).usage_count > 1 ? 's' : ''}`
                      : '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  )
}
