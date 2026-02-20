'use client'

import type { SocialPost } from '@/lib/social/types'
import { SocialSlotCard, SocialEmptySlotCard } from '@/components/social/social-slot-card'

type Props = {
  posts: SocialPost[]
  month: number
  year: number
  postsPerWeek: number
}

function getWeekOfYear(date: Date): number {
  const startOfYear = new Date(date.getFullYear(), 0, 1)
  const diff = date.getTime() - startOfYear.getTime()
  const oneWeek = 7 * 24 * 60 * 60 * 1000
  return Math.ceil((diff + startOfYear.getDay() * 24 * 60 * 60 * 1000) / oneWeek)
}

export function SocialMonthGrid({ posts, month: _month, year: _year, postsPerWeek }: Props) {
  const byWeek: Record<number, SocialPost[]> = {}
  for (const post of posts) {
    const d = new Date(post.schedule_at)
    const week = getWeekOfYear(d)
    if (!byWeek[week]) byWeek[week] = []
    byWeek[week].push(post)
  }

  for (const week of Object.keys(byWeek)) {
    byWeek[Number(week)].sort(
      (a, b) => new Date(a.schedule_at).getTime() - new Date(b.schedule_at).getTime()
    )
  }

  const weeks = Object.keys(byWeek).map(Number).sort((a, b) => a - b)

  if (weeks.length === 0) {
    return (
      <div className="text-center py-16 bg-stone-50 rounded-xl border border-dashed border-stone-200">
        <div className="text-3xl mb-2">📭</div>
        <p className="text-stone-500 text-sm">No posts scheduled this month.</p>
      </div>
    )
  }

  const ready = posts.filter((p) => p.preflight_ready).length
  const total = posts.length
  const cols = Math.max(postsPerWeek, 2)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 bg-stone-50 rounded-lg border border-stone-200 px-4 py-3 text-sm">
        <span className="text-stone-600 font-medium">{total} posts this month</span>
        <span className="text-stone-300">·</span>
        <span className="text-emerald-600">{ready} ready</span>
        <span className="text-stone-300">·</span>
        <span className="text-amber-600">{total - ready} need attention</span>
      </div>

      <div className="space-y-6">
        {weeks.map((week, wi) => {
          const weekPosts = byWeek[week]
          const padded: (SocialPost | null)[] = Array.from(
            { length: Math.max(weekPosts.length, cols) },
            (_, i) => weekPosts[i] ?? null
          )
          return (
            <div key={week}>
              <div className="text-xs font-medium text-stone-400 mb-2 uppercase tracking-wide">
                Week {wi + 1}
              </div>
              <div className={`grid gap-3 grid-cols-${cols <= 3 ? cols : 4}`}>
                {padded.map((post, idx) =>
                  post ? (
                    <SocialSlotCard key={post.id} post={post} />
                  ) : (
                    <SocialEmptySlotCard key={`empty-${week}-${idx}`} />
                  )
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
