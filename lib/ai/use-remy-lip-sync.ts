/* eslint-disable react-hooks/exhaustive-deps */
// useRemyLipSync â€” React hook that drives Remy's mouth animation
// Consumes streaming text and outputs the current viseme for rendering.

import { useState, useRef, useCallback, useEffect } from 'react'
import type { Viseme, VisemeFrame } from './remy-visemes'
import type { RemyEmotion } from './remy-visemes'
import { processStreamChunk, getFrameDuration } from './remy-visemes'
import { detectEmotion } from './remy-emotion'

export interface LipSyncState {
  /** Current viseme being displayed */
  currentViseme: Viseme
  /** Whether Remy is currently "speaking" (animating mouth) */
  isSpeaking: boolean
  /** Current emotion â€” determines the rest-state face between responses */
  currentEmotion: RemyEmotion
}

interface LipSyncInternals {
  /** Queue of viseme frames waiting to be displayed */
  frameQueue: VisemeFrame[]
  /** Pending character from cross-token digraph detection */
  pendingChar: string | null
  /** Timer for the current frame display */
  timer: ReturnType<typeof setTimeout> | null
  /** Whether we're actively processing the queue */
  isProcessing: boolean
  /** Accumulated text buffer for emotion detection */
  textBuffer: string
}

/**
 * Hook that manages Remy's lip-sync animation.
 *
 * Usage:
 * 1. Call `feedText(chunk)` every time a new streaming token arrives
 * 2. Read `currentViseme` to render the correct mouth via sprite sheet
 * 3. Call `stopSpeaking()` when the response is complete
 * 4. Call `reset()` when starting a new message
 *
 * The hook handles:
 * - Digraph detection across token boundaries (S|HOULD â†’ SH)
 * - Natural timing â€” punctuation causes longer pauses
 * - Queue management â€” fast token bursts don't skip frames
 * - Automatic return to resting when queue drains
 * - Emotion detection from accumulated response text
 */
export function useRemyLipSync(): LipSyncState & {
  feedText: (chunk: string) => void
  stopSpeaking: () => void
  reset: () => void
  setEmotion: (emotion: RemyEmotion) => void
} {
  const [currentViseme, setCurrentViseme] = useState<Viseme>('rest')
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [currentEmotion, setCurrentEmotion] = useState<RemyEmotion>('neutral')

  const internals = useRef<LipSyncInternals>({
    frameQueue: [],
    pendingChar: null,
    timer: null,
    isProcessing: false,
    textBuffer: '',
  })

  // Process the next frame in the queue
  const processNextFrame = useCallback(() => {
    const state = internals.current

    if (state.frameQueue.length === 0) {
      state.isProcessing = false
      // Don't immediately go to rest â€” wait a beat for more tokens
      state.timer = setTimeout(() => {
        // If still no frames after the grace period, go to rest
        if (state.frameQueue.length === 0) {
          setCurrentViseme('rest')
          setIsSpeaking(false)
        } else {
          // More frames arrived during grace period â€” keep going
          processNextFrame()
        }
      }, 150) // Grace period for next streaming token
      return
    }

    state.isProcessing = true
    const frame = state.frameQueue.shift()!
    const duration = getFrameDuration(frame)

    setCurrentViseme(frame.viseme)
    setIsSpeaking(true)

    state.timer = setTimeout(() => {
      processNextFrame()
    }, duration)
  }, [])

  /**
   * Feed a new text chunk into the lip-sync engine.
   * Called every time a streaming token arrives from the SSE connection.
   */
  const feedText = useCallback(
    (chunk: string) => {
      if (!chunk) return

      const state = internals.current

      // Accumulate text for emotion detection
      state.textBuffer += chunk

      const [frames, newPending] = processStreamChunk(chunk, state.pendingChar)
      state.pendingChar = newPending

      if (frames.length === 0) return

      // Add frames to the queue
      state.frameQueue.push(...frames)

      // Start processing if not already running
      if (!state.isProcessing) {
        processNextFrame()
      }
    },
    [processNextFrame]
  )

  /**
   * Signal that the response is complete. Flushes any pending character,
   * detects emotion from the accumulated text, and lets the queue drain
   * naturally before returning to rest.
   */
  const stopSpeaking = useCallback(() => {
    const state = internals.current

    // Flush pending character if any
    if (state.pendingChar) {
      const [frames] = processStreamChunk('', state.pendingChar)
      state.pendingChar = null
      if (frames.length > 0) {
        state.frameQueue.push(...frames)
      }
    }

    // Detect emotion from the full response text
    if (state.textBuffer.length > 0) {
      const emotion = detectEmotion(state.textBuffer)
      setCurrentEmotion(emotion)
      state.textBuffer = ''
    }

    // If nothing is processing and queue is empty, go to rest immediately
    if (!state.isProcessing && state.frameQueue.length === 0) {
      setCurrentViseme('rest')
      setIsSpeaking(false)
    }
    // Otherwise, let the queue drain naturally â€” processNextFrame will
    // set rest when it's done.
  }, [])

  /**
   * Full reset â€” clear everything. Call when starting a new conversation
   * or when the user cancels a request.
   */
  const reset = useCallback(() => {
    const state = internals.current
    if (state.timer) clearTimeout(state.timer)
    state.frameQueue = []
    state.pendingChar = null
    state.timer = null
    state.isProcessing = false
    state.textBuffer = ''
    setCurrentViseme('rest')
    setIsSpeaking(false)
    setCurrentEmotion('neutral')
  }, [])

  /** Manually set emotion (e.g., for greeting or error states) */
  const setEmotion = useCallback((emotion: RemyEmotion) => {
    setCurrentEmotion(emotion)
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      const state = internals.current
      if (state.timer) clearTimeout(state.timer)
    }
  }, [])

  return {
    currentViseme,
    isSpeaking,
    currentEmotion,
    feedText,
    stopSpeaking,
    reset,
    setEmotion,
  }
}
