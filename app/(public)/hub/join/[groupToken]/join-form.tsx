'use client'

import { type FormEvent, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  getOrCreateProfile,
  sendCircleRecoveryEmail,
  updateProfile,
} from '@/lib/hub/profile-actions'
import { joinHubGroup } from '@/lib/hub/group-actions'
import type { HubInviteCopyRole } from '@/lib/hub/invite-copy'

interface JoinGroupFormProps {
  groupToken: string
  groupName?: string
  isBridge?: boolean
  inviteToken?: string | null
  inviter?: {
    displayName: string
    copyRole: HubInviteCopyRole
  } | null
}

export function JoinGroupForm({
  groupToken,
  groupName,
  isBridge,
  inviteToken,
  inviter,
}: JoinGroupFormProps) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [allergyAnswer, setAllergyAnswer] = useState<null | 'none' | 'has'>(null)
  const [allergyText, setAllergyText] = useState('')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [recoverySent, setRecoverySent] = useState(false)

  const inviterLabel = inviter
    ? inviter.copyRole === 'chef'
      ? `Chef ${inviter.displayName}`
      : inviter.displayName
    : null
  const title = isBridge ? 'Join the introduction' : 'Join the dinner circle'
  const description = isBridge
    ? inviterLabel
      ? `${inviterLabel} sent this intro link. Add your name and step straight into the thread.`
      : 'No account setup. Add your name and step straight into the thread.'
    : inviterLabel
      ? `${inviterLabel} sent this link. Add your name, note any allergies, and you are in.`
      : 'No account setup. Add your name, note any allergies, and you are in.'
  const ctaLabel = isBridge ? 'Join Introduction' : 'Join Dinner Circle'
  const contextLabel = inviterLabel
    ? `${inviterLabel} invited you to ${groupName && groupName.trim().length > 0 ? groupName : isBridge ? 'a private introduction' : 'this Dinner Circle'}`
    : groupName && groupName.trim().length > 0
      ? `You are joining ${groupName}`
      : isBridge
        ? 'You are joining a private introduction'
        : 'You are joining a Dinner Circle'

  function handleJoin() {
    if (!name.trim()) return

    startTransition(async () => {
      try {
        const profile = await getOrCreateProfile({
          display_name: name.trim(),
          email: email.trim() || null,
        })

        if (profile.is_existing) {
          await joinHubGroup({ groupToken, profileId: profile.id, inviteToken })

          if (email.trim()) {
            await sendCircleRecoveryEmail(email.trim(), groupToken).catch(() => {})
            setRecoverySent(true)
          }

          router.push(`/hub/g/${groupToken}`)
          return
        }

        await joinHubGroup({ groupToken, profileId: profile.id, inviteToken })

        document.cookie = `hub_profile_token=${profile.profile_token}; path=/; max-age=${365 * 24 * 60 * 60}; samesite=lax`

        if (allergyAnswer === 'has' && allergyText.trim()) {
          const items = allergyText
            .split(',')
            .map((value) => value.trim())
            .filter(Boolean)

          await updateProfile({
            profileToken: profile.profile_token,
            known_allergies: items,
          }).catch(() => {})
        } else if (allergyAnswer === 'none') {
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

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    handleJoin()
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5">
        <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-300">
          Quick Join
        </span>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-stone-50">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-stone-400">{description}</p>
        <p className="mt-3 text-xs font-medium uppercase tracking-[0.18em] text-stone-500">
          {contextLabel}
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <label
            htmlFor="join-name"
            className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500"
          >
            Your Name
          </label>
          <input
            id="join-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="How should the group know you?"
            className="w-full rounded-2xl border border-stone-700 bg-stone-800 px-4 py-3 text-sm text-stone-100 outline-none transition focus:border-[var(--hub-primary,#e88f47)] focus:ring-2 focus:ring-[var(--hub-primary,#e88f47)]/20"
            autoFocus
            autoComplete="name"
          />
        </div>

        <div className="space-y-2">
          <label
            htmlFor="join-email"
            className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500"
          >
            Email
          </label>
          <input
            id="join-email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Optional, for re-entry and updates"
            type="email"
            className="w-full rounded-2xl border border-stone-700 bg-stone-800 px-4 py-3 text-sm text-stone-100 outline-none transition focus:border-[var(--hub-primary,#e88f47)] focus:ring-2 focus:ring-[var(--hub-primary,#e88f47)]/20"
            autoComplete="email"
          />
          <p className="text-xs text-stone-500">
            Optional, but useful if you need a recovery link later.
          </p>
        </div>

        {!isBridge && (
          <div className="rounded-[24px] border border-stone-700 bg-stone-800/70 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
              Dietary Context
            </p>
            <p className="mt-2 text-sm text-stone-300">
              Any food allergies or dietary restrictions the chef should know about?
            </p>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setAllergyAnswer('none')
                  setAllergyText('')
                }}
                className={`rounded-2xl border px-4 py-3 text-sm font-medium transition ${
                  allergyAnswer === 'none'
                    ? 'border-emerald-500 bg-emerald-950 text-emerald-300'
                    : 'border-stone-700 bg-stone-900/60 text-stone-300 hover:border-stone-500'
                }`}
              >
                No, none
              </button>
              <button
                type="button"
                onClick={() => setAllergyAnswer('has')}
                className={`rounded-2xl border px-4 py-3 text-sm font-medium transition ${
                  allergyAnswer === 'has'
                    ? 'border-amber-500 bg-amber-950 text-amber-300'
                    : 'border-stone-700 bg-stone-900/60 text-stone-300 hover:border-stone-500'
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
                className="mt-3 w-full rounded-2xl border border-stone-700 bg-stone-900/80 px-4 py-3 text-sm text-stone-100 outline-none transition focus:border-[var(--hub-primary,#e88f47)] focus:ring-2 focus:ring-[var(--hub-primary,#e88f47)]/20"
                aria-label="List any allergies or dietary restrictions"
              />
            )}
          </div>
        )}
      </div>

      {recoverySent && (
        <p className="rounded-2xl border border-amber-500/30 bg-amber-950/40 p-3 text-sm text-amber-200">
          Welcome back. We sent an access link to your email so you can reclaim full access.
        </p>
      )}

      {error && (
        <p className="rounded-2xl border border-red-500/20 bg-red-950/40 p-3 text-sm text-red-300">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={!name.trim() || isPending}
        className="w-full rounded-2xl bg-[var(--hub-primary,#e88f47)] px-5 py-3.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
      >
        {isPending ? 'Joining...' : ctaLabel}
      </button>

      <p className="text-center text-xs text-stone-500">
        No password, no long signup. You can fill in the rest once you are inside.
      </p>
    </form>
  )
}
