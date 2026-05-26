import { notFound } from 'next/navigation'
import { getSeries, listSeriesPosts, listSeriesHosts } from '@/lib/series'
import { SeriesDetailShell } from '@/components/series/series-detail-shell'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const series = await getSeries(id)
  if (!series) return { title: 'Series Not Found' }
  return { title: series.name }
}

export default async function SeriesDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const [series, postsResult, hosts] = await Promise.all([
    getSeries(id),
    listSeriesPosts({ seriesId: id }),
    listSeriesHosts(id),
  ])

  if (!series) notFound()

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <SeriesDetailShell series={series} posts={postsResult.posts} hosts={hosts} />
    </div>
  )
}
