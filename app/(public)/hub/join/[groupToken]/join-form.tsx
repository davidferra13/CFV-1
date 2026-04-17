'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  getOrCreateProfile,
  updateProfile,
  sendCircleRecoveryEmail,
} from '@/lib/hub/profile-actions'
import { joinHubGroup } from '@/lib/hub/group-actions'

interface JoinGroupFormProps {
  groupToken: string
  isBridge?: boolean
}

export function JoinGroupForm({ groupToken, isBridge }: JoinGroupFormProps) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [allergyAnswer, setAllergyAnswer] = useState<null | 'none' | 'has'>(null)
  const [allergyText, setAllergyText] = useState('')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [recoverySent, setRecoverySent] = useState(false)

  const handleJoin = () => {
    if (!name.trim()) return

    startTransition(async () => {
      try {
        const profile = await getOrCreateProfile({
          display_name: name.trim(),
          email: email.trim() || null,
        })

        // SECURITY (Q1): Existing profiles don't return profile_token.
        // The user must verify ownership via recovery email.
        if (profile.is_existing) {
          await joinHubGroup({ groupToken, profileId: profile.id })
          // Send recovery email so they can reclaim their identity
          if (email.trim()) {
            await sendCircleRecoveryEmail(email.trim(), groupToken).catch(() => {})
            setRecoverySent(true)
          }
          // Redirect to circle in view-only mode (no cookie = can read but not post)
          router.push(`/hub/g/${groupToken}`)
          return
        }

        await joinHubGroup({ groupToken, profileId: profile.id })

        // Set profile cookie (persistent, 1 year) - only for NEW profiles
        document.cookie = `hub_profile_token=${profile.profile_token}; path=/; max-age=${365 * 24 * 60 * 60}; samesite=lax`

        // Persist allergy/dietary info if provided
        if (allergyAnswer === 'has' && allergyText.trim()) {
          const items = allergyText
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
          await updateProfile({
            profileToken: profile.profile_token,
            known_allergies: items,
          }).catch(() => {
            // Non-blocking - profile update failure doesn't prevent joining
          })
        } else if (allergyAnswer === 'none') {
          // Explicitly record confirmed-none so chef can distinguish from not-answered
          await updateProfile({
            profileToken: profile.profile_token,
            known_allergies: [],
            known_dietary: [],
          }).catch(() => {})
        }

        router.push(`/hub/g/${groupToken}`)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to join')
      }
    })
  }

  return (
    <div>
      <div className="space-y-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          className="w-full rounded-xl bg-stone-800 px-4 py-3 text-sm text-stone-200 outline-none ring-1 ring-stone-700 placeholder:text-stone-500 focus:ring-[var(--hub-primary,#e88f47)]"
          onKeyDown={(e) => e.key === 'Enter' && !allergyAnswer && handleJoin()}
          autoFocus
        />

        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email (optional - for event updates)"
          type="email"
          className="w-full rounded-xl bg-stone-800 px-4 py-3 text-sm text-stone-200 outline-none ring-1 ring-stone-700 placeholder:text-stone-500 focus:ring-[var(--hub-primary,#e88f47)]"
        />

        {/* Allergy question - required context for the chef */}
        <div className="space-y-2 pt-1">
          <p className="text-xs font-medium text-stone-400">
            Any food allergies or dietary restrictions?
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setAllergyAnswer('none')
                setAllergyText('')
              }}
              className={`rounded-lg border py-2.5 text-sm font-medium transition-all ${
                allergyAnswer === 'none'
                  ? 'border-emerald-500 bg-emerald-950 text-emerald-300'
                  : 'border-stone-700 text-stone-400 hover:border-stone-600'
              }`}
            >
              No, none
            </button>
            <button
              type="button"
              onClick={() => setAllergyAnswer('has')}
              className={`rounded-lg border py-2.5 text-sm font-medium transition-all ${
                allergyAnswer === 'has'
                  ? 'border-amber-500 bg-amber-950 text-amber-300'
                  : 'border-stone-700 text-stone-400 hover:border-stone-600'
              }`}
            >
              Yes, I do
            </button>
          </div>
          {allergyAnswer === 'has' && (
            <input
              value={allergyText}
              onChange={(e) => setAllergyText(e.target.value)}
              placeholder="e.g. peanuts, shellfish, gluten-free"
              className="w-full rounded-xl bg-stone-800 px-4 py-2.5 text-sm text-stone-200 outline-none ring-1 ring-stone-700 placeholder:text-stone-500 focus:ring-[var(--hub-primary,#e88f47)]"
            />
          )}
        </div>
      </div>

      {recoverySent && (
        <p className="mt-2 rounded-lg border border-amber-500/30 bg-amber-950/50 p-3 text-xs text-amber-300">
          Welcome back! We sent an access link to your email. Check your inbox to unlock full
          access.
        </p>
      )}
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}

      <button
        onClick={handleJoin}
        disabled={!name.trim() || isPending}
        className="mt-4 w-full rounded-xl bg-[var(--hub-primary,#e88f47)] py-3 text-sm font-semibold text-white transition-opacity disabled:opacity-30"
      >
        {isPending ? 'Joining...' : isBridge ? 'Join Introduction' : 'Join the Group'}
      </button>
    </div>
  )
}
