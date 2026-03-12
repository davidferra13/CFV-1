'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ListSearch } from '@/components/ui/list-search'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FoodPlaceholderImage } from '@/components/ui/food-placeholder-image'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'
import { formatCurrency } from '@/lib/utils/currency'

const CATEGORY_STYLES: Record<string, string> = {
  sauce: 'bg-orange-900 text-orange-200',
  protein: 'bg-red-900 text-red-200',
  starch: 'bg-yellow-900 text-yellow-200',
  vegetable: 'bg-green-900 text-green-200',
  fruit: 'bg-lime-900 text-lime-200',
  dessert: 'bg-pink-900 text-pink-200',
  bread: 'bg-amber-900 text-amber-200',
  pasta: 'bg-yellow-900 text-yellow-600',
  soup: 'bg-teal-900 text-teal-200',
  salad: 'bg-emerald-900 text-emerald-200',
  appetizer: 'bg-purple-900 text-purple-200',
  condiment: 'bg-stone-800 text-stone-300',
  beverage: 'bg-sky-900 text-sky-200',
  other: 'bg-stone-800 text-stone-400',
}

interface RecipeItem {
  id: string
  name: string
  category: string
  photo_url: string | null
  cook_time_minutes: number | null
  yield_quantity: number | null
  yield_unit: string | null
  ingredient_count: number | null
  total_cost_cents: number | null
  has_all_prices: boolean
  times_cooked: number
}

export function RecipesTable({
  recipes,
  placeholders,
}: {
  recipes: RecipeItem[]
  placeholders: Record<string, any>
}) {
  return (
    <ListSearch
      items={recipes}
      searchKeys={['name', 'category']}
      placeholder="Search recipes..."
      categoryKey="category"
      categoryLabel="categories"
    >
      {(filtered) => (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Recipe</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Total Time</TableHead>
                <TableHead>Yield</TableHead>
                <TableHead>Ingredients</TableHead>
                <TableHead>Cost</TableHead>
                <TableHead>Times Cooked</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-stone-500 py-8">
                    No recipes match your search
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((recipe) => (
                  <TableRow key={recipe.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        {recipe.photo_url ? (
                          <div className="relative w-10 h-10 rounded-md overflow-hidden flex-shrink-0">
                            <Image
                              src={recipe.photo_url}
                              alt={recipe.name}
                              fill
                              sizes="40px"
                              className="object-cover"
                              unoptimized
                            />
                          </div>
                        ) : (
                          <FoodPlaceholderImage
                            image={placeholders[recipe.id] ?? null}
                            size="thumb"
                          />
                        )}
                        <Link
                          href={`/culinary/recipes/${recipe.id}`}
                          className="text-brand-600 hover:text-brand-300 hover:underline"
                        >
                          {recipe.name}
                        </Link>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${CATEGORY_STYLES[recipe.category] ?? 'bg-stone-800 text-stone-400'}`}
                      >
                        {recipe.category}
                      </span>
                    </TableCell>
                    <TableCell className="text-stone-400 text-sm">
                      {recipe.cook_time_minutes ? `${recipe.cook_time_minutes}m` : '\u2014'}
                    </TableCell>
                    <TableCell className="text-stone-400 text-sm">
                      {recipe.yield_quantity && recipe.yield_unit
                        ? `${recipe.yield_quantity} ${recipe.yield_unit}`
                        : '\u2014'}
                    </TableCell>
                    <TableCell className="text-stone-400 text-sm">
                      {recipe.ingredient_count ?? '\u2014'}
                    </TableCell>
                    <TableCell className="text-stone-400 text-sm">
                      {recipe.total_cost_cents != null ? (
                        <span className={recipe.has_all_prices ? '' : 'text-stone-400'}>
                          {formatCurrency(recipe.total_cost_cents)}
                          {!recipe.has_all_prices && <span className="text-xs ml-1">est.</span>}
                        </span>
                      ) : (
                        '\u2014'
                      )}
                    </TableCell>
                    <TableCell className="text-stone-400 text-sm">{recipe.times_cooked}</TableCell>
                    <TableCell>
                      <Link href={`/culinary/recipes/${recipe.id}`}>
                        <Button size="sm" variant="secondary">
                          View
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      )}
    </ListSearch>
  )
}
