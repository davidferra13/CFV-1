import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getAllComponents } from '@/lib/menus/actions'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'

export const metadata: Metadata = { title: 'Components - ChefFlow' }

const CATEGORY_STYLES: Record<string, string> = {
  sauce: 'bg-orange-100 text-orange-700',
  protein: 'bg-red-100 text-red-700',
  starch: 'bg-yellow-100 text-yellow-700',
  vegetable: 'bg-green-100 text-green-700',
  garnish: 'bg-lime-100 text-lime-700',
  base: 'bg-amber-100 text-amber-700',
  topping: 'bg-pink-100 text-pink-700',
  seasoning: 'bg-stone-100 text-stone-700',
  other: 'bg-stone-100 text-stone-600',
}

const TRANSPORT_LABELS: Record<string, string> = {
  cold: 'Cold (cooler)',
  frozen: 'Frozen (pack last)',
  room_temp: 'Room Temp',
  fragile: 'Fragile',
  liquid: 'Liquid (upright)',
}

const TRANSPORT_STYLES: Record<string, string> = {
  cold: 'bg-blue-100 text-blue-700',
  frozen: 'bg-sky-100 text-sky-700',
  room_temp: 'bg-stone-100 text-stone-600',
  fragile: 'bg-amber-100 text-amber-700',
  liquid: 'bg-cyan-100 text-cyan-700',
}

export default async function ComponentsPage() {
  await requireChef()
  const components = await getAllComponents()

  const linkedCount = components.filter(c => c.recipe_id !== null).length
  const makeAheadCount = components.filter(c => c.is_make_ahead).length
  const unlinkedCount = components.length - linkedCount

  return (
    <div className="space-y-6">
      <div>
        <Link href="/culinary" className="text-sm text-stone-500 hover:text-stone-700">
          ← Culinary
        </Link>
        <div className="flex items-center gap-3 mt-1">
          <h1 className="text-3xl font-bold text-stone-900">Components</h1>
          <span className="bg-stone-100 text-stone-600 text-sm px-2 py-0.5 rounded-full">
            {components.length}
          </span>
        </div>
        <p className="text-stone-500 mt-1">Building blocks across all your menus</p>
      </div>

      {components.length > 0 && (
        <div className="grid grid-cols-4 gap-4">
          <Card className="p-4">
            <p className="text-2xl font-bold text-stone-900">{components.length}</p>
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
          <p className="text-stone-600 font-medium mb-1">No components yet</p>
          <p className="text-stone-400 text-sm mb-4">
            Components are created when you build dishes inside a menu
          </p>
          <Link href="/culinary/menus">
            <Button variant="secondary" size="sm">Go to Menus</Button>
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
              {components.map(comp => (
                <TableRow key={comp.id}>
                  <TableCell className="font-medium">{comp.name}</TableCell>
                  <TableCell>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${CATEGORY_STYLES[comp.category] ?? 'bg-stone-100 text-stone-600'}`}>
                      {comp.category}
                    </span>
                  </TableCell>
                  <TableCell className="text-stone-600 text-sm">
                    {comp.dish_name || '—'}
                  </TableCell>
                  <TableCell className="text-stone-600 text-sm">
                    {comp.menu_id ? (
                      <Link
                        href={`/culinary/menus/${comp.menu_id}`}
                        className="text-brand-600 hover:text-brand-800 hover:underline"
                      >
                        {comp.menu_name || 'View Menu'}
                      </Link>
                    ) : '—'}
                  </TableCell>
                  <TableCell>
                    {comp.recipe_id ? (
                      <Link
                        href={`/culinary/recipes/${comp.recipe_id}`}
                        className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full hover:bg-green-200"
                      >
                        Linked
                      </Link>
                    ) : (
                      <span className="text-xs text-stone-400">No recipe</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {comp.is_make_ahead ? (
                      <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                        {comp.make_ahead_window_hours ? `${comp.make_ahead_window_hours}h ahead` : 'Make ahead'}
                      </span>
                    ) : '—'}
                  </TableCell>
                  <TableCell>
                    {comp.is_make_ahead && comp.transport_category ? (
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${TRANSPORT_STYLES[comp.transport_category] ?? 'bg-stone-100 text-stone-600'}`}>
                        {TRANSPORT_LABELS[comp.transport_category] ?? comp.transport_category}
                      </span>
                    ) : '—'}
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
