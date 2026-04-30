import type { Metadata } from 'next'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { RadarCard } from '@/components/radar/radar-card'
import { RadarPreferences } from '@/components/radar/radar-preferences'
import { getRadarOverview, getRadarPreferences } from '@/lib/culinary-radar/actions'
import { buildRadarInsightSummary } from '@/lib/culinary-radar/insights'

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

function sourceHealthVariant(value: string): 'default' | 'success' | 'warning' | 'error' | 'info' {
  if (value === 'healthy') return 'success'
  if (value === 'degraded') return 'error'
  if (value === 'stale') return 'warning'
  return 'info'
}

export default async function CulinaryRadarPage() {
  const [overview, preferences] = await Promise.all([getRadarOverview(), getRadarPreferences()])

  const criticalCount = overview.matches.filter((match) => match.severity === 'critical').length
  const highCount = overview.matches.filter((match) => match.severity === 'high').length
  const activeSources = overview.sources.filter((source) => source.active)
  const degradedSources = activeSources.filter((source) => source.lastError)
  const categories = new Map<string, number>()
  const insights = buildRadarInsightSummary(overview)

  for (const match of overview.matches) {
    categories.set(match.item.category, (categories.get(match.item.category) ?? 0) + 1)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <h1 className="text-2xl font-bold text-stone-100">Culinary Radar</h1>
          <p className="mt-1 text-sm leading-6 text-stone-400">
            Source-backed recalls, opportunities, local sourcing signals, sustainability guidance,
            craft developments, and business context filtered through your ChefFlow data.
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

      {overview.success && (
        <section className="space-y-3">
          <div>
            <h2 className="text-base font-semibold text-stone-200">Action lanes</h2>
            <p className="mt-1 text-sm text-stone-500">
              Radar groups live source matches into practical work streams before they become
              tasks, vendor leads, calendar notes, or operating decisions.
            </p>
          </div>
          <div className="grid gap-3 xl:grid-cols-4">
            {insights.lanes.map((lane) => (
              <Card key={lane.key} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-stone-100">{lane.label}</h3>
                    <p className="mt-1 text-xs leading-5 text-stone-500">{lane.description}</p>
                  </div>
                  <Badge variant={lane.matches.length > 0 ? 'info' : 'default'}>
                    {lane.matches.length}
                  </Badge>
                </div>
                <p className="mt-3 text-xs text-stone-400">{lane.nextStep}</p>
                {lane.matches.length > 0 && (
                  <ul className="mt-3 space-y-2">
                    {lane.matches.slice(0, 3).map((match) => (
                      <li key={match.id} className="text-xs leading-5 text-stone-400">
                        <span className="font-medium text-stone-200">{match.item.title}</span>
                        <span className="text-stone-500"> from {match.item.sourceName}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            ))}
          </div>
        </section>
      )}

      {overview.success && categories.size > 0 && (
        <div className="flex flex-wrap gap-2">
          {Array.from(categories.entries()).map(([category, count]) => (
            <Badge key={category} variant="info">
              {categoryLabel(category)} / {count}
            </Badge>
          ))}
        </div>
      )}

      {preferences.success && <RadarPreferences preferences={preferences.preferences} />}

      {!preferences.success && (
        <Card className="border-amber-900/50 bg-amber-950/20 p-5">
          <p className="font-medium text-amber-300">Radar controls could not load.</p>
          <p className="mt-1 text-sm text-amber-100/80">
            {preferences.error ?? 'ChefFlow will keep default radar delivery active.'}
          </p>
        </Card>
      )}

      {overview.success && overview.matches.length === 0 && (
        <Card className="p-10 text-center">
          <p className="text-lg font-medium text-stone-300">Nothing relevant right now.</p>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-stone-500">
            ChefFlow is ready to show source-backed safety alerts, opportunity leads, local sourcing
            guidance, sustainability guidance, and craft signals once the radar ingestion job
            creates matches for your business.
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
          <div>
            <h2 className="text-base font-semibold text-stone-200">Matched items</h2>
            <p className="mt-1 text-sm text-stone-500">
              Each card is source-backed and can become a task, a local source lead, or a market
              calendar note when the action fits the category.
            </p>
          </div>
          {overview.matches.map((match) => (
            <RadarCard key={match.id} match={match} />
          ))}
        </section>
      )}

      {overview.success && activeSources.length > 0 && (
        <section className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-stone-200">Source trust panel</h2>
              <p className="mt-1 text-sm text-stone-500">
                ChefFlow shows degraded, stale, and unrefreshed sources instead of implying an
                all-clear.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="success">{insights.trustedSourceCount} fresh</Badge>
              <Badge variant={insights.staleSourceCount > 0 ? 'warning' : 'default'}>
                {insights.staleSourceCount} stale
              </Badge>
              <Badge variant={insights.degradedSourceCount > 0 ? 'error' : 'default'}>
                {insights.degradedSourceCount} degraded
              </Badge>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {insights.sourceTrust
              .filter((source) => source.active)
              .map((source) => (
                <Card key={source.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-stone-100">{source.name}</p>
                      <p className="mt-1 text-xs text-stone-500">
                        {categoryLabel(source.defaultCategory)} / {source.credibilityTier} /{' '}
                        {source.freshnessLabel}
                      </p>
                    </div>
                    <Badge variant={sourceHealthVariant(source.health)}>
                      {categoryLabel(source.health)}
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
