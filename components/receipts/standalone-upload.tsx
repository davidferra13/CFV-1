'use client'

// Standalone Receipt Upload
// Allows chefs to upload a receipt from anywhere - no event required.
// Event is optional (defaulted to provided eventId if given), client is optional.
// Mirrors the quick-receipt-capture widget but without event-state restrictions
// and with selectors to associate the receipt with any event or client.

import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { uploadStandaloneReceipt } from '@/lib/receipts/library-actions'
import type { EventOption, ClientOption } from '@/lib/receipts/library-actions'

type Props = {
  events: EventOption[]
  clients: ClientOption[]
  defaultEventId?: string
  onSuccess?: (receiptPhotoId: string) => void
}

type UploadState = 'idle' | 'previewing' | 'uploading' | 'success' | 'error'

export function StandaloneUpload({ events, clients, defaultEventId, onSuccess }: Props) {
  const [state, setState] = useState<UploadState>('idle')
  const [preview, setPreview] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [receiptPhotoId, setReceiptPhotoId] = useState<string | null>(null)
  const [selectedEventId, setSelectedEventId] = useState<string>(defaultEventId ?? '')
  const [selectedClientId, setSelectedClientId] = useState<string>('')
  const [notes, setNotes] = useState<string>('')

  const inputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0]
    if (!nextFile) return
    setFile(nextFile)
    setPreview(URL.createObjectURL(nextFile))
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
      return
    }

    setState('error')
    setError(result.error)
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
      <div className="space-y-2 rounded-lg border border-green-200 bg-green-950 p-4">
        <p className="text-sm font-medium text-green-200">
          Receipt uploaded and queued for extraction.
        </p>
        <p className="text-xs text-green-600">
          After extraction, review the parsed line items and approve them before anything is added
          to expenses.
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
    <div className="space-y-4 rounded-lg border border-stone-700 bg-stone-900 p-4">
      <p className="text-sm font-semibold text-stone-200">Upload a Receipt</p>
      <p className="text-xs text-stone-500">
        Receipts auto-extract in the background, then stay pending review until you approve them.
      </p>

      {state === 'idle' && (
        <div>
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-stone-600 p-6 transition-colors hover:border-stone-400">
            <span className="mb-1 text-sm text-stone-400">Tap to choose a photo or take one now</span>
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

      {state === 'previewing' && preview && (
        <div className="space-y-3">
          <div className="w-full max-h-48 overflow-hidden rounded border border-stone-700">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="Receipt preview" className="max-h-48 w-full object-contain" />
          </div>
          <p className="text-xs text-stone-500">{file?.name}</p>
        </div>
      )}

      {state === 'uploading' && (
        <div className="animate-pulse text-sm text-stone-500">
          Uploading now. Nothing is added to expenses until review and approval.
        </div>
      )}

      {state === 'error' && error && <p className="text-sm text-red-600">{error}</p>}

      {(state === 'previewing' || state === 'error') && (
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-stone-400">
              Link to Event <span className="font-normal text-stone-400">(optional)</span>
            </label>
            <select
              value={selectedEventId}
              onChange={(event) => setSelectedEventId(event.target.value)}
              className="w-full rounded border border-stone-700 bg-stone-900 px-2 py-1.5 text-sm text-stone-200"
            >
              <option value="">- No event (standalone receipt) -</option>
              {events.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-stone-400">
              Link to Client <span className="font-normal text-stone-400">(optional)</span>
            </label>
            <select
              value={selectedClientId}
              onChange={(event) => setSelectedClientId(event.target.value)}
              className="w-full rounded border border-stone-700 bg-stone-900 px-2 py-1.5 text-sm text-stone-200"
            >
              <option value="">- No client -</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-stone-400">
              Note <span className="font-normal text-stone-400">(optional)</span>
            </label>
            <input
              type="text"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="e.g. Annual equipment purchase, farmers market run..."
              className="w-full rounded border border-stone-700 bg-stone-900 px-2 py-1.5 text-sm text-stone-200 placeholder:text-stone-400"
            />
          </div>

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
