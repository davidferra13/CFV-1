// Client Meal Prep History - Past deliveries with feedback

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireClient } from '@/lib/auth/get-user'
import { getMyMealHistory } from '@/lib/meal-prep/client-portal-actions'
import { Card, CardContent } from '@/components/ui/card'
import { MealHistoryFeedback } from './history-feedback'

export const metadata: Metadata = {
  title: 'Meal Prep History - ChefFlow',
}

export default async function MyMealHistoryPage() {
  await requireClient()

  const history = await getMyMealHistory(50)

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-stone-100">Delivery History</h1>
        <p className="text-stone-400 mt-1">
          Past meal prep deliveries. Leave feedback to help your chef learn your taste.
        </p>
      </div>

      {history.length === 0 ? (
        <Card className="border-stone-700 bg-stone-900">
          <CardContent className="p-8 text-center">
            <p className="text-stone-400">No deliveries yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {history.map((entry) => (
            <Card key={entry.weekId} className="border-stone-700 bg-stone-900">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-stone-300 font-medium">
                    {new Date(entry.deliveredAt).toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                  {entry.menuTitle && (
                    <span className="text-stone-500 text-sm">{entry.menuTitle}</span>
                  )}
                </div>

                {entry.dishes.length > 0 ? (
                  <div className="space-y-2">
                    {entry.dishes.map((dish, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between rounded-lg border border-stone-800 p-3"
                      >
                        <div>
                          <p className="text-stone-200 text-sm font-medium">{dish.name}</p>
                          {dish.description && (
                            <p className="text-stone-500 text-xs mt-0.5">{dish.description}</p>
                          )}
                        </div>
                        <MealHistoryFeedback weekId={entry.weekId} dishName={dish.name} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-stone-500 text-sm">No dish details recorded.</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Link
        href="/my-meals"
        className="text-brand-400 hover:text-brand-300 text-sm font-medium underline underline-offset-4 inline-block"
      >
        Back to Meal Prep
      </Link>
    </div>
  )
}
