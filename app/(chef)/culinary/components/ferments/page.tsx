import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getRecipes } from '@/lib/recipes/actions'
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

export const metadata: Metadata = { title: 'Ferments - ChefFlow' }

const FERMENT_KEYWORDS = [
  'ferment',
  'pickle',
  'kimchi',
  'lacto',
  'kvass',
  'kefir',
  'miso',
  'koji',
  'vinegar',
  'brine',
  'cured',
]

function isFermentLike(name: string) {
  const lower = name.toLowerCase()
  return FERMENT_KEYWORDS.some((kw) => lower.includes(kw))
}

export default async function FermentsPage() {
  await requireChef()

  const [recipes, components, dishes] = await Promise.all([
    getRecipes(),
    getAllComponents(),
    getAllDishes(),
  ])

  const fermentRecipes = recipes.filter((r) => isFermentLike(r.name))
  const fermentComponents = components.filter((c) => isFermentLike(c.name))

  return (
    <div className="space-y-6">
      <div>
        <Link href="/culinary/components" className="text-sm text-stone-500 hover:text-stone-700">
          ← Components
        </Link>
        <div className="flex items-center justify-between mt-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-stone-900">Ferments</h1>
            <span className="bg-teal-100 text-teal-700 text-sm px-2 py-0.5 rounded-full">
              {fermentRecipes.length + fermentComponents.length}
            </span>
          </div>
          <AddComponentForm defaultCategory="other" dishes={dishes} />
        </div>
        <p className="text-stone-500 mt-1">Fermented, pickled, and cured preparations</p>
      </div>

      <Card className="p-4 bg-stone-50 border-stone-200">
        <p className="text-sm text-stone-600">
          Ferments are matched by name — recipes and components containing &quot;ferment&quot;,
          &quot;pickle&quot;, &quot;kimchi&quot;, &quot;miso&quot;, &quot;lacto&quot;,
          &quot;cured&quot;, or similar terms appear here.
        </p>
      </Card>

      {fermentRecipes.length === 0 && fermentComponents.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-stone-600 font-medium">No fermented preparations found</p>
          <p className="text-stone-400 text-sm mt-1">
            Create recipes or menu components with fermentation-related names to see them here
          </p>
        </Card>
      ) : (
        <>
          {fermentRecipes.length > 0 && (
            <>
              <h2 className="text-base font-semibold text-stone-700">
                Recipes ({fermentRecipes.length})
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {fermentRecipes.map((recipe) => (
                  <Card key={recipe.id} className="p-4">
                    <Link
                      href={`/culinary/recipes/${recipe.id}`}
                      className="font-medium text-brand-600 hover:underline"
                    >
                      {recipe.name}
                    </Link>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs bg-stone-100 text-stone-500 px-2 py-0.5 rounded-full capitalize">
                        {recipe.category}
                      </span>
                      {recipe.cook_time_minutes && (
                        <span className="text-xs text-stone-400">{recipe.cook_time_minutes}m</span>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </>
          )}

          {fermentComponents.length > 0 && (
            <>
              <h2 className="text-base font-semibold text-stone-700">
                Menu Components ({fermentComponents.length})
              </h2>
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Component</TableHead>
                      <TableHead>Dish</TableHead>
                      <TableHead>Menu</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fermentComponents.map((comp) => (
                      <TableRow key={comp.id}>
                        <TableCell className="font-medium text-stone-900">{comp.name}</TableCell>
                        <TableCell className="text-stone-500 text-sm">
                          {comp.dish_name ?? '—'}
                        </TableCell>
                        <TableCell className="text-stone-500 text-sm">
                          {comp.menu_id ? (
                            <Link
                              href={`/culinary/menus/${comp.menu_id}`}
                              className="text-brand-600 hover:underline"
                            >
                              {comp.menu_name ?? 'View'}
                            </Link>
                          ) : (
                            '—'
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            </>
          )}
        </>
      )}
    </div>
  )
}
