'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Lock, LockOpen, Shuffle, Sparkles } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  APPETITE_TAGS,
  aggregateAppetiteDemand,
  buildAppetiteState,
  getAppetiteTag,
  projectAppetiteStateToDiscovery,
  spinAppetite,
  type AppetiteEvidence,
  type AppetiteSignal,
  type AppetiteSpinMode,
} from '@/lib/discovery/appetite-engine'

const EVIDENCE_KEY = 'chefflow:appetite-evidence:v1'
const EVIDENCE_LIMIT = 500

const MODE_LABELS: Record<AppetiteSpinMode, string> = {
  for_me: 'For me',
  fresh: 'Fresh',
  chaos: 'Chaos',
}

function safeReadEvidence(): AppetiteEvidence[] {
  if (typeof window === 'undefined') return []
  try {
    const parsed = JSON.parse(window.localStorage.getItem(EVIDENCE_KEY) || '[]')
    return Array.isArray(parsed) ? parsed.slice(-EVIDENCE_LIMIT) : []
  } catch {
    return []
  }
}

function recordEvidence(items: AppetiteEvidence[]) {
  if (typeof window === 'undefined' || items.length === 0) return
  const next = [...safeReadEvidence(), ...items].slice(-EVIDENCE_LIMIT)
  window.localStorage.setItem(EVIDENCE_KEY, JSON.stringify(next))
}

function matchingTagId(field: 'craving' | 'dietary' | 'budget' | 'intent', value: string | null) {
  if (!value) return null
  const normalized = value.trim().toLowerCase()
  return APPETITE_TAGS.find((tag) => tag.discovery?.[field]?.toLowerCase() === normalized)?.id ?? null
}

function querySignals(searchParams: URLSearchParams): AppetiteSignal[] {
  const appetiteIds = (searchParams.get('appetite') || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
  const lockedIds = new Set(
    (searchParams.get('appetiteLocks') || '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean)
  )

  const signals: AppetiteSignal[] = appetiteIds
    .filter((tagId) => Boolean(getAppetiteTag(tagId)))
    .map((tagId) => ({
      tagId,
      polarity: 'want',
      strength: 0.7,
      confidence: 0.8,
      hardness: 'soft',
      scope: 'session',
      source: 'explicit',
      locked: lockedIds.has(tagId),
    }))

  const cravingTagId = matchingTagId('craving', searchParams.get('craving'))
  if (cravingTagId && !signals.some((signal) => signal.tagId === cravingTagId)) {
    signals.push({
      tagId: cravingTagId,
      polarity: 'want',
      strength: 0.9,
      confidence: 1,
      hardness: 'soft',
      scope: 'session',
      source: 'explicit',
      locked: false,
    })
  }

  const constraints = [
    { tagId: matchingTagId('dietary', searchParams.get('dietary')), hardness: 'hard' as const },
    { tagId: matchingTagId('budget', searchParams.get('budget')), hardness: 'soft' as const },
    { tagId: matchingTagId('intent', searchParams.get('intent')), hardness: 'soft' as const },
  ]

  for (const constraint of constraints) {
    if (!constraint.tagId || signals.some((signal) => signal.tagId === constraint.tagId)) continue
    signals.push({
      tagId: constraint.tagId,
      polarity: 'want',
      strength: 1,
      confidence: 1,
      hardness: constraint.hardness,
      scope: 'session',
      source: 'explicit',
      locked: true,
    })
  }

  return signals
}

function learnedSignals(evidence: AppetiteEvidence[]): AppetiteSignal[] {
  const demand = aggregateAppetiteDemand(evidence)
  if (demand.length === 0) return []

  const maxPositiveScore = Math.max(1, ...demand.map((entry) => Math.max(0, entry.score)))
  return demand
    .filter((entry) => entry.score > 0)
    .slice(0, 24)
    .map((entry) => ({
      tagId: entry.tagId,
      polarity: 'want' as const,
      strength: Math.min(1, entry.score / maxPositiveScore),
      confidence: Math.min(1, 0.4 + entry.evidenceCount * 0.08),
      hardness: 'soft' as const,
      scope: 'learned' as const,
      source: 'behavior' as const,
      locked: false,
    }))
}

export function AppetiteSpinControl() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [mode, setMode] = useState<AppetiteSpinMode>('for_me')
  const [evidence, setEvidence] = useState<AppetiteEvidence[]>([])

  useEffect(() => {
    setEvidence(safeReadEvidence())
  }, [])

  const state = useMemo(
    () =>
      buildAppetiteState([
        ...querySignals(new URLSearchParams(searchParams.toString())),
        ...learnedSignals(evidence),
      ]),
    [evidence, searchParams]
  )

  const visibleSignals = useMemo(
    () =>
      state.signals
        .filter((signal) => signal.scope === 'session' && signal.polarity === 'want')
        .slice(0, 5),
    [state.signals]
  )

  const pushState = useCallback(
    (nextSignals: AppetiteSignal[]) => {
      const params = new URLSearchParams(searchParams.toString())
      const sessionSignals = nextSignals.filter(
        (signal) => signal.scope === 'session' && signal.polarity === 'want'
      )
      const appetiteIds = sessionSignals.map((signal) => signal.tagId)
      const lockedIds = sessionSignals.filter((signal) => signal.locked).map((signal) => signal.tagId)

      if (appetiteIds.length > 0) params.set('appetite', appetiteIds.join(','))
      else params.delete('appetite')
      if (lockedIds.length > 0) params.set('appetiteLocks', lockedIds.join(','))
      else params.delete('appetiteLocks')

      const projection = projectAppetiteStateToDiscovery({ signals: nextSignals })
      if (projection.craving) params.set('craving', projection.craving)
      else params.delete('craving')

      for (const key of ['dietary', 'budget', 'intent', 'eventStyle', 'useCase'] as const) {
        const value = projection[key]
        if (value) params.set(key, value)
      }

      const query = params.toString()
      router.push(query ? '/eat?' + query : '/eat', { scroll: false })
    },
    [router, searchParams]
  )

  const spin = useCallback(() => {
    const next = spinAppetite(state, { mode })
    const generated = next.signals.filter(
      (signal) => signal.scope === 'session' && signal.source === 'system'
    )
    const now = new Date().toISOString()
    const events = generated.map<AppetiteEvidence>((signal) => ({
      tagId: signal.tagId,
      action: 'spin_seen',
      occurredAt: now,
    }))
    recordEvidence(events)
    setEvidence((current) => [...current, ...events].slice(-EVIDENCE_LIMIT))
    pushState(next.signals)
  }, [mode, pushState, state])

  const toggleLock = useCallback(
    (tagId: string) => {
      const nextSignals = state.signals.map((signal) =>
        signal.tagId === tagId && signal.scope === 'session'
          ? { ...signal, locked: !signal.locked }
          : signal
      )
      const locked = Boolean(
        nextSignals.find((signal) => signal.tagId === tagId && signal.scope === 'session')?.locked
      )
      const event: AppetiteEvidence = {
        tagId,
        action: locked ? 'lock' : 'unlock',
        occurredAt: new Date().toISOString(),
      }
      recordEvidence([event])
      setEvidence((current) => [...current, event].slice(-EVIDENCE_LIMIT))
      pushState(nextSignals)
    },
    [pushState, state.signals]
  )

  return (
    <section
      className="rounded-2xl border border-stone-800 bg-stone-950/80 p-4"
      aria-labelledby="appetite-spin-heading"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p
            id="appetite-spin-heading"
            className="inline-flex items-center gap-2 text-sm font-semibold text-stone-100"
          >
            <Sparkles className="h-4 w-4 text-brand-300" />
            What sounds good?
          </p>
          <p className="mt-1 text-xs text-stone-500">
            Spin a direction, then lock anything you want to keep.
          </p>
        </div>

        <div
          className="inline-flex rounded-full border border-stone-800 bg-stone-900 p-1"
          role="group"
          aria-label="Appetite spin mode"
        >
          {(Object.keys(MODE_LABELS) as AppetiteSpinMode[]).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setMode(value)}
              aria-pressed={mode === value}
              className={[
                'min-h-10 rounded-full px-3 text-xs font-medium transition-colors',
                mode === value
                  ? 'bg-stone-700 text-stone-100'
                  : 'text-stone-400 hover:text-stone-200',
              ].join(' ')}
            >
              {MODE_LABELS[value]}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 flex min-h-11 flex-wrap items-center gap-2">
        {visibleSignals.length > 0 ? (
          visibleSignals.map((signal) => (
            <button
              key={signal.tagId}
              type="button"
              onClick={() => toggleLock(signal.tagId)}
              aria-pressed={Boolean(signal.locked)}
              title={signal.locked ? 'Unlock this appetite tag' : 'Lock this appetite tag'}
              className={[
                'inline-flex min-h-10 items-center gap-2 rounded-full border px-3 text-sm transition-colors',
                signal.locked
                  ? 'border-brand-600 bg-brand-600/15 text-brand-100'
                  : 'border-stone-700 bg-stone-900 text-stone-300 hover:border-stone-600',
              ].join(' ')}
            >
              <span>{getAppetiteTag(signal.tagId)?.label ?? signal.tagId}</span>
              {signal.locked ? (
                <Lock className="h-3.5 w-3.5" />
              ) : (
                <LockOpen className="h-3.5 w-3.5" />
              )}
            </button>
          ))
        ) : (
          <span className="text-sm text-stone-500">No direction yet. Spin to start.</span>
        )}
      </div>

      <button
        type="button"
        onClick={spin}
        className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-500 sm:w-auto"
      >
        <Shuffle className="h-4 w-4" />
        Spin appetite
      </button>
    </section>
  )
}
