'use client'

import { useState, useTransition } from 'react'
import type { HubGuestProfile } from '@/lib/hub/types'
import { updateProfile } from '@/lib/hub/profile-actions'

interface HubProfileEditorProps {
  profile: HubGuestProfile
  onSaved: (updated: HubGuestProfile) => void
  onCancel: () => void
}

export function HubProfileEditor({ profile, onSaved, onCancel }: HubProfileEditorProps) {
  const [displayName, setDisplayName] = useState(profile.display_name)
  const [bio, setBio] = useState(profile.bio ?? '')
  const [allergies, setAllergies] = useState(profile.known_allergies.join(', '))
  const [dietary, setDietary] = useState(profile.known_dietary.join(', '))
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleSave = () => {
    if (!displayName.trim()) return

    startTransition(async () => {
      try {
        const updated = await updateProfile({
          profileToken: profile.profile_token,
          display_name: displayName.trim(),
          bio: bio.trim() || null,
          known_allergies: allergies
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
          known_dietary: dietary
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
        })
        onSaved(updated)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save')
      }
    })
  }

  return (
    <div className="rounded-xl border border-stone-700 bg-stone-900/80 p-6">
      <h3 className="mb-4 text-sm font-semibold text-stone-200">Edit Profile</h3>

      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-500">Name</label>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full rounded-lg bg-stone-800 px-3 py-2 text-sm text-stone-200 outline-none ring-1 ring-stone-700 placeholder:text-stone-500 focus:ring-[#e88f47]"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-stone-500">
            Bio <span className="text-stone-600">(optional)</span>
          </label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Food lover, always brings wine..."
            maxLength={500}
            rows={2}
            className="w-full resize-none rounded-lg bg-stone-800 px-3 py-2 text-sm text-stone-200 outline-none ring-1 ring-stone-700 placeholder:text-stone-500 focus:ring-[#e88f47]"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-stone-500">
            Allergies <span className="text-stone-600">(comma-separated)</span>
          </label>
          <input
            value={allergies}
            onChange={(e) => setAllergies(e.target.value)}
            placeholder="Shellfish, Tree nuts, Dairy"
            className="w-full rounded-lg bg-stone-800 px-3 py-2 text-sm text-stone-200 outline-none ring-1 ring-stone-700 placeholder:text-stone-500 focus:ring-[#e88f47]"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-stone-500">
            Dietary Restrictions <span className="text-stone-600">(comma-separated)</span>
          </label>
          <input
            value={dietary}
            onChange={(e) => setDietary(e.target.value)}
            placeholder="Vegetarian, Gluten-free"
            className="w-full rounded-lg bg-stone-800 px-3 py-2 text-sm text-stone-200 outline-none ring-1 ring-stone-700 placeholder:text-stone-500 focus:ring-[#e88f47]"
          />
        </div>
      </div>

      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}

      <div className="mt-4 flex gap-2">
        <button
          onClick={handleSave}
          disabled={!displayName.trim() || isPending}
          className="flex-1 rounded-lg bg-[#e88f47] py-2 text-sm font-semibold text-white transition-opacity disabled:opacity-30"
        >
          {isPending ? 'Saving...' : 'Save'}
        </button>
        <button
          onClick={onCancel}
          className="rounded-lg bg-stone-800 px-4 py-2 text-sm text-stone-400 hover:bg-stone-700"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
