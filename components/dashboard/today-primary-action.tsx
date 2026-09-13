'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition, type FormEvent } from 'react'
import { toast } from 'sonner'
import { setTodayServeTime } from '@/lib/events/today-actions'
import type { QueueItem } from '@/lib/queue/types'

function contextText(item: QueueItem): string {
  return [item.context.primaryLabel, item.context.secondaryLabel].filter(Boolean).join(' · ')
}

export function TodayPrimaryAction({ item }: { item: QueueItem }) {
  const router = useRouter()
  const [serveTime, setServeTime] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const detail = contextText(item)
  const canSetServeTime = item.inlineAction?.type === 'set_serve_time'
  const eventId = item.inlineAction?.prefill.eventId ?? item.entityId

  function handleServeTimeSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    startTransition(async () => {
      try {
        const result = await setTodayServeTime({ eventId, serveTime })
        if (!result.ok) {
          setError(result.message)
          return
        }
        toast.success(result.message)
        router.refresh()
      } catch (caught) {
        console.error('[TodayPrimaryAction] Serve time save failed:', caught)
        setError('Serve time was not saved. Check your connection and try again.')
      }
    })
  }

  return (
    <section
      aria-labelledby="do-this-now"
      className="rounded-2xl bg-[var(--text-primary)] px-5 py-5 text-[var(--text-inverse)] shadow-sm sm:px-6 sm:py-6"
    >
      <p
        id="do-this-now"
        className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-300"
      >
        Do this now
        {item.workflowStep ? ` · ${item.workflowStep.label}` : ''}
      </p>
      <h1 className="mt-2 text-2xl font-semibold leading-tight sm:text-3xl">{item.title}</h1>
      {detail ? (
        <p className="mt-2 text-sm text-[var(--text-inverse)] opacity-75">{detail}</p>
      ) : null}
      <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--text-inverse)] opacity-85">
        {item.description}
      </p>
      {canSetServeTime ? (
        <form
          className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end"
          onSubmit={handleServeTimeSubmit}
        >
          <div className="w-full sm:max-w-44">
            <label
              htmlFor="today-serve-time"
              className="block text-xs font-semibold text-stone-300"
            >
              Serve time
            </label>
            <input
              id="today-serve-time"
              type="time"
              step={300}
              required
              value={serveTime}
              onChange={(event) => setServeTime(event.target.value)}
              disabled={isPending}
              aria-describedby={error ? 'today-serve-time-error' : undefined}
              className="mt-1 min-h-11 w-full rounded-xl border border-stone-500 bg-white px-3 py-2 text-base text-stone-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 disabled:cursor-wait disabled:opacity-70"
            />
          </div>
          <button
            type="submit"
            disabled={isPending || !serveTime}
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-200 disabled:cursor-wait disabled:opacity-60"
          >
            {isPending ? 'Saving…' : 'Save serve time'}
          </button>
        </form>
      ) : (
        <Link
          href={item.href}
          className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-200"
        >
          Continue
        </Link>
      )}
      {error ? (
        <p
          id="today-serve-time-error"
          role="alert"
          className="mt-3 max-w-2xl rounded-lg bg-red-950/60 px-3 py-2 text-sm text-red-100"
        >
          {error} Keep the time selected and try again.
        </p>
      ) : null}
      {item.estimatedMinutes ? (
        <p className="mt-3 text-sm text-stone-400">About {item.estimatedMinutes} min</p>
      ) : null}
    </section>
  )
}
