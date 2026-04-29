import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  dismissRadarMatch,
  markRadarMatchRead,
  markRadarMatchUseful,
} from '@/lib/culinary-radar/actions'
import type { RadarMatchView, RadarSeverity } from '@/lib/culinary-radar/view-model'

function severityVariant(
  severity: RadarSeverity
): 'default' | 'success' | 'warning' | 'error' | 'info' {
  if (severity === 'critical') return 'error'
  if (severity === 'high' || severity === 'medium') return 'warning'
  if (severity === 'info') return 'info'
  return 'default'
}

function formatDate(value: string | null): string {
  if (!value) return 'Date not published'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function titleize(value: string): string {
  return value
    .replace(/_/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

async function markReadAction(id: string) {
  const result = await markRadarMatchRead(id)
  if (!result.success) throw new Error(result.error ?? 'Could not mark radar item read.')
}

async function dismissAction(id: string) {
  const result = await dismissRadarMatch(id)
  if (!result.success) throw new Error(result.error ?? 'Could not dismiss radar item.')
}

async function usefulAction(id: string, useful: boolean) {
  const result = await markRadarMatchUseful(id, useful)
  if (!result.success) throw new Error(result.error ?? 'Could not save radar feedback.')
}

export function RadarCard({ match }: { match: RadarMatchView }) {
  const sourceDate = formatDate(match.item.sourcePublishedAt)
  const createdDate = formatDate(match.createdAt)

  return (
    <Card className="p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={severityVariant(match.severity)}>{match.severity}</Badge>
            <Badge variant="info">{titleize(match.item.category)}</Badge>
            <span className="text-xs text-stone-500">{match.relevanceScore}% relevance</span>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-stone-100">{match.item.title}</h2>
            <p className="mt-1 text-sm text-stone-400">
              {match.item.sourceName} · {sourceDate} · first matched {createdDate}
            </p>
          </div>

          {match.item.summary && (
            <p className="max-w-3xl text-sm leading-6 text-stone-300">{match.item.summary}</p>
          )}

          {match.matchReasons.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                Why ChefFlow surfaced this
              </p>
              <ul className="mt-2 space-y-1 text-sm text-stone-300">
                {match.matchReasons.map((reason) => (
                  <li key={reason} className="flex gap-2">
                    <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-brand-400" />
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {match.matchedEntities.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {match.matchedEntities.map((entity) =>
                entity.href ? (
                  <Link
                    key={`${entity.type}:${entity.id ?? entity.label}`}
                    href={entity.href}
                    className="rounded-md border border-stone-700 bg-stone-900/60 px-2.5 py-1 text-xs text-stone-300 transition-colors hover:border-brand-500 hover:text-stone-100"
                  >
                    {titleize(entity.type)}: {entity.label}
                  </Link>
                ) : (
                  <span
                    key={`${entity.type}:${entity.id ?? entity.label}`}
                    className="rounded-md border border-stone-700 bg-stone-900/60 px-2.5 py-1 text-xs text-stone-400"
                  >
                    {titleize(entity.type)}: {entity.label}
                  </span>
                )
              )}
            </div>
          )}

          {match.recommendedActions.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                Next steps
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {match.recommendedActions.map((action) => (
                  <span
                    key={action}
                    className="rounded-md bg-stone-800 px-2.5 py-1 text-xs text-stone-300"
                  >
                    {action}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-shrink-0 flex-wrap gap-2 lg:flex-col">
          <Button
            href={match.item.canonicalUrl}
            target="_blank"
            rel="noopener noreferrer"
            variant="secondary"
            size="sm"
          >
            Open source
          </Button>
          {match.deliveryState !== 'read' && (
            <form action={markReadAction.bind(null, match.id)}>
              <Button type="submit" variant="ghost" size="sm">
                Mark read
              </Button>
            </form>
          )}
          <form action={dismissAction.bind(null, match.id)}>
            <Button type="submit" variant="ghost" size="sm">
              Dismiss
            </Button>
          </form>
          <div className="flex gap-2 lg:flex-col">
            <form action={usefulAction.bind(null, match.id, true)}>
              <Button type="submit" variant="ghost" size="sm">
                Useful
              </Button>
            </form>
            <form action={usefulAction.bind(null, match.id, false)}>
              <Button type="submit" variant="ghost" size="sm">
                Not useful
              </Button>
            </form>
          </div>
        </div>
      </div>
    </Card>
  )
}
