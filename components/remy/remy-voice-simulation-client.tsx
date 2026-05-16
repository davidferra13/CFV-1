'use client'

import { useMemo, useState } from 'react'
import { AlertTriangle, Check, FlaskConical, Mic, X } from '@/components/ui/icons'
import {
  deriveVoiceMemoDraftCards,
  type RemyHubWorkload,
  type VoiceMemoDraftCard,
} from '@/lib/remy/operating-hub'

export function RemyVoiceMemoIntake() {
  const [transcript, setTranscript] = useState('')
  const [decisions, setDecisions] = useState<Record<string, VoiceMemoDraftCard['status']>>({})
  const cards = useMemo(() => deriveVoiceMemoDraftCards(transcript), [transcript])

  return (
    <section className="rounded-lg border border-stone-800 bg-stone-950 p-4">
      <div className="flex items-center gap-2">
        <Mic className="h-4 w-4 text-brand-400" />
        <h2 className="text-base font-semibold text-stone-100">Voice Memo Intake</h2>
      </div>
      <p className="mt-1 text-sm text-stone-400">
        Paste a transcript. Remy structures draft cards locally; nothing is sent, saved, or applied
        here.
      </p>
      <textarea
        value={transcript}
        onChange={(event) => setTranscript(event.target.value)}
        className="mt-4 min-h-28 w-full rounded-md border border-stone-800 bg-stone-900 p-3 text-sm text-stone-100 outline-none focus:border-brand-500"
        placeholder="Example: Remember that Maya is allergic to shellfish. Draft a task to follow up about Friday's deposit."
      />
      <div className="mt-4 grid gap-3">
        {cards.length === 0 ? (
          <div className="rounded-md border border-dashed border-stone-800 p-3 text-sm text-stone-500">
            No transcript yet. Draft cards will appear here with safety, payment, and status changes
            flagged for review.
          </div>
        ) : (
          cards.map((card) => {
            const status = decisions[card.id] ?? card.status
            return (
              <article
                key={card.id}
                className="rounded-md border border-stone-800 bg-stone-900 p-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-stone-100">{card.title}</p>
                    <p className="mt-1 text-sm text-stone-400">{card.detail}</p>
                  </div>
                  <span className={badgeClass(card.sensitivity)}>{card.sensitivity}</span>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setDecisions((prev) => ({ ...prev, [card.id]: 'approved_locally' }))
                    }
                    className="inline-flex items-center gap-1 rounded-md border border-emerald-900/60 px-2 py-1 text-xs text-emerald-300 hover:bg-emerald-950"
                  >
                    <Check className="h-3.5 w-3.5" />
                    Approve draft
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setDecisions((prev) => ({ ...prev, [card.id]: 'rejected_locally' }))
                    }
                    className="inline-flex items-center gap-1 rounded-md border border-rose-900/60 px-2 py-1 text-xs text-rose-300 hover:bg-rose-950"
                  >
                    <X className="h-3.5 w-3.5" />
                    Reject
                  </button>
                  <span className="text-xs text-stone-500">
                    Status: {status.replace(/_/g, ' ')}
                  </span>
                </div>
              </article>
            )
          })
        )}
      </div>
    </section>
  )
}

export function RemySimulationMode({ workload }: { workload: RemyHubWorkload }) {
  const [events, setEvents] = useState(1)
  const [guests, setGuests] = useState(12)
  const [prepHours, setPrepHours] = useState(5)
  const baseline = workload.score ?? 0
  const simulatedScore = Math.min(
    100,
    baseline + events * 18 + Math.round(guests / 2) + prepHours * 4
  )
  const risk =
    simulatedScore >= 85
      ? 'overloaded'
      : simulatedScore >= 60
        ? 'heavy'
        : simulatedScore >= 30
          ? 'steady'
          : 'open'

  return (
    <section className="rounded-lg border border-stone-800 bg-stone-950 p-4">
      <div className="flex items-center gap-2">
        <FlaskConical className="h-4 w-4 text-brand-400" />
        <h2 className="text-base font-semibold text-stone-100">Simulation Mode</h2>
      </div>
      <p className="mt-1 text-sm text-stone-400">
        Simulated only. It never writes canonical records or approves Remy actions.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <NumberField label="Events" value={events} setValue={setEvents} min={0} max={8} />
        <NumberField label="Guests" value={guests} setValue={setGuests} min={0} max={120} />
        <NumberField
          label="Prep hours"
          value={prepHours}
          setValue={setPrepHours}
          min={0}
          max={40}
        />
      </div>
      <div className="mt-4 rounded-md border border-amber-900/60 bg-amber-950/30 p-3">
        <div className="flex items-center gap-2 text-sm font-medium text-amber-200">
          <AlertTriangle className="h-4 w-4" />
          Simulated workload: {risk}
        </div>
        <p className="mt-1 text-sm text-amber-100/80">
          Score {simulatedScore}/100 from current visible workload plus editable assumptions.
          Convert this into a task or proposal only through the normal approval flow.
        </p>
      </div>
    </section>
  )
}

function NumberField({
  label,
  value,
  setValue,
  min,
  max,
}: {
  label: string
  value: number
  setValue: (value: number) => void
  min: number
  max: number
}) {
  return (
    <label className="text-xs font-medium text-stone-400">
      {label}
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(event) => setValue(Number(event.target.value))}
        className="mt-1 w-full rounded-md border border-stone-800 bg-stone-900 px-3 py-2 text-sm text-stone-100"
      />
    </label>
  )
}

function badgeClass(value: VoiceMemoDraftCard['sensitivity']): string {
  if (value === 'safety')
    return 'rounded-full bg-red-950 px-2 py-1 text-xs font-medium text-red-200'
  if (value === 'payment')
    return 'rounded-full bg-amber-950 px-2 py-1 text-xs font-medium text-amber-200'
  if (value === 'status')
    return 'rounded-full bg-blue-950 px-2 py-1 text-xs font-medium text-blue-200'
  return 'rounded-full bg-stone-800 px-2 py-1 text-xs font-medium text-stone-300'
}
