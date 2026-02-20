import type { SocialQueueSummary } from '@/lib/social/types'

type Stat = { label: string; value: number; color: string }

export function SocialQueueSummaryBar({ summary }: { summary: SocialQueueSummary }) {
  const stats: Stat[] = [
    { label: 'Total Posts', value: summary.totalPosts, color: 'text-stone-700' },
    { label: 'Ideas', value: summary.byStatus.idea ?? 0, color: 'text-stone-500' },
    { label: 'Drafts', value: summary.byStatus.draft ?? 0, color: 'text-amber-600' },
    { label: 'Approved', value: summary.byStatus.approved ?? 0, color: 'text-sky-600' },
    { label: 'Queued', value: summary.byStatus.queued ?? 0, color: 'text-violet-600' },
    { label: 'Published', value: summary.byStatus.published ?? 0, color: 'text-emerald-600' },
    { label: 'Next 30 Days', value: summary.next30Days, color: 'text-brand-600' },
  ]

  return (
    <div className="grid grid-cols-4 sm:grid-cols-7 gap-3">
      {stats.map(({ label, value, color }) => (
        <div key={label} className="bg-white rounded-lg border border-stone-200 px-3 py-3 text-center">
          <div className={`text-2xl font-bold ${color}`}>{value}</div>
          <div className="text-xs text-stone-500 mt-0.5 leading-tight">{label}</div>
        </div>
      ))}
    </div>
  )
}
