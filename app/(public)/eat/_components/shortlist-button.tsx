'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { Plus, Check, Loader2 } from 'lucide-react'
import {
  addPlanningCandidate,
  createPlanningGroupFromDiscovery,
} from '@/lib/hub/planning-candidate-actions'
import type { PlanningBrief } from '@/lib/hub/types'
import type { ConsumerResultCard } from '@/lib/public-consumer/discovery-actions'

type StoredPlanningContext = {
  groupToken: string
  profileToken: string
}

const STORAGE_KEY = 'cf-planning-shortlist'

function readStoredPlanningContext(): StoredPlanningContext | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as StoredPlanningContext
    if (!parsed.groupToken || !parsed.profileToken) return null
    return parsed
  } catch {
    return null
  }
}

function writeStoredPlanningContext(value: StoredPlanningContext) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
  } catch {
    // Local storage is optional. The server action also sets a cookie.
  }
}

function snapshotFromCard(card: ConsumerResultCard) {
  return {
    title: card.title,
    subtitle: card.subtitle ?? undefined,
    imageUrl: card.imageUrl ?? undefined,
    eyebrow: card.eyebrow,
    locationLabel: card.locationLabel ?? undefined,
    priceLabel: card.priceLabel ?? undefined,
    dietaryTags: card.dietaryTags,
    serviceModes: card.serviceModes,
    ctaLabel: card.ctaLabel,
    href: card.ctaHref,
  }
}

export function ShortlistButton({
  card,
  planningBrief,
}: {
  card: ConsumerResultCard
  planningBrief: PlanningBrief
}) {
  const [context, setContext] = useState<StoredPlanningContext | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'added'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const snapshot = useMemo(() => snapshotFromCard(card), [card])

  useEffect(() => {
    setContext(readStoredPlanningContext())
  }, [])

  function addWithContext(nextContext: StoredPlanningContext) {
    setError(null)
    startTransition(async () => {
      try {
        const result = await addPlanningCandidate({
          groupToken: nextContext.groupToken,
          profileToken: nextContext.profileToken,
          candidateType: card.sourceType,
          sourceId: card.sourceId,
          snapshot,
        })

        if (!result.success) {
          setError(result.error)
          return
        }

        setStatus('added')
        setExpanded(false)
        setContext(nextContext)
        writeStoredPlanningContext(nextContext)
      } catch {
        setError('Could not add this option. Please try again.')
      }
    })
  }

  function handleQuickAdd() {
    if (!context) {
      setExpanded(true)
      return
    }
    addWithContext(context)
  }

  function handleCreateAndAdd() {
    const name = displayName.trim()
    if (!name) {
      setError('Enter your name to start a shared shortlist.')
      return
    }

    setError(null)
    startTransition(async () => {
      try {
        const created = await createPlanningGroupFromDiscovery({
          displayName: name,
          email: email.trim() || null,
          planningBrief,
        })

        if (!created.success) {
          setError(created.error)
          return
        }

        const nextContext = {
          groupToken: created.groupToken,
          profileToken: created.profileToken,
        }

        const added = await addPlanningCandidate({
          groupToken: created.groupToken,
          profileToken: created.profileToken,
          candidateType: card.sourceType,
          sourceId: card.sourceId,
          snapshot,
        })

        if (!added.success) {
          setError(added.error)
          return
        }

        setStatus('added')
        setExpanded(false)
        setContext(nextContext)
        writeStoredPlanningContext(nextContext)
      } catch {
        setError('Could not start the shortlist. Please try again.')
      }
    })
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleQuickAdd}
        disabled={pending || status === 'added'}
        className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-stone-700 bg-stone-950 px-3 text-sm font-medium text-stone-200 transition-colors hover:border-stone-600 hover:bg-stone-900 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : status === 'added' ? (
          <Check className="h-4 w-4 text-emerald-300" />
        ) : (
          <Plus className="h-4 w-4" />
        )}
        {status === 'added'
          ? 'Added to shortlist'
          : context
            ? 'Add to shortlist'
            : 'Start shortlist'}
      </button>

      {expanded && !context && (
        <div className="rounded-xl border border-stone-700 bg-stone-950 p-3">
          <div className="space-y-2">
            <input
              type="text"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="Your name"
              className="h-10 w-full rounded-lg border border-stone-700 bg-stone-900 px-3 text-sm text-stone-100 placeholder:text-stone-600 focus:border-brand-500 focus:outline-none"
            />
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Email optional"
              className="h-10 w-full rounded-lg border border-stone-700 bg-stone-900 px-3 text-sm text-stone-100 placeholder:text-stone-600 focus:border-brand-500 focus:outline-none"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleCreateAndAdd}
                disabled={pending}
                className="inline-flex h-10 flex-1 items-center justify-center rounded-lg bg-brand-600 px-3 text-sm font-semibold text-white transition-colors hover:bg-brand-500 disabled:opacity-60"
              >
                Create and add
              </button>
              <button
                type="button"
                onClick={() => setExpanded(false)}
                className="inline-flex h-10 items-center justify-center rounded-lg border border-stone-700 px-3 text-sm text-stone-300 transition-colors hover:border-stone-600"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {error && <p className="text-xs leading-relaxed text-red-300">{error}</p>}
    </div>
  )
}
