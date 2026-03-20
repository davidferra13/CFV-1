'use client'

import { useState, useCallback, useEffect } from 'react'
import { useKitchenVoice, KitchenCommand } from '@/lib/hooks/use-kitchen-voice'
import { useKitchenTimers, KitchenTimerDisplay } from './kitchen-timer'
import { toast } from 'sonner'

export interface KitchenStep {
  id: string
  title: string
  description?: string
  completed: boolean
}

interface KitchenModeProps {
  steps: KitchenStep[]
  title?: string
  onStepComplete?: (stepId: string) => void
  onAddNote?: (stepId: string, note: string) => void
  onExit: () => void
}

/**
 * Full-screen kitchen mode overlay.
 * Designed for hands-free operation during service.
 * Large text, high contrast, voice commands.
 *
 * Browser support: Chrome and Edge (Web Speech API).
 * All processing is local. No data leaves the browser.
 */
export function KitchenMode({
  steps,
  title = 'Kitchen Mode',
  onStepComplete,
  onAddNote,
  onExit,
}: KitchenModeProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [localSteps, setLocalSteps] = useState<KitchenStep[]>(steps)
  const [notes, setNotes] = useState<Record<string, string[]>>({})
  const { timers, addTimer, removeTimer, clearAllTimers } = useKitchenTimers()

  // Sync if steps prop changes
  useEffect(() => {
    setLocalSteps(steps)
  }, [steps])

  const currentStep = localSteps[currentIndex] || null
  const nextStep = localSteps[currentIndex + 1] || null

  const goNext = useCallback(() => {
    setCurrentIndex((i) => Math.min(i + 1, localSteps.length - 1))
  }, [localSteps.length])

  const goPrevious = useCallback(() => {
    setCurrentIndex((i) => Math.max(i - 1, 0))
  }, [])

  const markDone = useCallback(() => {
    if (!currentStep) return
    setLocalSteps((prev) =>
      prev.map((s) => (s.id === currentStep.id ? { ...s, completed: true } : s))
    )
    onStepComplete?.(currentStep.id)
    toast.success('Step marked complete')
    // Auto-advance to next incomplete step
    const nextIncomplete = localSteps.findIndex(
      (s, i) => i > currentIndex && !s.completed
    )
    if (nextIncomplete >= 0) {
      setCurrentIndex(nextIncomplete)
    }
  }, [currentStep, currentIndex, localSteps, onStepComplete])

  const addNote = useCallback(
    (text: string) => {
      if (!currentStep) return
      setNotes((prev) => ({
        ...prev,
        [currentStep.id]: [...(prev[currentStep.id] || []), text],
      }))
      onAddNote?.(currentStep.id, text)
      toast.success('Note added')
    },
    [currentStep, onAddNote]
  )

  const handleCommand = useCallback(
    (command: KitchenCommand) => {
      switch (command.type) {
        case 'next':
          goNext()
          break
        case 'previous':
          goPrevious()
          break
        case 'done':
          markDone()
          break
        case 'timer':
          addTimer(command.minutes)
          toast.success(`Timer set: ${command.minutes} minute${command.minutes !== 1 ? 's' : ''}`)
          break
        case 'note':
          addNote(command.text)
          break
        case 'stop':
          // Handled by the hook itself
          break
        case 'unknown':
          // Show what was heard but not recognized
          toast(`Heard: "${command.raw}"`, { duration: 2000 })
          break
      }
    },
    [goNext, goPrevious, markDone, addTimer, addNote]
  )

  const {
    isListening,
    transcript,
    supportsVoice,
    startListening,
    stopListening,
  } = useKitchenVoice({ onCommand: handleCommand })

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      clearAllTimers()
    }
  }, [clearAllTimers])

  const completedCount = localSteps.filter((s) => s.completed).length
  const stepNotes = currentStep ? notes[currentStep.id] || [] : []

  return (
    <div
      className="fixed inset-0 z-[9999] bg-zinc-950 text-white flex flex-col overflow-hidden"
      style={{ fontSize: '24px' }}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 bg-zinc-900 border-b border-zinc-800">
        <div className="flex items-center gap-4">
          <h1 className="font-bold text-white" style={{ fontSize: '28px' }}>
            {title}
          </h1>
          <span className="text-zinc-400 text-lg">
            {completedCount}/{localSteps.length} done
          </span>
        </div>
        <div className="flex items-center gap-4">
          {/* Voice status */}
          {supportsVoice && (
            <button
              onClick={isListening ? stopListening : startListening}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-lg
                transition-all
                ${isListening
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-zinc-700 hover:bg-zinc-600 text-zinc-300'
                }
              `}
            >
              <MicIcon isActive={isListening} />
              {isListening ? 'Listening...' : 'Start Voice'}
            </button>
          )}
          <button
            onClick={onExit}
            className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-lg transition-colors"
          >
            Exit Kitchen Mode
          </button>
        </div>
      </div>

      {/* Browser compatibility note */}
      {!supportsVoice && (
        <div className="mx-6 mt-4 px-4 py-3 rounded-xl bg-yellow-900/50 border border-yellow-700 text-yellow-300 text-base">
          Voice commands require Chrome or Edge. You can still use tap/click controls below.
        </div>
      )}

      {/* Main content area */}
      <div className="flex-1 flex flex-col lg:flex-row gap-6 p-6 overflow-auto">
        {/* Current step (primary focus) */}
        <div className="flex-1 flex flex-col">
          {currentStep ? (
            <div className="flex-1 flex flex-col">
              {/* Step indicator */}
              <div className="text-zinc-500 text-lg mb-2">
                Step {currentIndex + 1} of {localSteps.length}
              </div>

              {/* Step title */}
              <h2
                className={`font-bold mb-4 ${
                  currentStep.completed ? 'text-emerald-400 line-through' : 'text-white'
                }`}
                style={{ fontSize: '48px', lineHeight: 1.2 }}
              >
                {currentStep.completed && (
                  <span className="mr-3">&#10003;</span>
                )}
                {currentStep.title}
              </h2>

              {/* Step description */}
              {currentStep.description && (
                <p className="text-zinc-300 text-2xl leading-relaxed mb-6 max-w-3xl">
                  {currentStep.description}
                </p>
              )}

              {/* Notes for this step */}
              {stepNotes.length > 0 && (
                <div className="mt-4 mb-6">
                  <h3 className="text-zinc-400 text-lg mb-2">Notes:</h3>
                  <ul className="space-y-1">
                    {stepNotes.map((note, i) => (
                      <li key={i} className="text-yellow-300 text-xl">
                        &bull; {note}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Next step preview */}
              {nextStep && (
                <div className="mt-auto pt-6 border-t border-zinc-800">
                  <div className="text-zinc-500 text-base mb-1">Up next:</div>
                  <div className="text-zinc-400 text-2xl">{nextStep.title}</div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-zinc-400 text-3xl">No steps to display</p>
            </div>
          )}

          {/* Manual controls */}
          <div className="flex flex-wrap gap-3 mt-6 pt-4 border-t border-zinc-800">
            <button
              onClick={goPrevious}
              disabled={currentIndex <= 0}
              className="px-6 py-3 rounded-xl bg-zinc-700 hover:bg-zinc-600 disabled:opacity-30 disabled:cursor-not-allowed text-white font-medium text-lg transition-colors"
            >
              Previous
            </button>
            <button
              onClick={markDone}
              disabled={!currentStep || currentStep.completed}
              className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-30 disabled:cursor-not-allowed text-white font-bold text-lg transition-colors"
            >
              Mark Done
            </button>
            <button
              onClick={goNext}
              disabled={currentIndex >= localSteps.length - 1}
              className="px-6 py-3 rounded-xl bg-zinc-700 hover:bg-zinc-600 disabled:opacity-30 disabled:cursor-not-allowed text-white font-medium text-lg transition-colors"
            >
              Next
            </button>
            <button
              onClick={() => addTimer(5)}
              className="px-6 py-3 rounded-xl bg-blue-700 hover:bg-blue-600 text-white font-medium text-lg transition-colors"
            >
              5 min Timer
            </button>
            <button
              onClick={() => addTimer(10)}
              className="px-6 py-3 rounded-xl bg-blue-700 hover:bg-blue-600 text-white font-medium text-lg transition-colors"
            >
              10 min Timer
            </button>
          </div>
        </div>

        {/* Right sidebar: timers and transcript */}
        <div className="lg:w-[360px] flex flex-col gap-4">
          {/* Active timers */}
          <div>
            <h3 className="text-zinc-400 text-lg mb-3 font-medium">Timers</h3>
            <KitchenTimerDisplay timers={timers} onRemove={removeTimer} />
            {timers.length === 0 && (
              <p className="text-zinc-600 text-base">
                No active timers. Say "timer 5 minutes" or tap a button.
              </p>
            )}
          </div>

          {/* Voice transcript */}
          {isListening && transcript && (
            <div className="mt-4 p-4 rounded-xl bg-zinc-800/80 border border-zinc-700">
              <div className="text-zinc-500 text-sm mb-1">Hearing:</div>
              <div className="text-zinc-300 text-xl italic">"{transcript}"</div>
            </div>
          )}

          {/* Command reference */}
          <div className="mt-auto p-4 rounded-xl bg-zinc-900 border border-zinc-800">
            <h4 className="text-zinc-500 text-sm font-medium mb-2">Voice Commands:</h4>
            <ul className="text-zinc-600 text-sm space-y-1">
              <li>"Next" or "Next step"</li>
              <li>"Go back" or "Previous"</li>
              <li>"Done" or "Mark done"</li>
              <li>"Timer 5 minutes"</li>
              <li>"Note [your note]"</li>
              <li>"Stop listening"</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

/** Pulsing microphone icon */
function MicIcon({ isActive }: { isActive: boolean }) {
  return (
    <span className="relative inline-flex items-center justify-center w-6 h-6">
      {isActive && (
        <span className="absolute inset-0 rounded-full bg-emerald-400 opacity-40 animate-ping" />
      )}
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-5 h-5 relative"
      >
        <rect x="9" y="1" width="6" height="13" rx="3" />
        <path d="M19 10v1a7 7 0 0 1-14 0v-1" />
        <line x1="12" y1="19" x2="12" y2="23" />
        <line x1="8" y1="23" x2="16" y2="23" />
      </svg>
    </span>
  )
}
