// Event Discovery Fields Section
// Collapsible section for vibe, dress code, table presentation,
// surprise coordination, social media consent, and confidentiality.
// Auto-saves on change (debounced 500ms).

'use client'

import { useState, useCallback, useRef, useTransition } from 'react'
import { Card } from '@/components/ui/card'
import { toast } from 'sonner'
import { updateDiscoveryFields } from '@/lib/events/discovery-actions'
import type {
  DiscoveryFields,
  SocialMediaConsent,
  SurpriseDetails,
} from '@/lib/events/discovery-types'

const VIBE_TAGS = [
  'casual',
  'formal',
  'interactive',
  'intimate',
  'party',
  'elegant',
  'rustic',
  'festive',
] as const

const TABLE_OPTIONS = [
  { value: 'simple', label: 'Simple' },
  { value: 'elevated', label: 'Elevated' },
  { value: 'themed', label: 'Themed' },
] as const

const SOCIAL_MEDIA_OPTIONS: { value: SocialMediaConsent; label: string }[] = [
  { value: 'full', label: 'Full permission' },
  { value: 'restricted', label: 'Restricted (ask before posting)' },
  { value: 'none', label: 'No posting allowed' },
  { value: 'undiscussed', label: 'Not discussed yet' },
]

type Props = {
  eventId: string
  initialFields: DiscoveryFields
}

export function DiscoveryFieldsSection({ eventId, initialFields }: Props) {
  const [isOpen, setIsOpen] = useState(hasAnyContent(initialFields))
  const [fields, setFields] = useState<DiscoveryFields>(initialFields)
  const [isPending, startTransition] = useTransition()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const debouncedSave = useCallback(
    (updated: Partial<DiscoveryFields>) => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        startTransition(async () => {
          try {
            const result = await updateDiscoveryFields(eventId, updated)
            if (!result.success) {
              toast.error(result.error ?? 'Failed to save')
            }
          } catch {
            toast.error('Failed to save discovery fields')
          }
        })
      }, 500)
    },
    [eventId, startTransition]
  )

  function updateField<K extends keyof DiscoveryFields>(key: K, value: DiscoveryFields[K]) {
    const updated = { ...fields, [key]: value }
    setFields(updated)
    debouncedSave({ [key]: value })
  }

  if (!isOpen) {
    return (
      <Card className="p-4">
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center justify-between w-full text-left"
        >
          <div className="flex items-center gap-2">
            <span className="text-lg font-medium">Event Discovery</span>
            {hasAnyContent(fields) ? (
              <span className="text-xs text-stone-500">configured</span>
            ) : (
              <span className="text-xs text-stone-600">not set</span>
            )}
          </div>
          <span className="text-stone-500 text-sm">+</span>
        </button>
      </Card>
    )
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => setIsOpen(false)} className="flex items-center gap-2">
          <h2 className="text-xl font-semibold">Event Discovery</h2>
          <span className="text-stone-500 text-sm">&minus;</span>
        </button>
        {isPending && <span className="text-xs text-stone-500">Saving...</span>}
      </div>

      <div className="space-y-6">
        {/* Vibe / Atmosphere */}
        <fieldset className="space-y-2">
          <label className="text-sm font-medium text-stone-300">Vibe / Atmosphere</label>
          <div className="flex flex-wrap gap-2 mb-2">
            {VIBE_TAGS.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() =>
                  updateField('vibe_atmosphere', tag === fields.vibe_atmosphere ? null : tag)
                }
                className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                  fields.vibe_atmosphere === tag
                    ? 'bg-brand-600 border-brand-500 text-white'
                    : 'bg-stone-800 border-stone-700 text-stone-300 hover:border-stone-500'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
          <input
            type="text"
            value={
              fields.vibe_atmosphere && !VIBE_TAGS.includes(fields.vibe_atmosphere as any)
                ? fields.vibe_atmosphere
                : ''
            }
            onChange={(e) => updateField('vibe_atmosphere', e.target.value || null)}
            placeholder="Or describe custom vibe..."
            className="w-full bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-sm text-stone-200 placeholder:text-stone-600"
          />
        </fieldset>

        {/* Dress Code */}
        <fieldset className="space-y-2">
          <label className="text-sm font-medium text-stone-300">Dress Code</label>
          <input
            type="text"
            value={fields.dress_code ?? ''}
            onChange={(e) => updateField('dress_code', e.target.value || null)}
            placeholder="All black, business casual, themed..."
            className="w-full bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-sm text-stone-200 placeholder:text-stone-600"
          />
        </fieldset>

        {/* Table Presentation */}
        <fieldset className="space-y-2">
          <label className="text-sm font-medium text-stone-300">Table Presentation</label>
          <div className="flex gap-2">
            {TABLE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() =>
                  updateField(
                    'table_presentation',
                    opt.value === fields.table_presentation ? null : opt.value
                  )
                }
                className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${
                  fields.table_presentation === opt.value
                    ? 'bg-brand-600 border-brand-500 text-white'
                    : 'bg-stone-800 border-stone-700 text-stone-300 hover:border-stone-500'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </fieldset>

        {/* Surprise Coordination */}
        <fieldset className="space-y-2">
          <label className="text-sm font-medium text-stone-300">Surprise Coordination</label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={fields.surprise_details?.isSurprise ?? false}
              onChange={(e) => {
                const isSurprise = e.target.checked
                const updated: SurpriseDetails | null = isSurprise
                  ? {
                      isSurprise: true,
                      honoree: fields.surprise_details?.honoree ?? '',
                      coordinationNotes: fields.surprise_details?.coordinationNotes ?? '',
                    }
                  : null
                updateField('surprise_details', updated)
              }}
              className="rounded border-stone-600"
            />
            <span className="text-sm text-stone-300">This is a surprise event</span>
          </label>
          {fields.surprise_details?.isSurprise && (
            <div className="ml-6 space-y-2">
              <input
                type="text"
                value={fields.surprise_details.honoree}
                onChange={(e) =>
                  updateField('surprise_details', {
                    ...fields.surprise_details!,
                    honoree: e.target.value,
                  })
                }
                placeholder="Who is being surprised?"
                className="w-full bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-sm text-stone-200 placeholder:text-stone-600"
              />
              <textarea
                value={fields.surprise_details.coordinationNotes}
                onChange={(e) =>
                  updateField('surprise_details', {
                    ...fields.surprise_details!,
                    coordinationNotes: e.target.value,
                  })
                }
                placeholder="Coordination notes (arrival timing, signals, etc.)"
                rows={2}
                className="w-full bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-sm text-stone-200 placeholder:text-stone-600 resize-none"
              />
            </div>
          )}
        </fieldset>

        {/* Social Media Consent */}
        <fieldset className="space-y-2">
          <label className="text-sm font-medium text-stone-300">Social Media</label>
          <div className="space-y-1">
            {SOCIAL_MEDIA_OPTIONS.map((opt) => (
              <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="social_media_consent"
                  checked={fields.social_media_consent === opt.value}
                  onChange={() => updateField('social_media_consent', opt.value)}
                  className="border-stone-600"
                />
                <span className="text-sm text-stone-300">{opt.label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {/* Confidentiality */}
        <fieldset className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={fields.confidentiality_required}
              onChange={(e) => updateField('confidentiality_required', e.target.checked)}
              className="rounded border-stone-600"
            />
            <span className="text-sm font-medium text-stone-300">
              Confidentiality required (high-profile client)
            </span>
          </label>
        </fieldset>
      </div>
    </Card>
  )
}

function hasAnyContent(fields: DiscoveryFields): boolean {
  return !!(
    fields.dress_code ||
    fields.table_presentation ||
    fields.surprise_details?.isSurprise ||
    (fields.social_media_consent && fields.social_media_consent !== 'undiscussed') ||
    fields.vibe_atmosphere ||
    fields.vendor_coordination_notes ||
    fields.confidentiality_required
  )
}
