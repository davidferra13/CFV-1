'use client'

// Standalone Receipt Upload
// Allows chefs to upload a receipt from anywhere - no event required.
// Event is optional (defaulted to provided eventId if given), client is optional.
// Mirrors the quick-receipt-capture widget but without event-state restrictions
// and with selectors to associate the receipt with any event or client.

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { uploadStandaloneReceipt } from '@/lib/receipts/library-actions'
import type { EventOption, ClientOption } from '@/lib/receipts/library-actions'

type Props = {
  events: EventOption[]
  clients: ClientOption[]
  /** Pre-select an event (e.g., when uploading from an event page). */
  defaultEventId?: string
  /** Called after a successful upload so the parent can refresh or redirect. */
  onSuccess?: (receiptPhotoId: string) => void
}

type UploadState = 'idle' | 'previewing' | 'uploading' | 'success' | 'error'

export function StandaloneUpload({ events, clients, defaultEventId, onSuccess }: Props) {
  const [state, setState] = useState<UploadState>('idle')
  const [preview, setPreview] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [receiptPhotoId, setReceiptPhotoId] = useState<string | null>(null)

  // Association selectors - event defaults to provided id (usually the current event)
  const [selectedEventId, setSelectedEventId] = useState<string>(defaultEventId ?? '')
  const [selectedClientId, setSelectedClientId] = useState<string>('')
  const [notes, setNotes] = useState<string>('')

  const inputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    setPreview(URL.createObjectURL(f))
    setState('previewing')
    setError(null)
  }

  const handleUpload = async () => {
    if (!file) return
    setState('uploading')
    setError(null)

    const formData = new FormData()
    formData.set('receipt', file)

    const result = await uploadStandaloneReceipt(formData, {
      eventId: selectedEventId || undefined,
      clientId: selectedClientId || undefined,
      notes: notes.trim() || undefined,
    })

    if (result.success) {
      setState('success')
      setReceiptPhotoId(result.receiptPhotoId)
      onSuccess?.(result.receiptPhotoId)
    } else {
      setState('error')
      setError(result.error)
    }
  }

  const handleReset = () => {
    setState('idle')
    setPreview(null)
    setFile(null)
    setError(null)
    setReceiptPhotoId(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  if (state === 'success') {
    return (
      <div className="border border-green-200 bg-green-950 rounded-lg p-4 space-y-2">
        <p className="text-sm font-medium text-green-800">
          Receipt uploaded and queued for extraction.
        </p>
        <p className="text-xs text-green-600">
          Check back in a moment to review the extracted line items.
        </p>
        <div className="flex gap-2 pt-1">
          <Button size="sm" variant="ghost" onClick={handleReset}>
            Upload Another
          </Button>
          <Button size="sm" variant="secondary" href="/receipts">
            View Receipt Library
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="border border-stone-700 rounded-lg p-4 space-y-4 bg-stone-900">
      <p className="text-sm font-semibold text-stone-200">Upload a Receipt</p>

      {/* File picker */}
      {state === 'idle' && (
        <div>
          <label className="flex flex-col items-center justify-center border-2 border-dashed border-stone-600 rounded-lg p-6 cursor-pointer hover:border-stone-400 transition-colors">
            <span className="text-stone-400 text-sm mb-1">
              Tap to choose a photo or take one now
            </span>
            <span className="text-xs text-stone-400">JPEG, PNG, HEIC, WebP · max 10 MB</span>
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/heic,image/heif,image/webp"
              capture="environment"
              onChange={handleFileChange}
              className="sr-only"
            />
          </label>
        </div>
      )}

      {/* Preview */}
      {state === 'previewing' && preview && (
        <div className="space-y-3">
          <div className="w-full max-h-48 overflow-hidden rounded border border-stone-700">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="Receipt preview" className="object-contain w-full max-h-48" />
          </div>
          <p className="text-xs text-stone-500">{file?.name}</p>
        </div>
      )}

      {/* Uploading spinner */}
      {state === 'uploading' && (
        <div className="text-sm text-stone-500 animate-pulse">Uploading…</div>
      )}

      {/* Error */}
      {state === 'error' && error && <p className="text-sm text-red-600">{error}</p>}

      {/* Association selectors - shown while previewing or after error */}
      {(state === 'previewing' || state === 'error') && (
        <div className="space-y-3">
          {/* Event selector */}
          <div>
            <label className="block text-xs font-medium text-stone-400 mb-1">
              Link to Event <span className="font-normal text-stone-400">(optional)</span>
            </label>
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="w-full text-sm border border-stone-700 rounded px-2 py-1.5 bg-stone-900 text-stone-200"
            >
              <option value="">- No event (standalone receipt) -</option>
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.label}
                </option>
              ))}
            </select>
          </div>

          {/* Client selector */}
          <div>
            <label className="block text-xs font-medium text-stone-400 mb-1">
              Link to Client <span className="font-normal text-stone-400">(optional)</span>
            </label>
            <select
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              className="w-full text-sm border border-stone-700 rounded px-2 py-1.5 bg-stone-900 text-stone-200"
            >
              <option value="">- No client -</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-stone-400 mb-1">
              Note <span className="font-normal text-stone-400">(optional)</span>
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Annual equipment purchase, farmers market run…"
              className="w-full text-sm border border-stone-700 rounded px-2 py-1.5 bg-stone-900 text-stone-200 placeholder:text-stone-300"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <Button size="sm" variant="ghost" onClick={handleReset}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleUpload}>
              Upload Receipt
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
