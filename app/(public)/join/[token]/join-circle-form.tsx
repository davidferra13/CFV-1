'use client'

import { type FormEvent, useState, useTransition } from 'react'
import { joinCircleViaToken } from '@/lib/dinner-circles/qr-join-actions'

interface JoinCircleFormProps {
  token: string
  chefName: string
  eventTitle?: string | null
}

export function JoinCircleForm({ token, chefName, eventTitle }: JoinCircleFormProps) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [joined, setJoined] = useState(false)
  const [alreadyMember, setAlreadyMember] = useState(false)

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!name.trim() || !email.trim()) return

    startTransition(async () => {
      try {
        const result = await joinCircleViaToken(token, {
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim() || undefined,
        })

        if (!result.success) {
          setError(
            result.reason === 'expired'
              ? 'This link has expired.'
              : result.reason === 'maxed'
                ? 'This link has reached its join limit.'
                : 'Invalid link.'
          )
          return
        }

        if (result.alreadyMember) {
          setAlreadyMember(true)
        }

        // Store profile token for future access
        if (result.profileToken) {
          document.cookie = `hub_profile_token=${result.profileToken}; path=/; max-age=${365 * 24 * 60 * 60}; samesite=lax`
        }

        setJoined(true)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong. Try again.')
      }
    })
  }

  if (joined) {
    return (
      <div className="space-y-4 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-950 text-3xl">
          &#10003;
        </div>
        <h2 className="text-2xl font-semibold text-stone-50">
          {alreadyMember ? 'Welcome back!' : "You're in!"}
        </h2>
        <p className="text-sm leading-6 text-stone-300">
          {alreadyMember
            ? `You were already part of this circle. ${chefName} has you covered.`
            : `${chefName} will keep you updated${eventTitle ? ` about ${eventTitle}` : ''}.`}
        </p>
        <p className="text-xs text-stone-500">
          Check your email for circle updates and event details.
        </p>
      </div>
    )
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
        <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-300">
          Quick Join
        </span>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-stone-50">
          Join {eventTitle ? 'this dinner' : 'the circle'}
        </h2>
        <p className="mt-2 text-sm leading-6 text-stone-400">
          No app, no account. Just your name and email.
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <label
            htmlFor="qr-join-name"
            className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500"
          >
            Your Name
          </label>
          <input
            id="qr-join-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="How should the chef know you?"
            required
            className="w-full rounded-2xl border border-stone-700 bg-stone-800 px-4 py-3 text-sm text-stone-100 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
            autoFocus
            autoComplete="name"
          />
        </div>

        <div className="space-y-2">
          <label
            htmlFor="qr-join-email"
            className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500"
          >
            Email
          </label>
          <input
            id="qr-join-email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="For circle updates and event info"
            required
            type="email"
            className="w-full rounded-2xl border border-stone-700 bg-stone-800 px-4 py-3 text-sm text-stone-100 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
            autoComplete="email"
          />
        </div>

        <div className="space-y-2">
          <label
            htmlFor="qr-join-phone"
            className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500"
          >
            Phone{' '}
            <span className="font-normal normal-case tracking-normal text-stone-600">
              (optional)
            </span>
          </label>
          <input
            id="qr-join-phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="For text updates"
            type="tel"
            className="w-full rounded-2xl border border-stone-700 bg-stone-800 px-4 py-3 text-sm text-stone-100 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
            autoComplete="tel"
          />
        </div>
      </div>

      {error && (
        <p className="rounded-2xl border border-red-500/20 bg-red-950/40 p-3 text-sm text-red-300">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={!name.trim() || !email.trim() || isPending}
        className="w-full rounded-2xl bg-amber-600 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-amber-500 disabled:opacity-40"
      >
        {isPending ? 'Joining...' : 'Join Circle'}
      </button>

      <p className="text-center text-xs text-stone-500">
        No password, no app download. Takes about 10 seconds.
      </p>
    </form>
  )
}
