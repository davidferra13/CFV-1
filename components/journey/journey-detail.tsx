'use client'

import { useMemo, useState } from 'react'
import type {
  ChefJourney,
  ChefJourneyEntry,
  ChefJourneyIdea,
  ChefJourneyMedia,
  ChefJourneyRecipeLink,
} from '@/lib/journey/types'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { JourneyOverviewForm } from './journey-overview-form'
import { JourneyEntryPanel } from './journey-entry-panel'
import { JourneyIdeaPanel } from './journey-idea-panel'
import { JourneyMediaPanel } from './journey-media-panel'
import { JourneyRecipeLinksPanel } from './journey-recipe-links-panel'
import { JourneyProgressPanel } from './journey-progression-panel'

type RecipeOption = {
  id: string
  name: string
}

type DetailTab = 'entries' | 'media' | 'recipes' | 'ideas' | 'progress'

export function JourneyDetail({
  journey,
  initialEntries,
  initialIdeas,
  initialMedia,
  initialRecipeLinks,
  recipeOptions,
  initialTab = 'entries',
}: {
  journey: ChefJourney
  initialEntries: ChefJourneyEntry[]
  initialIdeas: ChefJourneyIdea[]
  initialMedia: ChefJourneyMedia[]
  initialRecipeLinks: ChefJourneyRecipeLink[]
  recipeOptions: RecipeOption[]
  initialTab?: DetailTab
}) {
  const [journeyState, setJourneyState] = useState<ChefJourney>(journey)
  const [entries, setEntries] = useState<ChefJourneyEntry[]>(initialEntries)
  const [ideas, setIdeas] = useState<ChefJourneyIdea[]>(initialIdeas)
  const [media, setMedia] = useState<ChefJourneyMedia[]>(initialMedia)
  const [recipeLinks, setRecipeLinks] = useState<ChefJourneyRecipeLink[]>(initialRecipeLinks)
  const [activeTab, setActiveTab] = useState<DetailTab>(initialTab)

  const highlightCount = useMemo(
    () => entries.filter((entry) => entry.is_highlight).length,
    [entries]
  )
  const adoptedCount = useMemo(
    () => ideas.filter((idea) => idea.status === 'adopted').length,
    [ideas]
  )
  const mappedCount = useMemo(
    () =>
      entries.filter((entry) => entry.latitude !== null && entry.longitude !== null).length +
      media.filter((item) => item.latitude !== null && item.longitude !== null).length,
    [entries, media]
  )
  const reflectionCount = useMemo(
    () =>
      entries.filter((entry) => entry.mistakes_made.length > 0 || entry.proud_moments.length > 0)
        .length,
    [entries]
  )
  const repeatableCount = useMemo(
    () => recipeLinks.filter((link) => link.would_repeat).length,
    [recipeLinks]
  )
  const tabs: Array<{ id: DetailTab; label: string }> = [
    { id: 'entries', label: 'Journal Log' },
    { id: 'media', label: 'Scrapbook' },
    { id: 'recipes', label: 'Recipe Progression' },
    { id: 'ideas', label: 'Idea Pipeline' },
    { id: 'progress', label: 'Growth Progress' },
  ]

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div>
              <CardTitle>{journeyState.title}</CardTitle>
              <p className="text-sm text-stone-400 mt-1">
                Capture lessons from this journal and convert them into ideas your team can execute.
              </p>
            </div>
            <Badge
              variant={
                journeyState.status === 'completed'
                  ? 'success'
                  : journeyState.status === 'in_progress'
                    ? 'info'
                    : 'default'
              }
            >
              {journeyState.status.replace('_', ' ')}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="rounded-lg border border-stone-700 bg-stone-800 p-3">
              <p className="text-xs uppercase tracking-wide text-stone-500">Entries</p>
              <p className="text-xl font-semibold text-stone-100 mt-1">{entries.length}</p>
            </div>
            <div className="rounded-lg border border-stone-700 bg-stone-800 p-3">
              <p className="text-xs uppercase tracking-wide text-stone-500">Highlights</p>
              <p className="text-xl font-semibold text-stone-100 mt-1">{highlightCount}</p>
            </div>
            <div className="rounded-lg border border-stone-700 bg-stone-800 p-3">
              <p className="text-xs uppercase tracking-wide text-stone-500">Ideas</p>
              <p className="text-xl font-semibold text-stone-100 mt-1">{ideas.length}</p>
            </div>
            <div className="rounded-lg border border-stone-700 bg-stone-800 p-3">
              <p className="text-xs uppercase tracking-wide text-stone-500">Adopted</p>
              <p className="text-xl font-semibold text-stone-100 mt-1">{adoptedCount}</p>
            </div>
            <div className="rounded-lg border border-stone-700 bg-stone-800 p-3">
              <p className="text-xs uppercase tracking-wide text-stone-500">Media</p>
              <p className="text-xl font-semibold text-stone-100 mt-1">{media.length}</p>
            </div>
            <div className="rounded-lg border border-stone-700 bg-stone-800 p-3">
              <p className="text-xs uppercase tracking-wide text-stone-500">Recipe Logs</p>
              <p className="text-xl font-semibold text-stone-100 mt-1">{recipeLinks.length}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-lg border border-amber-200 bg-amber-950 px-3 py-2">
              <p className="text-xs text-amber-700">Reflection Depth</p>
              <p className="text-sm text-amber-900 mt-0.5">
                {reflectionCount} entries include mistakes, wins, or change notes.
              </p>
            </div>
            <div className="rounded-lg border border-sky-200 bg-sky-950 px-3 py-2">
              <p className="text-xs text-sky-700">Mapped Memories</p>
              <p className="text-sm text-sky-900 mt-0.5">
                {mappedCount} timeline items include precise map coordinates.
              </p>
            </div>
            <div className="rounded-lg border border-emerald-200 bg-emerald-950 px-3 py-2">
              <p className="text-xs text-emerald-700">Repeat Potential</p>
              <p className="text-sm text-emerald-900 mt-0.5">
                {repeatableCount}/{recipeLinks.length} recipe tests are marked worth repeating.
              </p>
            </div>
          </div>

          <JourneyOverviewForm journey={journeyState} onSaved={setJourneyState} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 text-sm rounded-md border ${
                  activeTab === tab.id
                    ? 'bg-brand-600 text-white border-brand-600'
                    : 'bg-stone-900 text-stone-400 border-stone-700 hover:bg-stone-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {activeTab === 'entries' && (
            <JourneyEntryPanel
              journeyId={journeyState.id}
              initialEntries={entries}
              onEntriesChange={setEntries}
            />
          )}

          {activeTab === 'media' && (
            <JourneyMediaPanel
              journeyId={journeyState.id}
              initialMedia={media}
              entries={entries}
              onMediaChange={setMedia}
            />
          )}

          {activeTab === 'recipes' && (
            <JourneyRecipeLinksPanel
              journeyId={journeyState.id}
              initialRecipeLinks={recipeLinks}
              entries={entries}
              recipeOptions={recipeOptions}
              onRecipeLinksChange={setRecipeLinks}
            />
          )}

          {activeTab === 'ideas' && (
            <JourneyIdeaPanel
              journeyId={journeyState.id}
              initialIdeas={ideas}
              entries={entries}
              recipeOptions={recipeOptions}
              onIdeasChange={setIdeas}
            />
          )}

          {activeTab === 'progress' && (
            <JourneyProgressPanel
              journey={journeyState}
              entries={entries}
              ideas={ideas}
              media={media}
              recipeLinks={recipeLinks}
              onJumpToTab={(tab) => setActiveTab(tab)}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
