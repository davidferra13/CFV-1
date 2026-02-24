import { requireChef } from '@/lib/auth/get-user'
import { getSocialPlannerData } from '@/lib/social/actions'
import { SocialAnnualCalendar } from '@/components/social/social-annual-calendar'
import { SocialQueueSummaryBar } from '@/components/social/social-queue-summary-bar'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default async function SocialPlannerPage() {
  await requireChef()
  const planner = await getSocialPlannerData()

  return (
    <div className="space-y-6">
      <SocialQueueSummaryBar summary={planner.summary} />
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-stone-100">
          {planner.settings.target_year} Content Calendar
        </h2>
        <div className="flex items-center gap-3">
          <span className="text-sm text-stone-500">
            {planner.summary.totalPosts} posts · {planner.settings.posts_per_week}/week
          </span>
          <Link href="/social/settings">
            <Button variant="secondary" size="sm">
              Settings
            </Button>
          </Link>
        </div>
      </div>
      {planner.summary.totalPosts === 0 ? (
        <div className="text-center py-20 bg-stone-800 rounded-xl border border-dashed border-stone-600">
          <div className="text-4xl mb-3">📅</div>
          <h3 className="text-lg font-semibold text-stone-200 mb-1">No posts generated yet</h3>
          <p className="text-sm text-stone-500 mb-4 max-w-sm mx-auto">
            Head to Settings to configure your posting schedule, then generate your annual content
            calendar.
          </p>
          <Link href="/social/settings">
            <Button variant="primary">Set Up Schedule</Button>
          </Link>
        </div>
      ) : (
        <SocialAnnualCalendar posts={planner.posts} targetYear={planner.settings.target_year} />
      )}
    </div>
  )
}
