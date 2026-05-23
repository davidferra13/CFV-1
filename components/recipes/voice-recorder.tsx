'use client'

// VoiceRecorder - reusable browser-native audio recorder
// Uses MediaRecorder API. Falls back gracefully if mic unavailable.

import { useRef, useState, useCallback, useEffect } from 'react'

type VoiceRecorderProps = {
  onRecordingComplete: (blob: Blob) => void
  maxDurationMs?: number
}

type RecorderState = 'idle' | 'recording' | 'stopped' | 'error'

export function VoiceRecorder({
  onRecordingComplete,
  maxDurationMs = 5 * 60 * 1000, // 5 min default
}: VoiceRecorderProps) {
  const [state, setState] = useState<RecorderState>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [audioLevel, setAudioLevel] = useState(0)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animFrameRef = useRef<number | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current)
      animFrameRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    analyserRef.current = null
  }, [])

  useEffect(() => {
    return cleanup
  }, [cleanup])

  const updateLevel = useCallback(() => {
    if (!analyserRef.current) return
    const data = new Uint8Array(analyserRef.current.fftSize)
    analyserRef.current.getByteTimeDomainData(data)
    let sum = 0
    for (let i = 0; i < data.length; i++) {
      const v = (data[i] - 128) / 128
      sum += v * v
    }
    const rms = Math.sqrt(sum / data.length)
    setAudioLevel(Math.min(1, rms * 3))
    animFrameRef.current = requestAnimationFrame(updateLevel)
  }, [])

  const startRecording = useCallback(async () => {
    try {
      setErrorMsg(null)
      chunksRef.current = []
      setElapsed(0)

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      // Set up audio level analyser
      const audioCtx = new AudioContext()
      const source = audioCtx.createMediaStreamSource(stream)
      const analyser = audioCtx.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)
      analyserRef.current = analyser

      const recorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm',
      })

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        onRecordingComplete(blob)
        cleanup()
        setState('stopped')
      }

      mediaRecorderRef.current = recorder
      recorder.start(250) // collect in 250ms chunks
      setState('recording')

      // Duration timer
      const start = Date.now()
      timerRef.current = setInterval(() => {
        const now = Date.now() - start
        setElapsed(now)
        if (now >= maxDurationMs) {
          recorder.stop()
        }
      }, 200)

      // Audio level visualization
      updateLevel()
    } catch (err: unknown) {
      const msg =
        err instanceof DOMException && err.name === 'NotAllowedError'
          ? 'Microphone access denied. Please allow microphone access and try again.'
          : 'Could not access microphone. Check your device settings.'
      setErrorMsg(msg)
      setState('error')
      cleanup()
    }
  }, [maxDurationMs, onRecordingComplete, cleanup, updateLevel])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop()
    }
  }, [])

  const formatTime = (ms: number) => {
    const secs = Math.floor(ms / 1000)
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center gap-4">
        {state === 'idle' || state === 'stopped' || state === 'error' ? (
          <button
            type="button"
            onClick={startRecording}
            className="flex items-center gap-2 rounded-full bg-red-600 px-6 py-3 font-medium text-white transition-colors hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/50"
          >
            <span className="h-3 w-3 rounded-full bg-white" />
            {state === 'stopped' ? 'Record Again' : 'Start Recording'}
          </button>
        ) : (
          <button
            type="button"
            onClick={stopRecording}
            className="flex items-center gap-2 rounded-full bg-stone-700 px-6 py-3 font-medium text-white transition-colors hover:bg-stone-600 focus:outline-none focus:ring-2 focus:ring-stone-500/50"
          >
            <span className="h-3 w-3 rounded-sm bg-red-500" />
            Stop
          </button>
        )}

        {state === 'recording' && (
          <span className="text-sm font-mono text-stone-300">{formatTime(elapsed)}</span>
        )}
      </div>

      {/* Audio level indicator */}
      {state === 'recording' && (
        <div className="flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500" />
          </span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-stone-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 transition-[width] duration-100"
              style={{ width: `${Math.max(5, audioLevel * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Error */}
      {errorMsg && (
        <p className="rounded-lg border border-red-800 bg-red-950/50 px-3 py-2 text-sm text-red-300">
          {errorMsg}
        </p>
      )}
    </div>
  )
}
