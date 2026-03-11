'use client'

import { FormEvent, useState, useTransition } from 'react'
import { updateChefJourney } from '@/lib/journey/actions'
import type { ChefJourney, ChefJourneyStatus } from '@/lib/journey/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { joinLines, parseLines } from './helpers'

type OverviewState = {
  title: string
  destination_city: string
  destination_region: string
  destination_country: string
  started_on: string
  ended_on: string
  status: ChefJourneyStatus
  trip_summary: string
  favorite_meal: string
  favorite_experience: string
  key_learnings_text: string
  inspiration_ideas_text: string
  culinary_focus_tags_text: string
  collaborators_text: string
}

function buildState(journey: ChefJourney): OverviewState {
  return {
    title: journey.title,
    destination_city: journey.destination_city || '',
    destination_region: journey.destination_region || '',
    destination_country: journey.destination_country || '',
    started_on: journey.started_on || '',
    ended_on: journey.ended_on || '',
    status: journey.status,
    trip_summary: journey.trip_summary,
    favorite_meal: journey.favorite_meal,
    favorite_experience: journey.favorite_experience,
    key_learnings_text: joinLines(journey.key_learnings),
    inspiration_ideas_text: joinLines(journey.inspiration_ideas),
    culinary_focus_tags_text: joinLines(journey.culinary_focus_tags),
    collaborators_text: joinLines(journey.collaborators),
  }
}

export function JourneyOverviewForm({
  journey,
  onSaved,
}: {
  journey: ChefJourney
  onSaved: (journey: ChefJourney) => void
}) {
  const [state, setState] = useState<OverviewState>(buildState(journey))
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    setError(null)

    startTransition(async () => {
      try {
        const result = await updateChefJourney(journey.id, {
          title: state.title,
          destination_city: state.destination_city,
          destination_region: state.destination_region,
          destination_country: state.destination_country,
          started_on: state.started_on || null,
          ended_on: state.ended_on || null,
          status: state.status,
          trip_summary: state.trip_summary,
          favorite_meal: state.favorite_meal,
          favorite_experience: state.favorite_experience,
          key_learnings: parseLines(state.key_learnings_text),
          inspiration_ideas: parseLines(state.inspiration_ideas_text),
          culinary_focus_tags: parseLines(state.culinary_focus_tags_text),
          collaborators: parseLines(state.collaborators_text),
          cover_image_url: null,
        })

        setState(buildState(result.journey))
        onSaved(result.journey)
      } catch (saveError) {
        setError(saveError instanceof Error ? saveError.message : 'Failed to save overview')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 border border-stone-700 rounded-lg p-4">
      <h3 className="text-sm font-semibold text-stone-100">Journal Overview</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Input
          label="Journal Title"
          value={state.title}
          onChange={(event) => setState((prev) => ({ ...prev, title: event.target.value }))}
          required
        />
        <div>
          <label className="block text-sm font-medium text-stone-300 mb-1.5">Status</label>
          <select
            value={state.status}
            onChange={(event) =>
              setState((prev) => ({ ...prev, status: event.target.value as ChefJourneyStatus }))
            }
            className="w-full rounded-lg border border-stone-600 px-3 py-2 text-sm"
          >
            <option value="planning">Planning</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="archived">Archived</option>
          </select>
        </div>
        <Input
          label="City"
          value={state.destination_city}
          onChange={(event) =>
            setState((prev) => ({ ...prev, destination_city: event.target.value }))
          }
          placeholder="Rome"
        />
        <Input
          label="Region"
          value={state.destination_region}
          onChange={(event) =>
            setState((prev) => ({ ...prev, destination_region: event.target.value }))
          }
          placeholder="Lazio"
        />
        <Input
          label="Country"
          value={state.destination_country}
          onChange={(event) =>
            setState((prev) => ({ ...prev, destination_country: event.target.value }))
          }
          placeholder="Italy"
        />
        <Input
          label="Collaborators"
          value={state.collaborators_text}
          onChange={(event) =>
            setState((prev) => ({ ...prev, collaborators_text: event.target.value }))
          }
          placeholder="One per line or comma separated"
        />
        <Input
          label="Start Date"
          type="date"
          value={state.started_on}
          onChange={(event) => setState((prev) => ({ ...prev, started_on: event.target.value }))}
        />
        <Input
          label="End Date"
          type="date"
          value={state.ended_on}
          onChange={(event) => setState((prev) => ({ ...prev, ended_on: event.target.value }))}
        />
      </div>

      <Textarea
        label="Trip Summary"
        value={state.trip_summary}
        onChange={(event) => setState((prev) => ({ ...prev, trip_summary: event.target.value }))}
        rows={4}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Textarea
          label="Favorite Meal"
          value={state.favorite_meal}
          onChange={(event) => setState((prev) => ({ ...prev, favorite_meal: event.target.value }))}
          rows={3}
        />
        <Textarea
          label="Favorite Experience"
          value={state.favorite_experience}
          onChange={(event) =>
            setState((prev) => ({ ...prev, favorite_experience: event.target.value }))
          }
          rows={3}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Textarea
          label="Key Learnings"
          value={state.key_learnings_text}
          onChange={(event) =>
            setState((prev) => ({ ...prev, key_learnings_text: event.target.value }))
          }
          rows={5}
          placeholder="One per line"
        />
        <Textarea
          label="Ideas to Bring Back"
          value={state.inspiration_ideas_text}
          onChange={(event) =>
            setState((prev) => ({ ...prev, inspiration_ideas_text: event.target.value }))
          }
          rows={5}
          placeholder="One per line"
        />
        <Textarea
          label="Focus Tags"
          value={state.culinary_focus_tags_text}
          onChange={(event) =>
            setState((prev) => ({ ...prev, culinary_focus_tags_text: event.target.value }))
          }
          rows={5}
          placeholder="One per line"
        />
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-950 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Saving...' : 'Save Overview'}
        </Button>
      </div>
    </form>
  )
}
