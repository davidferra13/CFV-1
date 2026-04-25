/* eslint-disable @next/next/no-img-element */
'use client'

import { useState, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  parseWhiteboardImage,
  type WhiteboardItem,
  type WhiteboardResult,
} from '@/lib/ai/parse-whiteboard'
import { parseBrainDump, type BrainDumpResult } from '@/lib/ai/parse-brain-dump'
import { useRouter } from 'next/navigation'

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
  { label: string; color: 'default' | 'success' | 'warning' | 'error' | 'info'; icon: string }
> = {
  client_followup: { label: 'Client Follow-up', color: 'error', icon: '📞' },
  dinner_detail: { label: 'Dinner Detail', color: 'info', icon: '🍽️' },
  recipe_note: { label: 'Recipe Note', color: 'success', icon: '📝' },
  prep_task: { label: 'Prep Task', color: 'warning', icon: '🔪' },
  shopping_item: { label: 'Shopping', color: 'default', icon: '🛒' },
  menu_idea: { label: 'Menu Idea', color: 'info', icon: '📋' },
  business_note: { label: 'Business', color: 'default', icon: '💼' },
  contact_info: { label: 'Contact', color: 'info', icon: '👤' },
  date_reminder: { label: 'Date', color: 'warning', icon: '📅' },
  general: { label: 'Note', color: 'default', icon: '📌' },
}

const URGENCY_CONFIG: Record<string, { label: string; variant: 'error' | 'warning' | 'success' }> =
  {
    high: { label: 'Urgent', variant: 'error' },
    medium: { label: 'This week', variant: 'warning' },
    low: { label: 'When ready', variant: 'success' },
  }

type CaptureMode = 'photo' | 'text'

export function WhiteboardCapture() {
  const [mode, setMode] = useState<CaptureMode>('photo')
  const [preview, setPreview] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [textInput, setTextInput] = useState('')
  const [parsing, setParsing] = useState(false)
  const [result, setResult] = useState<WhiteboardResult | null>(null)
  const [brainDumpResult, setBrainDumpResult] = useState<BrainDumpResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (!selected) return

    if (!ACCEPTED_TYPES.includes(selected.type) && !selected.name.toLowerCase().endsWith('.heic')) {
      setError('Upload a photo (JPEG, PNG, WebP, or HEIC)')
      return
    }
    if (selected.size > MAX_FILE_SIZE) {
      setError('File too large (max 15MB)')
      return
    }

    setFile(selected)
    setError(null)
    setResult(null)
    setBrainDumpResult(null)

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

  const parsePhoto = async () => {
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

  const parseText = async () => {
    if (!textInput.trim()) return
    setParsing(true)
    setError(null)

    try {
      const parsed = await parseBrainDump(textInput)
      setBrainDumpResult(parsed.parsed)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse text')
    } finally {
      setParsing(false)
    }
  }

  const reset = () => {
    setFile(null)
    setPreview(null)
    setResult(null)
    setBrainDumpResult(null)
    setError(null)
    setTextInput('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // Group whiteboard items by category
  const groupedItems =
    result?.items.reduce<Record<string, WhiteboardItem[]>>((acc, item) => {
      const key = item.category
      if (!acc[key]) acc[key] = []
      acc[key].push(item)
      return acc
    }, {}) ?? {}

  // Sort categories: client_followup first, then by urgency
  const sortedCategories = Object.entries(groupedItems).sort(([a], [b]) => {
    if (a === 'client_followup') return -1
    if (b === 'client_followup') return 1
    return 0
  })

  return (
    <div className="space-y-6">
      {/* Mode toggle */}
      <div className="flex gap-2">
        <Button
          variant={mode === 'photo' ? 'primary' : 'ghost'}
          size="sm"
          onClick={() => {
            setMode('photo')
            reset()
          }}
        >
          📸 Photo
        </Button>
        <Button
          variant={mode === 'text' ? 'primary' : 'ghost'}
          size="sm"
          onClick={() => {
            setMode('text')
            reset()
          }}
        >
          ✏️ Brain Dump
        </Button>
      </div>

      {/* Photo capture */}
      {mode === 'photo' && !result && (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className="border-2 border-dashed border-stone-300 dark:border-stone-700 rounded-xl p-8 text-center hover:border-stone-400 dark:hover:border-stone-600 transition-colors cursor-pointer"
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
                className="max-h-64 mx-auto rounded-lg shadow-md"
              />
              <p className="text-sm text-stone-500 dark:text-stone-400">{file?.name}</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-4xl">📸</div>
              <p className="text-stone-600 dark:text-stone-300 font-medium">
                Snap your whiteboard or drop a photo
              </p>
              <p className="text-sm text-stone-400 dark:text-stone-500">
                JPEG, PNG, WebP, or HEIC up to 15MB
              </p>
            </div>
          )}
        </div>
      )}

      {/* Text brain dump */}
      {mode === 'text' && !brainDumpResult && (
        <div className="space-y-3">
          <textarea
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="Dump everything here. Client names, dinner details, recipe ideas, dates, to-dos, whatever is in your head..."
            className="w-full h-48 p-4 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 resize-y focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          />
        </div>
      )}

      {/* Parse button */}
      {((mode === 'photo' && file && !result) ||
        (mode === 'text' && textInput.trim() && !brainDumpResult)) && (
        <Button
          variant="primary"
          onClick={mode === 'photo' ? parsePhoto : parseText}
          loading={parsing}
          disabled={parsing}
          className="w-full sm:w-auto"
        >
          {parsing ? 'Reading...' : mode === 'photo' ? 'Read & Organize' : 'Parse & Organize'}
        </Button>
      )}

      {/* Error */}
      {error && (
        <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Whiteboard photo results */}
      {result && (
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
            <Button variant="ghost" size="sm" onClick={reset}>
              Scan another
            </Button>
          </div>

          {result.warnings.length > 0 && (
            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 text-sm">
              {result.warnings.join('. ')}
            </div>
          )}

          {sortedCategories.map(([category, items]) => {
            const config = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.general
            return (
              <Card key={category}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <span>{config.icon}</span>
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

          {/* Raw transcription collapsible */}
          {result.rawTranscription && (
            <details className="group">
              <summary className="cursor-pointer text-sm text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300">
                View raw transcription
              </summary>
              <pre className="mt-2 p-4 bg-stone-50 dark:bg-stone-900 rounded-lg text-xs text-stone-600 dark:text-stone-400 whitespace-pre-wrap overflow-auto max-h-64">
                {result.rawTranscription}
              </pre>
            </details>
          )}
        </div>
      )}

      {/* Brain dump text results */}
      {brainDumpResult && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">Parsed</h2>
            <Button variant="ghost" size="sm" onClick={reset}>
              Dump more
            </Button>
          </div>

          {brainDumpResult.clients.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <span>👤</span> Clients
                  <Badge variant="info">{brainDumpResult.clients.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {brainDumpResult.clients.map((c: any, i: number) => (
                  <div
                    key={i}
                    className="p-3 rounded-lg bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-700"
                  >
                    <p className="font-medium text-stone-900 dark:text-stone-100">{c.full_name}</p>
                    {c.allergies?.length > 0 && (
                      <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                        Allergies: {c.allergies.join(', ')}
                      </p>
                    )}
                    {c.dietary_restrictions?.length > 0 && (
                      <p className="text-xs text-amber-600 dark:text-amber-400">
                        Diet: {c.dietary_restrictions.join(', ')}
                      </p>
                    )}
                    {c.phone && <p className="text-xs text-stone-500 mt-1">{c.phone}</p>}
                    {c.email && <p className="text-xs text-stone-500">{c.email}</p>}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {brainDumpResult.recipes.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <span>📝</span> Recipes
                  <Badge variant="success">{brainDumpResult.recipes.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {brainDumpResult.recipes.map((r: any, i: number) => (
                  <div
                    key={i}
                    className="p-3 rounded-lg bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-700"
                  >
                    <p className="font-medium text-stone-900 dark:text-stone-100">{r.name}</p>
                    {r.category && (
                      <Badge variant="default" className="mt-1">
                        {r.category}
                      </Badge>
                    )}
                    {r.ingredients?.length > 0 && (
                      <p className="text-xs text-stone-500 dark:text-stone-400 mt-2">
                        {r.ingredients.length} ingredient{r.ingredients.length !== 1 ? 's' : ''}:{' '}
                        {r.ingredients.map((ing: any) => ing.name).join(', ')}
                      </p>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {brainDumpResult.notes.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <span>📌</span> Notes
                  <Badge variant="default">{brainDumpResult.notes.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {brainDumpResult.notes.map((n, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-lg bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-700"
                  >
                    <p className="text-sm text-stone-900 dark:text-stone-100">{n.content}</p>
                    <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                      Suggested: {n.suggestedAction}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}

function WhiteboardItemCard({ item }: { item: WhiteboardItem }) {
  const urgencyConfig = URGENCY_CONFIG[item.urgency]

  return (
    <div className="p-3 rounded-lg bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-700 flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm text-stone-900 dark:text-stone-100 font-medium flex-1">
          {item.content}
        </p>
        <Badge variant={urgencyConfig.variant}>{urgencyConfig.label}</Badge>
      </div>

      <div className="flex items-center gap-3 flex-wrap text-xs text-stone-500 dark:text-stone-400">
        {item.clientName && (
          <span className="flex items-center gap-1">
            <span>👤</span> {item.clientName}
          </span>
        )}
        {item.eventDate && (
          <span className="flex items-center gap-1">
            <span>📅</span> {item.eventDate}
          </span>
        )}
      </div>

      <p className="text-xs text-brand-600 dark:text-brand-400">Next: {item.suggestedAction}</p>
    </div>
  )
}
