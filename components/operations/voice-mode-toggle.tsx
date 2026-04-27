'use client'

// Voice Mode Toggle - Microphone button with visual feedback for KDS.
// Uses browser-native Web Speech API (no external services, data stays local).
// Shows active listening state, recognized commands, and help overlay.

import { useState, useCallback, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  createSpeechRecognition,
  isSpeechRecognitionSupported,
} from '@/lib/voice/speech-recognition'
import type { SpeechRecognitionWrapper } from '@/lib/voice/speech-recognition'
import { parseKitchenCommand, COMMAND_HELP } from '@/lib/voice/kitchen-commands'
import type { KitchenCommand } from '@/lib/voice/kitchen-commands'

interface VoiceModeToggleProps {
  onCommand: (command: KitchenCommand) => void
  className?: string
}

export function VoiceModeToggle({ onCommand, className = '' }: VoiceModeToggleProps) {
  const [isListening, setIsListening] = useState(false)
  const [lastTranscript, setLastTranscript] = useState<string | null>(null)
  const [lastCommand, setLastCommand] = useState<KitchenCommand | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showHelp, setShowHelp] = useState(false)
  const recognitionRef = useRef<SpeechRecognitionWrapper | null>(null)

  const supported = typeof window !== 'undefined' && isSpeechRecognitionSupported()

  // Clear last command after 3 seconds
  useEffect(() => {
    if (lastCommand) {
      const timer = setTimeout(() => {
        setLastCommand(null)
        setLastTranscript(null)
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [lastCommand])

  const handleResult = useCallback(
    (transcript: string, isFinal: boolean) => {
      if (!isFinal) return

      setLastTranscript(transcript)
      const command = parseKitchenCommand(transcript)
      setLastCommand(command)

      if (command.type !== 'unknown') {
        onCommand(command)
      }
    },
    [onCommand]
  )

  const toggleListening = useCallback(() => {
    if (isListening) {
      recognitionRef.current?.stop()
      setIsListening(false)
      return
    }

    setError(null)

    if (!recognitionRef.current) {
      recognitionRef.current = createSpeechRecognition({
        continuous: true,
        interimResults: false,
        lang: 'en-US',
        onResult: handleResult,
        onError: (err) => setError(err),
        onStart: () => setIsListening(true),
        onEnd: () => setIsListening(false),
      })
    }

    recognitionRef.current.start()
  }, [isListening, handleResult])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      recognitionRef.current?.stop()
    }
  }, [])

  if (!supported) {
    return null // Don't show button if browser doesn't support it
  }

  const commandColor = lastCommand
    ? lastCommand.type === 'unknown'
      ? 'text-stone-500'
      : lastCommand.type === 'eighty_six'
        ? 'text-red-400'
        : 'text-emerald-400'
    : ''

  return (
    <div className={`relative ${className}`}>
      {/* Main toggle button */}
      <div className="flex items-center gap-2">
        <button
          onClick={toggleListening}
          className={`relative flex items-center justify-center w-12 h-12 rounded-full transition-all ${
            isListening
              ? 'bg-red-500 text-white shadow-lg shadow-red-500/30 animate-pulse'
              : 'bg-stone-700 text-stone-300 hover:bg-stone-600'
          }`}
          title={isListening ? 'Stop listening' : 'Start voice mode'}
        >
          {/* Microphone icon (SVG) */}
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" />
          </svg>

          {/* Listening ring animation */}
          {isListening && (
            <span className="absolute inset-0 rounded-full border-2 border-red-400 animate-ping" />
          )}
        </button>

        {/* Status text */}
        <div className="text-xs">
          {isListening && !lastCommand && <span className="text-red-300">Listening...</span>}
          {lastCommand && (
            <span className={commandColor}>
              {lastCommand.type === 'unknown'
                ? `"${lastTranscript}"`
                : formatCommandName(lastCommand)}
            </span>
          )}
          {error && <span className="text-red-400">{error}</span>}
        </div>

        {/* Help button */}
        <button
          onClick={() => setShowHelp(!showHelp)}
          className="text-xs text-stone-500 hover:text-stone-300 transition-colors"
        >
          {showHelp ? 'Hide help' : 'Commands'}
        </button>
      </div>

      {/* Help overlay */}
      {showHelp && (
        <div className="absolute top-full left-0 mt-2 w-80 rounded-lg border border-stone-700 bg-stone-800 shadow-xl z-50 p-3">
          <h4 className="text-xs font-medium text-stone-200 mb-2 uppercase tracking-wider">
            Voice Commands
          </h4>
          <div className="space-y-2">
            {COMMAND_HELP.map((cmd) => (
              <div key={cmd.command} className="text-xs">
                <span className="font-medium text-brand-400">{cmd.command}</span>
                <span className="text-stone-400 ml-1.5">{cmd.description}</span>
                <p className="text-stone-600 text-xxs mt-0.5">{cmd.example}</p>
              </div>
            ))}
          </div>
          <p className="text-xxs text-stone-600 mt-3 pt-2 border-t border-stone-700">
            Audio is processed locally in your browser. Nothing is sent to any server.
          </p>
        </div>
      )}
    </div>
  )
}

// ── Helper ─────────────────────────────────────────────────────────────────

function formatCommandName(cmd: KitchenCommand): string {
  switch (cmd.type) {
    case 'fire':
      return cmd.courseNumber ? `Fire course ${cmd.courseNumber}` : `Fire ${cmd.dishName ?? ''}`
    case 'plate':
      return cmd.courseNumber ? `Plating course ${cmd.courseNumber}` : 'Plating'
    case 'serve':
      return cmd.courseNumber ? `Serve course ${cmd.courseNumber}` : 'Serve'
    case 'eighty_six':
      return `86: ${cmd.dishName}`
    case 'timer':
      return `Timer: ${cmd.minutes}m`
    case 'next_step':
      return 'Next step'
    case 'whats_next':
      return "What's next?"
    case 'mark_complete':
      return 'Marked complete'
    case 'all_day':
      return `All day: ${cmd.dishName ?? ''}`
    case 'heard':
      return 'Heard'
    case 'corner':
      return 'Corner!'
    case 'behind':
      return 'Behind!'
    case 'hot':
      return 'Hot!'
    case 'picking_up':
      return `Picking up${cmd.dishName ? `: ${cmd.dishName}` : ''}`
    default:
      return 'Unknown'
  }
}
