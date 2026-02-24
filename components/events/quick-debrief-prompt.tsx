'use client'

// Quick Debrief Prompt — 3-question card that appears on recently-completed events
// before the chef files a full AAR. Captures immediate impressions while fresh.
// Submits to the AAR create action with partial data.

import { useState } from 'react'
import { createAAR } from '@/lib/aar/actions'

interface Props {
  eventId: string
  hasAAR: boolean
  completedAt: string | null
}

export function QuickDebriefPrompt({ eventId, hasAAR, completedAt }: Props) {
  const [dismissed, setDismissed] = useState(false)
  const [step, setStep] = useState<'idle' | 'submitting' | 'done'>('idle')

  // Only show within 48 hours of completion and if no AAR yet
  if (hasAAR || dismissed) return null
  if (!completedAt) return null
  const hoursSinceCompletion = (Date.now() - new Date(completedAt).getTime()) / 3600000
  if (hoursSinceCompletion > 48) return null

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setStep('submitting')

    const fd = new FormData(e.currentTarget)
    const energyRating = parseInt(fd.get('energy') as string, 10)
    const wentWell = (fd.get('wentWell') as string).trim()
    const doDifferently = (fd.get('doDifferently') as string).trim()

    try {
      await createAAR({
        event_id: eventId,
        calm_rating: energyRating,
        preparation_rating: energyRating, // Rough proxy
        what_went_well: wentWell || undefined,
        would_do_differently: doDifferently || undefined,
        general_notes: 'Quick debrief — file full AAR later',
      })
      setStep('done')
    } catch {
      setStep('idle')
    }
  }

  if (step === 'done') {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-950 px-4 py-3 flex items-center gap-3">
        <span className="text-emerald-600 text-lg">✅</span>
        <div>
          <p className="text-sm font-semibold text-emerald-900">Debrief saved!</p>
          <p className="text-xs text-emerald-700">
            File a full Event Review when you have a moment.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-950 p-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <p className="text-sm font-semibold text-amber-900">Quick Debrief — while it's fresh</p>
          <p className="text-xs text-amber-700 mt-0.5">3 quick questions before you move on.</p>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-amber-400 hover:text-amber-600 text-sm shrink-0 mt-0.5"
          aria-label="Dismiss"
        >
          ✕
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Q1: Energy/calm rating */}
        <div>
          <label className="text-xs font-medium text-amber-900 block mb-1.5">
            How was your energy / calm level during service?
          </label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <label key={n} className="flex flex-col items-center gap-0.5 cursor-pointer">
                <input type="radio" name="energy" value={n} required className="sr-only peer" />
                <span className="text-lg peer-checked:scale-125 transition-transform">
                  {['😓', '😐', '🙂', '😊', '🤩'][n - 1]}
                </span>
                <span className="text-[10px] text-amber-700">{n}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Q2: What went best */}
        <div>
          <label className="text-xs font-medium text-amber-900 block mb-1">
            One thing that went really well?
          </label>
          <input
            name="wentWell"
            placeholder="e.g. The risotto timing was perfect"
            className="w-full text-sm border border-amber-200 bg-surface rounded px-2.5 py-1.5 focus:outline-none focus:border-amber-400"
          />
        </div>

        {/* Q3: What to do differently */}
        <div>
          <label className="text-xs font-medium text-amber-900 block mb-1">
            One thing you'd do differently?
          </label>
          <input
            name="doDifferently"
            placeholder="e.g. Prep the sauce 30 min earlier"
            className="w-full text-sm border border-amber-200 bg-surface rounded px-2.5 py-1.5 focus:outline-none focus:border-amber-400"
          />
        </div>

        <button
          type="submit"
          disabled={step === 'submitting'}
          className="w-full text-sm font-medium py-2 rounded-md bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50 transition-colors"
        >
          {step === 'submitting' ? 'Saving…' : 'Save Quick Debrief'}
        </button>
      </form>
    </div>
  )
}
