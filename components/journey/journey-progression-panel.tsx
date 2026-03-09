'use client'

import { CheckCircle2, Circle, Compass } from '@/components/ui/icons'
import type {
  ChefJourney,
  ChefJourneyEntry,
  ChefJourneyIdea,
  ChefJourneyMedia,
  ChefJourneyRecipeLink,
} from '@/lib/journey/types'
import { Button } from '@/components/ui/button'

type JourneyTabId = 'entries' | 'media' | 'recipes' | 'ideas'

type ProgressTask = {
  id: string
  label: string
  description: string
  complete: boolean
  tab: JourneyTabId
}

function completionPercent(completed: number, total: number): number {
  if (total === 0) return 0
  return Math.round((completed / total) * 100)
}

export function JourneyProgressPanel({
  journey,
  entries,
  ideas,
  media,
  recipeLinks,
  onJumpToTab,
}: {
  journey: ChefJourney
  entries: ChefJourneyEntry[]
  ideas: ChefJourneyIdea[]
  media: ChefJourneyMedia[]
  recipeLinks: ChefJourneyRecipeLink[]
  onJumpToTab: (tab: JourneyTabId) => void
}) {
  const entryTypes = new Set(entries.map((entry) => entry.entry_type))
  const mappedTimelineItems = [
    ...entries
      .filter((entry) => entry.latitude !== null && entry.longitude !== null)
      .map((entry) => entry.id),
    ...media
      .filter((item) => item.latitude !== null && item.longitude !== null)
      .map((item) => item.id),
  ].length
  const reflectiveEntries = entries.filter(
    (entry) =>
      entry.mistakes_made.length > 0 ||
      entry.proud_moments.length > 0 ||
      entry.what_to_change_next_time.length > 0
  ).length
  const hasCoverMemory = media.some((item) => item.is_cover)
  const ratedRecipeTests = recipeLinks.filter((link) => link.outcome_rating !== null).length
  const adoptedIdeas = ideas.filter((idea) => idea.status === 'adopted').length

  const tasks: ProgressTask[] = [
    {
      id: 'overview-story',
      label: 'Craft the Journey Story',
      description:
        'Fill the overview with a clear trip summary and core motivation for the journey.',
      complete: journey.trip_summary.trim().length >= 60,
      tab: 'entries',
    },
    {
      id: 'timeline-depth',
      label: 'Build Timeline Depth',
      description:
        'Log at least six timeline entries so this journey reads like a full narrative arc.',
      complete: entries.length >= 6,
      tab: 'entries',
    },
    {
      id: 'timeline-variety',
      label: 'Capture Different Entry Types',
      description:
        'Include at least four entry types: meals, techniques, lessons, destinations, and reflections.',
      complete: entryTypes.size >= 4,
      tab: 'entries',
    },
    {
      id: 'reflection-honesty',
      label: 'Document Mistakes and Wins',
      description:
        'Capture honest retrospectives in at least three entries to make growth measurable.',
      complete: reflectiveEntries >= 3,
      tab: 'entries',
    },
    {
      id: 'mapped-memories',
      label: 'Pin Memories on the Map',
      description: 'Attach map coordinates to three or more entries/media moments.',
      complete: mappedTimelineItems >= 3,
      tab: 'media',
    },
    {
      id: 'media-archive',
      label: 'Build a Visual Archive',
      description: 'Add at least six photos/videos/docs and mark a cover memory.',
      complete: media.length >= 6 && hasCoverMemory,
      tab: 'media',
    },
    {
      id: 'recipe-progression',
      label: 'Tie Learnings to Recipes',
      description: 'Link at least three recipes and capture adaptation details.',
      complete: recipeLinks.length >= 3,
      tab: 'recipes',
    },
    {
      id: 'recipe-evaluation',
      label: 'Rate Test Outcomes',
      description: 'Rate at least two recipe outcomes so your future decisions are data-informed.',
      complete: ratedRecipeTests >= 2,
      tab: 'recipes',
    },
    {
      id: 'idea-adoption',
      label: 'Ship at Least One Idea',
      description: 'Convert one journal idea into an adopted operational or menu change.',
      complete: adoptedIdeas >= 1,
      tab: 'ideas',
    },
  ]

  const completedCount = tasks.filter((task) => task.complete).length
  const percent = completionPercent(completedCount, tasks.length)
  const remaining = tasks.filter((task) => !task.complete).slice(0, 3)

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-stone-700 bg-stone-800 p-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold text-stone-100">Career Journal Completion</p>
            <p className="text-sm text-stone-400">
              {completedCount}/{tasks.length} milestones complete
            </p>
          </div>
          <div className="inline-flex items-center gap-1 rounded-full bg-stone-900 border border-stone-700 px-2.5 py-1 text-xs text-stone-300">
            <Compass className="w-3.5 h-3.5 text-brand-600" />
            {percent}% complete
          </div>
        </div>

        <div className="mt-3 h-2 rounded-full bg-stone-700 overflow-hidden">
          <div
            className="h-full bg-brand-600 transition-all duration-300"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {tasks.map((task) => (
          <div
            key={task.id}
            className={`rounded-lg border p-3 ${
              task.complete
                ? 'border-emerald-200 bg-emerald-950/70'
                : 'border-stone-700 bg-stone-900'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2">
                {task.complete ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5" />
                ) : (
                  <Circle className="w-4 h-4 text-stone-400 mt-0.5" />
                )}
                <div>
                  <p className="text-sm font-medium text-stone-100">{task.label}</p>
                  <p className="text-xs text-stone-400 mt-0.5">{task.description}</p>
                </div>
              </div>
              {!task.complete && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onJumpToTab(task.tab)}
                >
                  Open
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-950 px-4 py-3">
        <p className="text-sm font-medium text-amber-900 flex items-center gap-2">
          <Compass className="w-4 h-4" />
          Next Momentum Moves
        </p>
        {remaining.length === 0 ? (
          <p className="text-sm text-amber-800 mt-1">
            Journal is fully documented. Keep adding new entries as this journey evolves.
          </p>
        ) : (
          <div className="mt-2 space-y-1">
            {remaining.map((task) => (
              <p key={task.id} className="text-sm text-amber-900">
                - {task.label}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
