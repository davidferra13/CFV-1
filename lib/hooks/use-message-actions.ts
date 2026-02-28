import { useState, useCallback, useEffect, type Dispatch, type SetStateAction } from 'react'
import { toast } from 'sonner'
import { toggleBookmark, deleteMessage } from '@/lib/ai/remy-local-storage'
import { deleteRemyMemory } from '@/lib/ai/remy-memory-actions'
import type { RemyMessage } from '@/lib/ai/remy-types'

// ─── Voice Settings ──────────────────────────────────────────────────────────

export interface VoiceSettings {
  voiceURI: string | null
  rate: number
  pitch: number
  volume: number
}

const VOICE_SETTINGS_KEY = 'remy-voice-settings'
const DEFAULT_VOICE_SETTINGS: VoiceSettings = {
  voiceURI: null,
  rate: 1,
  pitch: 1,
  volume: 1,
}

export { DEFAULT_VOICE_SETTINGS }

function loadVoiceSettings(): VoiceSettings {
  if (typeof window === 'undefined') return DEFAULT_VOICE_SETTINGS
  try {
    const raw = localStorage.getItem(VOICE_SETTINGS_KEY)
    if (!raw) return DEFAULT_VOICE_SETTINGS
    const parsed = JSON.parse(raw)
    return { ...DEFAULT_VOICE_SETTINGS, ...parsed }
  } catch {
    return DEFAULT_VOICE_SETTINGS
  }
}

export function saveVoiceSettings(settings: VoiceSettings) {
  try {
    localStorage.setItem(VOICE_SETTINGS_KEY, JSON.stringify(settings))
  } catch {
    // localStorage full or unavailable
  }
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useMessageActions(setMessages: Dispatch<SetStateAction<RemyMessage[]>>) {
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [speakingId, setSpeakingId] = useState<string | null>(null)
  const [voiceSettings, setVoiceSettings] = useState<VoiceSettings>(loadVoiceSettings)
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([])
  const [showVoiceSettings, setShowVoiceSettings] = useState(false)

  // Load available TTS voices (they load async in some browsers)
  useEffect(() => {
    function loadVoices() {
      const voices = speechSynthesis.getVoices()
      if (voices.length > 0) setAvailableVoices(voices)
    }
    loadVoices()
    speechSynthesis.addEventListener('voiceschanged', loadVoices)
    return () => speechSynthesis.removeEventListener('voiceschanged', loadVoices)
  }, [])

  const handleCopy = useCallback((msgId: string, content: string) => {
    navigator.clipboard.writeText(content).then(() => {
      setCopiedId(msgId)
      toast.success('Copied to clipboard')
      setTimeout(() => setCopiedId(null), 2000)
    })
  }, [])

  const handleToggleBookmark = useCallback(
    async (msgId: string) => {
      try {
        const newState = await toggleBookmark(msgId)
        setMessages((prev) =>
          prev.map((m) => (m.id === msgId ? { ...m, bookmarked: newState } : m))
        )
        toast.success(newState ? 'Bookmarked' : 'Bookmark removed')
      } catch (err) {
        console.error('[remy] Failed to toggle bookmark:', err)
      }
    },
    [setMessages]
  )

  const updateVoiceSetting = useCallback(
    <K extends keyof VoiceSettings>(key: K, value: VoiceSettings[K]) => {
      setVoiceSettings((prev) => {
        const next = { ...prev, [key]: value }
        saveVoiceSettings(next)
        return next
      })
    },
    []
  )

  const handlePreviewVoice = useCallback(
    (voiceURI: string | null) => {
      speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance('Hey chef, this is Remy.')
      utterance.rate = voiceSettings.rate
      utterance.pitch = voiceSettings.pitch
      utterance.volume = voiceSettings.volume
      if (voiceURI) {
        const voice = availableVoices.find((v) => v.voiceURI === voiceURI)
        if (voice) utterance.voice = voice
      }
      speechSynthesis.speak(utterance)
    },
    [availableVoices, voiceSettings.rate, voiceSettings.pitch, voiceSettings.volume]
  )

  const handleSpeak = useCallback(
    (msgId: string, content: string) => {
      // If already speaking this message, stop it
      if (speakingId === msgId) {
        speechSynthesis.cancel()
        setSpeakingId(null)
        return
      }
      // Stop any current speech first
      speechSynthesis.cancel()

      // Strip markdown formatting for cleaner speech
      const plainText = content
        .replace(/#{1,6}\s+/g, '') // headings
        .replace(/\*\*(.+?)\*\*/g, '$1') // bold
        .replace(/\*(.+?)\*/g, '$1') // italic
        .replace(/_(.+?)_/g, '$1') // italic underscores
        .replace(/`{1,3}[^`]*`{1,3}/g, '') // code
        .replace(/\[(.+?)\]\(.+?\)/g, '$1') // links
        .replace(/[-*+]\s+/g, '. ') // list items
        .replace(/\d+\.\s+/g, '. ') // numbered lists
        .replace(/>\s+/g, '') // blockquotes
        .replace(/---+/g, '') // horizontal rules
        .replace(/\n{2,}/g, '. ') // paragraph breaks
        .replace(/\n/g, ' ') // line breaks
        .trim()

      if (!plainText) return

      const utterance = new SpeechSynthesisUtterance(plainText)
      utterance.rate = voiceSettings.rate
      utterance.pitch = voiceSettings.pitch
      utterance.volume = voiceSettings.volume
      if (voiceSettings.voiceURI) {
        const voice = availableVoices.find((v) => v.voiceURI === voiceSettings.voiceURI)
        if (voice) utterance.voice = voice
      }
      utterance.onend = () => setSpeakingId(null)
      utterance.onerror = () => setSpeakingId(null)

      setSpeakingId(msgId)
      speechSynthesis.speak(utterance)
    },
    [speakingId, voiceSettings, availableVoices]
  )

  const stopSpeaking = useCallback(() => {
    if (speakingId) {
      speechSynthesis.cancel()
      setSpeakingId(null)
    }
  }, [speakingId])

  const handleDeleteMessage = useCallback(
    async (msgId: string) => {
      setMessages((prev) => prev.filter((m) => m.id !== msgId))
      toast.success('Message removed')
      // Also delete from IndexedDB so it doesn't reappear on reload
      deleteMessage(msgId).catch((err) => console.error('[non-blocking] Delete msg failed', err))
    },
    [setMessages]
  )

  const handleDeleteMemory = useCallback(
    async (memoryId: string) => {
      try {
        await deleteRemyMemory(memoryId)
        setMessages((prev) =>
          prev.map((msg) => {
            if (!msg.memoryItems) return msg
            return {
              ...msg,
              memoryItems: msg.memoryItems.filter((m) => m.id !== memoryId),
            }
          })
        )
        toast.success('Memory deleted')
      } catch (err) {
        console.error('[remy] Failed to delete memory:', err)
        toast.error('Failed to delete memory')
      }
    },
    [setMessages]
  )

  return {
    copiedId,
    speakingId,
    voiceSettings,
    setVoiceSettings,
    availableVoices,
    showVoiceSettings,
    setShowVoiceSettings,
    handleCopy,
    handleToggleBookmark,
    handleSpeak,
    handlePreviewVoice,
    updateVoiceSetting,
    stopSpeaking,
    handleDeleteMessage,
    handleDeleteMemory,
  }
}
