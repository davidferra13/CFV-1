import { listMySeries } from '@/lib/series'
import { SeriesListView } from '@/components/series/series-list-view'

export const metadata = { title: 'Series' }

export default async function SeriesPage() {
  const series = await listMySeries()

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-100">Series</h1>
        <p className="mt-1 text-sm text-stone-400">
          Permanent circles that produce recurring events
        </p>
      </div>

      <SeriesListView series={series} />
    </div>
  )
}
