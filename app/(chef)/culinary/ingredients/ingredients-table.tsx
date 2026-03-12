'use client'

import { ListSearch } from '@/components/ui/list-search'
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

const CATEGORY_STYLES: Record<string, string> = {
  protein: 'bg-red-900 text-red-200',
  produce: 'bg-green-900 text-green-200',
  dairy: 'bg-blue-900 text-blue-200',
  pantry: 'bg-stone-800 text-stone-300',
  spice: 'bg-amber-900 text-amber-200',
  oil: 'bg-yellow-900 text-yellow-200',
  alcohol: 'bg-purple-900 text-purple-200',
  baking: 'bg-orange-900 text-orange-200',
  frozen: 'bg-sky-900 text-sky-200',
  canned: 'bg-stone-800 text-stone-400',
  fresh_herb: 'bg-emerald-900 text-emerald-200',
  dry_herb: 'bg-lime-900 text-lime-200',
  condiment: 'bg-teal-900 text-teal-200',
  beverage: 'bg-indigo-900 text-indigo-200',
  specialty: 'bg-pink-900 text-pink-200',
  other: 'bg-stone-800 text-stone-400',
}

interface IngredientItem {
  id: string
  name: string
  category: string
  default_unit: string
  is_staple: boolean
  average_price_cents: number | null
  preferred_vendor: string | null
  usage_count: number
}

export function IngredientsTable({ ingredients }: { ingredients: IngredientItem[] }) {
  return (
    <ListSearch
      items={ingredients}
      searchKeys={['name', 'category', 'preferred_vendor']}
      placeholder="Search ingredients..."
      categoryKey="category"
      categoryLabel="categories"
    >
      {(filtered) => (
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
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-stone-500 py-8">
                    No ingredients match your search
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((ing) => (
                  <TableRow key={ing.id}>
                    <TableCell className="font-medium">
                      {ing.name}
                      {ing.preferred_vendor && (
                        <p className="text-xs text-stone-400 mt-0.5">
                          Vendor: {ing.preferred_vendor}
                        </p>
                      )}
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
                        <span className="text-xs bg-green-900 text-green-200 px-2 py-0.5 rounded-full">
                          Staple
                        </span>
                      ) : (
                        '\u2014'
                      )}
                    </TableCell>
                    <TableCell className="text-stone-400 text-sm">
                      {ing.average_price_cents != null ? (
                        `${formatCurrency(ing.average_price_cents)} / ${ing.default_unit}`
                      ) : (
                        <span className="text-stone-400">Not set</span>
                      )}
                    </TableCell>
                    <TableCell className="text-stone-400 text-sm">
                      {ing.usage_count > 0
                        ? `${ing.usage_count} recipe${ing.usage_count > 1 ? 's' : ''}`
                        : '\u2014'}
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
