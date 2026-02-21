'use client'

import { useState, useTransition } from 'react'
import { submitCheckin } from '@/lib/professional/growth-checkin-actions'
import { Button } from '@/components/ui/button'

export function GrowthCheckinModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0)
  const [isPending, startTransition] = useTransition()
  const [satisfaction, setSatisfaction] = useState(7)
  const [learned, setLearned] = useState('')
  const [draining, setDraining] = useState('')
  const [goal, setGoal] = useState('')
  const [trackRequest, setTrackRequest] = useState('')
  const [done, setDone] = useState(false)

  function handleSubmit() {
    startTransition(async () => {
      await submitCheckin({
        satisfaction_score: satisfaction,
        learned_this_quarter: learned || undefined,
        draining_this_quarter: draining || undefined,
        goal_next_quarter: goal || undefined,
        track_request: trackRequest || undefined,
      })
      setDone(true)
    })
  }

  const questions = [
    { label: 'How satisfied are you with your chef career right now?', type: 'slider' as const },
    {
      label: "What's one thing you learned or got better at this quarter?",
      type: 'textarea' as const,
      value: learned,
      setter: setLearned,
    },
    {
      label: "What's been draining your energy lately?",
      type: 'textarea' as const,
      value: draining,
      setter: setDraining,
    },
    {
      label: "What's your #1 goal for next quarter?",
      type: 'textarea' as const,
      value: goal,
      setter: setGoal,
    },
    {
      label: "Is there anything you'd like your business system to track differently?",
      type: 'textarea' as const,
      value: trackRequest,
      setter: setTrackRequest,
    },
  ]

  if (done) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg p-8 max-w-md w-full text-center">
          <p className="text-lg font-medium text-stone-900 mb-2">Check-in saved!</p>
          <p className="text-sm text-stone-500 mb-4">See you in 3 months.</p>
          <Button onClick={onClose}>Close</Button>
        </div>
      </div>
    )
  }

  const q = questions[step]

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg p-6 max-w-lg w-full">
        <p className="text-xs text-stone-400 mb-4">
          Question {step + 1} of {questions.length}
        </p>
        <p className="text-lg font-medium text-stone-900 mb-4">{q.label}</p>

        {q.type === 'slider' ? (
          <div className="space-y-3">
            <input
              type="range"
              min={1}
              max={10}
              value={satisfaction}
              onChange={(e) => setSatisfaction(Number(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-stone-500">
              <span>1 — Struggling</span>
              <span className="text-lg font-bold text-stone-900">{satisfaction}</span>
              <span>10 — Thriving</span>
            </div>
          </div>
        ) : (
          <textarea
            value={q.value}
            onChange={(e) => q.setter(e.target.value)}
            rows={4}
            className="w-full border border-stone-300 rounded px-3 py-2 text-sm"
            placeholder="Take your time..."
          />
        )}

        <div className="flex justify-between mt-6">
          {step > 0 ? (
            <Button variant="ghost" onClick={() => setStep(step - 1)}>
              Back
            </Button>
          ) : (
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
          )}
          {step < questions.length - 1 ? (
            <Button onClick={() => setStep(step + 1)}>Next</Button>
          ) : (
            <Button onClick={handleSubmit} disabled={isPending}>
              {isPending ? 'Submitting...' : 'Submit'}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
