'use client'

import { useState, useTransition } from 'react'
import { createHubPoll } from '@/lib/hub/poll-actions'

interface HubCreatePollProps {
  groupId: string
  profileToken: string
  onCreated?: () => void
  onCancel?: () => void
}

export function HubCreatePoll({ groupId, profileToken, onCreated, onCancel }: HubCreatePollProps) {
  const [question, setQuestion] = useState('')
  const [options, setOptions] = useState(['', ''])
  const [pollType, setPollType] = useState<'single_choice' | 'multi_choice' | 'ranked_choice'>(
    'single_choice'
  )
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const addOption = () => {
    if (options.length >= 10) return
    setOptions([...options, ''])
  }

  const removeOption = (index: number) => {
    if (options.length <= 2) return
    setOptions(options.filter((_, i) => i !== index))
  }

  const updateOption = (index: number, value: string) => {
    setOptions(options.map((o, i) => (i === index ? value : o)))
  }

  const handleSubmit = () => {
    const trimmedQuestion = question.trim()
    const trimmedOptions = options.map((o) => o.trim()).filter(Boolean)

    if (!trimmedQuestion) {
      setError('Enter a question')
      return
    }
    if (trimmedOptions.length < 2) {
      setError('Add at least 2 options')
      return
    }

    setError(null)
    startTransition(async () => {
      try {
        await createHubPoll({
          groupId,
          profileToken,
          question: trimmedQuestion,
          poll_type: pollType,
          options: trimmedOptions.map((label) => ({ label })),
        })
        onCreated?.()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create poll')
      }
    })
  }

  return (
    <div className="border-t border-stone-700 bg-stone-900/90 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-sm font-semibold text-stone-200">Create a Poll</h4>
        <button
          type="button"
          onClick={onCancel}
          className="text-xs text-stone-500 hover:text-stone-300"
        >
          Cancel
        </button>
      </div>

      {error && (
        <div className="mb-3 rounded-lg border border-red-900/30 bg-red-900/20 px-3 py-2 text-xs text-red-300">
          {error}
        </div>
      )}

      {/* Question */}
      <input
        type="text"
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder="Ask a question..."
        maxLength={300}
        className="mb-3 w-full rounded-lg bg-stone-800 px-3 py-2 text-sm text-stone-200 ring-1 ring-stone-700 placeholder-stone-500 focus:outline-none focus:ring-[var(--hub-primary,#e88f47)]"
      />

      {/* Options */}
      <div className="mb-3 space-y-2">
        {options.map((opt, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              type="text"
              value={opt}
              onChange={(e) => updateOption(i, e.target.value)}
              placeholder={`Option ${i + 1}`}
              maxLength={200}
              className="flex-1 rounded-lg bg-stone-800 px-3 py-1.5 text-sm text-stone-200 ring-1 ring-stone-700 placeholder-stone-500 focus:outline-none focus:ring-[var(--hub-primary,#e88f47)]"
            />
            {options.length > 2 && (
              <button
                type="button"
                onClick={() => removeOption(i)}
                className="rounded p-1 text-stone-500 hover:text-red-400"
                title="Remove option"
              >
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        ))}
        {options.length < 10 && (
          <button
            type="button"
            onClick={addOption}
            className="text-xs text-[var(--hub-primary,#e88f47)] hover:underline"
          >
            + Add option
          </button>
        )}
      </div>

      {/* Poll type toggle */}
      <div className="mb-4 flex items-center gap-3">
        <label className="flex items-center gap-1.5 text-xs text-stone-400">
          <input
            type="radio"
            name="pollType"
            checked={pollType === 'single_choice'}
            onChange={() => setPollType('single_choice')}
            className="accent-[#e88f47]"
          />
          Single choice
        </label>
        <label className="flex items-center gap-1.5 text-xs text-stone-400">
          <input
            type="radio"
            name="pollType"
            checked={pollType === 'multi_choice'}
            onChange={() => setPollType('multi_choice')}
            className="accent-[#e88f47]"
          />
          Multiple choice
        </label>
        <label className="flex items-center gap-1.5 text-xs text-stone-400">
          <input
            type="radio"
            name="pollType"
            checked={pollType === 'ranked_choice'}
            onChange={() => setPollType('ranked_choice')}
            className="accent-[#e88f47]"
          />
          Ranked choice
        </label>
      </div>

      {/* Submit */}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={isPending}
        className="w-full rounded-lg bg-[var(--hub-primary,#e88f47)] py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {isPending ? 'Creating...' : 'Create Poll'}
      </button>
    </div>
  )
}
