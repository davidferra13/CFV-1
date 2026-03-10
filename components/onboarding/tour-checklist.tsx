'use client'

// TourChecklist - Floating persistent checklist
// Shows remaining onboarding steps with completion status.
// Collapsible, dismissible, with progress bar.

import { useState, useCallback } from 'react'
import { useTour } from './tour-provider'
import { Button } from '@/components/ui/button'
import { CheckCircle2, Circle, ChevronDown, ChevronUp, X } from '@/components/ui/icons'

export function TourChecklist() {
  const tour = useTour()
  const [isCollapsed, setIsCollapsed] = useState(false)

  const handleStepClick = useCallback(
    (stepId: string) => {
      tour.startTour(stepId)
    },
    [tour]
  )

  if (!tour.showChecklist) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 max-h-[80vh] bg-stone-900 border border-stone-700 rounded-xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-300">
      {/* Header */}
      <div className="px-4 py-3 bg-stone-800 border-b border-stone-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-brand-500" />
          <span className="text-sm font-semibold text-stone-200">Getting Started</span>
          <span className="text-xs text-stone-400 bg-stone-700 px-2 py-0.5 rounded-full">
            {tour.completedCount}/{tour.totalSteps}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 text-stone-400 hover:text-stone-200 rounded transition-colors"
            aria-label={isCollapsed ? 'Expand checklist' : 'Collapse checklist'}
          >
            {isCollapsed ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          <button
            onClick={tour.dismissChecklist}
            className="p-1 text-stone-400 hover:text-stone-200 rounded transition-colors"
            aria-label="Dismiss checklist"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-stone-800">
        <div
          className="h-full bg-brand-500 transition-all duration-500"
          style={{ width: `${tour.progressPercent}%` }}
        />
      </div>

      {/* Steps */}
      {!isCollapsed && (
        <div className="max-h-80 overflow-y-auto">
          <ul className="py-2">
            {tour.config.steps.map((step) => {
              const isDone = tour.completedSteps.has(step.id)
              return (
                <li key={step.id}>
                  <button
                    onClick={() => handleStepClick(step.id)}
                    className={`w-full text-left px-4 py-2.5 flex items-start gap-3 hover:bg-stone-800 transition-colors ${
                      isDone ? 'opacity-60' : ''
                    }`}
                  >
                    {isDone ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                    ) : (
                      <Circle className="h-5 w-5 text-stone-500 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="min-w-0">
                      <p
                        className={`text-sm font-medium ${
                          isDone ? 'text-stone-500 line-through' : 'text-stone-200'
                        }`}
                      >
                        {step.title}
                      </p>
                      <p className="text-xs text-stone-400 mt-0.5 line-clamp-2">
                        {step.description}
                      </p>
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-stone-700">
            <Button variant="ghost" onClick={tour.startTour} className="w-full text-xs">
              Take the Guided Tour
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
