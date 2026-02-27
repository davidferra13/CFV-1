'use client'

import { useState, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

interface UploadFile {
  file: File
  id: string
  status: 'pending' | 'uploading' | 'extracting' | 'parsing' | 'done' | 'error'
  error?: string
  dishCount?: number
}

interface MenuUploadZoneProps {
  onFilesProcessed: (jobId: string) => void
  onPastedText: (text: string) => void
}

const ACCEPTED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/heic',
  'image/webp',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/rtf',
]

const ACCEPTED_EXTENSIONS = [
  '.pdf',
  '.jpg',
  '.jpeg',
  '.png',
  '.heic',
  '.webp',
  '.docx',
  '.txt',
  '.rtf',
]

export function MenuUploadZone({ onFilesProcessed, onPastedText }: MenuUploadZoneProps) {
  const [files, setFiles] = useState<UploadFile[]>([])
  const [isDragOver, setIsDragOver] = useState(false)
  const [pasteMode, setPasteMode] = useState(false)
  const [pastedText, setPastedText] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFiles = useCallback((fileList: FileList) => {
    const newFiles: UploadFile[] = Array.from(fileList)
      .filter((f) => {
        const ext = '.' + f.name.split('.').pop()?.toLowerCase()
        return ACCEPTED_EXTENSIONS.includes(ext)
      })
      .map((f) => ({
        file: f,
        id: crypto.randomUUID(),
        status: 'pending' as const,
      }))

    setFiles((prev) => [...prev, ...newFiles])
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragOver(false)
      if (e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files)
      }
    },
    [handleFiles]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false)
  }, [])

  const processFile = useCallback(
    async (uploadFile: UploadFile) => {
      setFiles((prev) =>
        prev.map((f) => (f.id === uploadFile.id ? { ...f, status: 'uploading' } : f))
      )

      try {
        // Send file as FormData (no base64 bloat, supports large files)
        const formData = new FormData()
        formData.append('file', uploadFile.file)

        const response = await fetch('/api/menus/upload', {
          method: 'POST',
          body: formData,
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Upload failed')
        }

        const result = await response.json()

        setFiles((prev) =>
          prev.map((f) =>
            f.id === uploadFile.id ? { ...f, status: 'done', dishCount: result.dishCount } : f
          )
        )

        onFilesProcessed(result.jobId)
      } catch (err) {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === uploadFile.id
              ? { ...f, status: 'error', error: err instanceof Error ? err.message : 'Failed' }
              : f
          )
        )
      }
    },
    [onFilesProcessed]
  )

  const processAll = useCallback(async () => {
    const pending = files.filter((f) => f.status === 'pending')
    const CONCURRENCY = 3

    // Process files in batches to avoid overwhelming the server
    for (let i = 0; i < pending.length; i += CONCURRENCY) {
      const batch = pending.slice(i, i + CONCURRENCY)
      await Promise.all(batch.map(processFile))
    }
  }, [files, processFile])

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id))
  }, [])

  const handlePasteSubmit = useCallback(() => {
    if (pastedText.trim()) {
      onPastedText(pastedText.trim())
      setPastedText('')
      setPasteMode(false)
    }
  }, [pastedText, onPastedText])

  const statusIcon = (status: UploadFile['status']) => {
    switch (status) {
      case 'pending':
        return '○'
      case 'uploading':
      case 'extracting':
      case 'parsing':
        return '◌'
      case 'done':
        return '●'
      case 'error':
        return '✕'
    }
  }

  const statusColor = (status: UploadFile['status']) => {
    switch (status) {
      case 'pending':
        return 'text-stone-500'
      case 'uploading':
      case 'extracting':
      case 'parsing':
        return 'text-brand-400 animate-pulse'
      case 'done':
        return 'text-green-400'
      case 'error':
        return 'text-red-400'
    }
  }

  return (
    <div className="space-y-4">
      {/* Mode toggle */}
      <div className="flex gap-2">
        <Button
          variant={pasteMode ? 'secondary' : 'primary'}
          size="sm"
          onClick={() => setPasteMode(false)}
        >
          Upload Files
        </Button>
        <Button
          variant={pasteMode ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => setPasteMode(true)}
        >
          Paste Text
        </Button>
      </div>

      {pasteMode ? (
        /* Paste text mode */
        <Card className="p-4 space-y-3">
          <p className="text-sm text-stone-400">
            Paste or type a menu below. The system will parse it into individual dishes.
          </p>
          <textarea
            value={pastedText}
            onChange={(e) => setPastedText(e.target.value)}
            placeholder={`Example:\n\nFirst Course\nPan-Seared Diver Scallops\nwith cauliflower purée and brown butter\n\nEntrée\nRack of Lamb\nwith rosemary jus and roasted vegetables\n\nDessert\nChocolate Soufflé`}
            className="w-full h-48 bg-stone-900 border border-stone-700 rounded-lg p-3 text-stone-200 text-sm font-mono resize-y focus:outline-none focus:ring-2 focus:ring-brand-500/50"
          />
          <div className="flex justify-end">
            <Button onClick={handlePasteSubmit} disabled={!pastedText.trim()}>
              Parse Menu
            </Button>
          </div>
        </Card>
      ) : (
        <>
          {/* Drop zone */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${
              isDragOver
                ? 'border-brand-500 bg-brand-500/10'
                : 'border-stone-700 hover:border-stone-600 bg-stone-900/50'
            }`}
          >
            <div className="text-4xl mb-3 opacity-50">{isDragOver ? '↓' : '◉'}</div>
            <p className="text-stone-300 font-medium mb-1">
              {isDragOver ? 'Drop files here' : 'Drop menu files here or click to browse'}
            </p>
            <p className="text-stone-500 text-sm">
              PDF, images (JPG, PNG, HEIC), Word (.docx), or plain text
            </p>
            <p className="text-stone-600 text-xs mt-2">
              Upload 100+ files at once — they&apos;ll be processed in queue
            </p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={ACCEPTED_EXTENSIONS.join(',')}
              onChange={(e) => e.target.files && handleFiles(e.target.files)}
              className="hidden"
            />
          </div>

          {/* File list */}
          {files.length > 0 && (
            <Card className="divide-y divide-stone-800">
              <div className="p-3 flex items-center justify-between">
                <span className="text-sm text-stone-400">
                  {files.length} file{files.length !== 1 ? 's' : ''} selected
                </span>
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" onClick={() => setFiles([])}>
                    Clear All
                  </Button>
                  <Button
                    size="sm"
                    onClick={processAll}
                    disabled={files.every((f) => f.status !== 'pending')}
                  >
                    Process All
                  </Button>
                </div>
              </div>
              {files.map((f) => (
                <div key={f.id} className="p-3 flex items-center gap-3">
                  <span className={`text-lg ${statusColor(f.status)}`}>{statusIcon(f.status)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-stone-300 truncate">{f.file.name}</p>
                    {f.status === 'done' && f.dishCount !== undefined && (
                      <p className="text-xs text-green-500">{f.dishCount} dishes found</p>
                    )}
                    {f.status === 'error' && <p className="text-xs text-red-400">{f.error}</p>}
                  </div>
                  <span className="text-xs text-stone-600">
                    {(f.file.size / 1024).toFixed(0)} KB
                  </span>
                  {f.status === 'pending' && (
                    <button
                      onClick={() => removeFile(f.id)}
                      className="text-stone-600 hover:text-stone-400 text-sm"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </Card>
          )}
        </>
      )}
    </div>
  )
}
