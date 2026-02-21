'use client'

// QuickReceiptCapture — Inline receipt upload widget for live events.
// Shown on the event detail page for events in 'confirmed' or 'in_progress' state.
// Allows the chef to snap a receipt photo, preview it, and upload with one tap.
// On success, the receipt is queued for background OCR and the chef is linked to the receipt summary.

import { useRef, useState, useTransition } from 'react'
import Link from 'next/link'
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

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0]
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
      const result = await quickCaptureReceipt(eventId, formData)
      if (result.success) {
        setState('success')
        setFile(null)
        if (previewUrl) URL.revokeObjectURL(previewUrl)
        setPreviewUrl(null)
        if (fileInputRef.current) fileInputRef.current.value = ''
      } else {
        setErrorMsg(result.error)
        setState('error')
      }
    })
  }

  if (state === 'success') {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-emerald-800">Receipt uploaded — OCR processing in background</p>
          <p className="text-xs text-emerald-600 mt-0.5">Line items will be ready for review shortly.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={`/events/${eventId}/receipts`}
            className="text-sm font-medium text-emerald-700 hover:text-emerald-900 underline"
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
    <div className="rounded-lg border border-stone-200 bg-stone-50 p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-stone-800">Quick Receipt Capture</h3>
          <p className="text-xs text-stone-500 mt-0.5">
            Snap a receipt now — OCR extracts line items automatically
          </p>
        </div>
        {state === 'idle' && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
          >
            Upload Receipt
          </Button>
        )}
      </div>

      {/* Hidden file input — capture="environment" triggers camera on mobile */}
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
            className="max-h-48 w-full object-contain rounded-md border border-stone-200 bg-white"
          />
          <p className="text-xs text-stone-500 truncate">{file?.name}</p>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleUpload}>
              Upload &amp; Process
            </Button>
            <Button variant="ghost" size="sm" onClick={handleCancel}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {state === 'uploading' && (
        <div className="flex items-center gap-2 text-sm text-stone-600 py-1">
          <span
            className="inline-block w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"
            aria-hidden="true"
          />
          Uploading and queuing for OCR...
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
