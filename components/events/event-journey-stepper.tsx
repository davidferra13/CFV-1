'use client'

// Event Journey Stepper
// Visual 12-stage timeline showing the client's full journey.
// Responsive: horizontal scrollable on desktop, vertical on mobile.
// Supports action CTAs on active steps and social sharing on milestone steps.

import { toast } from 'sonner'
import { Check, Share2 } from '@/components/ui/icons'
import { format, parseISO } from 'date-fns'
import Link from 'next/link'
import type { JourneyStep } from '@/lib/events/journey-steps'

function ShareButton({ shareText, label }: { shareText: string; label: string }) {
  const handleShare = async () => {
    const shareData = { text: shareText }
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share(shareData)
      } catch {
        // User cancelled share - no-op
      }
    } else {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(shareText)
        toast.success('Copied to clipboard')
      } catch {
        toast.error('Failed to copy')
      }
    }
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      title={`Share: ${label}`}
      className="inline-flex items-center gap-1 text-[10px] font-medium text-stone-400 hover:text-brand-600 transition-colors mt-1"
    >
      <Share2 className="w-3 h-3" />
      Share
    </button>
  )
}

export function EventJourneyStepper({ steps }: { steps: JourneyStep[] }) {
  if (steps.length === 0) return null

  return (
    <>
      {/* ── Desktop: horizontal scrollable stepper ───────────────────────── */}
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
                        : 'bg-stone-900 border-stone-600 text-stone-300'
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
                    step.isFuture
                      ? 'text-stone-400'
                      : step.isCurrent
                        ? 'text-brand-400'
                        : 'text-stone-300'
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

                {/* CTA action for current step */}
                {step.isCurrent && step.actionHref && step.actionLabel && (
                  <Link
                    href={step.actionHref}
                    className="mt-1.5 inline-block text-[10px] font-semibold text-white bg-brand-600 hover:bg-brand-700 px-2 py-0.5 rounded-full transition-colors text-center whitespace-nowrap"
                  >
                    {step.actionLabel}
                  </Link>
                )}

                {/* Share button for milestone steps that are completed */}
                {step.isMilestone && step.completedAt && step.shareText && (
                  <ShareButton shareText={step.shareText} label={step.label} />
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
                        : 'bg-stone-700'
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
                      ? 'bg-brand-600 border-brand-600 text-white animate-pulse'
                      : 'bg-stone-900 border-stone-600 text-stone-300'
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
                      : steps[i + 1].isCurrent
                        ? 'bg-brand-400'
                        : 'bg-stone-700'
                  }`}
                />
              )}
            </div>

            {/* Content */}
            <div className={`pb-4 flex-1 min-w-0 ${i === steps.length - 1 ? 'pb-0' : ''}`}>
              <p
                className={`text-sm font-medium ${
                  step.isFuture
                    ? 'text-stone-400'
                    : step.isCurrent
                      ? 'text-brand-400'
                      : 'text-stone-200'
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

              {/* CTA for current step */}
              {step.isCurrent && step.actionHref && step.actionLabel && (
                <Link
                  href={step.actionHref}
                  className="inline-flex items-center mt-2 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 px-3 py-1.5 rounded-lg transition-colors"
                >
                  {step.actionLabel} →
                </Link>
              )}

              {/* Share button for completed milestones */}
              {step.isMilestone && step.completedAt && step.shareText && (
                <div className="mt-1">
                  <ShareButton shareText={step.shareText} label={step.label} />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
