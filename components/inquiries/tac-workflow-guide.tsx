// TakeAChef Workflow Guide — collapsible 4-step overview shown on TAC inquiry detail pages.
// Dismissible per-inquiry via localStorage. Helps chefs understand the full TakeAChef flow.
'use client'

import { useState, useEffect } from 'react'

const STORAGE_KEY = 'chefflow:tac-workflow-guide-dismissed'

interface TacWorkflowGuideProps {
  inquiryStatus: string
}

const STEPS = [
  {
    number: '1',
    label: 'Lead arrives',
    detail: 'Address it — send your initial menu on TakeAChef, or decline',
    activeStatuses: ['new'],
  },
  {
    number: '2',
    label: 'Conversation on TakeAChef',
    detail: 'Message back and forth, then paste the conversation here so you never lose it',
    activeStatuses: ['awaiting_chef', 'awaiting_client', 'quoted'],
  },
  {
    number: '3',
    label: 'Booking confirms',
    detail: 'We auto-create the event with all the details from the booking email',
    activeStatuses: ['confirmed'],
  },
  {
    number: '4',
    label: 'Build the final menu',
    detail: 'The TakeAChef menu was a door-opener — now create the real one for the event',
    activeStatuses: ['confirmed'],
  },
]

export function TacWorkflowGuide({ inquiryStatus }: TacWorkflowGuideProps) {
  const [dismissed, setDismissed] = useState(true)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) !== '1') {
        setDismissed(false)
      }
    } catch {
      setDismissed(false)
    }
  }, [])

  if (dismissed) return null

  const handleDismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, '1')
    } catch {}
    setDismissed(true)
  }

  return (
    <div className="rounded-lg border border-blue-200 bg-blue-950/50 px-3 py-2">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1.5 text-xs font-medium text-blue-700 hover:text-blue-900"
        >
          <span className="text-blue-400">{expanded ? '▾' : '▸'}</span>
          How TakeAChef inquiries work in ChefFlow
        </button>
        <button
          type="button"
          onClick={handleDismiss}
          className="text-blue-400 hover:text-blue-600 text-sm leading-none"
          aria-label="Dismiss"
        >
          &times;
        </button>
      </div>

      {expanded && (
        <div className="mt-2 space-y-1">
          {STEPS.map((step) => {
            const isActive = step.activeStatuses.includes(inquiryStatus)
            return (
              <div
                key={step.number}
                className={`flex items-start gap-2 rounded px-2 py-1 ${
                  isActive ? 'bg-blue-900/60' : ''
                }`}
              >
                <span
                  className={`shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    isActive ? 'bg-blue-600 text-white' : 'bg-blue-200 text-blue-600'
                  }`}
                >
                  {step.number}
                </span>
                <div>
                  <p
                    className={`text-xs font-medium ${isActive ? 'text-blue-900' : 'text-blue-700'}`}
                  >
                    {step.label}
                    {isActive && (
                      <span className="ml-1 text-[10px] text-blue-500">← you are here</span>
                    )}
                  </p>
                  <p className="text-[11px] text-blue-600/80">{step.detail}</p>
                </div>
              </div>
            )
          })}
          <button
            type="button"
            onClick={handleDismiss}
            className="text-[11px] text-blue-500 hover:text-blue-700 underline underline-offset-2 ml-2 mt-1"
          >
            Got it, don't show again
          </button>
        </div>
      )}
    </div>
  )
}
