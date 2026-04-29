/* eslint-disable @next/next/no-img-element */
'use client'

import { useCallback, useRef, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Camera, FileText, Upload } from '@/components/ui/icons'
import {
  parseWhiteboardImage,
  type WhiteboardItem,
  type WhiteboardResult,
} from '@/lib/ai/parse-whiteboard'
import { InstantNotePanel } from './instant-note-panel'

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic']
const MAX_FILE_SIZE = 15 * 1024 * 1024

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      resolve(result.split(',')[1])
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

const CATEGORY_CONFIG: Record<
  string,
  { label: string; color: 'default' | 'success' | 'warning' | 'error' | 'info' }
> = {
  client_followup: { label: 'Client Follow-up', color: 'error' },
  dinner_detail: { label: 'Dinner Detail', color: 'info' },
  recipe_note: { label: 'Recipe Note', color: 'success' },
  prep_task: { label: 'Prep Task', color: 'warning' },
  shopping_item: { label: 'Shopping', color: 'default' },
  menu_idea: { label: 'Menu Idea', color: 'info' },
  business_note: { label: 'Business', color: 'default' },
  contact_info: { label: 'Contact', color: 'info' },
  date_reminder: { label: 'Date', color: 'warning' },
  general: { label: 'Note', color: 'default' },
}

const URGENCY_CONFIG: Record<string, { label: string; variant: 'error' | 'warning' | 'success' }> =
  {
    high: { label: 'Urgent', variant: 'error' },
    medium: { label: 'This week', variant: 'warning' },
    low: { label: 'When ready', variant: 'success' },
  }

type CaptureMode = 'photo' | 'text'

export function WhiteboardCapture({
  initialReviewQueue,
  initialTrackedActions,
}: {
  initialReviewQueue: any[]
  initialTrackedActions: any[]
}) {
  const [mode, setMode] = useState<CaptureMode>('text')
  const [preview, setPreview] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [parsing, setParsing] = useState(false)
  const [result, setResult] = useState<WhiteboardResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const resetPhoto = useCallback(() => {
    setFile(null)
    setPreview(null)
    setResult(null)
    setError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (!selected) return

    if (!ACCEPTED_TYPES.includes(selected.type) && !selected.name.toLowerCase().endsWith('.heic')) {
      setError('Upload a photo: JPEG, PNG, WebP, or HEIC')
      return
    }
    if (selected.size > MAX_FILE_SIZE) {
      setError('File too large. Maximum size is 15MB.')
      return
    }

    setFile(selected)
    setError(null)
    setResult(null)

    const reader = new FileReader()
    reader.onload = () => setPreview(reader.result as string)
    reader.readAsDataURL(selected)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const dropped = e.dataTransfer.files[0]
      if (!dropped) return

      const fakeEvent = {
        target: { files: [dropped] },
      } as unknown as React.ChangeEvent<HTMLInputElement>
      handleFileSelect(fakeEvent)
    },
    [handleFileSelect]
  )

  async function parsePhoto() {
    if (!file) return
    setParsing(true)
    setError(null)

    try {
      const base64 = await fileToBase64(file)
      const parsed = await parseWhiteboardImage(base64, file.type || 'image/jpeg')
      setResult(parsed)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse photo')
    } finally {
      setParsing(false)
    }
  }

  const groupedItems =
    result?.items.reduce<Record<string, WhiteboardItem[]>>((acc, item) => {
      const key = item.category
      if (!acc[key]) acc[key] = []
      acc[key].push(item)
      return acc
    }, {}) ?? {}

  const sortedCategories = Object.entries(groupedItems).sort(([a], [b]) => {
    if (a === 'client_followup') return -1
    if (b === 'client_followup') return 1
    return 0
  })

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <Button
          variant={mode === 'text' ? 'primary' : 'ghost'}
          size="sm"
          onClick={() => setMode('text')}
        >
          <FileText className="h-4 w-4" />
          Instant Note
        </Button>
        <Button
          variant={mode === 'photo' ? 'primary' : 'ghost'}
          size="sm"
          onClick={() => {
            setMode('photo')
            resetPhoto()
          }}
        >
          <Camera className="h-4 w-4" />
          Photo
        </Button>
      </div>

      {mode === 'text' ? (
        <InstantNotePanel
          initialReviewQueue={initialReviewQueue}
          initialTrackedActions={initialTrackedActions}
        />
      ) : null}

      {mode === 'photo' && !result ? (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className="cursor-pointer rounded-xl border-2 border-dashed border-stone-300 p-8 text-center transition-colors hover:border-stone-400 dark:border-stone-700 dark:hover:border-stone-600"
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_TYPES.join(',')}
            capture="environment"
            onChange={handleFileSelect}
            className="hidden"
          />

          {preview ? (
            <div className="space-y-4">
              <img
                src={preview}
                alt="Whiteboard preview"
                className="mx-auto max-h-64 rounded-lg shadow-md"
              />
              <p className="text-sm text-stone-500 dark:text-stone-400">{file?.name}</p>
            </div>
          ) : (
            <div className="space-y-3">
              <Upload className="mx-auto h-10 w-10 text-stone-400" />
              <p className="font-medium text-stone-600 dark:text-stone-300">
                Snap your whiteboard or drop a photo
              </p>
              <p className="text-sm text-stone-400 dark:text-stone-500">
                JPEG, PNG, WebP, or HEIC up to 15MB
              </p>
            </div>
          )}
        </div>
      ) : null}

      {mode === 'photo' && file && !result ? (
        <Button
          variant="primary"
          onClick={parsePhoto}
          loading={parsing}
          disabled={parsing}
          className="w-full sm:w-auto"
        >
          {parsing ? 'Reading...' : 'Read & Organize'}
        </Button>
      ) : null}

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/50 dark:text-red-400">
          {error}
        </div>
      ) : null}

      {result ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">
                Found {result.items.length} item{result.items.length !== 1 ? 's' : ''}
              </h2>
              <Badge
                variant={
                  result.confidence === 'high'
                    ? 'success'
                    : result.confidence === 'medium'
                      ? 'warning'
                      : 'error'
                }
              >
                {result.confidence} confidence
              </Badge>
            </div>
            <Button variant="ghost" size="sm" onClick={resetPhoto}>
              Scan another
            </Button>
          </div>

          {result.warnings.length > 0 ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-400">
              {result.warnings.join('. ')}
            </div>
          ) : null}

          {sortedCategories.map(([category, items]) => {
            const config = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.general
            return (
              <Card key={category}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <span>{config.label}</span>
                    <Badge variant={config.color}>{items.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {items.map((item, idx) => (
                    <WhiteboardItemCard key={idx} item={item} />
                  ))}
                </CardContent>
              </Card>
            )
          })}

          {result.rawTranscription ? (
            <details className="group">
              <summary className="cursor-pointer text-sm text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-300">
                View raw transcription
              </summary>
              <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap rounded-lg bg-stone-50 p-4 text-xs text-stone-600 dark:bg-stone-900 dark:text-stone-400">
                {result.rawTranscription}
              </pre>
            </details>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

function WhiteboardItemCard({ item }: { item: WhiteboardItem }) {
  const urgencyConfig = URGENCY_CONFIG[item.urgency]

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-stone-200 bg-stone-50 p-3 dark:border-stone-700 dark:bg-stone-800/50">
      <div className="flex items-start justify-between gap-2">
        <p className="flex-1 text-sm font-medium text-stone-900 dark:text-stone-100">
          {item.content}
        </p>
        <Badge variant={urgencyConfig.variant}>{urgencyConfig.label}</Badge>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs text-stone-500 dark:text-stone-400">
        {item.clientName ? <span>Client: {item.clientName}</span> : null}
        {item.eventDate ? <span>Date: {item.eventDate}</span> : null}
      </div>

      <p className="text-xs text-brand-600 dark:text-brand-400">Next: {item.suggestedAction}</p>
    </div>
  )
}
