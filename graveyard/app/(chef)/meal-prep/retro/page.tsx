import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getWeeklyRetrospective } from '@/lib/recurring/weekly-retro-actions'

export const metadata: Metadata = { title: 'Week Review | ChefFlow' }

function formatDollars(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

export default async function WeekRetroPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>
}) {
  await requireChef()
  const params = await searchParams
  const data = await getWeeklyRetrospective(params.week)

  const hasActivity =
    data.totalDeliveries > 0 || data.totalDishesServed > 0 || data.invoicedAmountCents > 0

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-stone-100">Week Review</h1>
          <p className="text-sm text-stone-500 mt-1">{data.weekLabel}</p>
        </div>
        <Link href="/meal-prep" className="text-sm text-amber-500 hover:text-amber-400">
          Back to Meal Prep
        </Link>
      </div>

      {/* Week Selector */}
      {data.availableWeeks.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {data.availableWeeks.map((w) => (
            <Link
              key={w.weekStart}
              href={`/meal-prep/retro?week=${w.weekStart}`}
              className={`px-3 py-1.5 text-xs rounded-md border transition-colors ${
                w.weekStart === data.weekStart
                  ? 'bg-amber-600 border-amber-500 text-white'
                  : 'bg-stone-800 border-stone-700 text-stone-400 hover:border-stone-600'
              }`}
            >
              {w.label}
            </Link>
          ))}
        </div>
      )}

      {!hasActivity ? (
        <div className="bg-stone-800/50 border border-stone-700 rounded-lg p-8 text-center">
          <p className="text-stone-400">No meal prep activity recorded for this week.</p>
          <p className="text-stone-500 text-sm mt-2">
            Select a different week above, or data will appear here as you log deliveries.
          </p>
        </div>
      ) : (
        <>
          {/* Section 1: Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <SummaryCard label="Deliveries" value={String(data.totalDeliveries)} />
            <SummaryCard label="Clients Served" value={String(data.clientsServed.length)} />
            <SummaryCard label="Dishes Served" value={String(data.totalDishesServed)} />
            <SummaryCard
              label="Containers Out"
              value={String(data.containersOutstanding)}
              warn={data.containersOutstanding > 0}
            />
          </div>

          {/* Section 2: Revenue */}
          {(data.invoicedAmountCents > 0 ||
            data.paidAmountCents > 0 ||
            data.overdueAmountCents > 0) && (
            <div className="bg-stone-800/50 border border-stone-700 rounded-lg p-4">
              <h2 className="text-sm font-semibold text-stone-300 mb-3">Revenue</h2>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-stone-500">Invoiced</p>
                  <p className="text-lg font-semibold text-stone-100">
                    {formatDollars(data.invoicedAmountCents)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-stone-500">Collected</p>
                  <p className="text-lg font-semibold text-green-400">
                    {formatDollars(data.paidAmountCents)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-stone-500">Overdue</p>
                  <p
                    className={`text-lg font-semibold ${data.overdueAmountCents > 0 ? 'text-red-400' : 'text-stone-500'}`}
                  >
                    {formatDollars(data.overdueAmountCents)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Section 3: Dish Performance */}
          {data.dishesServed.length > 0 && (
            <div className="bg-stone-800/50 border border-stone-700 rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-stone-700">
                <h2 className="text-sm font-semibold text-stone-300">Dish Performance</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-stone-500 border-b border-stone-700/50">
                      <th className="px-4 py-2 font-medium">Dish</th>
                      <th className="px-3 py-2 font-medium text-center">Served</th>
                      <th className="px-3 py-2 font-medium text-center">Loved</th>
                      <th className="px-3 py-2 font-medium text-center">Liked</th>
                      <th className="px-3 py-2 font-medium text-center">Neutral</th>
                      <th className="px-3 py-2 font-medium text-center">Disliked</th>
                      <th className="px-4 py-2 font-medium">Clients</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.dishesServed.map((dish) => (
                      <tr
                        key={dish.dishName}
                        className="border-b border-stone-800 hover:bg-stone-800/30"
                      >
                        <td className="px-4 py-2 text-stone-200 font-medium">{dish.dishName}</td>
                        <td className="px-3 py-2 text-center text-stone-400">{dish.timesServed}</td>
                        <td className="px-3 py-2 text-center">
                          {dish.reactions.loved > 0 ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-900/40 text-green-400 text-xs">
                              {dish.reactions.loved}
                            </span>
                          ) : (
                            <span className="text-stone-600">-</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {dish.reactions.liked > 0 ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-900/40 text-blue-400 text-xs">
                              {dish.reactions.liked}
                            </span>
                          ) : (
                            <span className="text-stone-600">-</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {dish.reactions.neutral > 0 ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-stone-700/60 text-stone-400 text-xs">
                              {dish.reactions.neutral}
                            </span>
                          ) : (
                            <span className="text-stone-600">-</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {dish.reactions.disliked > 0 ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-900/40 text-red-400 text-xs">
                              {dish.reactions.disliked}
                            </span>
                          ) : (
                            <span className="text-stone-600">-</span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-stone-500 text-xs">
                          {dish.clientNames.join(', ')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Reaction totals */}
              <div className="px-4 py-2 border-t border-stone-700/50 flex gap-4 text-xs text-stone-500">
                <span>
                  Totals: {data.lovedCount} loved, {data.likedCount} liked, {data.neutralCount}{' '}
                  neutral, {data.dislikedCount} disliked
                </span>
              </div>
            </div>
          )}

          {/* Section 4: Client Requests */}
          {(data.requestsFulfilled > 0 ||
            data.requestsDeclined > 0 ||
            data.requestsPending > 0) && (
            <div className="bg-stone-800/50 border border-stone-700 rounded-lg p-4">
              <h2 className="text-sm font-semibold text-stone-300 mb-3">Client Requests</h2>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-stone-500">Fulfilled</p>
                  <p className="text-lg font-semibold text-green-400">{data.requestsFulfilled}</p>
                </div>
                <div>
                  <p className="text-xs text-stone-500">Declined</p>
                  <p className="text-lg font-semibold text-stone-400">{data.requestsDeclined}</p>
                </div>
                <div>
                  <p className="text-xs text-stone-500">Pending</p>
                  <p
                    className={`text-lg font-semibold ${data.requestsPending > 0 ? 'text-amber-400' : 'text-stone-500'}`}
                  >
                    {data.requestsPending}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Container detail */}
          {(data.containersSent > 0 || data.containersReturned > 0) && (
            <div className="bg-stone-800/50 border border-stone-700 rounded-lg p-4">
              <h2 className="text-sm font-semibold text-stone-300 mb-3">Containers</h2>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-stone-500">Sent</p>
                  <p className="text-lg font-semibold text-stone-200">{data.containersSent}</p>
                </div>
                <div>
                  <p className="text-xs text-stone-500">Returned</p>
                  <p className="text-lg font-semibold text-green-400">{data.containersReturned}</p>
                </div>
                <div>
                  <p className="text-xs text-stone-500">Outstanding</p>
                  <p
                    className={`text-lg font-semibold ${data.containersOutstanding > 0 ? 'text-amber-400' : 'text-stone-500'}`}
                  >
                    {data.containersOutstanding}
                  </p>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function SummaryCard({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="bg-stone-800/50 border border-stone-700 rounded-lg p-4">
      <p className="text-xs text-stone-500">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${warn ? 'text-amber-400' : 'text-stone-100'}`}>
        {value}
      </p>
    </div>
  )
}
