import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getAllComponents, getAllDishes } from '@/lib/menus/actions'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { AddComponentForm } from '@/components/culinary/add-component-form'
import { ComponentsTable } from './components-table'

export const metadata: Metadata = { title: 'Components - ChefFlow' }

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
            <p className="text-2xl font-bold text-green-200">{linkedCount}</p>
            <p className="text-sm text-stone-500 mt-1">Linked to a recipe</p>
          </Card>
          <Card className="p-4">
            <p className="text-2xl font-bold text-red-600">{unlinkedCount}</p>
            <p className="text-sm text-stone-500 mt-1">Missing recipe</p>
          </Card>
          <Card className="p-4">
            <p className="text-2xl font-bold text-amber-200">{makeAheadCount}</p>
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
        <ComponentsTable components={components as any} />
      )}
    </div>
  )
}
