'use client'

// Event Journey Stepper
// Visual timeline showing the client's full journey from inquiry to post-event.
// Responsive: horizontal on desktop (md+), vertical on mobile.

import { Check } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import type { JourneyStep } from '@/lib/events/journey-steps'

export function EventJourneyStepper({ steps }: { steps: JourneyStep[] }) {
  if (steps.length === 0) return null

  return (
    <>
      {/* ── Desktop: horizontal stepper ─────────────────────────────────── */}
      <div className="hidden md:block overflow-x-auto pb-2">
        <div className="flex items-start min-w-max gap-0">
          {steps.map((step, i) => (
            <div key={step.key} className="flex items-start">
              {/* Step node + label */}
              <div className="flex flex-col items-center w-28 px-1">
                {/* Circle */}
                <div
                  className={`flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all flex-shrink-0 ${
                    step.completedAt && !step.isFuture
                      ? 'bg-emerald-500 border-emerald-500 text-white'
                      : step.isCurrent
                      ? 'bg-brand-600 border-brand-600 text-white animate-pulse'
                      : 'bg-white border-stone-300 text-stone-300'
                  }`}
                >
                  {step.completedAt && !step.isFuture ? (
                    <Check className="w-4 h-4" strokeWidth={3} />
                  ) : (
                    <span className="w-2.5 h-2.5 rounded-full bg-current" />
                  )}
                </div>

                {/* Label */}
                <p
                  className={`mt-2 text-xs font-medium text-center leading-tight ${
                    step.isFuture ? 'text-stone-400' : 'text-stone-700'
                  }`}
                >
                  {step.label}
                </p>

                {/* Timestamp */}
                {step.completedAt && (
                  <p className="mt-0.5 text-[10px] text-stone-400 text-center">
                    {format(parseISO(step.completedAt), 'MMM d')}
                  </p>
                )}
              </div>

              {/* Connector line between steps */}
              {i < steps.length - 1 && (
                <div
                  className={`flex-shrink-0 h-0.5 w-6 mt-4 mx-0 ${
                    steps[i + 1].completedAt && !steps[i + 1].isFuture
                      ? 'bg-emerald-400'
                      : steps[i + 1].isCurrent
                      ? 'bg-brand-400'
                      : 'bg-stone-200'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Mobile: vertical stepper ─────────────────────────────────────── */}
      <div className="md:hidden space-y-0">
        {steps.map((step, i) => (
          <div key={step.key} className="flex gap-3">
            {/* Column: circle + line */}
            <div className="flex flex-col items-center">
              <div
                className={`flex items-center justify-center w-7 h-7 rounded-full border-2 flex-shrink-0 mt-0.5 ${
                  step.completedAt && !step.isFuture
                    ? 'bg-emerald-500 border-emerald-500 text-white'
                    : step.isCurrent
                    ? 'bg-brand-600 border-brand-600 text-white'
                    : 'bg-white border-stone-300 text-stone-300'
                }`}
              >
                {step.completedAt && !step.isFuture ? (
                  <Check className="w-3.5 h-3.5" strokeWidth={3} />
                ) : (
                  <span className="w-2 h-2 rounded-full bg-current" />
                )}
              </div>
              {i < steps.length - 1 && (
                <div
                  className={`w-0.5 flex-1 min-h-[24px] mt-1 mb-0 ${
                    steps[i + 1].completedAt && !steps[i + 1].isFuture
                      ? 'bg-emerald-300'
                      : 'bg-stone-200'
                  }`}
                />
              )}
            </div>

            {/* Content */}
            <div className={`pb-4 flex-1 min-w-0 ${i === steps.length - 1 ? 'pb-0' : ''}`}>
              <p
                className={`text-sm font-medium ${
                  step.isFuture ? 'text-stone-400' : 'text-stone-800'
                }`}
              >
                {step.label}
              </p>
              {!step.isFuture && (
                <p className="text-xs text-stone-500 mt-0.5 leading-snug">{step.description}</p>
              )}
              {step.completedAt && (
                <p className="text-[11px] text-stone-400 mt-0.5">
                  {format(parseISO(step.completedAt), 'MMMM d, yyyy')}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
