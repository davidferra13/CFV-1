'use client'

import Link from 'next/link'
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

const CATEGORY_STYLES: Record<string, string> = {
  sauce: 'bg-orange-900 text-orange-200',
  protein: 'bg-red-900 text-red-200',
  starch: 'bg-yellow-900 text-yellow-200',
  vegetable: 'bg-green-900 text-green-200',
  garnish: 'bg-lime-900 text-lime-200',
  base: 'bg-amber-900 text-amber-200',
  topping: 'bg-pink-900 text-pink-200',
  seasoning: 'bg-stone-800 text-stone-300',
  other: 'bg-stone-800 text-stone-400',
}

const TRANSPORT_LABELS: Record<string, string> = {
  cold: 'Cold (cooler)',
  frozen: 'Frozen (pack last)',
  room_temp: 'Room Temp',
  fragile: 'Fragile',
  liquid: 'Liquid (upright)',
}

const TRANSPORT_STYLES: Record<string, string> = {
  cold: 'bg-blue-900 text-blue-200',
  frozen: 'bg-sky-900 text-sky-200',
  room_temp: 'bg-stone-800 text-stone-400',
  fragile: 'bg-amber-900 text-amber-200',
  liquid: 'bg-cyan-900 text-cyan-200',
}

interface ComponentItem {
  id: string
  name: string
  category: string
  dish_name: string | null
  menu_id: string | null
  menu_name: string | null
  recipe_id: string | null
  is_make_ahead: boolean
  make_ahead_window_hours: number | null
  transport_category: string | null
}

export function ComponentsTable({ components }: { components: ComponentItem[] }) {
  return (
    <ListSearch
      items={components}
      searchKeys={['name', 'dish_name', 'menu_name', 'category']}
      placeholder="Search components..."
      categoryKey="category"
      categoryLabel="categories"
    >
      {(filtered) => (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Component</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Dish</TableHead>
                <TableHead>Menu</TableHead>
                <TableHead>Recipe</TableHead>
                <TableHead>Make Ahead</TableHead>
                <TableHead>Transport Zone</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-stone-500 py-8">
                    No components match your search
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((comp) => (
                  <TableRow key={comp.id}>
                    <TableCell className="font-medium">{comp.name}</TableCell>
                    <TableCell>
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${CATEGORY_STYLES[comp.category] ?? 'bg-stone-800 text-stone-400'}`}
                      >
                        {comp.category}
                      </span>
                    </TableCell>
                    <TableCell className="text-stone-400 text-sm">
                      {comp.dish_name || '\u2014'}
                    </TableCell>
                    <TableCell className="text-stone-400 text-sm">
                      {comp.menu_id ? (
                        <Link
                          href={`/culinary/menus/${comp.menu_id}`}
                          className="text-brand-600 hover:text-brand-300 hover:underline"
                        >
                          {comp.menu_name || 'View Menu'}
                        </Link>
                      ) : (
                        '\u2014'
                      )}
                    </TableCell>
                    <TableCell>
                      {comp.recipe_id ? (
                        <Link
                          href={`/culinary/recipes/${comp.recipe_id}`}
                          className="text-xs bg-green-900 text-green-200 px-2 py-0.5 rounded-full hover:bg-green-200"
                        >
                          Linked
                        </Link>
                      ) : (
                        <span className="text-xs text-stone-400">No recipe</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {comp.is_make_ahead ? (
                        <span className="text-xs bg-amber-900 text-amber-200 px-2 py-0.5 rounded-full">
                          {comp.make_ahead_window_hours
                            ? `${comp.make_ahead_window_hours}h ahead`
                            : 'Make ahead'}
                        </span>
                      ) : (
                        '\u2014'
                      )}
                    </TableCell>
                    <TableCell>
                      {comp.is_make_ahead && comp.transport_category ? (
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded-full ${TRANSPORT_STYLES[comp.transport_category] ?? 'bg-stone-800 text-stone-400'}`}
                        >
                          {TRANSPORT_LABELS[comp.transport_category] ?? comp.transport_category}
                        </span>
                      ) : (
                        '\u2014'
                      )}
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
