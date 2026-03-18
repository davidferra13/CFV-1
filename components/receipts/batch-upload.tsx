'use client'

// Batch Receipt Upload Component
// Select multiple receipt photos, preview them with quality checks,
// then upload all at once with per-file progress indicators.
// Mobile-first: supports camera capture and file picker.

import { useState, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { uploadReceiptBatch } from '@/lib/receipts/batch-upload-actions'
import { checkImageQuality, type ImageQualityResult } from '@/lib/receipts/image-quality-check'
import type { EventOption, ClientOption } from '@/lib/receipts/library-actions'

type Props = {
  events: EventOption[]
  clients: ClientOption[]
  defaultEventId?: string
  onSuccess?: () => void
}

type FileEntry = {
  id: string
  file: File
  preview: string
  quality: ImageQualityResult | null
  status: 'checking' | 'ready' | 'invalid' | 'uploading' | 'success' | 'error'
  error?: string
  receiptPhotoId?: string
}

const MAX_BATCH = 20

export function BatchUpload({ events, clients, defaultEventId, onSuccess }: Props) {
  const [files, setFiles] = useState<FileEntry[]>([])
  const [uploading, setUploading] = useState(false)
  const [done, setDone] = useState(false)
  const [selectedEventId, setSelectedEventId] = useState(defaultEventId ?? '')
  const [selectedClientId, setSelectedClientId] = useState('')
  const [notes, setNotes] = useState('')

  const inputRef = useRef<HTMLInputElement>(null)

  const handleFilesSelected = useCallback(
    async (selectedFiles: FileList) => {
      const newEntries: FileEntry[] = []
      const existingCount = files.length

      // Enforce batch limit
      const remaining = MAX_BATCH - existingCount
      const toProcess = Array.from(selectedFiles).slice(0, remaining)

      for (const file of toProcess) {
        const id = crypto.randomUUID()
        const preview = URL.createObjectURL(file)
        newEntries.push({ id, file, preview, quality: null, status: 'checking' })
      }

      setFiles((prev) => [...prev, ...newEntries])

      // Run quality checks in parallel
      for (const entry of newEntries) {
        checkImageQuality(entry.file).then((quality) => {
          setFiles((prev) =>
            prev.map((f) =>
              f.id === entry.id
                ? {
                    ...f,
                    quality,
                    status: quality.valid ? 'ready' : 'invalid',
                    error: quality.error,
                  }
                : f
            )
          )
        })
      }

      if (toProcess.length < selectedFiles.length) {
        // Some files were dropped due to batch limit
        setFiles((prev) => prev) // no-op, just to note the limit was hit
      }
    },
    [files.length]
  )

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFilesSelected(e.target.files)
      // Reset input so the same files can be re-selected
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const handleRemoveFile = (id: string) => {
    setFiles((prev) => {
      const entry = prev.find((f) => f.id === id)
      if (entry) URL.revokeObjectURL(entry.preview)
      return prev.filter((f) => f.id !== id)
    })
  }

  const handleUploadAll = async () => {
    const readyFiles = files.filter((f) => f.status === 'ready')
    if (readyFiles.length === 0) return

    setUploading(true)

    // Mark all ready files as uploading
    setFiles((prev) =>
      prev.map((f) => (f.status === 'ready' ? { ...f, status: 'uploading' as const } : f))
    )

    const formData = new FormData()
    for (const entry of readyFiles) {
      formData.append('receipts', entry.file)
    }

    try {
      const result = await uploadReceiptBatch(formData, {
        eventId: selectedEventId || undefined,
        clientId: selectedClientId || undefined,
        notes: notes.trim() || undefined,
      })

      // Map results back to file entries by filename
      const resultMap = new Map<string, (typeof result.results)[0]>()
      for (const r of result.results) {
        resultMap.set(r.filename, r)
      }

      setFiles((prev) =>
        prev.map((f) => {
          if (f.status !== 'uploading') return f
          const r = resultMap.get(f.file.name)
          if (!r) return { ...f, status: 'error' as const, error: 'No result returned' }
          return r.success
            ? { ...f, status: 'success' as const, receiptPhotoId: r.receiptPhotoId }
            : { ...f, status: 'error' as const, error: r.error }
        })
      )

      setDone(true)
      onSuccess?.()
    } catch (err) {
      setFiles((prev) =>
        prev.map((f) =>
          f.status === 'uploading'
            ? { ...f, status: 'error' as const, error: 'Upload failed unexpectedly' }
            : f
        )
      )
    } finally {
      setUploading(false)
    }
  }

  const handleReset = () => {
    for (const f of files) URL.revokeObjectURL(f.preview)
    setFiles([])
    setDone(false)
    setUploading(false)
  }

  const readyCount = files.filter((f) => f.status === 'ready').length
  const successCount = files.filter((f) => f.status === 'success').length
  const errorCount = files.filter((f) => f.status === 'error' || f.status === 'invalid').length
  const checkingCount = files.filter((f) => f.status === 'checking').length

  return (
    <Card className="p-4 space-y-4 bg-stone-900 border-stone-700">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-stone-200">Batch Receipt Upload</p>
        {files.length > 0 && (
          <span className="text-xs text-stone-500">
            {files.length}/{MAX_BATCH} files
          </span>
        )}
      </div>

      {/* File picker */}
      {files.length < MAX_BATCH && !uploading && !done && (
        <label className="flex flex-col items-center justify-center border-2 border-dashed border-stone-600 rounded-lg p-6 cursor-pointer hover:border-stone-400 transition-colors">
          <span className="text-stone-400 text-sm mb-1">Tap to select photos or take one now</span>
          <span className="text-xs text-stone-500">
            JPEG, PNG, HEIC, WebP. Up to {MAX_BATCH - files.length} more files. Max 10 MB each.
          </span>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/heic,image/heif,image/webp"
            capture="environment"
            multiple
            onChange={handleInputChange}
            className="sr-only"
          />
        </label>
      )}

      {/* File grid */}
      {files.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {files.map((entry) => (
            <div
              key={entry.id}
              className={`relative rounded-lg border overflow-hidden ${
                entry.status === 'success'
                  ? 'border-green-700'
                  : entry.status === 'error' || entry.status === 'invalid'
                    ? 'border-red-700'
                    : entry.status === 'uploading'
                      ? 'border-amber-700'
                      : 'border-stone-700'
              }`}
            >
              {/* Thumbnail */}
              <div className="aspect-[3/4] bg-stone-800">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={entry.preview}
                  alt={entry.file.name}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Status overlay */}
              <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/70 via-transparent to-transparent p-2">
                <div className="flex items-center gap-1">
                  {entry.status === 'checking' && (
                    <span className="text-xs text-stone-400 animate-pulse">Checking...</span>
                  )}
                  {entry.status === 'ready' && (
                    <span className="text-xs text-green-400">Ready</span>
                  )}
                  {entry.status === 'invalid' && (
                    <span className="text-xs text-red-400">{entry.error}</span>
                  )}
                  {entry.status === 'uploading' && (
                    <span className="text-xs text-amber-400 animate-pulse">Uploading...</span>
                  )}
                  {entry.status === 'success' && (
                    <span className="text-xs text-green-400">Uploaded</span>
                  )}
                  {entry.status === 'error' && (
                    <span className="text-xs text-red-400">{entry.error ?? 'Failed'}</span>
                  )}
                </div>

                {/* Quality warnings */}
                {entry.quality?.warnings &&
                  entry.quality.warnings.length > 0 &&
                  entry.status === 'ready' && (
                    <p className="text-[10px] text-amber-400 mt-0.5">{entry.quality.warnings[0]}</p>
                  )}

                {/* File info */}
                <p className="text-[10px] text-stone-400 truncate mt-0.5">{entry.file.name}</p>
              </div>

              {/* Remove button (only before upload) */}
              {!uploading && !done && entry.status !== 'success' && (
                <button
                  onClick={() => handleRemoveFile(entry.id)}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-stone-300 text-xs flex items-center justify-center hover:bg-red-900 hover:text-red-400 transition-colors"
                  aria-label="Remove"
                >
                  x
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Association selectors */}
      {files.length > 0 && !done && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-stone-400 mb-1">
                Link to Event <span className="font-normal">(optional, applies to all)</span>
              </label>
              <select
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                disabled={uploading}
                className="w-full text-sm border border-stone-700 rounded px-2 py-1.5 bg-stone-900 text-stone-200"
              >
                <option value="">- No event (standalone) -</option>
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-400 mb-1">
                Link to Client <span className="font-normal">(optional)</span>
              </label>
              <select
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                disabled={uploading}
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
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-400 mb-1">
              Note <span className="font-normal">(optional, applies to all)</span>
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={uploading}
              placeholder="e.g. Historical receipts from 2024 tax year"
              className="w-full text-sm border border-stone-700 rounded px-2 py-1.5 bg-stone-900 text-stone-200 placeholder:text-stone-500"
            />
          </div>
        </div>
      )}

      {/* Actions */}
      {files.length > 0 && (
        <div className="flex items-center gap-3 pt-1">
          {!done ? (
            <>
              <Button size="sm" variant="ghost" onClick={handleReset} disabled={uploading}>
                Clear All
              </Button>
              <Button
                size="sm"
                onClick={handleUploadAll}
                disabled={uploading || readyCount === 0 || checkingCount > 0}
              >
                {uploading
                  ? 'Uploading...'
                  : `Upload ${readyCount} Receipt${readyCount !== 1 ? 's' : ''}`}
              </Button>
              {errorCount > 0 && !uploading && (
                <span className="text-xs text-red-400">{errorCount} invalid</span>
              )}
            </>
          ) : (
            <>
              <Button size="sm" variant="ghost" onClick={handleReset}>
                Upload More
              </Button>
              <Button size="sm" variant="secondary" href="/receipts">
                View Receipt Library
              </Button>
              <span className="text-xs text-stone-400">
                {successCount} uploaded{errorCount > 0 ? `, ${errorCount} failed` : ''}
              </span>
            </>
          )}
        </div>
      )}
    </Card>
  )
}
