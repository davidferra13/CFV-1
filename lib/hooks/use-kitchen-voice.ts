'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { toast } from 'sonner'

export type KitchenCommand =
  | { type: 'next' }
  | { type: 'previous' }
  | { type: 'done' }
  | { type: 'timer'; minutes: number }
  | { type: 'note'; text: string }
  | { type: 'stop' }
  | { type: 'unknown'; raw: string }

interface UseKitchenVoiceOptions {
  onCommand?: (command: KitchenCommand) => void
}

/**
 * Voice command hook for kitchen mode.
 * Uses browser-native Web Speech API (Chrome/Edge).
 * All processing is local, no data leaves the browser.
 */
export function useKitchenVoice(options: UseKitchenVoiceOptions = {}) {
  const { onCommand } = options
  const [isListening, setIsListening] = useState(false)
  const [lastCommand, setLastCommand] = useState<KitchenCommand | null>(null)
  const [transcript, setTranscript] = useState('')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null)
  const onCommandRef = useRef(onCommand)
  onCommandRef.current = onCommand

  const supportsVoice =
    typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)

  const parseCommand = useCallback((text: string): KitchenCommand => {
    const lower = text.toLowerCase().trim()

    // "next step" / "next"
    if (/^(next\s*step|next)$/i.test(lower)) {
      return { type: 'next' }
    }

    // "go back" / "previous"
    if (/^(go\s*back|previous|back)$/i.test(lower)) {
      return { type: 'previous' }
    }

    // "done" / "complete" / "mark done"
    if (/^(done|complete|mark\s*done|finished)$/i.test(lower)) {
      return { type: 'done' }
    }

    // "stop listening" / "stop"
    if (/^(stop\s*listening|stop|pause)$/i.test(lower)) {
      return { type: 'stop' }
    }

    // "timer X minutes" / "set timer for X minutes"
    const timerMatch = lower.match(
      /(?:set\s+)?timer\s+(?:for\s+)?(\d+)\s*(?:minutes?|mins?)/
    )
    if (timerMatch) {
      return { type: 'timer', minutes: parseInt(timerMatch[1], 10) }
    }

    // "add note [text]"
    const noteMatch = lower.match(/^(?:add\s+)?note\s+(.+)$/i)
    if (noteMatch) {
      return { type: 'note', text: noteMatch[1].trim() }
    }

    return { type: 'unknown', raw: text }
  }, [])

  const startListening = useCallback(() => {
    if (isListening) return

    if (!supportsVoice) {
      toast.error('Voice input is not supported in this browser. Try Chrome or Edge.')
      return
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      let finalText = ''
      let interimText = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) {
          finalText += result[0].transcript
        } else {
          interimText += result[0].transcript
        }
      }

      setTranscript(interimText || finalText)

      if (finalText.trim()) {
        const command = parseCommand(finalText.trim())
        setLastCommand(command)
        onCommandRef.current?.(command)

        // If user says "stop listening", auto-stop
        if (command.type === 'stop') {
          recognition.stop()
          setIsListening(false)
        }
      }
    }

    recognition.onstart = () => {
      setIsListening(true)
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onerror = (event: any) => {
      console.error('[kitchen-voice] Speech recognition error:', event.error)
      if (event.error === 'not-allowed') {
        toast.error('Microphone access denied. Enable it in your browser settings.')
        setIsListening(false)
      } else if (event.error === 'no-speech') {
        // Silence timeout, restart if still listening
        // Do nothing, onend will handle restart
      } else if (event.error !== 'aborted') {
        toast.error('Voice recognition error. Try again.')
      }
    }

    recognition.onend = () => {
      // Auto-restart if we should still be listening
      // (Web Speech API stops after silence in some browsers)
      if (recognitionRef.current === recognition && isListening) {
        try {
          recognition.start()
        } catch {
          setIsListening(false)
        }
      } else {
        setIsListening(false)
      }
    }

    recognitionRef.current = recognition
    try {
      recognition.start()
    } catch {
      toast.error('Could not start voice recognition. Try again.')
    }
  }, [isListening, supportsVoice, parseCommand])

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      const ref = recognitionRef.current
      recognitionRef.current = null
      ref.stop()
    }
    setIsListening(false)
    setTranscript('')
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
        recognitionRef.current = null
      }
    }
  }, [])

  return {
    isListening,
    lastCommand,
    transcript,
    supportsVoice,
    startListening,
    stopListening,
  }
}
