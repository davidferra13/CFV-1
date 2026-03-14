import Link from 'next/link'
import {
  ArrowRight,
  BookOpen,
  Camera,
  Compass,
  Lightbulb,
  MapPin,
  NotebookPen,
  UtensilsCrossed,
} from '@/components/ui/icons'
import type { ChefJourneyInsights, ChefJourneyWithStats } from '@/lib/journey/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type ChefJournalWidgetProps = {
  insights: ChefJourneyInsights
  latestJourney: ChefJourneyWithStats | null
}

function destinationLabel(journey: ChefJourneyWithStats): string {
  const parts = [
    journey.destination_city,
    journey.destination_region,
    journey.destination_country,
  ].filter((part): part is string => Boolean(part && part.trim()))
  return parts.join(', ')
}

function formatJourneyDateRange(startedOn: string | null, endedOn: string | null): string {
  if (!startedOn && !endedOn) return 'No dates set'
  if (startedOn && !endedOn) return `${new Date(startedOn).toLocaleDateString()} - Ongoing`
  if (!startedOn && endedOn) return `Ends ${new Date(endedOn).toLocaleDateString()}`
  return `${new Date(startedOn as string).toLocaleDateString()} - ${new Date(endedOn as string).toLocaleDateString()}`
}

function adoptionRate(insights: ChefJourneyInsights): number {
  if (insights.total_ideas === 0) return 0
  return Math.round((insights.adopted_ideas / insights.total_ideas) * 100)
}

function progressionMessage(insights: ChefJourneyInsights): string {
  if (insights.total_entries < 5) {
    return 'Start by logging the timeline of one complete trip from first day to return.'
  }
  if (insights.total_media < 3) {
    return 'Add visual memories so chefs can relive techniques and plating moments later.'
  }
  if (insights.total_recipe_links < 2) {
    return 'Link tested recipes to journey learnings so inspiration turns into repeatable execution.'
  }
  if (insights.adopted_ideas < 1) {
    return 'Promote one idea to adopted to prove journal learnings are shaping real service.'
  }
  return 'Journal momentum is strong. Keep documenting wins, mistakes, and what to improve next.'
}

export function ChefJournalWidget({ insights, latestJourney }: ChefJournalWidgetProps) {
  return (
    <Card className="border-brand-700">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-brand-200 flex items-center gap-2">
            <NotebookPen className="h-4 w-4" />
            Chef Journal
          </CardTitle>
          <Link
            href="/settings/journal"
            className="inline-flex items-center gap-1 text-sm text-brand-600 hover:text-brand-400"
          >
            Open Journal
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div className="rounded-lg border border-stone-700 bg-stone-800 p-3">
            <p className="text-xs uppercase tracking-wide text-stone-500 flex items-center gap-1">
              <BookOpen className="h-3.5 w-3.5" />
              Journals
            </p>
            <p className="text-xl font-semibold text-stone-100 mt-1">{insights.total_journeys}</p>
          </div>
          <div className="rounded-lg border border-stone-700 bg-stone-800 p-3">
            <p className="text-xs uppercase tracking-wide text-stone-500 flex items-center gap-1">
              <Compass className="h-3.5 w-3.5" />
              Entries
            </p>
            <p className="text-xl font-semibold text-stone-100 mt-1">{insights.total_entries}</p>
          </div>
          <div className="rounded-lg border border-stone-700 bg-stone-800 p-3">
            <p className="text-xs uppercase tracking-wide text-stone-500 flex items-center gap-1">
              <Camera className="h-3.5 w-3.5" />
              Media
            </p>
            <p className="text-xl font-semibold text-stone-100 mt-1">{insights.total_media}</p>
          </div>
          <div className="rounded-lg border border-stone-700 bg-stone-800 p-3">
            <p className="text-xs uppercase tracking-wide text-stone-500 flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              Mapped
            </p>
            <p className="text-xl font-semibold text-stone-100 mt-1">{insights.mapped_entries}</p>
          </div>
          <div className="rounded-lg border border-stone-700 bg-stone-800 p-3">
            <p className="text-xs uppercase tracking-wide text-stone-500 flex items-center gap-1">
              <UtensilsCrossed className="h-3.5 w-3.5" />
              Recipe Logs
            </p>
            <p className="text-xl font-semibold text-stone-100 mt-1">
              {insights.total_recipe_links}
            </p>
          </div>
          <div className="rounded-lg border border-stone-700 bg-stone-800 p-3">
            <p className="text-xs uppercase tracking-wide text-stone-500 flex items-center gap-1">
              <Lightbulb className="h-3.5 w-3.5" />
              Adoption
            </p>
            <p className="text-xl font-semibold text-stone-100 mt-1">{adoptionRate(insights)}%</p>
          </div>
        </div>

        <div className="rounded-lg border border-amber-200 bg-amber-950 px-3 py-2">
          <p className="text-sm text-amber-900">{progressionMessage(insights)}</p>
        </div>

        {latestJourney ? (
          <div className="rounded-lg border border-stone-700 p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-stone-100 truncate">{latestJourney.title}</p>
              <Link
                href={`/settings/journal/${latestJourney.id}`}
                className="text-xs text-brand-600 hover:text-brand-400"
              >
                Open
              </Link>
            </div>
            <p className="text-xs text-stone-500">
              {formatJourneyDateRange(latestJourney.started_on, latestJourney.ended_on)}
            </p>
            {destinationLabel(latestJourney) && (
              <p className="text-xs text-stone-400">{destinationLabel(latestJourney)}</p>
            )}
            <div className="flex flex-wrap gap-2 text-xs text-stone-500">
              <span>{latestJourney.entry_count} entries</span>
              <span>{latestJourney.media_count} media</span>
              <span>{latestJourney.recipe_link_count} recipe logs</span>
              <span>
                {latestJourney.adopted_idea_count}/{latestJourney.idea_count} adopted ideas
              </span>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-stone-600 p-4 text-center">
            <p className="text-sm text-stone-300">No Chef Journal started yet.</p>
            <p className="text-xs text-stone-500 mt-1">
              Create your first journal to track growth over time.
            </p>
            <Link
              href="/settings/journal"
              className="inline-flex items-center gap-1 text-sm text-brand-600 hover:text-brand-400 mt-2"
            >
              Create Journal
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
