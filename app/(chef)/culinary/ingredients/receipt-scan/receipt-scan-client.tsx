'use client'

import { useState, useCallback, useTransition, useRef } from 'react'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  scanReceipt,
  importReceiptPrices,
  type ReceiptScanResult,
} from '@/lib/ingredients/receipt-scan-actions'
import type { ReceiptLineItem } from '@/lib/ai/receipt-ocr'
import { getIngredients } from '@/lib/recipes/actions'

type MatchedItem = ReceiptLineItem & {
  ingredientId: string | null
  ingredientName: string | null
  selected: boolean
}

type Ingredient = {
  id: string
  name: string
  category: string
  default_unit: string
  [key: string]: unknown
}

export function ReceiptScanClient() {
  const [step, setStep] = useState<'upload' | 'scanning' | 'review' | 'importing' | 'done'>(
    'upload'
  )
  const [error, setError] = useState<string | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [storeName, setStoreName] = useState('')
  const [purchaseDate, setPurchaseDate] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })
  const [items, setItems] = useState<MatchedItem[]>([])
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number } | null>(
    null
  )
  const [isPending, startTransition] = useTransition()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (JPEG, PNG, etc.)')
      return
    }

    if (file.size > 20 * 1024 * 1024) {
      setError('Image must be under 20MB')
      return
    }

    setError(null)
    const reader = new FileReader()
    reader.onload = (ev) => {
      const result = ev.target?.result as string
      setImagePreview(result)
    }
    reader.readAsDataURL(file)
  }, [])

  const handleScan = useCallback(() => {
    if (!imagePreview) return

    setError(null)
    setStep('scanning')

    startTransition(async () => {
      try {
        // Extract base64 data from data URL
        const base64 = imagePreview.split(',')[1]
        const mimeType = imagePreview.split(';')[0].split(':')[1]

        const result = await scanReceipt(base64, mimeType)

        if (!result.success || !result.receipt) {
          setError(result.error || 'Failed to scan receipt')
          setStep('upload')
          return
        }

        const receipt = result.receipt

        // Set store name and date from OCR if available
        if (receipt.storeName) setStoreName(receipt.storeName)
        if (receipt.date) setPurchaseDate(receipt.date)

        // Load user's ingredients for matching
        let userIngredients: Ingredient[] = []
        try {
          userIngredients = await getIngredients()
          setIngredients(userIngredients)
        } catch {
          // Non-blocking, user can still manually match
        }

        // Auto-match receipt items to ingredients by fuzzy name
        const matched: MatchedItem[] = receipt.items.map((item) => {
          const match = findBestMatch(item.productName, userIngredients)
          return {
            ...item,
            ingredientId: match?.id || null,
            ingredientName: match?.name || null,
            selected: !!match,
          }
        })

        setItems(matched)
        setStep('review')
      } catch (err: any) {
        if (err?.message?.includes('Ollama') || err?.name === 'OllamaOfflineError') {
          setError('AI parsing is temporarily unavailable. Please try again in a moment.')
        } else {
          setError(err?.message || 'Failed to scan receipt')
        }
        setStep('upload')
      }
    })
  }, [imagePreview])

  const handleImport = useCallback(() => {
    const selectedItems = items.filter((i) => i.selected && i.ingredientId)
    if (selectedItems.length === 0) {
      toast.error('No items selected for import')
      return
    }
    if (!storeName.trim()) {
      toast.error('Please enter a store name')
      return
    }

    setStep('importing')
    startTransition(async () => {
      try {
        const result = await importReceiptPrices({
          storeName: storeName.trim(),
          purchaseDate,
          items: selectedItems.map((i) => ({
            ingredientId: i.ingredientId!,
            productName: i.productName,
            priceCents: i.totalPrice || i.unitPrice,
            unit: i.unit,
            quantity: i.quantity,
          })),
        })

        if (!result.success) {
          setError(result.error || 'Import failed')
          setStep('review')
          return
        }

        setImportResult({ imported: result.imported, skipped: result.skipped })
        setStep('done')
        toast.success(
          `Imported ${result.imported} price${result.imported !== 1 ? 's' : ''} from receipt`
        )
      } catch (err: any) {
        setError(err?.message || 'Import failed')
        setStep('review')
      }
    })
  }, [items, storeName, purchaseDate])

  const toggleItem = (index: number) => {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, selected: !item.selected } : item))
    )
  }

  const setItemIngredient = (index: number, ingredientId: string | null) => {
    const ing = ingredients.find((i) => i.id === ingredientId)
    setItems((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
              ...item,
              ingredientId,
              ingredientName: ing?.name || null,
              selected: !!ingredientId,
            }
          : item
      )
    )
  }

  const reset = () => {
    setStep('upload')
    setError(null)
    setImagePreview(null)
    setStoreName('')
    const _rsd = new Date()
    setPurchaseDate(
      `${_rsd.getFullYear()}-${String(_rsd.getMonth() + 1).padStart(2, '0')}-${String(_rsd.getDate()).padStart(2, '0')}`
    )
    setItems([])
    setImportResult(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-stone-100">Receipt Scanner</h1>
          <p className="text-stone-400 mt-1">
            Upload a grocery receipt photo to automatically extract and import prices
          </p>
        </div>
        <Link href="/culinary/ingredients">
          <Button variant="ghost">Back to Ingredients</Button>
        </Link>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      {/* Step 1: Upload */}
      {step === 'upload' && (
        <Card>
          <CardHeader>
            <CardTitle>Upload Receipt Photo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-stone-400">
              Take a photo of your grocery receipt. The AI will extract line items and prices.
            </p>

            <div className="flex flex-col items-center gap-4">
              {imagePreview ? (
                <div className="relative max-w-sm">
                  <img
                    src={imagePreview}
                    alt="Receipt preview"
                    className="max-h-96 rounded-lg border border-stone-700"
                  />
                  <button
                    onClick={() => {
                      setImagePreview(null)
                      if (fileInputRef.current) fileInputRef.current.value = ''
                    }}
                    className="absolute top-2 right-2 bg-stone-900/80 text-stone-300 rounded-full w-6 h-6 flex items-center justify-center hover:bg-stone-800"
                  >
                    x
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full max-w-sm h-48 border-2 border-dashed border-stone-600 rounded-lg cursor-pointer hover:border-stone-500 transition-colors">
                  <div className="text-center p-4">
                    <p className="text-stone-300 font-medium">Click to select receipt image</p>
                    <p className="text-sm text-stone-500 mt-1">JPEG, PNG, HEIC (max 20MB)</p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                </label>
              )}
            </div>

            {imagePreview && (
              <div className="flex justify-center">
                <Button onClick={handleScan} disabled={isPending}>
                  Scan Receipt
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 2: Scanning */}
      {step === 'scanning' && (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="animate-pulse">
              <p className="text-lg text-stone-300">Scanning receipt...</p>
              <p className="text-sm text-stone-500 mt-2">
                This may take up to 2 minutes for large receipts
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Review */}
      {step === 'review' && (
        <>
          {/* Store + Date */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-stone-300">Store Name</label>
                  <Input
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    placeholder="e.g. Market Basket"
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-stone-300">Purchase Date</label>
                  <Input
                    type="date"
                    value={purchaseDate}
                    onChange={(e) => setPurchaseDate(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Items */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Scanned Items ({items.length})</CardTitle>
                <div className="flex gap-2 text-sm">
                  <Badge variant="success">
                    {items.filter((i) => i.selected && i.ingredientId).length} matched
                  </Badge>
                  <Badge variant="default">
                    {items.filter((i) => !i.ingredientId).length} unmatched
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {items.length === 0 ? (
                <p className="text-stone-500 text-center py-4">No items found on receipt</p>
              ) : (
                <div className="space-y-2">
                  {items.map((item, index) => (
                    <div
                      key={index}
                      className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                        item.selected && item.ingredientId
                          ? 'border-emerald-800 bg-emerald-950/20'
                          : 'border-stone-700 bg-stone-900/50'
                      }`}
                    >
                      {/* Checkbox */}
                      <input
                        type="checkbox"
                        checked={item.selected}
                        onChange={() => toggleItem(index)}
                        disabled={!item.ingredientId}
                        className="w-4 h-4 rounded border-stone-600"
                      />

                      {/* Product info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-stone-200 truncate">{item.productName}</p>
                        <p className="text-xs text-stone-500 truncate">{item.rawText}</p>
                      </div>

                      {/* Price */}
                      <div className="text-right shrink-0">
                        <p className="text-sm font-medium text-stone-100">
                          ${((item.totalPrice || item.unitPrice) / 100).toFixed(2)}
                        </p>
                        {item.quantity > 1 && (
                          <p className="text-xs text-stone-500">
                            {item.quantity} x ${(item.unitPrice / 100).toFixed(2)}
                          </p>
                        )}
                        <p className="text-xs text-stone-500">per {item.unit}</p>
                      </div>

                      {/* Confidence */}
                      <div className="shrink-0">
                        <Badge
                          variant={
                            item.confidence >= 0.8
                              ? 'success'
                              : item.confidence >= 0.5
                                ? 'warning'
                                : 'error'
                          }
                        >
                          {Math.round(item.confidence * 100)}%
                        </Badge>
                      </div>

                      {/* Ingredient match dropdown */}
                      <div className="shrink-0 w-48">
                        <select
                          value={item.ingredientId || ''}
                          onChange={(e) => setItemIngredient(index, e.target.value || null)}
                          className="w-full text-xs border border-stone-600 rounded-md px-2 py-1.5 bg-stone-900 text-stone-300"
                        >
                          <option value="">-- No match --</option>
                          {ingredients.map((ing) => (
                            <option key={ing.id} value={ing.id}>
                              {ing.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Summary row */}
              {items.length > 0 && (
                <div className="flex items-center justify-between mt-6 pt-4 border-t border-stone-700">
                  <div className="text-sm text-stone-400">
                    {items.filter((i) => i.selected && i.ingredientId).length} of {items.length}{' '}
                    items will be imported
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" onClick={reset}>
                      Start Over
                    </Button>
                    <Button
                      onClick={handleImport}
                      disabled={
                        isPending || items.filter((i) => i.selected && i.ingredientId).length === 0
                      }
                    >
                      Import Prices
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Step 4: Importing */}
      {step === 'importing' && (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="animate-pulse">
              <p className="text-lg text-stone-300">Importing prices...</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 5: Done */}
      {step === 'done' && importResult && (
        <Card>
          <CardContent className="py-8 text-center space-y-4">
            <div className="text-4xl">✓</div>
            <p className="text-lg text-stone-200">
              Imported {importResult.imported} price{importResult.imported !== 1 ? 's' : ''} from
              receipt
            </p>
            {importResult.skipped > 0 && (
              <p className="text-sm text-stone-500">
                {importResult.skipped} item{importResult.skipped !== 1 ? 's' : ''} skipped
              </p>
            )}
            <div className="flex justify-center gap-3 mt-4">
              <Button variant="ghost" onClick={reset}>
                Scan Another Receipt
              </Button>
              <Link href="/culinary/ingredients">
                <Button variant="secondary">View Ingredients</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Scan notes */}
      {step === 'upload' && (
        <div className="rounded-lg border border-stone-800 bg-stone-900/40 px-4 py-3 text-sm text-stone-400">
          Scan extracts line items, matches them to your ingredients, and imports only the prices you
          approve.
        </div>
      )}
    </div>
  )
}

/**
 * Simple fuzzy match: find the ingredient whose name best matches the product name.
 * Uses lowercase substring matching with a simple scoring heuristic.
 */
function findBestMatch(productName: string, ingredients: Ingredient[]): Ingredient | null {
  if (!ingredients.length) return null

  const normalized = productName
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
  const words = normalized.split(/\s+/)

  let bestScore = 0
  let bestMatch: Ingredient | null = null

  for (const ing of ingredients) {
    const ingName = ing.name
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .trim()

    // Exact match
    if (ingName === normalized) return ing

    // Check how many words from ingredient name appear in product name
    const ingWords = ingName.split(/\s+/)
    let matchedWords = 0
    for (const w of ingWords) {
      if (w.length >= 3 && normalized.includes(w)) matchedWords++
    }

    // Score: percentage of ingredient words found in product name
    const score = ingWords.length > 0 ? matchedWords / ingWords.length : 0

    if (score > bestScore && score >= 0.5) {
      bestScore = score
      bestMatch = ing
    }
  }

  return bestMatch
}
