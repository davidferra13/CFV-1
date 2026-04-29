import type { Metadata } from 'next'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { RadarCard } from '@/components/radar/radar-card'
import { getRadarOverview } from '@/lib/culinary-radar/actions'

export const metadata: Metadata = {
  title: 'Culinary Radar',
  description: 'Source-backed external culinary intelligence filtered through your business.',
}

function categoryLabel(value: string): string {
  return value
    .replace(/_/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export default async function CulinaryRadarPage() {
  const overview = await getRadarOverview()

  const criticalCount = overview.matches.filter((match) => match.severity === 'critical').length
  const highCount = overview.matches.filter((match) => match.severity === 'high').length
  const activeSources = overview.sources.filter((source) => source.active)
  const degradedSources = activeSources.filter((source) => source.lastError)
  const categories = new Map<string, number>()

  for (const match of overview.matches) {
    categories.set(match.item.category, (categories.get(match.item.category) ?? 0) + 1)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <h1 className="text-2xl font-bold text-stone-100">Culinary Radar</h1>
          <p className="mt-1 text-sm leading-6 text-stone-400">
            Source-backed recalls, opportunities, sustainability signals, craft developments, and
            business context filtered through your ChefFlow data.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant={criticalCount > 0 ? 'error' : 'default'}>{criticalCount} critical</Badge>
          <Badge variant={highCount > 0 ? 'warning' : 'default'}>{highCount} high</Badge>
          <Badge variant={degradedSources.length > 0 ? 'warning' : 'success'}>
            {activeSources.length} sources
          </Badge>
        </div>
      </div>

      {!overview.success && (
        <Card className="border-red-900/50 bg-red-950/20 p-5">
          <p className="font-medium text-red-300">Culinary Radar could not load.</p>
          <p className="mt-1 text-sm text-red-200/80">
            {overview.error ?? 'The radar tables or source data are unavailable.'}
          </p>
        </Card>
      )}

      {overview.success && degradedSources.length > 0 && (
        <Card className="border-amber-900/50 bg-amber-950/20 p-5">
          <p className="font-medium text-amber-300">Some sources are degraded.</p>
          <p className="mt-1 text-sm text-amber-100/80">
            ChefFlow will not call this an all-clear until every enabled source has refreshed.
          </p>
        </Card>
      )}

      {overview.success && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="p-4">
            <p className="text-2xl font-bold text-stone-100">{overview.matches.length}</p>
            <p className="mt-1 text-xs text-stone-500">Relevant radar items</p>
          </Card>
          <Card className="p-4">
            <p className="text-2xl font-bold text-stone-100">{activeSources.length}</p>
            <p className="mt-1 text-xs text-stone-500">Enabled source monitors</p>
          </Card>
          <Card className="p-4">
            <p className="text-2xl font-bold text-stone-100">{categories.size}</p>
            <p className="mt-1 text-xs text-stone-500">Categories with matches</p>
          </Card>
        </div>
      )}

      {overview.success && categories.size > 0 && (
        <div className="flex flex-wrap gap-2">
          {Array.from(categories.entries()).map(([category, count]) => (
            <Badge key={category} variant="info">
              {categoryLabel(category)} · {count}
            </Badge>
          ))}
        </div>
      )}

      {overview.success && overview.matches.length === 0 && (
        <Card className="p-10 text-center">
          <p className="text-lg font-medium text-stone-300">Nothing relevant right now.</p>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-stone-500">
            ChefFlow is ready to show source-backed safety alerts, opportunity leads, sustainability
            guidance, and craft signals once the radar ingestion job creates matches for your
            business.
          </p>
          {activeSources.length > 0 && (
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {activeSources.slice(0, 6).map((source) => (
                <Badge key={source.id} variant="default">
                  {source.name}
                </Badge>
              ))}
            </div>
          )}
        </Card>
      )}

      {overview.matches.length > 0 && (
        <section className="space-y-4">
          {overview.matches.map((match) => (
            <RadarCard key={match.id} match={match} />
          ))}
        </section>
      )}

      {overview.success && activeSources.length > 0 && (
        <section>
          <h2 className="mb-3 text-base font-semibold text-stone-200">Source monitors</h2>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {activeSources.map((source) => (
              <Card key={source.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-stone-100">{source.name}</p>
                    <p className="mt-1 text-xs text-stone-500">
                      {categoryLabel(source.defaultCategory)} · {source.credibilityTier}
                    </p>
                  </div>
                  <Badge variant={source.lastError ? 'warning' : 'success'}>
                    {source.lastError ? 'Check' : 'Active'}
                  </Badge>
                </div>
                {source.lastError && (
                  <p className="mt-3 text-xs leading-5 text-amber-300">{source.lastError}</p>
                )}
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
