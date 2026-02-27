import { Card } from '@/components/ui/card'
import type { CharityHoursSummary } from '@/lib/charity/hours-types'

export function CharityHoursSummaryCards({ summary }: { summary: CharityHoursSummary }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card className="p-4 text-center">
        <p className="text-2xl font-bold text-stone-100">{summary.totalHours}</p>
        <p className="text-xs text-stone-500 mt-1">Total Hours</p>
      </Card>
      <Card className="p-4 text-center">
        <p className="text-2xl font-bold text-stone-100">{summary.totalEntries}</p>
        <p className="text-xs text-stone-500 mt-1">Entries Logged</p>
      </Card>
      <Card className="p-4 text-center">
        <p className="text-2xl font-bold text-stone-100">{summary.uniqueOrgs}</p>
        <p className="text-xs text-stone-500 mt-1">Organizations</p>
      </Card>
      <Card className="p-4 text-center">
        <p className="text-2xl font-bold text-stone-100">{summary.verified501cOrgs}</p>
        <p className="text-xs text-stone-500 mt-1">Verified 501(c)</p>
      </Card>
    </div>
  )
}
