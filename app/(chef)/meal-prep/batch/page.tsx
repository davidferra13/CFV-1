import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getWeeklyBatchOverview } from '@/lib/meal-prep/batch-aggregation-actions'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export const metadata: Metadata = { title: 'Batch Overview | ChefFlow' }

export default async function BatchPage() {
  await requireChef()
  const overview = await getWeeklyBatchOverview()

  if (overview.days.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-100">Batch Overview</h1>
          <p className="text-sm text-stone-500 mt-1">
            Aggregated prep view across all active meal prep clients
          </p>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-stone-400 mb-4">No active meal prep programs</p>
            <Link
              href="/meal-prep"
              className="text-brand-400 hover:text-brand-300 text-sm underline"
            >
              Go to Meal Prep
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-stone-100">Batch Overview</h1>
        <p className="text-sm text-stone-500 mt-1">
          Aggregated prep view across all active meal prep clients
        </p>
      </div>

      {/* Day sections */}
      {overview.days.map((day) => (
        <section key={day.dayOfWeek} className="space-y-4">
          {/* Day header */}
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold text-stone-100">{day.dayLabel}</h2>
            <Badge variant="info">
              {day.clients.length} {day.clients.length === 1 ? 'client' : 'clients'}
            </Badge>
          </div>

          {/* Client cards grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {day.clients.map((client) => (
              <Card key={client.programId}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{client.clientName}</CardTitle>
                  <p className="text-xs text-stone-500">Week {client.rotationWeek}</p>
                </CardHeader>
                <CardContent className="pt-0">
                  {client.menuTitle ? (
                    <>
                      <p className="text-sm text-stone-300">{client.menuTitle}</p>
                      {client.dishes.length > 0 && (
                        <p className="text-xs text-stone-500 mt-1">
                          {client.dishes.map((d) => d.name).join(', ')}
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-stone-500 italic">No menu assigned</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Ingredients table */}
          {day.aggregatedIngredients.length > 0 ? (
            <div className="overflow-x-auto rounded-lg border border-stone-800">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-stone-800 bg-stone-900/50">
                    <th className="text-left px-4 py-2 text-stone-400 font-medium">Ingredient</th>
                    <th className="text-left px-4 py-2 text-stone-400 font-medium">Category</th>
                    <th className="text-right px-4 py-2 text-stone-400 font-medium">Quantity</th>
                    <th className="text-left px-4 py-2 text-stone-400 font-medium">Unit</th>
                    <th className="text-left px-4 py-2 text-stone-400 font-medium">Shared By</th>
                  </tr>
                </thead>
                <tbody>
                  {day.aggregatedIngredients.map((ing) => (
                    <tr
                      key={`${ing.ingredientId}-${ing.unit}`}
                      className={`border-b border-stone-800/50 ${
                        ing.contributingClients.length > 1 ? 'bg-brand-950/20' : ''
                      }`}
                    >
                      <td className="px-4 py-2 text-stone-200">{ing.ingredientName}</td>
                      <td className="px-4 py-2 text-stone-400 capitalize">{ing.category}</td>
                      <td className="px-4 py-2 text-stone-200 text-right tabular-nums">
                        {Math.round(ing.totalQuantity * 100) / 100}
                      </td>
                      <td className="px-4 py-2 text-stone-400">{ing.unit}</td>
                      <td className="px-4 py-2 text-stone-400">
                        {ing.contributingClients.join(', ')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-stone-500 italic pl-1">No ingredient data available</p>
          )}
        </section>
      ))}

      {/* Footer */}
      <p className="text-xs text-stone-500 pt-4 border-t border-stone-800">
        Total: {overview.totalActivePrograms} active{' '}
        {overview.totalActivePrograms === 1 ? 'program' : 'programs'} across {overview.days.length}{' '}
        delivery {overview.days.length === 1 ? 'day' : 'days'}
      </p>
    </div>
  )
}
