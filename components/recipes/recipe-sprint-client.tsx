'use client'

// Recipe Sprint Mode - Queue-based backfill capture
// Chef works through all unrecorded components one at a time.
// Designed for maximum speed: paste description → AI parses → confirm → next.

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Alert } from '@/components/ui/alert'
import { createRecipe, addIngredientToRecipe, linkRecipeToComponent } from '@/lib/recipes/actions'
import { parseRecipeFromText } from '@/lib/ai/parse-recipe'
import type { ParsedIngredient } from '@/lib/ai/parse-recipe'
import type { UnrecordedComponentForSprint } from '@/lib/recipes/actions'
import { format } from 'date-fns'
import {
  BookOpen,
  ChevronRight,
  SkipForward,
  CheckCircle,
  Mic,
  MicOff,
} from '@/components/ui/icons'

type Props = {
  initialItems: UnrecordedComponentForSprint[]
  aiConfigured: boolean
}

export function RecipeSprintClient({ initialItems, aiConfigured }: Props) {
  const router = useRouter()

  // Queue state: pending = items not yet captured, skipped items append to end
  const [queue, setQueue] = useState<UnrecordedComponentForSprint[]>(initialItems)
  const [doneCount, setDoneCount] = useState(0)
  const [rawText, setRawText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [lastSaved, setLastSaved] = useState<string | null>(null)
  const [isListening, setIsListening] = useState(false)
  const [speechSupported, setSpeechSupported] = useState(false)
  const recognitionRef = useRef<any>(null)

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      setSpeechSupported(false)
      return
    }
    setSpeechSupported(true)

    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'

    recognition.onresult = (event: any) => {
      let finalTranscript = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' '
        }
      }
      if (finalTranscript) {
        setRawText((prev) => prev + finalTranscript)
      }
    }

    recognition.onerror = (event: any) => {
      console.error('[speech]', event.error)
      setIsListening(false)
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    recognitionRef.current = recognition

    return () => {
      try {
        recognition.stop()
      } catch {
        // ignore
      }
    }
  }, [])

  const toggleListening = () => {
    if (!recognitionRef.current) return
    if (isListening) {
      recognitionRef.current.stop()
      setIsListening(false)
    } else {
      try {
        recognitionRef.current.start()
        setIsListening(true)
      } catch {
        // Already started, ignore
      }
    }
  }

  const total = initialItems.length
  const remaining = queue.length
  const current = queue[0] ?? null
  const progressPercent = total === 0 ? 100 : Math.round((doneCount / total) * 100)

  const handleSave = async () => {
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop()
      setIsListening(false)
    }
    if (!current || !rawText.trim()) return
    setLoading(true)
    setError('')

    try {
      let recipeName = current.componentName
      let recipeCategory = current.componentCategory || 'other'
      let recipeMethod = rawText.trim()
      let ingredientsList: ParsedIngredient[] = []

      if (aiConfigured) {
        const result = await parseRecipeFromText(`${current.componentName}: ${rawText}`)
        recipeName = result.parsed.name || current.componentName
        recipeCategory = result.parsed.category || current.componentCategory || 'other'
        recipeMethod = result.parsed.method || rawText.trim()
        ingredientsList = result.parsed.ingredients || []
      }

      const recipeResult = await createRecipe({
        name: recipeName,
        category: recipeCategory,
        method: recipeMethod,
      })

      for (let i = 0; i < ingredientsList.length; i++) {
        const ing = ingredientsList[i]
        await addIngredientToRecipe(recipeResult.recipe.id, {
          ingredient_name: ing.name,
          ingredient_category: ing.category || 'other',
          ingredient_default_unit: ing.unit || 'unit',
          quantity: ing.quantity || 1,
          unit: ing.unit || 'unit',
          preparation_notes: ing.preparation_notes || undefined,
          is_optional: ing.is_optional || false,
          sort_order: i,
        })
      }

      await linkRecipeToComponent(recipeResult.recipe.id, current.componentId)

      setLastSaved(recipeName)
      setDoneCount((prev) => prev + 1)
      setQueue((prev) => prev.slice(1))
      setRawText('')
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Failed to save recipe')
    } finally {
      setLoading(false)
    }
  }

  const handleSkip = () => {
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop()
      setIsListening(false)
    }
    if (!current) return
    // Move current to end of queue
    setQueue((prev) => [...prev.slice(1), prev[0]])
    setRawText('')
    setError('')
  }

  // All done
  if (queue.length === 0) {
    return (
      <div className="max-w-2xl mx-auto text-center space-y-6 py-12">
        <div className="flex justify-center">
          <div className="rounded-full bg-green-900 p-6">
            <CheckCircle className="h-16 w-16 text-emerald-600" />
          </div>
        </div>
        <div>
          <h2 className="text-2xl font-bold text-stone-100">Recipe Book is up to date</h2>
          <p className="text-stone-300 mt-2">
            {doneCount > 0
              ? `You just captured ${doneCount} recipe${doneCount !== 1 ? 's' : ''}. Your future self will thank you.`
              : 'Nothing left to record - all dishes have recipes.'}
          </p>
        </div>
        <div className="flex justify-center gap-3">
          <Link href="/recipes">
            <Button variant="secondary">View Recipe Book</Button>
          </Link>
          <Link href="/dashboard">
            <Button>Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex justify-between items-center text-sm">
          <span className="font-medium text-stone-300">
            {doneCount} captured · {remaining} remaining
          </span>
          <span className="text-stone-500">{progressPercent}%</span>
        </div>
        <div className="h-2 bg-stone-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-brand-500 rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Success flash */}
      {lastSaved && !error && (
        <Alert variant="success">
          Saved: <strong>{lastSaved}</strong> - recipe recorded and linked.
        </Alert>
      )}

      {error && <Alert variant="error">{error}</Alert>}

      {/* Current component card */}
      {current && (
        <Card className="border-brand-600 shadow-sm">
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-xl">{current.componentName}</CardTitle>
                  <Badge variant="default">{current.componentCategory}</Badge>
                </div>
                <div className="text-sm text-stone-500 flex items-center gap-1.5">
                  <span>
                    {current.eventOccasion || 'Event'} ·{' '}
                    {format(new Date(current.eventDate + 'T12:00:00'), 'MMM d, yyyy')}
                    {current.clientName && ` · ${current.clientName}`}
                  </span>
                  <ChevronRight className="h-3.5 w-3.5" />
                  <Link
                    href={`/events/${current.eventId}`}
                    className="text-brand-500 hover:text-brand-400"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View event
                  </Link>
                </div>
              </div>
              <div className="flex items-center gap-1 text-xs text-stone-300 shrink-0">
                <BookOpen className="h-3.5 w-3.5" />
                <span>{remaining} left</span>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-stone-300">
                  {aiConfigured
                    ? 'Describe how you make it - ingredients, method, anything you remember'
                    : 'Describe the method (will save as-is)'}
                </label>
                {speechSupported && (
                  <button
                    type="button"
                    onClick={toggleListening}
                    disabled={loading}
                    className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                      isListening
                        ? 'bg-red-900/60 text-red-300 hover:bg-red-900/80 animate-pulse'
                        : 'bg-stone-700 text-stone-300 hover:bg-stone-600'
                    }`}
                  >
                    {isListening ? (
                      <>
                        <MicOff className="h-3.5 w-3.5" />
                        Stop
                      </>
                    ) : (
                      <>
                        <Mic className="h-3.5 w-3.5" />
                        Dictate
                      </>
                    )}
                  </button>
                )}
              </div>
              <Textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder={`How do you make ${current.componentName}? Ingredients and amounts, key steps, yield...`}
                rows={6}
                disabled={loading}
                autoFocus
              />
              {isListening && (
                <p className="text-xs text-red-400 animate-pulse mt-1">
                  Listening... speak naturally, then tap Stop when done
                </p>
              )}
              {aiConfigured && (
                <p className="text-xs text-stone-300 mt-1">
                  Your description will be parsed into a structured recipe - review it on the recipe
                  page after saving.
                </p>
              )}
            </div>

            <div className="flex justify-between items-center">
              <button
                onClick={handleSkip}
                disabled={loading}
                className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-300 disabled:opacity-50"
              >
                <SkipForward className="h-3.5 w-3.5" />
                Skip for now (come back later)
              </button>

              <div className="flex gap-2">
                <Link
                  href={`/recipes/new?component=${current.componentId}&componentName=${encodeURIComponent(current.componentName)}&componentCategory=${encodeURIComponent(current.componentCategory)}`}
                >
                  <Button variant="secondary" size="sm" disabled={loading}>
                    Full Editor
                  </Button>
                </Link>
                <Button onClick={handleSave} disabled={loading || !rawText.trim()} size="sm">
                  {loading ? 'Saving...' : aiConfigured ? 'Parse & Save →' : 'Save →'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Queue preview - next 3 items */}
      {queue.length > 1 && (
        <div className="space-y-1">
          <p className="text-xs font-semibold text-stone-300 uppercase tracking-wide">Up next</p>
          {queue.slice(1, 4).map((item, i) => (
            <div
              key={`${item.componentId}-${i}`}
              className="flex items-center gap-2 px-3 py-2 bg-stone-800 rounded-lg text-sm text-stone-500"
            >
              <span className="font-medium text-stone-300">{item.componentName}</span>
              <span className="text-stone-300">·</span>
              <span>{item.eventOccasion || 'Event'}</span>
              <span className="text-stone-300">·</span>
              <span>{format(new Date(item.eventDate + 'T12:00:00'), 'MMM d')}</span>
            </div>
          ))}
          {queue.length > 4 && (
            <p className="text-xs text-stone-300 px-3">+ {queue.length - 4} more</p>
          )}
        </div>
      )}

      <div className="flex justify-between items-center pt-2 border-t border-stone-800">
        <Link href="/dashboard" className="text-sm text-stone-500 hover:text-stone-300">
          Done for today
        </Link>
        <Link href="/recipes" className="text-sm text-stone-500 hover:text-stone-300">
          View Recipe Book
        </Link>
      </div>
    </div>
  )
}
