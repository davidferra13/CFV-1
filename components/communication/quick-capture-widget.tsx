'use client'

import { useState, useTransition, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  logExternalCommunication,
  getClientsForPicker,
  getEventsForPicker,
} from '@/lib/communication/quick-capture-actions'
import type {
  QuickCaptureInput,
  QuickCaptureResult,
} from '@/lib/communication/quick-capture-actions'
import { SuggestedUpdateCard } from './suggested-update-card'
import type { SuggestedUpdate } from '@/lib/communication/info-change-types'

const CHANNELS = [
  { value: 'call', label: 'Call', icon: 'Ph' },
  { value: 'text', label: 'Text', icon: 'Tx' },
  { value: 'whatsapp', label: 'WhatsApp', icon: 'WA' },
  { value: 'email', label: 'Email', icon: 'Em' },
  { value: 'in_person', label: 'In Person', icon: 'IP' },
  { value: 'other', label: 'Other', icon: 'Ot' },
] as const

const TAGS = [
  { value: 'dietary_change', label: 'Dietary' },
  { value: 'guest_count', label: 'Guest Count' },
  { value: 'date_change', label: 'Date Change' },
  { value: 'menu_feedback', label: 'Menu Feedback' },
  { value: 'logistics', label: 'Logistics' },
  { value: 'payment', label: 'Payment' },
  { value: 'vendor_coordination', label: 'Vendor' },
  { value: 'general', label: 'General' },
] as const

type Props = {
  isOpen: boolean
  onClose: () => void
  prefillClientId?: string | null
  prefillClientName?: string | null
  prefillEventId?: string | null
}

export function QuickCaptureWidget({
  isOpen,
  onClose,
  prefillClientId,
  prefillClientName,
  prefillEventId,
}: Props) {
  const [isPending, startTransition] = useTransition()

  // Form state
  const [clientId, setClientId] = useState<string | null>(prefillClientId ?? null)
  const [clientSearch, setClientSearch] = useState(prefillClientName ?? '')
  const [channel, setChannel] = useState<string>('call')
  const [direction, setDirection] = useState<'inbound' | 'outbound'>('outbound')
  const [keyInfo, setKeyInfo] = useState('')
  const [linkedEventId, setLinkedEventId] = useState<string | null>(prefillEventId ?? null)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [durationMinutes, setDurationMinutes] = useState<number | null>(null)
  const [followUpNeeded, setFollowUpNeeded] = useState(false)
  const [followUpDate, setFollowUpDate] = useState('')

  // Picker data
  const [clients, setClients] = useState<Array<{ id: string; name: string; email: string | null }>>(
    []
  )
  const [events, setEvents] = useState<
    Array<{ id: string; occasion: string; eventDate: string | null }>
  >([])
  const [showClientDropdown, setShowClientDropdown] = useState(false)

  // Result state
  const [result, setResult] = useState<QuickCaptureResult | null>(null)
  const [suggestedUpdates, setSuggestedUpdates] = useState<SuggestedUpdate[]>([])

  // Load picker data
  useEffect(() => {
    if (!isOpen) return
    getClientsForPicker()
      .then(setClients)
      .catch(() => {})
    getEventsForPicker(clientId)
      .then(setEvents)
      .catch(() => {})
  }, [isOpen, clientId])

  // Reset on prefill changes
  useEffect(() => {
    if (prefillClientId) setClientId(prefillClientId)
    if (prefillClientName) setClientSearch(prefillClientName)
    if (prefillEventId) setLinkedEventId(prefillEventId)
  }, [prefillClientId, prefillClientName, prefillEventId])

  function resetForm() {
    setClientId(prefillClientId ?? null)
    setClientSearch(prefillClientName ?? '')
    setChannel('call')
    setDirection('outbound')
    setKeyInfo('')
    setLinkedEventId(prefillEventId ?? null)
    setSelectedTags([])
    setDurationMinutes(null)
    setFollowUpNeeded(false)
    setFollowUpDate('')
    setResult(null)
    setSuggestedUpdates([])
  }

  function handleClose() {
    resetForm()
    onClose()
  }

  function handleSubmit() {
    if (!keyInfo.trim()) return

    const input: QuickCaptureInput = {
      clientId: clientId || null,
      clientName: clientSearch || null,
      channel: channel as any,
      direction,
      keyInfo: keyInfo.trim(),
      linkedEventId: linkedEventId || null,
      tags: selectedTags as any[],
      durationMinutes,
      followUpNeeded,
      followUpDate: followUpNeeded && followUpDate ? followUpDate : null,
    }

    startTransition(async () => {
      try {
        const res = await logExternalCommunication(input)
        setResult(res)
        if (res.success && res.suggestedUpdates) {
          setSuggestedUpdates(res.suggestedUpdates)
        }
        if (res.success && !res.suggestedUpdates?.length) {
          // Auto-close after brief success display
          setTimeout(handleClose, 1200)
        }
      } catch {
        setResult({ success: false, error: 'Failed to save. Try again.' })
      }
    })
  }

  function toggleTag(tag: string) {
    setSelectedTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]))
  }

  const filteredClients = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
      (c.email && c.email.toLowerCase().includes(clientSearch.toLowerCase()))
  )

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/50" onClick={handleClose} />

      {/* Sheet (slides up on mobile, centered modal on desktop) */}
      <div className="fixed inset-x-0 bottom-0 z-50 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-lg">
        <Card className="rounded-t-2xl md:rounded-2xl border-stone-700 bg-stone-900 max-h-[90vh] overflow-y-auto">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Log Communication</CardTitle>
              <button
                onClick={handleClose}
                className="text-stone-400 hover:text-stone-200 text-xl leading-none"
                aria-label="Close"
              >
                x
              </button>
            </div>
          </CardHeader>

          <CardContent className="space-y-4 pb-6">
            {result?.success && suggestedUpdates.length > 0 ? (
              /* Show suggested updates after successful capture */
              <div className="space-y-3">
                <p className="text-sm text-emerald-400 font-medium">Logged successfully.</p>
                <div className="space-y-2">
                  {suggestedUpdates.map((update, i) => (
                    <SuggestedUpdateCard
                      key={`${update.type}-${i}`}
                      update={update}
                      eventId={linkedEventId}
                      clientId={clientId}
                      onDismiss={() => {
                        setSuggestedUpdates((prev) => prev.filter((_, idx) => idx !== i))
                        if (suggestedUpdates.length <= 1) {
                          setTimeout(handleClose, 400)
                        }
                      }}
                    />
                  ))}
                </div>
                <Button variant="secondary" onClick={handleClose} className="w-full">
                  Done
                </Button>
              </div>
            ) : result?.success ? (
              <div className="text-center py-4">
                <p className="text-emerald-400 font-medium">Logged successfully.</p>
              </div>
            ) : (
              /* Capture form */
              <>
                {result?.error && <p className="text-sm text-red-400">{result.error}</p>}

                {/* Who */}
                <div className="relative">
                  <label className="block text-xs font-medium text-stone-400 mb-1">Who *</label>
                  <input
                    type="text"
                    value={clientSearch}
                    onChange={(e) => {
                      setClientSearch(e.target.value)
                      setClientId(null)
                      setShowClientDropdown(true)
                    }}
                    onFocus={() => setShowClientDropdown(true)}
                    placeholder="Client name or new contact"
                    className="w-full rounded-lg border border-stone-700 bg-stone-800 px-3 py-2 text-sm text-stone-100 placeholder:text-stone-500 focus:border-brand-500 focus:outline-none"
                  />
                  {showClientDropdown && filteredClients.length > 0 && !clientId && (
                    <div className="absolute z-10 mt-1 w-full max-h-40 overflow-y-auto rounded-lg border border-stone-700 bg-stone-800 shadow-lg">
                      {filteredClients.slice(0, 10).map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            setClientId(c.id)
                            setClientSearch(c.name)
                            setShowClientDropdown(false)
                          }}
                          className="w-full px-3 py-2 text-left text-sm text-stone-200 hover:bg-stone-700"
                        >
                          {c.name}
                          {c.email && (
                            <span className="ml-2 text-xs text-stone-500">{c.email}</span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Channel */}
                <div>
                  <label className="block text-xs font-medium text-stone-400 mb-1">Channel *</label>
                  <div className="flex flex-wrap gap-2">
                    {CHANNELS.map((ch) => (
                      <button
                        key={ch.value}
                        type="button"
                        onClick={() => setChannel(ch.value)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                          channel === ch.value
                            ? 'bg-brand-600 text-white'
                            : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                        }`}
                      >
                        {ch.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Direction */}
                <div>
                  <label className="block text-xs font-medium text-stone-400 mb-1">
                    Direction *
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setDirection('outbound')}
                      className={`flex-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        direction === 'outbound'
                          ? 'bg-brand-600 text-white'
                          : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                      }`}
                    >
                      I reached out
                    </button>
                    <button
                      type="button"
                      onClick={() => setDirection('inbound')}
                      className={`flex-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        direction === 'inbound'
                          ? 'bg-brand-600 text-white'
                          : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                      }`}
                    >
                      They reached out
                    </button>
                  </div>
                </div>

                {/* Key Info */}
                <div>
                  <label className="block text-xs font-medium text-stone-400 mb-1">
                    Key Info *
                  </label>
                  <textarea
                    value={keyInfo}
                    onChange={(e) => setKeyInfo(e.target.value)}
                    placeholder="What was learned, decided, or promised"
                    rows={3}
                    maxLength={2000}
                    className="w-full rounded-lg border border-stone-700 bg-stone-800 px-3 py-2 text-sm text-stone-100 placeholder:text-stone-500 focus:border-brand-500 focus:outline-none resize-none"
                  />
                  <p className="mt-0.5 text-xs text-stone-500 text-right">{keyInfo.length}/2000</p>
                </div>

                {/* Linked Event */}
                <div>
                  <label className="block text-xs font-medium text-stone-400 mb-1">
                    Linked Event
                  </label>
                  <select
                    value={linkedEventId ?? ''}
                    onChange={(e) => setLinkedEventId(e.target.value || null)}
                    className="w-full rounded-lg border border-stone-700 bg-stone-800 px-3 py-2 text-sm text-stone-100 focus:border-brand-500 focus:outline-none"
                  >
                    <option value="">None</option>
                    {events.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.occasion}
                        {e.eventDate ? ` (${new Date(e.eventDate).toLocaleDateString()})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Tags */}
                <div>
                  <label className="block text-xs font-medium text-stone-400 mb-1">Tags</label>
                  <div className="flex flex-wrap gap-1.5">
                    {TAGS.map((tag) => (
                      <button
                        key={tag.value}
                        type="button"
                        onClick={() => toggleTag(tag.value)}
                        className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                          selectedTags.includes(tag.value)
                            ? 'bg-brand-600/30 text-brand-300 border border-brand-500'
                            : 'bg-stone-800 text-stone-400 border border-stone-700 hover:border-stone-600'
                        }`}
                      >
                        {tag.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Duration (for calls) */}
                {(channel === 'call' || channel === 'in_person') && (
                  <div>
                    <label className="block text-xs font-medium text-stone-400 mb-1">
                      Duration (minutes)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="1440"
                      value={durationMinutes ?? ''}
                      onChange={(e) =>
                        setDurationMinutes(e.target.value ? parseInt(e.target.value, 10) : null)
                      }
                      placeholder="Optional"
                      className="w-24 rounded-lg border border-stone-700 bg-stone-800 px-3 py-2 text-sm text-stone-100 placeholder:text-stone-500 focus:border-brand-500 focus:outline-none"
                    />
                  </div>
                )}

                {/* Follow-up */}
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-sm text-stone-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={followUpNeeded}
                      onChange={(e) => setFollowUpNeeded(e.target.checked)}
                      className="rounded border-stone-600 bg-stone-800"
                    />
                    Follow-up needed
                  </label>
                  {followUpNeeded && (
                    <input
                      type="date"
                      value={followUpDate}
                      onChange={(e) => setFollowUpDate(e.target.value)}
                      className="rounded-lg border border-stone-700 bg-stone-800 px-3 py-1.5 text-sm text-stone-100 focus:border-brand-500 focus:outline-none"
                    />
                  )}
                </div>

                {/* Submit */}
                <Button
                  onClick={handleSubmit}
                  disabled={isPending || !keyInfo.trim()}
                  className="w-full"
                >
                  {isPending ? 'Saving...' : 'Log Communication'}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}
