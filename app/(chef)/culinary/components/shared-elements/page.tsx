import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getAllComponents, getAllDishes } from '@/lib/menus/actions'
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

export const metadata: Metadata = { title: 'Shared Elements' }

export default async function SharedElementsPage() {
  await requireChef()
  const [allComponents, dishes] = await Promise.all([getAllComponents(), getAllDishes()])

  // "Shared elements" = components linked to a recipe (reusable across menus)
  const shared = allComponents.filter((c) => c.recipe_id !== null)

  // Find which recipe_ids appear in multiple contexts
  const recipeUsage = new Map<string, number>()
  for (const comp of allComponents) {
    if (comp.recipe_id) {
      recipeUsage.set(comp.recipe_id, (recipeUsage.get(comp.recipe_id) ?? 0) + 1)
    }
  }

  const multiUse = shared.filter((c) => (recipeUsage.get(c.recipe_id!) ?? 0) > 1)

  return (
    <div className="space-y-6">
      <div>
        <Link href="/culinary/components" className="text-sm text-stone-500 hover:text-stone-300">
          ← Components
        </Link>
        <div className="flex items-center justify-between mt-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-stone-100">Shared Elements</h1>
            <span className="bg-brand-900 text-brand-700 text-sm px-2 py-0.5 rounded-full">
              {shared.length}
            </span>
          </div>
          <AddComponentForm dishes={dishes} />
        </div>
        <p className="text-stone-500 mt-1">
          Components with linked recipes - reusable building blocks across your menus
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-2xl font-bold text-stone-100">{shared.length}</p>
          <p className="text-sm text-stone-500 mt-1">Recipe-linked components</p>
        </Card>
        <Card className="p-4">
          <p className="text-2xl font-bold text-brand-700">{multiUse.length}</p>
          <p className="text-sm text-stone-500 mt-1">Used in multiple places</p>
        </Card>
        <Card className="p-4">
          <p className="text-2xl font-bold text-amber-700">
            {allComponents.filter((c) => c.is_make_ahead && c.recipe_id).length}
          </p>
          <p className="text-sm text-stone-500 mt-1">Make-ahead with recipe</p>
        </Card>
      </div>

      {shared.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-stone-400 font-medium">No shared elements yet</p>
          <p className="text-stone-400 text-sm mt-1">
            Link a recipe to a menu component to make it a shared, reusable element
          </p>
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
                <TableHead>Uses</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shared.map((comp) => (
                <TableRow key={comp.id}>
                  <TableCell className="font-medium text-stone-100">{comp.name}</TableCell>
                  <TableCell>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-stone-800 text-stone-400 capitalize">
                      {comp.category}
                    </span>
                  </TableCell>
                  <TableCell className="text-stone-500 text-sm">{comp.dish_name ?? '-'}</TableCell>
                  <TableCell className="text-stone-500 text-sm">
                    {comp.menu_id ? (
                      <Link
                        href={`/culinary/menus/${comp.menu_id}`}
                        className="text-brand-600 hover:underline"
                      >
                        {comp.menu_name ?? 'View'}
                      </Link>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/culinary/recipes/${comp.recipe_id}`}
                      className="text-xs bg-green-900 text-green-700 px-2 py-0.5 rounded-full hover:bg-green-200"
                    >
                      View Recipe
                    </Link>
                  </TableCell>
                  <TableCell className="text-stone-500 text-sm">
                    {recipeUsage.get(comp.recipe_id!) ?? 1}×
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
