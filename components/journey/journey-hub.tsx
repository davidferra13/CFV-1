'use client'

import Link from 'next/link'
import { FormEvent, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { BookOpen, Camera, Lightbulb, MapPin, Plus, Sparkles, Trash2 } from '@/components/ui/icons'
import { createChefJourney, deleteChefJourney } from '@/lib/journey/actions'
import type {
  ChefJourneyInsights,
  ChefJourneyStatus,
  ChefJourneyWithStats,
} from '@/lib/journey/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

const STATUS_META: Record<
  ChefJourneyStatus,
  { label: string; variant: 'default' | 'info' | 'success' | 'warning' }
> = {
  planning: { label: 'Planning', variant: 'default' },
  in_progress: { label: 'In Progress', variant: 'info' },
  completed: { label: 'Completed', variant: 'success' },
  archived: { label: 'Archived', variant: 'warning' },
}

type StatusFilter = ChefJourneyStatus | 'all'

type JourneyHubProps = {
  journeys: ChefJourneyWithStats[]
  insights: ChefJourneyInsights
}

type JourneyDraft = {
  title: string
  destination_city: string
  destination_region: string
  destination_country: string
  started_on: string
  ended_on: string
  trip_summary: string
  key_learnings_text: string
  inspiration_ideas_text: string
  culinary_focus_tags_text: string
}

const EMPTY_DRAFT: JourneyDraft = {
  title: '',
  destination_city: '',
  destination_region: '',
  destination_country: '',
  started_on: '',
  ended_on: '',
  trip_summary: '',
  key_learnings_text: '',
  inspiration_ideas_text: '',
  culinary_focus_tags_text: '',
}

function parseListInput(value: string): string[] {
  return value
    .split(/[\n,]/g)
    .map((item) => item.trim())
    .filter(Boolean)
}

function formatJourneyDateRange(startedOn: string | null, endedOn: string | null): string {
  if (!startedOn && !endedOn) return 'No dates set'
  if (startedOn && !endedOn) return `${new Date(startedOn).toLocaleDateString()} - Ongoing`
  if (!startedOn && endedOn) return `Ends ${new Date(endedOn).toLocaleDateString()}`
  return `${new Date(startedOn as string).toLocaleDateString()} - ${new Date(endedOn as string).toLocaleDateString()}`
}

function destinationLabel(journey: ChefJourneyWithStats): string {
  const parts = [
    journey.destination_city,
    journey.destination_region,
    journey.destination_country,
  ].filter((part): part is string => Boolean(part && part.trim()))
  return parts.join(', ')
}

function adoptionRate(insights: ChefJourneyInsights): number {
  if (insights.total_ideas === 0) return 0
  return Math.round((insights.adopted_ideas / insights.total_ideas) * 100)
}

function journeyNudge(journey: ChefJourneyWithStats): string {
  if (journey.entry_count < 4) {
    return 'Add more timeline entries to document this chapter end-to-end.'
  }
  if (journey.media_count < 3) {
    return 'Capture photos or videos so the team can revisit this visually.'
  }
  if (journey.recipe_link_count < 2) {
    return 'Link recipes tested from this journey to preserve what worked.'
  }
  if (journey.adopted_idea_count === 0) {
    return 'Promote one idea to adopted so this journey impacts real service.'
  }
  return 'Strong documentation. Keep logging to compound team knowledge.'
}

export function JourneyHub({ journeys, insights }: JourneyHubProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [showCreate, setShowCreate] = useState(journeys.length === 0)
  const [draft, setDraft] = useState<JourneyDraft>(EMPTY_DRAFT)
  const [error, setError] = useState<string | null>(null)
  const [deletingJourney, setDeletingJourney] = useState<ChefJourneyWithStats | null>(null)

  const filteredJourneys = useMemo(() => {
    if (statusFilter === 'all') return journeys
    return journeys.filter((journey) => journey.status === statusFilter)
  }, [journeys, statusFilter])

  const handleCreate = (event: FormEvent) => {
    event.preventDefault()
    setError(null)

    startTransition(async () => {
      try {
        const result = await createChefJourney({
          title: draft.title,
          destination_city: draft.destination_city,
          destination_region: draft.destination_region,
          destination_country: draft.destination_country,
          started_on: draft.started_on || null,
          ended_on: draft.ended_on || null,
          status: 'planning',
          trip_summary: draft.trip_summary,
          key_learnings: parseListInput(draft.key_learnings_text),
          inspiration_ideas: parseListInput(draft.inspiration_ideas_text),
          culinary_focus_tags: parseListInput(draft.culinary_focus_tags_text),
          collaborators: [],
          favorite_meal: '',
          favorite_experience: '',
          cover_image_url: null,
        })

        setDraft(EMPTY_DRAFT)
        setShowCreate(false)
        router.push(`/settings/journal/${result.journey.id}`)
      } catch (createError) {
        setError(createError instanceof Error ? createError.message : 'Failed to create journal')
      }
    })
  }

  const handleDelete = (journey: ChefJourneyWithStats) => {
    setDeletingJourney(journey)
  }

  const handleConfirmDelete = () => {
    if (!deletingJourney) return
    const journey = deletingJourney
    setDeletingJourney(null)

    startTransition(async () => {
      try {
        await deleteChefJourney(journey.id)
        router.refresh()
      } catch (deleteError) {
        setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete journal')
      }
    })
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card>
          <CardContent className="py-4">
            <p className="text-xs uppercase tracking-wide text-stone-500">Journals</p>
            <p className="text-2xl font-semibold text-stone-100 mt-1">{insights.total_journeys}</p>
            <p className="text-xs text-stone-500 mt-1">{insights.completed_journeys} completed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-xs uppercase tracking-wide text-stone-500">Journal Entries</p>
            <p className="text-2xl font-semibold text-stone-100 mt-1">{insights.total_entries}</p>
            <p className="text-xs text-stone-500 mt-1">
              {insights.highlights} marked as highlights
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-xs uppercase tracking-wide text-stone-500">Media Memories</p>
            <p className="text-2xl font-semibold text-stone-100 mt-1">{insights.total_media}</p>
            <p className="text-xs text-stone-500 mt-1">{insights.mapped_entries} mapped moments</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-xs uppercase tracking-wide text-stone-500">Recipe Logs</p>
            <p className="text-2xl font-semibold text-stone-100 mt-1">
              {insights.total_recipe_links}
            </p>
            <p className="text-xs text-stone-500 mt-1">journey-to-recipe connections</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-xs uppercase tracking-wide text-stone-500">Idea Pipeline</p>
            <p className="text-2xl font-semibold text-stone-100 mt-1">{insights.total_ideas}</p>
            <p className="text-xs text-stone-500 mt-1">{insights.adopted_ideas} adopted</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-xs uppercase tracking-wide text-stone-500">Reflection Depth</p>
            <p className="text-2xl font-semibold text-stone-100 mt-1">
              {insights.documented_mistakes}
            </p>
            <p className="text-xs text-stone-500 mt-1">{adoptionRate(insights)}% idea adoption</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <CardTitle>Chef Journal</CardTitle>
              <p className="text-sm text-stone-400 mt-1">
                Track travel, meals, lessons, and post-trip ideas so your inspiration becomes
                repeatable craft.
              </p>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setShowCreate((prev) => !prev)}
            >
              <Plus className="w-4 h-4" />
              {showCreate ? 'Hide Form' : 'New Journal'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {showCreate && (
            <form
              onSubmit={handleCreate}
              className="border border-stone-700 rounded-lg p-4 space-y-4 bg-stone-800/50"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input
                  label="Journal Title"
                  value={draft.title}
                  onChange={(event) => setDraft((prev) => ({ ...prev, title: event.target.value }))}
                  placeholder="Italy Culinary Research Tour"
                  required
                />
                <Input
                  label="Destination Country"
                  value={draft.destination_country}
                  onChange={(event) =>
                    setDraft((prev) => ({ ...prev, destination_country: event.target.value }))
                  }
                  placeholder="Italy"
                />
                <Input
                  label="Destination City"
                  value={draft.destination_city}
                  onChange={(event) =>
                    setDraft((prev) => ({ ...prev, destination_city: event.target.value }))
                  }
                  placeholder="Rome"
                />
                <Input
                  label="Destination Region"
                  value={draft.destination_region}
                  onChange={(event) =>
                    setDraft((prev) => ({ ...prev, destination_region: event.target.value }))
                  }
                  placeholder="Lazio"
                />
                <Input
                  label="Start Date"
                  type="date"
                  value={draft.started_on}
                  onChange={(event) =>
                    setDraft((prev) => ({ ...prev, started_on: event.target.value }))
                  }
                />
                <Input
                  label="End Date"
                  type="date"
                  value={draft.ended_on}
                  onChange={(event) =>
                    setDraft((prev) => ({ ...prev, ended_on: event.target.value }))
                  }
                />
              </div>

              <Textarea
                label="Trip Summary"
                value={draft.trip_summary}
                onChange={(event) =>
                  setDraft((prev) => ({ ...prev, trip_summary: event.target.value }))
                }
                rows={3}
                placeholder="What is the purpose of this journal and what are you trying to discover?"
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Textarea
                  label="Initial Learnings"
                  value={draft.key_learnings_text}
                  onChange={(event) =>
                    setDraft((prev) => ({ ...prev, key_learnings_text: event.target.value }))
                  }
                  rows={4}
                  placeholder="One per line or comma separated"
                />
                <Textarea
                  label="Ideas to Bring Back"
                  value={draft.inspiration_ideas_text}
                  onChange={(event) =>
                    setDraft((prev) => ({ ...prev, inspiration_ideas_text: event.target.value }))
                  }
                  rows={4}
                  placeholder="One per line or comma separated"
                />
                <Textarea
                  label="Focus Tags"
                  value={draft.culinary_focus_tags_text}
                  onChange={(event) =>
                    setDraft((prev) => ({ ...prev, culinary_focus_tags_text: event.target.value }))
                  }
                  rows={4}
                  placeholder="Pasta making, fermentation, market sourcing"
                />
              </div>

              {error && (
                <div className="rounded-lg border border-red-200 bg-red-950 px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setDraft(EMPTY_DRAFT)
                    setShowCreate(false)
                    setError(null)
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending ? 'Creating...' : 'Create Journal'}
                </Button>
              </div>
            </form>
          )}

          <div className="flex flex-wrap items-center gap-2">
            {(['all', 'planning', 'in_progress', 'completed', 'archived'] as StatusFilter[]).map(
              (status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                    statusFilter === status
                      ? 'bg-brand-600 text-white border-brand-600'
                      : 'bg-stone-900 text-stone-400 border-stone-700 hover:bg-stone-800'
                  }`}
                >
                  {status === 'all' ? 'All' : STATUS_META[status].label}
                </button>
              )
            )}
          </div>

          {filteredJourneys.length === 0 ? (
            <div className="border border-dashed border-stone-600 rounded-lg p-10 text-center">
              <p className="text-stone-300 font-medium">No journals yet</p>
              <p className="text-sm text-stone-500 mt-1">
                Start a journal to track destinations, meals, lessons, and ideas worth bringing
                back.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredJourneys.map((journey) => {
                const destination = destinationLabel(journey)
                const statusMeta = STATUS_META[journey.status]

                return (
                  <Card key={journey.id} className="border-stone-700">
                    <CardContent className="pt-5 space-y-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-lg font-semibold text-stone-100 leading-tight">
                            {journey.title}
                          </p>
                          <p className="text-xs text-stone-500 mt-1">
                            {formatJourneyDateRange(journey.started_on, journey.ended_on)}
                          </p>
                        </div>
                        <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>
                      </div>

                      {destination && (
                        <div className="flex items-center gap-1.5 text-sm text-stone-400">
                          <MapPin className="w-4 h-4 text-stone-400" />
                          <span>{destination}</span>
                        </div>
                      )}

                      {journey.trip_summary ? (
                        <p className="text-sm text-stone-300 line-clamp-3">
                          {journey.trip_summary}
                        </p>
                      ) : (
                        <p className="text-sm text-stone-400">No journal summary yet.</p>
                      )}

                      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
                        <div className="rounded-md bg-stone-800 border border-stone-700 p-2">
                          <p className="text-stone-500">Entries</p>
                          <p className="text-stone-100 font-semibold mt-0.5">
                            {journey.entry_count}
                          </p>
                        </div>
                        <div className="rounded-md bg-stone-800 border border-stone-700 p-2">
                          <p className="text-stone-500">Highlights</p>
                          <p className="text-stone-100 font-semibold mt-0.5">
                            {journey.highlight_count}
                          </p>
                        </div>
                        <div className="rounded-md bg-stone-800 border border-stone-700 p-2">
                          <p className="text-stone-500">Ideas Adopted</p>
                          <p className="text-stone-100 font-semibold mt-0.5">
                            {journey.adopted_idea_count}/{journey.idea_count}
                          </p>
                        </div>
                        <div className="rounded-md bg-stone-800 border border-stone-700 p-2">
                          <p className="text-stone-500">Media</p>
                          <p className="text-stone-100 font-semibold mt-0.5">
                            {journey.media_count}
                          </p>
                        </div>
                        <div className="rounded-md bg-stone-800 border border-stone-700 p-2">
                          <p className="text-stone-500">Recipe Logs</p>
                          <p className="text-stone-100 font-semibold mt-0.5">
                            {journey.recipe_link_count}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {journey.key_learnings.slice(0, 2).map((learning, index) => (
                          <span
                            key={`${journey.id}-learning-${index}`}
                            className="inline-flex items-center gap-1 rounded-full bg-amber-950 text-amber-700 px-2 py-0.5 text-[11px]"
                          >
                            <BookOpen className="w-3 h-3" />
                            {learning}
                          </span>
                        ))}
                        {journey.inspiration_ideas.slice(0, 2).map((idea, index) => (
                          <span
                            key={`${journey.id}-idea-${index}`}
                            className="inline-flex items-center gap-1 rounded-full bg-sky-950 text-sky-700 px-2 py-0.5 text-[11px]"
                          >
                            <Sparkles className="w-3 h-3" />
                            {idea}
                          </span>
                        ))}
                      </div>

                      <div className="rounded-md border border-sky-200 bg-sky-950 px-3 py-2 text-xs text-sky-900 flex items-start gap-2">
                        <Camera className="w-3.5 h-3.5 mt-0.5 text-sky-700" />
                        <span>{journeyNudge(journey)}</span>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-1">
                        <Link href={`/settings/journal/${journey.id}`} className="flex-1">
                          <Button variant="secondary" size="sm" className="w-full">
                            Open Journal
                          </Button>
                        </Link>
                        <Link href={`/settings/journal/${journey.id}?tab=scrapbook`}>
                          <Button variant="ghost" size="sm">
                            Scrapbook
                          </Button>
                        </Link>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(journey)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-950"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            <Card>
              <CardContent className="py-4 space-y-3">
                <p className="text-sm font-medium text-stone-100 flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-amber-500" />
                  Most Frequent Learning Themes
                </p>
                {insights.top_learning_topics.length === 0 ? (
                  <p className="text-sm text-stone-400">No themes captured yet.</p>
                ) : (
                  <div className="space-y-2">
                    {insights.top_learning_topics.map((topic) => (
                      <div key={topic.topic} className="flex items-center justify-between text-sm">
                        <span className="text-stone-300">{topic.topic}</span>
                        <span className="text-xs rounded-full bg-stone-800 px-2 py-0.5 text-stone-400">
                          {topic.count}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="py-4 space-y-3">
                <p className="text-sm font-medium text-stone-100 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-sky-500" />
                  Most Visited Destinations
                </p>
                {insights.top_destinations.length === 0 ? (
                  <p className="text-sm text-stone-400">No destinations logged yet.</p>
                ) : (
                  <div className="space-y-2">
                    {insights.top_destinations.map((destination) => (
                      <div
                        key={destination.destination}
                        className="flex items-center justify-between text-sm"
                      >
                        <span className="text-stone-300">{destination.destination}</span>
                        <span className="text-xs rounded-full bg-stone-800 px-2 py-0.5 text-stone-400">
                          {destination.count}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      <ConfirmModal
        open={!!deletingJourney}
        title={`Delete "${deletingJourney?.title}"?`}
        description="This will delete the journal and all of its entries. This cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        loading={isPending}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingJourney(null)}
      />
    </div>
  )
}
