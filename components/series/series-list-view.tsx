'use client'

import Link from 'next/link'
import type { SeriesSummary } from '@/lib/series'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface SeriesListViewProps {
  series: SeriesSummary[]
}

export function SeriesListView({ series }: SeriesListViewProps) {
  if (series.length === 0) {
    return (
      <div className="rounded-lg border border-stone-700 bg-stone-800/50 p-12 text-center">
        <h2 className="text-lg font-semibold text-stone-100">No series yet</h2>
        <p className="mt-2 text-sm text-stone-400">
          A series is a permanent circle that produces recurring events. Create your first one to
          get started.
        </p>
        <Link
          href="/series/create"
          className="mt-4 inline-block rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-500 transition-colors"
        >
          Create your first series
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Link
          href="/series/create"
          className="rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-500 transition-colors"
        >
          New Series
        </Link>
      </div>

      <div className="space-y-3">
        {series.map((s) => (
          <Link key={s.id} href={`/series/${s.id}`} className="block">
            <Card className="transition-colors hover:bg-stone-800/80">
              <CardHeader>
                <div className="flex items-start gap-4">
                  {s.coverImageUrl && (
                    <img
                      src={s.coverImageUrl}
                      alt=""
                      className="h-14 w-14 rounded-lg object-cover"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-stone-100">{s.name}</CardTitle>
                    {s.tagline && (
                      <CardDescription className="mt-1 text-stone-400">{s.tagline}</CardDescription>
                    )}
                  </div>
                  {!s.isActive && (
                    <Badge variant="warning" className="shrink-0">
                      Inactive
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4 text-xs text-stone-400">
                  <span>
                    {s.memberCount} {s.memberCount === 1 ? 'member' : 'members'}
                  </span>
                  <span>
                    {s.hostCount} {s.hostCount === 1 ? 'host' : 'hosts'}
                  </span>
                  <span>
                    {s.eventCount} {s.eventCount === 1 ? 'event' : 'events'}
                  </span>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
