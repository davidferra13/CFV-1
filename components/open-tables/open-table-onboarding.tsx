'use client'

import { useState, useTransition } from 'react'
import { markOpenTablesIntroSeen } from '@/lib/hub/open-table-actions'

interface Props {
  onClose: () => void
}

export function OpenTableOnboarding({ onClose }: Props) {
  const [step, setStep] = useState(0)
  const [isPending, startTransition] = useTransition()

  function handleComplete(interested: boolean) {
    startTransition(async () => {
      try {
        await markOpenTablesIntroSeen(interested)
      } catch {
        // Non-blocking
      }
      onClose()
    })
  }

  const steps = [
    // Step 1: The Story
    {
      title: 'Better together',
      body: 'Your chef connects people who love great food. Sometimes the best dinner parties happen when two groups come together.',
      visual: (
        <div className="flex items-center justify-center gap-3 py-6">
          <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center text-2xl">
            🍽
          </div>
          <div className="text-2xl text-stone-500">+</div>
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center text-2xl">
            🍽
          </div>
          <div className="text-2xl text-stone-500">=</div>
          <div className="w-20 h-20 rounded-full bg-brand-500/20 flex items-center justify-center text-3xl">
            🎉
          </div>
        </div>
      ),
    },
    // Step 2: The Scenario
    {
      title: 'How it works',
      body: "Imagine you're hosting a Halloween dinner for 6. Another group of 4 is looking for the same thing. Your chef knows you'd love each other. Open Tables makes that introduction happen.",
      visual: (
        <div className="bg-stone-700/50 border border-stone-600 rounded-xl p-4 my-4">
          <div className="flex items-start justify-between">
            <div>
              <h4 className="text-stone-100 font-medium">Halloween Dinner</h4>
              <p className="text-xs text-stone-400">Back Bay, Boston</p>
            </div>
            <span className="text-xs px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-full">
              4 open seats
            </span>
          </div>
          <div className="flex gap-1.5 mt-2">
            <span className="text-xs px-2 py-0.5 bg-stone-600 text-stone-300 rounded-full">
              casual
            </span>
            <span className="text-xs px-2 py-0.5 bg-stone-600 text-stone-300 rounded-full">
              21+
            </span>
          </div>
        </div>
      ),
    },
    // Step 3: The Control
    {
      title: "You're in control",
      body: 'Your table is private unless you choose otherwise. If you open it, you pick exactly what people see. And your chef approves every request before anyone meets.',
      visual: (
        <div className="space-y-2 my-4">
          <div className="flex items-center gap-3 p-3 bg-stone-700/50 rounded-lg">
            <div className="w-5 h-5 rounded border-2 border-emerald-500 flex items-center justify-center">
              <div className="w-2.5 h-2.5 bg-emerald-500 rounded-sm" />
            </div>
            <span className="text-sm text-stone-200">Your circle's name and vibe</span>
          </div>
          <div className="flex items-center gap-3 p-3 bg-stone-700/50 rounded-lg">
            <div className="w-5 h-5 rounded border-2 border-emerald-500 flex items-center justify-center">
              <div className="w-2.5 h-2.5 bg-emerald-500 rounded-sm" />
            </div>
            <span className="text-sm text-stone-200">General area (never your address)</span>
          </div>
          <div className="flex items-center gap-3 p-3 bg-stone-700/50 rounded-lg">
            <div className="w-5 h-5 rounded border-2 border-red-400 flex items-center justify-center" />
            <span className="text-sm text-stone-400 line-through">Your name or contact info</span>
          </div>
          <div className="flex items-center gap-3 p-3 bg-stone-700/50 rounded-lg">
            <div className="w-5 h-5 rounded border-2 border-red-400 flex items-center justify-center" />
            <span className="text-sm text-stone-400 line-through">Your exact location</span>
          </div>
          <p className="text-xs text-stone-400 text-center mt-2">Your chef reviews every request</p>
        </div>
      ),
    },
  ]

  const currentStep = steps[step]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-stone-800 border border-stone-700 rounded-2xl max-w-md w-full p-6 shadow-2xl">
        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-6">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-colors ${
                i === step ? 'bg-brand-500' : i < step ? 'bg-brand-500/50' : 'bg-stone-600'
              }`}
            />
          ))}
        </div>

        <h2 className="text-xl font-display text-stone-100 text-center mb-2">
          {currentStep.title}
        </h2>
        <p className="text-sm text-stone-300 text-center">{currentStep.body}</p>

        {currentStep.visual}

        <div className="flex gap-3 mt-6">
          {step < steps.length - 1 ? (
            <>
              <button
                onClick={() => handleComplete(false)}
                className="flex-1 px-4 py-2.5 bg-stone-700 text-stone-300 rounded-lg text-sm hover:bg-stone-600 transition-colors"
              >
                Skip
              </button>
              <button
                onClick={() => setStep(step + 1)}
                className="flex-1 px-4 py-2.5 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-500 transition-colors"
              >
                Next
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => handleComplete(false)}
                disabled={isPending}
                className="flex-1 px-4 py-2.5 bg-stone-700 text-stone-200 rounded-lg text-sm font-medium hover:bg-stone-600 transition-colors"
              >
                Keep my table private
              </button>
              <button
                onClick={() => handleComplete(true)}
                disabled={isPending}
                className="flex-1 px-4 py-2.5 bg-brand-600/80 text-white rounded-lg text-sm hover:bg-brand-500 transition-colors"
              >
                Sounds fun!
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
