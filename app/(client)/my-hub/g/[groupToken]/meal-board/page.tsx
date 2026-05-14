import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { requireClient } from '@/lib/auth/get-user'
import { getOrCreateClientHubProfile } from '@/lib/hub/client-hub-actions'
import { getGroupByToken, getGroupMembers } from '@/lib/hub/group-actions'
import { getMealBoard, getMealRequests } from '@/lib/hub/meal-board-actions'
import { ActivityTracker } from '@/components/activity/activity-tracker'

interface Props {
  params: Promise<{ groupToken: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { groupToken } = await params
  const group = await getGroupByToken(groupToken)
  return { title: group ? `Meal Board - ${group.name}` : 'Meal Board' }
}

function statusBadge(status: string) {
  switch (status) {
    case 'confirmed':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-900/40 text-emerald-400">
          Confirmed
        </span>
      )
    case 'served':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-stone-700 text-stone-300">
          Served
        </span>
      )
    case 'planned':
    default:
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-brand-900/40 text-brand-400">
          Planned
        </span>
      )
  }
}

function mealTypeLabel(type: string) {
  const labels: Record<string, string> = {
    breakfast: 'Breakfast',
    lunch: 'Lunch',
    dinner: 'Dinner',
    snack: 'Snack',
  }
  return labels[type] || type
}

function formatDate(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

export default async function MealBoardPage({ params }: Props) {
  await requireClient()
  const { groupToken } = await params
  const profile = await getOrCreateClientHubProfile()

  const group = await getGroupByToken(groupToken)
  if (!group || !group.is_active) notFound()

  // Load meal board for the next 14 days
  const today = new Date()
  const startDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  const futureDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 14)
  const endDate = `${futureDate.getFullYear()}-${String(futureDate.getMonth() + 1).padStart(2, '0')}-${String(futureDate.getDate()).padStart(2, '0')}`

  const [meals, requests] = await Promise.all([
    getMealBoard({
      groupId: group.id,
      groupToken,
      profileToken: profile.profile_token,
      startDate,
      endDate,
    }),
    getMealRequests({ groupId: group.id, profileToken: profile.profile_token, status: 'pending' }),
  ])

  const members = await getGroupMembers(group.id)
  const memberMap = new Map(members.map((m) => [m.profile_id, m.profile?.display_name || 'Member']))

  // Group meals by date
  const mealsByDate = new Map<string, typeof meals>()
  for (const meal of meals) {
    const dateKey = meal.meal_date
    if (!mealsByDate.has(dateKey)) mealsByDate.set(dateKey, [])
    mealsByDate.get(dateKey)!.push(meal)
  }

  const sortedDates = Array.from(mealsByDate.keys()).sort()

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-100">Meal Board</h1>
          <p className="text-stone-400 text-sm mt-0.5">{group.name}</p>
        </div>
        <Link
          href={`/my-hub/g/${groupToken}`}
          className="text-sm text-brand-400 hover:text-brand-300"
        >
          Back to Circle
        </Link>
      </div>

      {/* Upcoming Meals */}
      {sortedDates.length === 0 ? (
        <div className="rounded-lg border border-stone-700 bg-stone-800/50 p-8 text-center">
          <p className="text-stone-400">No meals planned for the next two weeks.</p>
          <p className="text-stone-500 text-sm mt-1">
            Your chef will post meals here when they plan the menu.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedDates.map((dateStr) => {
            const dayMeals = mealsByDate.get(dateStr)!
            return (
              <div
                key={dateStr}
                className="rounded-lg border border-stone-700 bg-stone-800/50 overflow-hidden"
              >
                <div className="px-4 py-2.5 bg-stone-800 border-b border-stone-700">
                  <h3 className="text-sm font-semibold text-stone-200">{formatDate(dateStr)}</h3>
                </div>
                <div className="divide-y divide-stone-700/50">
                  {dayMeals.map((meal) => (
                    <div key={meal.id} className="px-4 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-medium text-stone-400 uppercase tracking-wide">
                              {mealTypeLabel(meal.meal_type)}
                            </span>
                            {meal.serving_time && (
                              <span className="text-xs text-stone-500">at {meal.serving_time}</span>
                            )}
                            {statusBadge(meal.status)}
                          </div>
                          <p className="text-stone-100 font-medium mt-1">{meal.title}</p>
                          {meal.description && (
                            <p className="text-stone-400 text-sm mt-0.5">{meal.description}</p>
                          )}
                          {/* Dietary tags */}
                          {(meal.dietary_tags?.length > 0 || meal.allergen_flags?.length > 0) && (
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {meal.dietary_tags?.map((tag: string) => (
                                <span
                                  key={tag}
                                  className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-emerald-900/30 text-emerald-400 border border-emerald-800/40"
                                >
                                  {tag}
                                </span>
                              ))}
                              {meal.allergen_flags?.map((flag: string) => (
                                <span
                                  key={flag}
                                  className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-amber-900/30 text-amber-400 border border-amber-800/40"
                                >
                                  {flag}
                                </span>
                              ))}
                            </div>
                          )}
                          {/* Chef/host info */}
                          {meal.author_profile_id && (
                            <p className="text-xs text-stone-500 mt-1.5">
                              Posted by {memberMap.get(meal.author_profile_id) || 'Chef'}
                            </p>
                          )}
                        </div>
                        {/* Head count */}
                        {meal.head_count != null && meal.head_count > 0 && (
                          <div className="text-right flex-shrink-0">
                            <span className="text-xs text-stone-500">Serves</span>
                            <p className="text-sm font-medium text-stone-300">{meal.head_count}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Meal Requests */}
      {requests.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-stone-100">Meal Requests</h2>
          <div className="rounded-lg border border-stone-700 bg-stone-800/50 divide-y divide-stone-700/50">
            {requests.map((req) => (
              <div key={req.id} className="px-4 py-3">
                <p className="text-stone-100 font-medium">{req.title}</p>
                {req.notes && <p className="text-stone-400 text-sm mt-0.5">{req.notes}</p>}
                <p className="text-xs text-stone-500 mt-1">
                  Requested by {req.requested_by?.display_name || 'Someone'}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <ActivityTracker eventType="page_viewed" metadata={{ group_id: group.id }} />
    </div>
  )
}

export const dynamic = 'force-dynamic'
