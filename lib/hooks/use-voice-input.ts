import { useState, useRef, useCallback, useEffect } from 'react'
import { toast } from 'sonner'

export function useVoiceInput(onTranscript: (text: string) => void) {
  const [isListening, setIsListening] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null)

  const supportsVoice =
    typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)

  const toggleVoiceInput = useCallback(() => {
    if (isListening) {
      recognitionRef.current?.stop()
      setIsListening(false)
      return
    }

    if (!supportsVoice) {
      toast.error('Voice input is not supported in this browser. Try Chrome or Edge.')
      return
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = true
    recognition.lang = 'en-US'

    let finalTranscript = ''

    recognition.onstart = () => {
      setIsListening(true)
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      let interim = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          finalTranscript += transcript
        } else {
          interim += transcript
        }
      }
      // Show interim results via callback
      onTranscript(finalTranscript + interim)
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onerror = (event: any) => {
      console.error('[remy-voice] Speech recognition error:', event.error)
      setIsListening(false)
      if (event.error === 'not-allowed') {
        toast.error('Microphone access denied. Enable it in your browser settings.')
      } else if (event.error !== 'aborted') {
        toast.error('Voice input error. Try again.')
      }
    }

    recognition.onend = () => {
      setIsListening(false)
      if (finalTranscript.trim()) {
        onTranscript(finalTranscript.trim())
      }
    }

    recognitionRef.current = recognition
    recognition.start()
  }, [isListening, supportsVoice, onTranscript])

  const stopListening = useCallback(() => {
    if (isListening) {
      recognitionRef.current?.stop()
      setIsListening(false)
    }
  }, [isListening])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      recognitionRef.current?.stop()
    }
  }, [])

  return {
    isListening,
    supportsVoice,
    toggleVoiceInput,
    stopListening,
  }
}
