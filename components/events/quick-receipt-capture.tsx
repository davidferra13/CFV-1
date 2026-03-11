'use client'

// QuickReceiptCapture - Inline receipt upload widget for live events.
// Shown on the event detail page for events in 'confirmed' or 'in_progress' state.
// Allows the chef to snap a receipt photo, preview it, and upload with one tap.
// On success, the receipt is queued for background OCR and linked to the receipt summary.

import Link from 'next/link'
import { useRef, useState, useTransition } from 'react'
import { quickCaptureReceipt } from '@/lib/receipts/quick-capture'
import { Button } from '@/components/ui/button'

type Props = {
  eventId: string
}

type State = 'idle' | 'previewing' | 'uploading' | 'success' | 'error'

export function QuickReceiptCapture({ eventId }: Props) {
  const [state, setState] = useState<State>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [, startTransition] = useTransition()

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0]
    if (!selected) return
    setFile(selected)
    setPreviewUrl(URL.createObjectURL(selected))
    setState('previewing')
    setErrorMsg('')
  }

  function handleCancel() {
    setFile(null)
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    setState('idle')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function handleUpload() {
    if (!file) return

    setState('uploading')
    const formData = new FormData()
    formData.set('receipt', file)

    startTransition(async () => {
      try {
        const result = await quickCaptureReceipt(eventId, formData)
        if (result.success) {
          setState('success')
          setFile(null)
          if (previewUrl) URL.revokeObjectURL(previewUrl)
          setPreviewUrl(null)
          if (fileInputRef.current) fileInputRef.current.value = ''
          return
        }

        setErrorMsg(result.error)
        setState('error')
      } catch {
        setErrorMsg('Upload failed - please try again')
        setState('error')
      }
    })
  }

  if (state === 'success') {
    return (
      <div className="flex flex-col gap-3 rounded-lg border border-emerald-200 bg-emerald-950 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-emerald-200">
            Receipt uploaded - OCR processing in background
          </p>
          <p className="mt-0.5 text-xs text-emerald-600">
            Parsed line items will be ready for review shortly. Nothing is added to expenses until
            you approve.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={`/events/${eventId}/receipts`}
            className="text-sm font-medium text-emerald-200 underline hover:text-emerald-100"
          >
            Review receipts
          </Link>
          <Button variant="secondary" size="sm" onClick={() => setState('idle')}>
            Add Another
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-stone-700 bg-stone-800 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-stone-200">Quick Receipt Capture</h3>
          <p className="mt-0.5 text-xs text-stone-500">
            Snap a receipt now. OCR extracts line items automatically, then holds them for review
            before approval.
          </p>
        </div>
        {state === 'idle' && (
          <Button variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()}>
            Upload Receipt
          </Button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/heic,image/heif,image/webp"
        capture="environment"
        onChange={handleFileChange}
        className="sr-only"
        aria-label="Upload receipt photo"
      />

      {state === 'previewing' && previewUrl && (
        <div className="space-y-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="Receipt preview"
            className="max-h-48 w-full rounded-md border border-stone-700 bg-stone-900 object-contain"
          />
          <p className="truncate text-xs text-stone-500">{file?.name}</p>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleUpload}>
              Upload and Process
            </Button>
            <Button variant="ghost" size="sm" onClick={handleCancel}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {state === 'uploading' && (
        <div className="flex items-center gap-2 py-1 text-sm text-stone-400">
          <span
            className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-brand-500 border-t-transparent"
            aria-hidden="true"
          />
          Uploading and queuing for OCR. Nothing is added to expenses until you review it.
        </div>
      )}

      {state === 'error' && (
        <div className="space-y-3">
          <p className="text-sm text-red-600">{errorMsg}</p>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setState('idle')
                setErrorMsg('')
              }}
            >
              Try Again
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
