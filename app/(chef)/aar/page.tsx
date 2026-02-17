// AAR History Page — Shows all After Action Reviews with trends
// Lets the chef see improvement over time

import { requireChef } from '@/lib/auth/get-user'
import { getRecentAARs, getAARStats } from '@/lib/aar/actions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'

export default async function AARHistoryPage() {
  const user = await requireChef()

  const [aars, stats] = await Promise.all([
    getRecentAARs(20),
    getAARStats(),
  ])

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-stone-900">After Action Reviews</h1>
          <p className="text-stone-600 mt-1">Track your improvement over time</p>
        </div>
        <Link href="/dashboard">
          <Button variant="ghost">Back to Dashboard</Button>
        </Link>
      </div>

      {/* Stats Summary */}
      {stats && stats.totalReviews > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Calm Rating</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-stone-900">{stats.last5AvgCalm}</div>
              <p className="text-sm text-stone-500 mt-1">last 5 events avg</p>
              {stats.totalReviews >= 5 && (
                <p className="text-xs mt-2">
                  {stats.trendDirection === 'improving' && (
                    <span className="text-green-600">Trending up from {stats.avgCalmRating} overall</span>
                  )}
                  {stats.trendDirection === 'declining' && (
                    <span className="text-red-600">Trending down from {stats.avgCalmRating} overall</span>
                  )}
                  {stats.trendDirection === 'neutral' && (
                    <span className="text-stone-500">Steady at {stats.avgCalmRating} overall</span>
                  )}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Prep Rating</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-stone-900">{stats.last5AvgPrep}</div>
              <p className="text-sm text-stone-500 mt-1">last 5 events avg</p>
              <p className="text-xs text-stone-400 mt-2">{stats.avgPrepRating} overall avg</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Total Reviews</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-stone-900">{stats.totalReviews}</div>
              <p className="text-sm text-stone-500 mt-1">dinners reviewed</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Most Forgotten</CardTitle>
            </CardHeader>
            <CardContent>
              {stats.topForgottenItems.length > 0 ? (
                <div className="space-y-1">
                  {stats.topForgottenItems.slice(0, 3).map(({ item, count }) => (
                    <div key={item} className="flex justify-between text-sm">
                      <span className="text-stone-700 capitalize">{item}</span>
                      <span className={`font-medium ${count >= 2 ? 'text-red-600' : 'text-stone-400'}`}>
                        {count}x
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-stone-500">No forgotten items yet</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Frequently Forgotten Items Warning */}
      {stats && stats.topForgottenItems.filter(i => i.count >= 2).length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <h3 className="font-medium text-amber-900">Items forgotten 2+ times (auto-added to checklist)</h3>
          <div className="flex flex-wrap gap-2 mt-2">
            {stats.topForgottenItems.filter(i => i.count >= 2).map(({ item, count }) => (
              <span
                key={item}
                className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-amber-100 text-amber-800"
              >
                {item} ({count}x)
              </span>
            ))}
          </div>
        </div>
      )}

      {/* AAR List */}
      {aars.length === 0 ? (
        <Card className="p-12 text-center">
          <h2 className="text-lg font-semibold text-stone-900">No reviews yet</h2>
          <p className="text-stone-500 mt-2">
            After Action Reviews will appear here after you complete events and file reviews.
          </p>
          <Link href="/events" className="inline-block mt-4">
            <Button variant="secondary">View Events</Button>
          </Link>
        </Card>
      ) : (
        <div className="space-y-3">
          {aars.map((aar) => (
            <Link key={aar.id} href={`/events/${aar.event_id}/aar`}>
              <Card className="p-4 hover:bg-stone-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-medium text-stone-900">
                        {aar.event?.occasion || 'Untitled Event'}
                      </h3>
                      <span className="text-sm text-stone-500">
                        {aar.event?.client?.full_name}
                      </span>
                    </div>
                    <p className="text-sm text-stone-500 mt-1">
                      {aar.event?.event_date
                        ? format(new Date(aar.event.event_date), 'MMM d, yyyy')
                        : 'Unknown date'
                      }
                      {aar.event?.guest_count && ` \u00B7 ${aar.event.guest_count} guests`}
                    </p>
                  </div>

                  <div className="flex items-center gap-4 text-sm">
                    <div className="text-center">
                      <div className="font-bold text-stone-900">{aar.calm_rating}/5</div>
                      <div className="text-xs text-stone-500">Calm</div>
                    </div>
                    <div className="text-center">
                      <div className="font-bold text-stone-900">{aar.preparation_rating}/5</div>
                      <div className="text-xs text-stone-500">Prep</div>
                    </div>
                    {aar.forgotten_items && aar.forgotten_items.length > 0 && (
                      <div className="text-center">
                        <div className="font-bold text-red-600">{aar.forgotten_items.length}</div>
                        <div className="text-xs text-stone-500">Forgot</div>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
