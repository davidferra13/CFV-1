'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Mic, Send, Sparkles, X } from '@/components/ui/icons'
import { createInstantNote } from '@/lib/quick-notes/intelligence-actions'

type SpeechRecognitionInstance = {
  lang: string
  interimResults: boolean
  continuous: boolean
  start: () => void
  onresult:
    | ((event: { results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }> }) => void)
    | null
  onerror: (() => void) | null
  onend: (() => void) | null
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance

function getSpeechRecognitionConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null
  const speechWindow = window as typeof window & {
    SpeechRecognition?: SpeechRecognitionConstructor
    webkitSpeechRecognition?: SpeechRecognitionConstructor
  }
  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition ?? null
}

export function InstantNoteDock() {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [listening, setListening] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function submitNote() {
    const rawText = input
    if (!rawText.trim()) return

    startTransition(async () => {
      const result = await createInstantNote({
        text: rawText,
        commandSource: 'instant_note_dock',
      })
      if (!result.success) {
        toast.error(result.error ?? 'Failed to save note')
        return
      }

      setInput('')
      setOpen(false)
      toast.success(
        result.processingMode === 'inline_fallback'
          ? 'Note saved and processed.'
          : 'Note saved for background routing.'
      )
      router.refresh()
    })
  }

  function startVoiceCapture() {
    const Recognition = getSpeechRecognitionConstructor()
    if (!Recognition) {
      toast.info('Voice capture is not available in this browser.')
      return
    }

    const recognition = new Recognition()
    recognition.lang = 'en-US'
    recognition.interimResults = true
    recognition.continuous = false
    setListening(true)
    recognition.onresult = (event) => {
      let transcript = ''
      for (let index = 0; index < event.results.length; index++) {
        transcript += event.results[index][0].transcript
      }
      setInput((current) => (current.trim() ? `${current.trim()} ${transcript}` : transcript))
    }
    recognition.onerror = () => {
      setListening(false)
      toast.error('Voice capture stopped.')
    }
    recognition.onend = () => setListening(false)
    recognition.start()
  }

  return (
    <div className="fixed bottom-6 right-6 z-40 hidden sm:block">
      {open ? (
        <div className="w-[360px] rounded-lg border border-stone-700 bg-stone-950 p-3 shadow-2xl">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-medium text-stone-100">
              <Sparkles className="h-4 w-4 text-brand-400" />
              Instant Note
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md p-1 text-stone-400 hover:bg-stone-800 hover:text-stone-100"
              aria-label="Close instant note dock"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Drop the thought. ChefFlow saves it first."
            className="h-28 w-full resize-none rounded-lg border border-stone-700 bg-stone-900 p-3 text-sm text-stone-100 placeholder-stone-500 focus:border-transparent focus:ring-2 focus:ring-brand-500"
            disabled={isPending}
          />
          <div className="mt-3 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={startVoiceCapture}
              disabled={isPending || listening}
            >
              <Mic className="h-4 w-4" />
              {listening ? 'Listening' : 'Voice'}
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={submitNote}
              disabled={!input.trim() || isPending}
              loading={isPending}
            >
              <Send className="h-4 w-4" />
              Capture
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-600 text-white shadow-lg transition hover:bg-brand-700 active:scale-95"
          aria-label="Open instant note capture"
        >
          <Sparkles className="h-5 w-5" />
        </button>
      )}
    </div>
  )
}
