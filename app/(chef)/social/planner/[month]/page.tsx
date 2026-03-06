import { notFound } from 'next/navigation'
import { requireChef } from '@/lib/auth/get-user'
import { getSocialPlannerData } from '@/lib/social/actions'
import { SocialMonthGrid } from '@/components/social/social-month-grid'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from '@/components/ui/icons'

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

export default async function SocialMonthPage({ params }: { params: { month: string } }) {
  await requireChef()
  const monthNum = parseInt(params.month, 10)

  if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) notFound()

  const planner = await getSocialPlannerData()
  const monthPosts = planner.posts.filter((p) => {
    const d = new Date(p.schedule_at)
    return d.getMonth() + 1 === monthNum && d.getFullYear() === planner.settings.target_year
  })

  const prevMonth = monthNum > 1 ? monthNum - 1 : null
  const nextMonth = monthNum < 12 ? monthNum + 1 : null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/social/planner">
            <Button variant="ghost" size="sm">
              <ChevronLeft className="w-4 h-4 mr-1" />
              Year View
            </Button>
          </Link>
          <div>
            <h2 className="text-xl font-semibold text-stone-100">
              {MONTH_NAMES[monthNum - 1]} {planner.settings.target_year}
            </h2>
            <p className="text-sm text-stone-500">{monthPosts.length} posts this month</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {prevMonth && (
            <Link href={`/social/planner/${prevMonth}`}>
              <Button variant="ghost" size="sm">
                <ChevronLeft className="w-4 h-4" />
                {MONTH_NAMES[prevMonth - 1]}
              </Button>
            </Link>
          )}
          {nextMonth && (
            <Link href={`/social/planner/${nextMonth}`}>
              <Button variant="ghost" size="sm">
                {MONTH_NAMES[nextMonth - 1]}
                <ChevronRight className="w-4 h-4" />
              </Button>
            </Link>
          )}
        </div>
      </div>

      <SocialMonthGrid
        posts={monthPosts}
        month={monthNum}
        year={planner.settings.target_year}
        postsPerWeek={planner.settings.posts_per_week}
      />
    </div>
  )
}
