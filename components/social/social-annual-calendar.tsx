import type { SocialPost } from '@/lib/social/types'
import { SocialMonthCell } from '@/components/social/social-month-cell'

type Props = {
  posts: SocialPost[]
  targetYear: number
}

export function SocialAnnualCalendar({ posts, targetYear }: Props) {
  // Group posts by month (1-12)
  const postsByMonth: Record<number, SocialPost[]> = {}
  for (let m = 1; m <= 12; m++) postsByMonth[m] = []

  for (const post of posts) {
    const d = new Date(post.schedule_at)
    if (d.getFullYear() === targetYear) {
      const m = d.getMonth() + 1
      postsByMonth[m].push(post)
    }
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
        <SocialMonthCell key={month} month={month} year={targetYear} posts={postsByMonth[month]} />
      ))}
    </div>
  )
}
