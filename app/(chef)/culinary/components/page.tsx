import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getAllComponents, getAllDishes } from '@/lib/menus/actions'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { AddComponentForm } from '@/components/culinary/add-component-form'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'

export const metadata: Metadata = { title: 'Components - ChefFlow' }

const CATEGORY_STYLES: Record<string, string> = {
  sauce: 'bg-orange-900 text-orange-700',
  protein: 'bg-red-900 text-red-700',
  starch: 'bg-yellow-900 text-yellow-700',
  vegetable: 'bg-green-900 text-green-700',
  garnish: 'bg-lime-900 text-lime-700',
  base: 'bg-amber-900 text-amber-700',
  topping: 'bg-pink-900 text-pink-700',
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
  cold: 'bg-blue-900 text-blue-700',
  frozen: 'bg-sky-900 text-sky-700',
  room_temp: 'bg-stone-800 text-stone-400',
  fragile: 'bg-amber-900 text-amber-700',
  liquid: 'bg-cyan-900 text-cyan-700',
}

export default async function ComponentsPage() {
  await requireChef()
  const [components, dishes] = await Promise.all([getAllComponents(), getAllDishes()])

  const linkedCount = components.filter((c) => c.recipe_id !== null).length
  const makeAheadCount = components.filter((c) => c.is_make_ahead).length
  const unlinkedCount = components.length - linkedCount

  return (
    <div className="space-y-6">
      <div>
        <Link href="/culinary" className="text-sm text-stone-500 hover:text-stone-300">
          ← Culinary
        </Link>
        <div className="flex items-center justify-between mt-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-stone-100">Components</h1>
            <span className="bg-stone-800 text-stone-400 text-sm px-2 py-0.5 rounded-full">
              {components.length}
            </span>
          </div>
          <AddComponentForm dishes={dishes} />
        </div>
        <p className="text-stone-500 mt-1">Building blocks across all your menus</p>
      </div>

      {components.length > 0 && (
        <div className="grid grid-cols-4 gap-4">
          <Card className="p-4">
            <p className="text-2xl font-bold text-stone-100">{components.length}</p>
            <p className="text-sm text-stone-500 mt-1">Total components</p>
          </Card>
          <Card className="p-4">
            <p className="text-2xl font-bold text-green-700">{linkedCount}</p>
            <p className="text-sm text-stone-500 mt-1">Linked to a recipe</p>
          </Card>
          <Card className="p-4">
            <p className="text-2xl font-bold text-red-600">{unlinkedCount}</p>
            <p className="text-sm text-stone-500 mt-1">Missing recipe</p>
          </Card>
          <Card className="p-4">
            <p className="text-2xl font-bold text-amber-700">{makeAheadCount}</p>
            <p className="text-sm text-stone-500 mt-1">Make-ahead</p>
          </Card>
        </div>
      )}

      {components.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-stone-400 font-medium mb-1">No components yet</p>
          <p className="text-stone-400 text-sm mb-4">
            Add components manually or create them when you build dishes inside a menu
          </p>
          <Link href="/culinary/menus">
            <Button variant="secondary" size="sm">
              Go to Menus
            </Button>
          </Link>
        </Card>
      ) : (
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
              {components.map((comp) => (
                <TableRow key={comp.id}>
                  <TableCell className="font-medium">{comp.name}</TableCell>
                  <TableCell>
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${CATEGORY_STYLES[comp.category] ?? 'bg-stone-800 text-stone-400'}`}
                    >
                      {comp.category}
                    </span>
                  </TableCell>
                  <TableCell className="text-stone-400 text-sm">{comp.dish_name || '—'}</TableCell>
                  <TableCell className="text-stone-400 text-sm">
                    {comp.menu_id ? (
                      <Link
                        href={`/culinary/menus/${comp.menu_id}`}
                        className="text-brand-600 hover:text-brand-300 hover:underline"
                      >
                        {comp.menu_name || 'View Menu'}
                      </Link>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell>
                    {comp.recipe_id ? (
                      <Link
                        href={`/culinary/recipes/${comp.recipe_id}`}
                        className="text-xs bg-green-900 text-green-700 px-2 py-0.5 rounded-full hover:bg-green-200"
                      >
                        Linked
                      </Link>
                    ) : (
                      <span className="text-xs text-stone-400">No recipe</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {comp.is_make_ahead ? (
                      <span className="text-xs bg-amber-900 text-amber-700 px-2 py-0.5 rounded-full">
                        {comp.make_ahead_window_hours
                          ? `${comp.make_ahead_window_hours}h ahead`
                          : 'Make ahead'}
                      </span>
                    ) : (
                      '—'
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
                      '—'
                    )}
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
