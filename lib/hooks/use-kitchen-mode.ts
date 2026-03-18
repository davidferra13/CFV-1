import { useState, useRef, useCallback, useEffect } from 'react'
import { toast } from 'sonner'

// Kitchen Mode - Continuous listening with wake word detection.
// Chef says "Hey Remy, [question]" and the question is captured + auto-sent.
// Auto-restarts after silence. 30-min auto-timeout for battery/CPU.

const WAKE_WORDS = ['hey remy', 'remy']
const AUTO_TIMEOUT_MS = 30 * 60 * 1000 // 30 minutes
const SILENCE_RESTART_MS = 2000 // Restart listening after 2s of silence

interface UseKitchenModeConfig {
  onMessage: (text: string) => void
  isLoading: boolean
}

export function useKitchenMode({ onMessage, isLoading }: UseKitchenModeConfig) {
  const [kitchenMode, setKitchenMode] = useState(false)
  const [isCapturing, setIsCapturing] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null)
  const autoTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const restartTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const kitchenModeRef = useRef(false)

  const supportsVoice =
    typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)

  const stopKitchenMode = useCallback(() => {
    kitchenModeRef.current = false
    setKitchenMode(false)
    setIsCapturing(false)
    recognitionRef.current?.stop()
    recognitionRef.current = null
    if (autoTimeoutRef.current) clearTimeout(autoTimeoutRef.current)
    if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current)
  }, [])

  const startListening = useCallback(() => {
    if (!supportsVoice || !kitchenModeRef.current) return

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'

    let capturedText = ''
    let wakeWordDetected = false

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      if (!kitchenModeRef.current) return

      let fullTranscript = ''
      for (let i = 0; i < event.results.length; i++) {
        fullTranscript += event.results[i][0].transcript
      }
      const lower = fullTranscript.toLowerCase().trim()

      // Check for wake word
      if (!wakeWordDetected) {
        for (const wake of WAKE_WORDS) {
          const idx = lower.indexOf(wake)
          if (idx !== -1) {
            wakeWordDetected = true
            setIsCapturing(true)
            // Extract everything after the wake word
            capturedText = fullTranscript.substring(idx + wake.length).trim()
            break
          }
        }
        return
      }

      // After wake word, capture the rest
      for (const wake of WAKE_WORDS) {
        const idx = lower.indexOf(wake)
        if (idx !== -1) {
          capturedText = fullTranscript.substring(idx + wake.length).trim()
          break
        }
      }

      // Check if we have a final result after the wake word
      const lastResult = event.results[event.results.length - 1]
      if (lastResult.isFinal && wakeWordDetected && capturedText.trim()) {
        const finalText = capturedText.trim()
        wakeWordDetected = false
        capturedText = ''
        setIsCapturing(false)
        onMessage(finalText)
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onerror = (event: any) => {
      if (event.error === 'not-allowed') {
        toast.error('Microphone access denied.')
        stopKitchenMode()
        return
      }
      // For other errors (network, no-speech), restart after a delay
      if (kitchenModeRef.current && event.error !== 'aborted') {
        restartTimeoutRef.current = setTimeout(() => {
          if (kitchenModeRef.current) startListening()
        }, SILENCE_RESTART_MS)
      }
    }

    recognition.onend = () => {
      // Auto-restart if kitchen mode is still on
      if (kitchenModeRef.current) {
        restartTimeoutRef.current = setTimeout(() => {
          if (kitchenModeRef.current) startListening()
        }, SILENCE_RESTART_MS)
      }
    }

    recognitionRef.current = recognition
    recognition.start()
  }, [supportsVoice, onMessage, stopKitchenMode]) // eslint-disable-line react-hooks/exhaustive-deps

  const toggleKitchenMode = useCallback(() => {
    if (kitchenMode) {
      stopKitchenMode()
      toast.success('Kitchen Mode off')
      return
    }

    if (!supportsVoice) {
      toast.error('Voice input is not supported in this browser.')
      return
    }

    kitchenModeRef.current = true
    setKitchenMode(true)
    toast.success('Kitchen Mode on - say "Hey Remy" to start')

    // Auto-timeout after 30 min
    autoTimeoutRef.current = setTimeout(() => {
      if (kitchenModeRef.current) {
        stopKitchenMode()
        toast('Kitchen Mode timed out after 30 minutes')
      }
    }, AUTO_TIMEOUT_MS)

    startListening()
  }, [kitchenMode, supportsVoice, stopKitchenMode, startListening])

  // Pause listening while Remy is responding (avoid picking up TTS audio)
  useEffect(() => {
    if (!kitchenMode) return
    if (isLoading) {
      recognitionRef.current?.stop()
    } else {
      // Restart after response completes
      restartTimeoutRef.current = setTimeout(() => {
        if (kitchenModeRef.current) startListening()
      }, 1000) // 1s delay to let TTS finish
    }
  }, [isLoading, kitchenMode, startListening])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      kitchenModeRef.current = false
      recognitionRef.current?.stop()
      if (autoTimeoutRef.current) clearTimeout(autoTimeoutRef.current)
      if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current)
    }
  }, [])

  return {
    kitchenMode,
    isCapturing,
    supportsVoice,
    toggleKitchenMode,
    stopKitchenMode,
  }
}
