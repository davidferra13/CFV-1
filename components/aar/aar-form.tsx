// AAR Entry Form — Optimized for post-service capture
// Quick ratings first (two taps), forgotten items second, text notes optional
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Alert } from '@/components/ui/alert'
import { Card } from '@/components/ui/card'
import { createAAR, updateAAR } from '@/lib/aar/actions'
import type { CreateAARInput, UpdateAARInput } from '@/lib/aar/actions'
import type { ChecklistItem } from '@/lib/checklist/actions'
import { trackAction, setActiveForm, trackError } from '@/lib/ai/remy-activity-tracker'

type AARFormProps = {
  eventId: string
  checklistItems: ChecklistItem[]
  existingAAR?: {
    id: string
    calm_rating: number
    preparation_rating: number
    execution_rating: number | null
    could_have_done_earlier: string | null
    forgotten_items: string[]
    what_went_well: string | null
    what_went_wrong: string | null
    menu_performance_notes: string | null
    client_behavior_notes: string | null
    site_notes: string | null
    general_notes: string | null
    would_do_differently: string | null
  } | null
}

const RATING_LABELS: Record<number, string> = {
  1: 'Very Low',
  2: 'Low',
  3: 'Moderate',
  4: 'High',
  5: 'Very High',
}

const CALM_LABELS: Record<number, string> = {
  1: 'Maximum stress',
  2: 'Stressful',
  3: 'Manageable',
  4: 'Calm',
  5: 'Completely calm',
}

const PREP_LABELS: Record<number, string> = {
  1: 'Nothing ready',
  2: 'Mostly unprepared',
  3: 'Somewhat prepared',
  4: 'Well prepared',
  5: 'Fully prepared',
}

function RatingSelector({
  label,
  sublabel,
  value,
  onChange,
  labels,
}: {
  label: string
  sublabel: string
  value: number
  onChange: (v: number) => void
  labels: Record<number, string>
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-stone-300 mb-1">
        {label} <span className="text-red-500">*</span>
      </label>
      <p className="text-xs text-stone-500 mb-3">{sublabel}</p>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`
              flex-1 py-3 px-2 rounded-lg border-2 text-center transition-all
              min-h-[60px] flex flex-col items-center justify-center
              ${
                value === n
                  ? 'border-brand-600 bg-brand-950 text-brand-400 font-semibold'
                  : 'border-stone-700 bg-stone-900 text-stone-400 hover:border-stone-600 hover:bg-stone-800'
              }
            `}
          >
            <span className="text-lg font-bold">{n}</span>
            <span className="text-[10px] leading-tight mt-1">{labels[n]}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

export function AARForm({ eventId, checklistItems, existingAAR }: AARFormProps) {
  const router = useRouter()
  const isEditing = !!existingAAR

  const [calmRating, setCalmRating] = useState(existingAAR?.calm_rating ?? 0)
  const [prepRating, setPrepRating] = useState(existingAAR?.preparation_rating ?? 0)
  const [forgottenItems, setForgottenItems] = useState<Set<string>>(
    new Set(existingAAR?.forgotten_items ?? [])
  )
  const [otherForgotten, setOtherForgotten] = useState('')
  const [couldHaveDoneEarlier, setCouldHaveDoneEarlier] = useState(
    existingAAR?.could_have_done_earlier ?? ''
  )
  const [whatWentWell, setWhatWentWell] = useState(existingAAR?.what_went_well ?? '')
  const [whatWentWrong, setWhatWentWrong] = useState(existingAAR?.what_went_wrong ?? '')
  const [menuNotes, setMenuNotes] = useState(existingAAR?.menu_performance_notes ?? '')
  const [clientNotes, setClientNotes] = useState(existingAAR?.client_behavior_notes ?? '')
  const [siteNotes, setSiteNotes] = useState(existingAAR?.site_notes ?? '')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setActiveForm(isEditing ? 'Edit After-Action Review' : 'New After-Action Review')
    return () => setActiveForm(null)
  }, [isEditing])

  const toggleForgotten = (item: string) => {
    setForgottenItems((prev) => {
      const next = new Set(prev)
      if (next.has(item)) {
        next.delete(item)
      } else {
        next.add(item)
      }
      return next
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (calmRating === 0 || prepRating === 0) {
      setError('Please rate both calm and preparation levels')
      return
    }

    setLoading(true)

    // Build forgotten items array: checked items + free text
    const allForgotten = Array.from(forgottenItems)
    if (otherForgotten.trim()) {
      const extras = otherForgotten
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
      allForgotten.push(...extras)
    }

    try {
      if (isEditing && existingAAR) {
        const updateData: UpdateAARInput = {
          calm_rating: calmRating,
          preparation_rating: prepRating,
          forgotten_items: allForgotten,
          could_have_done_earlier: couldHaveDoneEarlier || null,
          what_went_well: whatWentWell || null,
          what_went_wrong: whatWentWrong || null,
          menu_performance_notes: menuNotes || null,
          client_behavior_notes: clientNotes || null,
          site_notes: siteNotes || null,
        }
        await updateAAR(existingAAR.id, updateData)
        trackAction('Updated after-action review', `Calm: ${calmRating}/5, Prep: ${prepRating}/5`)
      } else {
        const createData: CreateAARInput = {
          event_id: eventId,
          calm_rating: calmRating,
          preparation_rating: prepRating,
          forgotten_items: allForgotten,
          could_have_done_earlier: couldHaveDoneEarlier || undefined,
          what_went_well: whatWentWell || undefined,
          what_went_wrong: whatWentWrong || undefined,
          menu_performance_notes: menuNotes || undefined,
          client_behavior_notes: clientNotes || undefined,
          site_notes: siteNotes || undefined,
        }
        await createAAR(createData)
        trackAction('Created after-action review', `Calm: ${calmRating}/5, Prep: ${prepRating}/5`)
      }

      router.push(`/events/${eventId}`)
      router.refresh()
    } catch (err) {
      console.error('AAR submit error:', err)
      const msg = err instanceof Error ? err.message : 'Failed to save review'
      setError(msg)
      trackError(msg, 'After-action review save')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <Alert variant="error" title="Error">
          {error}
        </Alert>
      )}

      {/* Section 1: Quick Ratings (required, do these first) */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-stone-100 mb-4">How did it feel?</h2>
        <div className="space-y-6">
          <RatingSelector
            label="Calm Rating"
            sublabel="How calm did the service feel overall?"
            value={calmRating}
            onChange={setCalmRating}
            labels={CALM_LABELS}
          />
          <RatingSelector
            label="Preparation Rating"
            sublabel="How prepared were you going in?"
            value={prepRating}
            onChange={setPrepRating}
            labels={PREP_LABELS}
          />
        </div>
      </Card>

      {/* Section 2: Forgotten Items (important, do this second) */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-stone-100 mb-2">Forgotten Items</h2>
        <p className="text-sm text-stone-500 mb-4">
          Check any items you forgot. This helps build your permanent checklist.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
          {checklistItems.map((ci) => (
            <label
              key={ci.item}
              className={`
                flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors
                ${
                  forgottenItems.has(ci.item)
                    ? 'border-red-300 bg-red-950 text-red-800'
                    : 'border-stone-700 bg-stone-900 text-stone-300 hover:bg-stone-800'
                }
              `}
            >
              <input
                type="checkbox"
                checked={forgottenItems.has(ci.item)}
                onChange={() => toggleForgotten(ci.item)}
                className="rounded border-stone-600 text-red-600 focus:ring-red-500"
              />
              <span className="text-sm">{ci.item}</span>
              {ci.category === 'learned' && ci.forgottenCount && (
                <span className="text-[10px] text-red-500 ml-auto">x{ci.forgottenCount}</span>
              )}
            </label>
          ))}
        </div>

        <Textarea
          label="Other items forgotten"
          placeholder="Comma-separated: e.g., truffle oil, piping bags"
          value={otherForgotten}
          onChange={(e) => setOtherForgotten(e.target.value)}
          rows={2}
          helperText="These will be tracked and may be added to your permanent checklist"
        />
      </Card>

      {/* Section 3: Text Notes (optional, fill in what you can) */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-stone-100 mb-2">Notes</h2>
        <p className="text-sm text-stone-500 mb-4">
          All optional. Fill in what you can now, come back later to add more.
        </p>

        <div className="space-y-4">
          <Textarea
            label="What could have been done earlier?"
            placeholder="Prep work, shopping, communication that could have happened sooner..."
            value={couldHaveDoneEarlier}
            onChange={(e) => setCouldHaveDoneEarlier(e.target.value)}
            rows={3}
          />

          <Textarea
            label="What went well?"
            placeholder="Highlight the wins..."
            value={whatWentWell}
            onChange={(e) => setWhatWentWell(e.target.value)}
            rows={3}
          />

          <Textarea
            label="What went wrong?"
            placeholder="Issues, mistakes, surprises..."
            value={whatWentWrong}
            onChange={(e) => setWhatWentWrong(e.target.value)}
            rows={3}
          />

          <Textarea
            label="Menu notes - what did the client love?"
            placeholder="Which dishes landed, which didn't, any modifications..."
            value={menuNotes}
            onChange={(e) => setMenuNotes(e.target.value)}
            rows={3}
          />

          <Textarea
            label="Client notes - anything to remember?"
            placeholder="Preferences, feedback, relationship notes..."
            value={clientNotes}
            onChange={(e) => setClientNotes(e.target.value)}
            rows={3}
          />

          <Textarea
            label="Site notes - anything new about the location?"
            placeholder="Kitchen issues, parking, access changes..."
            value={siteNotes}
            onChange={(e) => setSiteNotes(e.target.value)}
            rows={3}
          />
        </div>
      </Card>

      {/* Submit */}
      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.push(`/events/${eventId}`)}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          loading={loading}
          disabled={loading || calmRating === 0 || prepRating === 0}
          size="lg"
        >
          {isEditing ? 'Update Review' : 'File Review'}
        </Button>
      </div>
    </form>
  )
}
