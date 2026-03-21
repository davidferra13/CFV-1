// Speech Recognition Wrapper
// Browser-native Web Speech API for hands-free kitchen commands.
// No external services, no server calls, no privacy concerns.
// Audio stays entirely in the browser.

// ── Types ──────────────────────────────────────────────────────────────────

export interface SpeechRecognitionOptions {
  continuous?: boolean
  interimResults?: boolean
  lang?: string
  onResult?: (transcript: string, isFinal: boolean) => void
  onError?: (error: string) => void
  onStart?: () => void
  onEnd?: () => void
}

export interface SpeechRecognitionWrapper {
  start: () => void
  stop: () => void
  isListening: () => boolean
  isSupported: () => boolean
}

// ── Browser API types (not in standard TS lib) ─────────────────────────────

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList
  resultIndex: number
}

interface SpeechRecognitionResultList {
  length: number
  item(index: number): SpeechRecognitionResult
  [index: number]: SpeechRecognitionResult
}

interface SpeechRecognitionResult {
  isFinal: boolean
  length: number
  item(index: number): SpeechRecognitionAlternative
  [index: number]: SpeechRecognitionAlternative
}

interface SpeechRecognitionAlternative {
  transcript: string
  confidence: number
}

// ── Check browser support ──────────────────────────────────────────────────

export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === 'undefined') return false
  return !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
}

// ── Create recognition instance ────────────────────────────────────────────

export function createSpeechRecognition(
  options: SpeechRecognitionOptions
): SpeechRecognitionWrapper {
  let recognition: any = null
  let listening = false

  const supported = isSpeechRecognitionSupported()

  if (supported) {
    const SpeechRecognitionClass =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition

    recognition = new SpeechRecognitionClass()
    recognition.continuous = options.continuous ?? true
    recognition.interimResults = options.interimResults ?? false
    recognition.lang = options.lang ?? 'en-US'

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const result = event.results[event.resultIndex]
      if (result) {
        const transcript = result[0].transcript.trim().toLowerCase()
        const isFinal = result.isFinal
        options.onResult?.(transcript, isFinal)
      }
    }

    recognition.onerror = (event: any) => {
      const errorMsg =
        event.error === 'no-speech'
          ? 'No speech detected'
          : event.error === 'audio-capture'
            ? 'No microphone found'
            : event.error === 'not-allowed'
              ? 'Microphone permission denied'
              : `Speech recognition error: ${event.error}`

      options.onError?.(errorMsg)

      // Auto-stop on fatal errors
      if (['not-allowed', 'audio-capture'].includes(event.error)) {
        listening = false
      }
    }

    recognition.onstart = () => {
      listening = true
      options.onStart?.()
    }

    recognition.onend = () => {
      // Auto-restart if continuous mode and still supposed to be listening
      if (listening && options.continuous) {
        try {
          recognition.start()
        } catch {
          listening = false
          options.onEnd?.()
        }
      } else {
        listening = false
        options.onEnd?.()
      }
    }
  }

  return {
    start: () => {
      if (!supported) {
        options.onError?.('Speech recognition not supported in this browser')
        return
      }
      if (listening) return
      try {
        listening = true
        recognition.start()
      } catch (err) {
        listening = false
        options.onError?.('Failed to start speech recognition')
      }
    },

    stop: () => {
      listening = false
      if (recognition) {
        try {
          recognition.stop()
        } catch {
          // Already stopped
        }
      }
    },

    isListening: () => listening,
    isSupported: () => supported,
  }
}
