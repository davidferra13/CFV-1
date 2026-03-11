import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getAllComponents, getAllDishes } from '@/lib/menus/actions'
import { Card } from '@/components/ui/card'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'
import { AddComponentForm } from '@/components/culinary/add-component-form'

export const metadata: Metadata = { title: 'Sauce Components - ChefFlow' }

export default async function SauceComponentsPage() {
  await requireChef()
  const [allComponents, dishes] = await Promise.all([getAllComponents(), getAllDishes()])

  const sauces = allComponents.filter((c) => c.category === 'sauce')
  const linkedCount = sauces.filter((c) => c.recipe_id !== null).length

  return (
    <div className="space-y-6">
      <div>
        <Link href="/culinary/components" className="text-sm text-stone-500 hover:text-stone-300">
          ← Components
        </Link>
        <div className="flex items-center justify-between mt-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-stone-100">Sauces</h1>
            <span className="bg-orange-900 text-orange-200 text-sm px-2 py-0.5 rounded-full">
              {sauces.length}
            </span>
          </div>
          <AddComponentForm defaultCategory="sauce" dishes={dishes} />
        </div>
        <p className="text-stone-500 mt-1">Sauce components across all your menus</p>
      </div>

      {sauces.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <Card className="p-4">
            <p className="text-2xl font-bold text-stone-100">{sauces.length}</p>
            <p className="text-sm text-stone-500 mt-1">Sauce components</p>
          </Card>
          <Card className="p-4">
            <p className="text-2xl font-bold text-green-200">{linkedCount}</p>
            <p className="text-sm text-stone-500 mt-1">Linked to recipes</p>
          </Card>
          <Card className="p-4">
            <p className="text-2xl font-bold text-amber-200">
              {sauces.filter((c) => c.is_make_ahead).length}
            </p>
            <p className="text-sm text-stone-500 mt-1">Make-ahead</p>
          </Card>
        </div>
      )}

      {sauces.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-stone-400 font-medium">No sauce components yet</p>
          <p className="text-stone-400 text-sm mt-1">
            Add components to dishes inside a menu and categorize them as &quot;sauce&quot;
          </p>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Dish</TableHead>
                <TableHead>Menu</TableHead>
                <TableHead>Recipe</TableHead>
                <TableHead>Make Ahead</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sauces.map((comp) => (
                <TableRow key={comp.id}>
                  <TableCell className="font-medium text-stone-100">{comp.name}</TableCell>
                  <TableCell className="text-stone-500 text-sm">{comp.dish_name ?? '—'}</TableCell>
                  <TableCell className="text-stone-500 text-sm">
                    {comp.menu_id ? (
                      <Link
                        href={`/culinary/menus/${comp.menu_id}`}
                        className="text-brand-600 hover:underline"
                      >
                        {comp.menu_name ?? 'View Menu'}
                      </Link>
                    ) : (
                      '—'
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
