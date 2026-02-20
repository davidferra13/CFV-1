import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getAllComponents } from '@/lib/menus/actions'
import { Card } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'

export const metadata: Metadata = { title: 'Garnishes - ChefFlow' }

export default async function GarnishesPage() {
  await requireChef()
  const allComponents = await getAllComponents()

  const garnishes = allComponents.filter(c => c.category === 'garnish')
  const linkedCount = garnishes.filter(c => c.recipe_id !== null).length

  return (
    <div className="space-y-6">
      <div>
        <Link href="/culinary/components" className="text-sm text-stone-500 hover:text-stone-700">← Components</Link>
        <div className="flex items-center gap-3 mt-1">
          <h1 className="text-3xl font-bold text-stone-900">Garnishes</h1>
          <span className="bg-lime-100 text-lime-700 text-sm px-2 py-0.5 rounded-full">{garnishes.length}</span>
        </div>
        <p className="text-stone-500 mt-1">Garnish components across all your menus</p>
      </div>

      {garnishes.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          <Card className="p-4">
            <p className="text-2xl font-bold text-stone-900">{garnishes.length}</p>
            <p className="text-sm text-stone-500 mt-1">Garnish components</p>
          </Card>
          <Card className="p-4">
            <p className="text-2xl font-bold text-green-700">{linkedCount}</p>
            <p className="text-sm text-stone-500 mt-1">Linked to recipes</p>
          </Card>
        </div>
      )}

      {garnishes.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-stone-600 font-medium">No garnish components yet</p>
          <p className="text-stone-400 text-sm mt-1">
            Add components to dishes inside a menu and categorize them as &quot;garnish&quot;
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {garnishes.map(comp => (
                <TableRow key={comp.id}>
                  <TableCell className="font-medium text-stone-900">{comp.name}</TableCell>
                  <TableCell className="text-stone-500 text-sm">{comp.dish_name ?? '—'}</TableCell>
                  <TableCell className="text-stone-500 text-sm">
                    {comp.menu_id ? (
                      <Link href={`/culinary/menus/${comp.menu_id}`} className="text-brand-600 hover:underline">
                        {comp.menu_name ?? 'View Menu'}
                      </Link>
                    ) : '—'}
                  </TableCell>
                  <TableCell>
                    {comp.recipe_id ? (
                      <Link href={`/culinary/recipes/${comp.recipe_id}`} className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full hover:bg-green-200">
                        Linked
                      </Link>
                    ) : <span className="text-xs text-stone-400">No recipe</span>}
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
