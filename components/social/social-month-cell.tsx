import Link from 'next/link'
import type { SocialPost } from '@/lib/social/types'

const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

type Props = {
  month: number
  year: number
  posts: SocialPost[]
}

export function SocialMonthCell({ month, year, posts }: Props) {
  const published = posts.filter((p) => p.status === 'published').length
  const queued = posts.filter((p) => p.status === 'queued').length
  const approved = posts.filter((p) => p.status === 'approved').length
  const draft = posts.filter((p) => p.status === 'draft').length
  const ideas = posts.filter((p) => p.status === 'idea').length
  const total = posts.length

  const readyPct = total > 0 ? Math.round(((published + queued + approved) / total) * 100) : 0

  return (
    <Link href={`/social/planner/${month}`} className="block group">
      <div className="bg-stone-900 rounded-xl border border-stone-700 p-4 hover:border-brand-600 hover:shadow-sm transition-all cursor-pointer">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-stone-200">{MONTH_NAMES[month - 1]}</span>
          <span className="text-xs text-stone-300">{total} posts</span>
        </div>

        {/* Progress bar */}
        <div className="w-full h-1.5 bg-stone-800 rounded-full overflow-hidden mb-3">
          {total > 0 && (
            <div
              className="h-full bg-emerald-500 rounded-full transition-all"
              style={{ width: `${readyPct}%` }}
            />
          )}
        </div>

        {/* Status mini-pills */}
        <div className="flex flex-wrap gap-1">
          {published > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-200 font-medium">
              {published} done
            </span>
          )}
          {queued > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-950 text-violet-200 font-medium">
              {queued} queued
            </span>
          )}
          {approved > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-950 text-sky-200 font-medium">
              {approved} approved
            </span>
          )}
          {draft > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-950 text-amber-200 font-medium">
              {draft} drafts
            </span>
          )}
          {ideas > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-stone-800 text-stone-500 font-medium">
              {ideas} ideas
            </span>
          )}
        </div>

        {total === 0 && <p className="text-xs text-stone-300 italic">No posts planned</p>}
      </div>
    </Link>
  )
}
