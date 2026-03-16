'use client'

// KitchenProfileCallout
// Compact read-only card showing client's kitchen notes on the event detail page.
// Surfaced in the day-of logistics section so the chef can see equipment and
// constraints without navigating away from the event.

import { Card } from '@/components/ui/card'
import { format } from 'date-fns'
import Link from 'next/link'

interface KitchenProfile {
  id: string
  full_name: string
  kitchen_size: string | null
  kitchen_constraints: string | null
  kitchen_oven_notes: string | null
  kitchen_burner_notes: string | null
  kitchen_counter_notes: string | null
  kitchen_refrigeration_notes: string | null
  kitchen_plating_notes: string | null
  kitchen_sink_notes: string | null
  kitchen_profile_updated_at: string | null
  equipment_available: string[] | null
  equipment_must_bring: string[] | null
}

interface KitchenProfileCalloutProps {
  clientId: string
  profile: KitchenProfile | null
}

const FIELDS: Array<{ key: keyof KitchenProfile; label: string }> = [
  { key: 'kitchen_oven_notes', label: 'Oven' },
  { key: 'kitchen_burner_notes', label: 'Burners' },
  { key: 'kitchen_counter_notes', label: 'Counter space' },
  { key: 'kitchen_refrigeration_notes', label: 'Refrigeration' },
  { key: 'kitchen_plating_notes', label: 'Plating surfaces' },
  { key: 'kitchen_sink_notes', label: 'Sink' },
]

export function KitchenProfileCallout({ clientId, profile }: KitchenProfileCalloutProps) {
  const hasNotes =
    profile &&
    (FIELDS.some((f) => !!profile[f.key]) ||
      !!profile.kitchen_constraints ||
      !!profile.kitchen_size ||
      (profile.equipment_available && profile.equipment_available.length > 0) ||
      (profile.equipment_must_bring && profile.equipment_must_bring.length > 0))

  return (
    <Card className="p-6">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h2 className="text-base font-semibold text-stone-100">Kitchen Profile</h2>
          {profile?.kitchen_profile_updated_at && (
            <p className="text-xs text-stone-400 mt-0.5">
              Last updated {format(new Date(profile.kitchen_profile_updated_at), 'MMM d, yyyy')}
            </p>
          )}
        </div>
        <Link
          href={`/clients/${clientId}`}
          className="text-xs text-brand-600 hover:text-brand-400 font-medium shrink-0"
          target="_blank"
          rel="noopener"
        >
          Edit in client profile →
        </Link>
      </div>

      {!profile || !hasNotes ? (
        <div className="rounded-md bg-amber-950 border border-amber-200 px-3 py-2.5">
          <p className="text-sm text-amber-800">
            No kitchen notes on file for this client.{' '}
            <Link
              href={`/clients/${clientId}`}
              className="underline font-medium"
              target="_blank"
              rel="noopener"
            >
              Add notes
            </Link>{' '}
            after your first walkthrough - they&apos;ll appear here on every event.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {profile.kitchen_size && (
            <div className="flex gap-6 text-sm">
              <span className="text-stone-500 font-medium w-28 shrink-0">Size</span>
              <span className="text-stone-200">{profile.kitchen_size}</span>
            </div>
          )}

          {FIELDS.map((f) => {
            const val = profile[f.key] as string | null
            if (!val) return null
            return (
              <div key={f.key} className="flex gap-6 text-sm">
                <span className="text-stone-500 font-medium w-28 shrink-0">{f.label}</span>
                <span className="text-stone-200">{val}</span>
              </div>
            )
          })}

          {profile.kitchen_constraints && (
            <div className="flex gap-6 text-sm">
              <span className="text-stone-500 font-medium w-28 shrink-0">General notes</span>
              <span className="text-stone-200">{profile.kitchen_constraints}</span>
            </div>
          )}

          {profile.equipment_available && profile.equipment_available.length > 0 && (
            <div className="flex gap-6 text-sm">
              <span className="text-stone-500 font-medium w-28 shrink-0">Available</span>
              <span className="text-stone-200">{profile.equipment_available.join(', ')}</span>
            </div>
          )}

          {profile.equipment_must_bring && profile.equipment_must_bring.length > 0 && (
            <div className="flex gap-6 text-sm">
              <span className="text-stone-500 font-medium w-28 shrink-0 text-amber-700">
                Must bring
              </span>
              <span className="text-amber-800 font-medium">
                {profile.equipment_must_bring.join(', ')}
              </span>
            </div>
          )}
        </div>
      )}
    </Card>
  )
}
