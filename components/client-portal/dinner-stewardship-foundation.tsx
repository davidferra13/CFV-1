'use client'

import { useState, useTransition } from 'react'
import type { StewardshipSnapshot } from '@/lib/dinner-circles/stewardship'
import {
  submitDinnerChangeIntake,
  type DinnerChangeIntakeState,
} from '@/lib/dinner-circles/stewardship-actions'

type DinnerStewardshipFoundationProps = {
  eventId: string
  snapshot: StewardshipSnapshot
}

const CHANGE_OPTIONS = [
  ['headcount', 'Headcount'],
  ['guest_swap', 'Guest changed'],
  ['dietary', 'Dietary'],
  ['menu_request', 'Menu'],
  ['private_surprise', 'Private note'],
  ['timing_access', 'Timing/access'],
  ['cancellation_reschedule', 'Cancel/reschedule'],
  ['addon', 'Add-on'],
  ['general', 'General'],
] as const

export function DinnerStewardshipFoundation({
  eventId,
  snapshot,
}: DinnerStewardshipFoundationProps) {
  const [state, setState] = useState<DinnerChangeIntakeState>({ ok: false, message: '' })
  const [isPending, startTransition] = useTransition()

  function onSubmit(formData: FormData) {
    startTransition(async () => {
      setState(await submitDinnerChangeIntake(state, formData))
    })
  }

  const activeActions = snapshot.actions.filter((action) => action.tier !== 'destructive')
  const destructiveActions = snapshot.actions.filter((action) => action.tier === 'destructive')

  return (
    <section className="mb-6 space-y-4" aria-labelledby="dinner-stewardship-title">
      <div className="rounded-xl border border-emerald-800/50 bg-emerald-950/25 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-300">
              {snapshot.lifecycleLabel}
            </p>
            <h2 id="dinner-stewardship-title" className="mt-1 text-xl font-semibold text-stone-100">
              {snapshot.daysUntil} days until dinner
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-300">
              Your dinner is confirmed and still actively stewarded. The chef sees blockers;
              participants only see client-safe readiness.
            </p>
          </div>

          <div className="grid min-w-[220px] grid-cols-3 gap-2 text-center">
            <Metric label="Known" value={snapshot.participantProgress.totalKnown} />
            <Metric label="Ready" value={snapshot.participantProgress.dietaryComplete} />
            <Metric label="Pending" value={snapshot.participantProgress.pending} />
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-5">
          {snapshot.gates.map((gate) => (
            <div key={gate.id} className="rounded-lg border border-stone-700 bg-stone-900/70 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-stone-100">{gate.label}</p>
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${gate.status === 'complete' ? 'bg-emerald-900 text-emerald-200' : gate.status === 'blocked' ? 'bg-red-950 text-red-300' : 'bg-amber-950 text-amber-300'}`}
                >
                  {gate.status}
                </span>
              </div>
              <p className="mt-2 text-xs leading-5 text-stone-400">{gate.description}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-xl border border-stone-800 bg-stone-900 p-5">
          <h3 className="text-base font-semibold text-stone-100">Tell us anything changed</h3>
          <p className="mt-1 text-sm text-stone-400">
            Send structured changes without broadcasting private notes to guests.
          </p>

          <form
            onSubmit={(event) => {
              event.preventDefault()
              onSubmit(new FormData(event.currentTarget))
            }}
            className="mt-4 space-y-3"
          >
            <input suppressHydrationWarning type="hidden" name="eventId" value={eventId} />
            <div className="grid gap-3 sm:grid-cols-[180px_1fr]">
              <label className="text-sm font-medium text-stone-300" htmlFor="changeType">
                Type
              </label>
              <select
                id="changeType"
                name="changeType"
                className="min-h-[44px] rounded-lg border border-stone-700 bg-stone-950 px-3 text-sm text-stone-100"
                defaultValue="general"
              >
                {CHANGE_OPTIONS.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-3 sm:grid-cols-[180px_1fr]">
              <label className="text-sm font-medium text-stone-300" htmlFor="note">
                Details
              </label>
              <textarea
                suppressHydrationWarning
                id="note"
                name="note"
                rows={4}
                className="min-h-[120px] rounded-lg border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-100"
                placeholder="What changed, who it affects, and whether it is private."
                required
              />
            </div>

            <label className="flex min-h-[44px] items-center gap-3 text-sm text-stone-300">
              <input
                suppressHydrationWarning
                type="checkbox"
                name="privateToHostChef"
                className="h-4 w-4 rounded border-stone-600 bg-stone-950"
              />
              Keep this private to host and chef
            </label>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <button
                type="submit"
                disabled={isPending}
                className="min-h-[44px] rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-500 disabled:opacity-60"
              >
                {isPending ? 'Sending...' : 'Send to chef'}
              </button>
              {state.message ? (
                <p className={state.ok ? 'text-sm text-emerald-300' : 'text-sm text-red-300'}>
                  {state.message}
                </p>
              ) : null}
            </div>
          </form>
        </div>

        <div className="rounded-xl border border-stone-800 bg-stone-900 p-5">
          <h3 className="text-base font-semibold text-stone-100">Participant action contract</h3>
          <div className="mt-4 space-y-2">
            {activeActions.map((action) => (
              <ActionRow key={action.id} action={action} />
            ))}
            {destructiveActions.map((action) => (
              <ActionRow key={action.id} action={action} muted />
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <InfoPanel title="What the chef brings" items={snapshot.logistics.chefBrings} />
        <InfoPanel title="What the host provides" items={snapshot.logistics.hostProvides} />
        <InfoPanel title="Memory feed" items={snapshot.memoryFeed.map((item) => item.label)} />
      </div>

      <div className="rounded-xl border border-stone-800 bg-stone-900 p-5">
        <h3 className="text-base font-semibold text-stone-100">Privacy and audit controls</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {snapshot.privacyControls.map((control) => (
            <div key={control.id} className="rounded-lg border border-stone-700 bg-stone-950 p-3">
              <p className="text-sm font-medium text-stone-100">{control.label}</p>
              <p className="mt-1 text-xs leading-5 text-stone-400">{control.protectedData}</p>
              <p className="mt-2 text-xs leading-5 text-emerald-300">{control.enforcement}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-emerald-800/40 bg-stone-950/70 p-3">
      <p className="text-lg font-semibold text-stone-100">{value}</p>
      <p className="text-xs text-stone-400">{label}</p>
    </div>
  )
}

function ActionRow({
  action,
  muted = false,
}: {
  action: StewardshipSnapshot['actions'][number]
  muted?: boolean
}) {
  return (
    <div className="rounded-lg border border-stone-700 bg-stone-950 p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p
            className={
              muted ? 'text-sm font-medium text-stone-400' : 'text-sm font-medium text-stone-100'
            }
          >
            {action.label}
          </p>
          <p className="mt-1 text-xs text-stone-500">{action.allowedRoles.join(', ')}</p>
        </div>
        <span className="rounded-full bg-stone-800 px-2 py-0.5 text-[11px] text-stone-300">
          {action.clientSafeStatus}
        </span>
      </div>
    </div>
  )
}

function InfoPanel({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-xl border border-stone-800 bg-stone-900 p-5">
      <h3 className="text-base font-semibold text-stone-100">{title}</h3>
      <ul className="mt-3 space-y-2">
        {items.map((item) => (
          <li key={item} className="text-sm leading-6 text-stone-400">
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}
