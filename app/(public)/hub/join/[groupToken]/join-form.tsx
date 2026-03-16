'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { getOrCreateProfile } from '@/lib/hub/profile-actions'
import { joinHubGroup } from '@/lib/hub/group-actions'

interface JoinGroupFormProps {
  groupToken: string
}

export function JoinGroupForm({ groupToken }: JoinGroupFormProps) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleJoin = () => {
    if (!name.trim()) return

    startTransition(async () => {
      try {
        // Create or find profile
        const profile = await getOrCreateProfile({
          display_name: name.trim(),
          email: email.trim() || null,
        })

        // Join the group
        await joinHubGroup({
          groupToken,
          profileId: profile.id,
        })

        // Set profile cookie (persistent, 1 year)
        document.cookie = `hub_profile_token=${profile.profile_token}; path=/; max-age=${365 * 24 * 60 * 60}; samesite=lax`

        // Redirect to the group
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
          onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
          autoFocus
        />

        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email (optional - for event updates)"
          type="email"
          className="w-full rounded-xl bg-stone-800 px-4 py-3 text-sm text-stone-200 outline-none ring-1 ring-stone-700 placeholder:text-stone-500 focus:ring-[var(--hub-primary,#e88f47)]"
        />
      </div>

      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}

      <button
        onClick={handleJoin}
        disabled={!name.trim() || isPending}
        className="mt-4 w-full rounded-xl bg-[var(--hub-primary,#e88f47)] py-3 text-sm font-semibold text-white transition-opacity disabled:opacity-30"
      >
        {isPending ? 'Joining...' : 'Join the Group'}
      </button>
    </div>
  )
}
