// Smart Import Hub - Client Component
// Handles tabs, text input, file upload, AI parsing, review, and save flows
'use client'

import { useState, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Card } from '@/components/ui/card'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { parseClientFromText } from '@/lib/ai/parse-client'
import { parseClientsFromBulk } from '@/lib/ai/parse-clients-bulk'
import { parseRecipeFromText } from '@/lib/ai/parse-recipe'
import { parseBrainDump } from '@/lib/ai/parse-brain-dump'
import { importClient, importClients, importRecipe, importBrainDump } from '@/lib/ai/import-actions'
import { importReceiptAsExpense } from '@/lib/ai/import-receipt-action'
import { EXPENSE_CATEGORY_OPTIONS } from '@/lib/constants/expense-categories'
import { importDocument } from '@/lib/documents/import-actions'
import type { ParsedClient } from '@/lib/ai/parse-client'
import type { ParsedRecipe } from '@/lib/ai/parse-recipe'
import type { BrainDumpResult } from '@/lib/ai/parse-brain-dump'
import type { BrainDumpImportResult } from '@/lib/ai/import-actions'
import type { ReceiptExtraction } from '@/lib/ai/parse-receipt'
import type { ParsedDocument } from '@/lib/ai/parse-document-text'
import type { VisionDetectionResult } from '@/lib/ai/parse-document-vision'

type ImportMode = 'brain-dump' | 'clients' | 'recipe' | 'receipt' | 'document' | 'file-upload'
type ImportPhase = 'input' | 'parsing' | 'review' | 'saving' | 'done'

type EventOption = {
  id: string
  occasion: string | null
  event_date: string
  client: { full_name: string } | null
}

type TabConfig = { mode: ImportMode; label: string; placeholder: string; isFileUpload?: boolean }

const TABS: TabConfig[] = [
  {
    mode: 'brain-dump',
    label: 'Brain Dump',
    placeholder: `Paste anything — client info, recipes, notes, whatever is on your mind.\n\nExample:\nMichel — Belgian, wife Kelly, always comes with Evan and Lindsay. Evan picky no sauce. Nut allergy. Haverhill, 10 min away, enter through garage. $100/person, 4 guests, cash, tips well.\n\nDiane sauce — sear the steak first, set it aside. Sauté shallots and mushrooms in the same pan. Deglaze with cognac. Add beef stock and heavy cream...`
  },
  {
    mode: 'clients',
    label: 'Import Clients',
    placeholder: `Paste info about one or more clients. Separate multiple clients with blank lines or dashes.\n\nExample:\nMichel — Belgian, wife Kelly, always comes with Evan and Lindsay. Evan picky no sauce. Nut allergy. Haverhill, 10 min away, enter through garage. $100/person, 4 guests, cash, tips well.\n\nMurr — real name Mary, husband Justin. Just had a baby. Wellesley and Needham. $180/person discounted from $200. No mushrooms.`
  },
  {
    mode: 'recipe',
    label: 'Import Recipe',
    placeholder: `Type or paste a recipe description.\n\nExample:\nDiane sauce — sear the steak first, set it aside. Sauté shallots and mushrooms in the same pan. Deglaze with cognac. Add beef stock and heavy cream. Splash of worcestershire, spoon of dijon. Let it reduce. Finish with the drippings from the steak, squeeze of lemon, and fresh parsley. Serves 4, makes about 2 cups.`
  },
  {
    mode: 'receipt',
    label: 'Import Receipt',
    placeholder: '',
    isFileUpload: true,
  },
  {
    mode: 'document',
    label: 'Import Document',
    placeholder: `Paste a contract, policy, template, or any other document.\n\nExample:\nCancellation Policy — Events cancelled more than 7 days before the event date receive a full refund minus the deposit. Cancellations within 7 days forfeit the deposit. Same-day cancellations are charged 50% of the quoted price. Weather-related cancellations are handled on a case-by-case basis.`
  },
  {
    mode: 'file-upload',
    label: 'Upload File',
    placeholder: '',
    isFileUpload: true,
  },
]

const CATEGORY_OPTIONS = EXPENSE_CATEGORY_OPTIONS

const PAYMENT_METHOD_OPTIONS = [
  { value: 'card', label: 'Card' },
  { value: 'cash', label: 'Cash' },
  { value: 'venmo', label: 'Venmo' },
  { value: 'paypal', label: 'PayPal' },
  { value: 'zelle', label: 'Zelle' },
  { value: 'check', label: 'Check' },
  { value: 'other', label: 'Other' },
]

export function SmartImportHub({ aiConfigured, events = [] }: { aiConfigured: boolean; events?: EventOption[] }) {
  const [mode, setMode] = useState<ImportMode>('brain-dump')
  const [phase, setPhase] = useState<ImportPhase>('input')
  const [rawText, setRawText] = useState('')
  const [error, setError] = useState<string | null>(null)

  // Parsed results
  const [parsedClients, setParsedClients] = useState<ParsedClient[]>([])
  const [parsedRecipes, setParsedRecipes] = useState<ParsedRecipe[]>([])
  const [brainDumpResult, setBrainDumpResult] = useState<BrainDumpResult | null>(null)
  const [parsedReceipt, setParsedReceipt] = useState<ReceiptExtraction | null>(null)
  const [parsedDocument, setParsedDocument] = useState<ParsedDocument | null>(null)
  const [visionResult, setVisionResult] = useState<VisionDetectionResult | null>(null)
  const [parseWarnings, setParseWarnings] = useState<string[]>([])
  const [parseConfidence, setParseConfidence] = useState<string>('')

  // File upload state
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [filePreview, setFilePreview] = useState<string | null>(null)

  // Receipt/expense options
  const [selectedEventId, setSelectedEventId] = useState('')
  const [receiptCategory, setReceiptCategory] = useState('groceries')
  const [receiptPaymentMethod, setReceiptPaymentMethod] = useState('card')

  // AI review confirmation
  const [aiReviewConfirmed, setAiReviewConfirmed] = useState(false)

  // Import results
  const [importResult, setImportResult] = useState<BrainDumpImportResult | null>(null)
  const [clientImportCount, setClientImportCount] = useState(0)
  const [recipeImportCount, setRecipeImportCount] = useState(0)
  const [expenseImportCount, setExpenseImportCount] = useState(0)
  const [documentImportCount, setDocumentImportCount] = useState(0)

  const currentTab = TABS.find(t => t.mode === mode)!

  const eventOptions = events.map(e => ({
    value: e.id,
    label: `${e.occasion || 'Untitled'} — ${e.event_date}${e.client ? ` (${e.client.full_name})` : ''}`,
  }))

  const resetState = () => {
    setPhase('input')
    setError(null)
    setParsedClients([])
    setParsedRecipes([])
    setBrainDumpResult(null)
    setParsedReceipt(null)
    setParsedDocument(null)
    setVisionResult(null)
    setParseWarnings([])
    setParseConfidence('')
    setImportResult(null)
    setClientImportCount(0)
    setRecipeImportCount(0)
    setExpenseImportCount(0)
    setDocumentImportCount(0)
    setAiReviewConfirmed(false)
    setUploadedFile(null)
    setFilePreview(null)
    setSelectedEventId('')
    setReceiptCategory('groceries')
    setReceiptPaymentMethod('card')
  }

  const handleModeChange = (newMode: ImportMode) => {
    setMode(newMode)
    resetState()
    setRawText('')
  }

  // Convert file to base64
  const fileToBase64 = async (file: File): Promise<string> => {
    const buffer = await file.arrayBuffer()
    return btoa(
      new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
    )
  }

  const handleFileChange = (file: File) => {
    setUploadedFile(file)
    setParsedReceipt(null)
    setVisionResult(null)

    // Preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = (ev) => setFilePreview(ev.target?.result as string)
      reader.readAsDataURL(file)
    } else {
      setFilePreview(null)
    }
  }

  const handleParse = async () => {
    setError(null)
    setPhase('parsing')

    try {
      if (mode === 'receipt') {
        if (!uploadedFile) return
        const base64 = await fileToBase64(uploadedFile)
        const { parseReceiptImage } = await import('@/lib/ai/parse-receipt')
        const mediaType = uploadedFile.type as 'image/jpeg' | 'image/png' | 'image/webp'
        const result = await parseReceiptImage(base64, mediaType)
        setParsedReceipt(result)
        setParseConfidence(result.confidence)
        setParseWarnings(result.warnings)

        // Auto-detect payment method
        if (result.paymentMethod) {
          const pm = result.paymentMethod.toLowerCase()
          if (pm.includes('visa') || pm.includes('mastercard') || pm.includes('amex') || pm.includes('card') || pm.includes('debit') || pm.includes('credit')) {
            setReceiptPaymentMethod('card')
          } else if (pm.includes('cash')) {
            setReceiptPaymentMethod('cash')
          }
        }
      } else if (mode === 'document') {
        if (!rawText.trim()) return
        const { parseDocumentFromText } = await import('@/lib/ai/parse-document-text')
        const result = await parseDocumentFromText(rawText)
        setParsedDocument(result.parsed)
        setParseConfidence(result.confidence)
        setParseWarnings(result.warnings)
      } else if (mode === 'file-upload') {
        if (!uploadedFile) return
        const base64 = await fileToBase64(uploadedFile)
        const { parseDocumentWithVision } = await import('@/lib/ai/parse-document-vision')
        const result = await parseDocumentWithVision(base64, uploadedFile.type, uploadedFile.name)
        setVisionResult(result)
        setParseConfidence(result.confidence)
        setParseWarnings(result.warnings)

        // Route detected type to appropriate state
        if (result.detectedType === 'receipt') {
          setParsedReceipt(result.extractedData as any)
        } else if (result.detectedType === 'client_info') {
          setParsedClients([result.extractedData as any])
        } else if (result.detectedType === 'recipe') {
          setParsedRecipes([result.extractedData as any])
        } else if (result.detectedType === 'document') {
          setParsedDocument(result.extractedData as any)
        }
      } else if (mode === 'clients') {
        if (!rawText.trim()) return
        const hasMultiple = rawText.includes('\n\n') || /^[\s]*[-—]/m.test(rawText)
        if (hasMultiple) {
          const result = await parseClientsFromBulk(rawText)
          setParsedClients(result.parsed)
          setParseWarnings(result.warnings)
          setParseConfidence(result.confidence)
        } else {
          const result = await parseClientFromText(rawText)
          setParsedClients([result.parsed])
          setParseWarnings(result.warnings)
          setParseConfidence(result.confidence)
        }
      } else if (mode === 'recipe') {
        if (!rawText.trim()) return
        const result = await parseRecipeFromText(rawText)
        setParsedRecipes([result.parsed])
        setParseWarnings(result.warnings)
        setParseConfidence(result.confidence)
      } else {
        // Brain dump
        if (!rawText.trim()) return
        const result = await parseBrainDump(rawText)
        setBrainDumpResult(result.parsed)
        setParsedClients(result.parsed.clients)
        setParsedRecipes(result.parsed.recipes)
        setParseWarnings(result.warnings)
        setParseConfidence(result.confidence)
      }
      setPhase('review')
    } catch (err) {
      console.error('Parse error:', err)
      setError(err instanceof Error ? err.message : 'Failed to parse')
      setPhase('input')
    }
  }

  const handleSaveAll = async () => {
    setPhase('saving')
    setError(null)

    try {
      if (mode === 'receipt' || (mode === 'file-upload' && parsedReceipt)) {
        await importReceiptAsExpense(
          parsedReceipt!,
          selectedEventId || null,
          receiptPaymentMethod,
          receiptCategory
        )
        setExpenseImportCount(1)
      } else if (mode === 'document' || (mode === 'file-upload' && parsedDocument)) {
        await importDocument(
          parsedDocument!,
          mode === 'file-upload' ? 'file_upload' : 'text_import',
          mode === 'file-upload' ? uploadedFile?.name : undefined
        )
        setDocumentImportCount(1)
      } else if (mode === 'brain-dump' && brainDumpResult) {
        const result = await importBrainDump(brainDumpResult)
        setImportResult(result)
        setClientImportCount(result.clients.filter(c => c.success).length)
        setRecipeImportCount(result.recipes.filter(r => r.success).length)
      } else if ((mode === 'clients' || mode === 'file-upload') && parsedClients.length > 0) {
        if (parsedClients.length === 1) {
          await importClient(parsedClients[0])
          setClientImportCount(1)
        } else {
          const result = await importClients(parsedClients)
          setClientImportCount(result.imported)
        }
      } else if ((mode === 'recipe' || mode === 'file-upload') && parsedRecipes.length > 0) {
        await importRecipe(parsedRecipes[0])
        setRecipeImportCount(1)
      }
      setPhase('done')
    } catch (err) {
      console.error('Import error:', err)
      setError(err instanceof Error ? err.message : 'Failed to save records')
      setPhase('review')
    }
  }

  const handleSaveSingleClient = async (index: number) => {
    try {
      await importClient(parsedClients[index])
      setParsedClients(prev => prev.filter((_, i) => i !== index))
      setClientImportCount(prev => prev + 1)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save client')
    }
  }

  const handleDiscardClient = (index: number) => {
    setParsedClients(prev => prev.filter((_, i) => i !== index))
  }

  const handleDiscardRecipe = (index: number) => {
    setParsedRecipes(prev => prev.filter((_, i) => i !== index))
  }

  const isTextMode = !currentTab.isFileUpload
  const isFileMode = !!currentTab.isFileUpload
  const canParse = aiConfigured && phase !== 'parsing' && (
    isTextMode ? rawText.trim().length > 0 : uploadedFile !== null
  )

  return (
    <div className="space-y-6">
      {/* Mode Tabs */}
      <div className="border-b border-stone-200">
        <nav className="-mb-px flex flex-wrap gap-x-6">
          {TABS.map(tab => (
            <button
              key={tab.mode}
              onClick={() => handleModeChange(tab.mode)}
              className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${
                mode === tab.mode
                  ? 'border-brand-500 text-brand-600'
                  : 'border-transparent text-stone-500 hover:text-stone-700 hover:border-stone-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {error && (
        <Alert variant="error" title="Error">
          {error}
        </Alert>
      )}

      {/* INPUT PHASE */}
      {(phase === 'input' || phase === 'parsing') && (
        <div className="space-y-4">
          {/* Text input for text-based modes */}
          {isTextMode && (
            <Textarea
              placeholder={currentTab.placeholder}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              rows={12}
              disabled={phase === 'parsing'}
              className="font-mono text-sm"
            />
          )}

          {/* File upload for file-based modes */}
          {isFileMode && (
            <FileUploadZone
              file={uploadedFile}
              preview={filePreview}
              onFileChange={handleFileChange}
              disabled={phase === 'parsing'}
              accept={mode === 'receipt'
                ? 'image/jpeg,image/png,image/webp'
                : 'image/jpeg,image/png,image/webp,application/pdf'
              }
              hint={mode === 'receipt'
                ? 'Upload a photo of your receipt (JPEG, PNG, WebP)'
                : 'Upload an image or PDF (JPEG, PNG, WebP, PDF)'
              }
            />
          )}

          <div className="flex gap-3">
            <Button
              onClick={handleParse}
              disabled={!canParse}
              loading={phase === 'parsing'}
            >
              {phase === 'parsing' ? 'Parsing...' : 'Parse'}
            </Button>
            {(rawText || uploadedFile) && (
              <Button
                variant="secondary"
                onClick={() => { setRawText(''); resetState() }}
                disabled={phase === 'parsing'}
              >
                Clear
              </Button>
            )}
          </div>
        </div>
      )}

      {/* REVIEW PHASE */}
      {phase === 'review' && (
        <div className="space-y-6">
          {/* AI Extraction Notice */}
          <Alert variant="info" title="AI-Extracted Data">
            The content below was extracted by AI. Please review carefully before saving.
          </Alert>

          {/* Parse Summary */}
          <div className="flex items-center gap-3">
            <Badge variant="info">AI-Extracted</Badge>
            <ConfidenceBadge confidence={parseConfidence} />
            <span className="text-sm text-stone-600">
              {mode === 'file-upload' && visionResult && (
                <>Detected: <Badge>{visionResult.detectedType.replace('_', ' ')}</Badge></>
              )}
              {parsedClients.length > 0 && ` ${parsedClients.length} client(s)`}
              {parsedRecipes.length > 0 && ` ${parsedRecipes.length} recipe(s)`}
              {parsedReceipt && ` Receipt: ${parsedReceipt.itemCount || parsedReceipt.lineItems?.length || 0} items`}
              {parsedDocument && ` Document: ${parsedDocument.document_type}`}
              {brainDumpResult?.notes && brainDumpResult.notes.length > 0 && `, ${brainDumpResult.notes.length} note(s)`}
            </span>
          </div>

          {/* Warnings */}
          {parseWarnings.length > 0 && (
            <Alert variant="warning" title="Warnings">
              <ul className="list-disc list-inside space-y-1">
                {parseWarnings.map((w, i) => <li key={i}>{w}</li>)}
              </ul>
            </Alert>
          )}

          {/* Receipt Review */}
          {parsedReceipt && (
            <ReceiptReviewCard
              receipt={parsedReceipt}
              eventOptions={eventOptions}
              selectedEventId={selectedEventId}
              onEventChange={setSelectedEventId}
              category={receiptCategory}
              onCategoryChange={setReceiptCategory}
              paymentMethod={receiptPaymentMethod}
              onPaymentMethodChange={setReceiptPaymentMethod}
            />
          )}

          {/* Document Review */}
          {parsedDocument && !parsedReceipt && (
            <DocumentReviewCard document={parsedDocument} />
          )}

          {/* Client Cards */}
          {parsedClients.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-stone-900">Clients</h2>
              {parsedClients.map((client, index) => (
                <ClientReviewCard
                  key={index}
                  client={client}
                  onSave={() => handleSaveSingleClient(index)}
                  onDiscard={() => handleDiscardClient(index)}
                />
              ))}
            </div>
          )}

          {/* Recipe Cards */}
          {parsedRecipes.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-stone-900">Recipes</h2>
              {parsedRecipes.map((recipe, index) => (
                <RecipeReviewCard
                  key={index}
                  recipe={recipe}
                  onDiscard={() => handleDiscardRecipe(index)}
                />
              ))}
            </div>
          )}

          {/* Brain Dump Notes */}
          {brainDumpResult?.notes && brainDumpResult.notes.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-stone-900">Notes</h2>
              {brainDumpResult.notes.map((note, i) => (
                <Card key={i} className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge>{note.type}</Badge>
                  </div>
                  <p className="text-sm text-stone-700">{note.content}</p>
                  <p className="text-xs text-stone-500 mt-2">Suggested: {note.suggestedAction}</p>
                </Card>
              ))}
            </div>
          )}

          {/* Unstructured text */}
          {brainDumpResult?.unstructured && brainDumpResult.unstructured.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-stone-900">Uncategorized</h2>
              {brainDumpResult.unstructured.map((text, i) => (
                <Card key={i} className="p-4">
                  <p className="text-sm text-stone-600 italic">{text}</p>
                </Card>
              ))}
            </div>
          )}

          {/* AI Review Confirmation */}
          {(parsedClients.length > 0 || parsedRecipes.length > 0 || parsedReceipt || parsedDocument) && (
            <label className="flex items-center gap-3 pt-4 border-t cursor-pointer">
              <input
                type="checkbox"
                checked={aiReviewConfirmed}
                onChange={(e) => setAiReviewConfirmed(e.target.checked)}
                className="h-4 w-4 rounded border-stone-300 text-brand-600 focus:ring-brand-500"
              />
              <span className="text-sm text-stone-700">
                I have reviewed the AI-extracted data above and confirm it is accurate
              </span>
            </label>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            {(parsedClients.length > 0 || parsedRecipes.length > 0 || parsedReceipt || parsedDocument) && (
              <Button onClick={handleSaveAll} disabled={!aiReviewConfirmed}>
                {parsedReceipt ? 'Save as Expense' :
                 parsedDocument ? 'Save Document' :
                 `Save All (${parsedClients.length + parsedRecipes.length} record${parsedClients.length + parsedRecipes.length !== 1 ? 's' : ''})`}
              </Button>
            )}
            <Button variant="secondary" onClick={() => { resetState(); setRawText('') }}>
              Start Over
            </Button>
          </div>
        </div>
      )}

      {/* SAVING PHASE */}
      {phase === 'saving' && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600 mb-4" />
          <p className="text-stone-600">Saving records...</p>
        </div>
      )}

      {/* DONE PHASE */}
      {phase === 'done' && (
        <div className="space-y-4">
          <Alert variant="success" title="Import Complete">
            {clientImportCount > 0 && <p>Created {clientImportCount} client record{clientImportCount !== 1 ? 's' : ''}.</p>}
            {recipeImportCount > 0 && <p>Created {recipeImportCount} recipe record{recipeImportCount !== 1 ? 's' : ''}.</p>}
            {expenseImportCount > 0 && <p>Created {expenseImportCount} expense record{expenseImportCount !== 1 ? 's' : ''}.</p>}
            {documentImportCount > 0 && <p>Saved {documentImportCount} document{documentImportCount !== 1 ? 's' : ''}.</p>}
          </Alert>

          {/* Import result errors */}
          {importResult && (
            <>
              {importResult.clients.filter(c => !c.success).map((c, i) => (
                <Alert key={`ce-${i}`} variant="error" title={`Failed: ${c.name}`}>
                  {c.error}
                </Alert>
              ))}
              {importResult.recipes.filter(r => !r.success).map((r, i) => (
                <Alert key={`re-${i}`} variant="error" title={`Failed: ${r.name}`}>
                  {r.error}
                </Alert>
              ))}
            </>
          )}

          <div className="flex gap-3">
            <Button onClick={() => { resetState(); setRawText('') }}>
              Import More
            </Button>
            {clientImportCount > 0 && (
              <Button variant="secondary" onClick={() => window.location.href = '/clients'}>
                View Clients
              </Button>
            )}
            {recipeImportCount > 0 && (
              <Button variant="secondary" onClick={() => window.location.href = '/menus'}>
                View Menus
              </Button>
            )}
            {expenseImportCount > 0 && (
              <Button variant="secondary" onClick={() => window.location.href = '/expenses'}>
                View Expenses
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================
// FILE UPLOAD ZONE
// ============================================

function FileUploadZone({ file, preview, onFileChange, disabled, accept, hint }: {
  file: File | null
  preview: string | null
  onFileChange: (file: File) => void
  disabled: boolean
  accept: string
  hint: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) onFileChange(droppedFile)
  }, [onFileChange])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setIsDragging(false)
  }, [])

  return (
    <div className="space-y-4">
      <div
        onClick={() => !disabled && inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
          ${isDragging ? 'border-brand-500 bg-brand-50' : 'border-stone-300 hover:border-stone-400'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          aria-label="Upload file"
          onChange={(e) => { if (e.target.files?.[0]) onFileChange(e.target.files[0]) }}
          className="hidden"
          disabled={disabled}
        />
        <svg className="mx-auto h-12 w-12 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        <p className="mt-2 text-sm text-stone-600">
          {file ? file.name : 'Drop a file here or click to upload'}
        </p>
        <p className="mt-1 text-xs text-stone-500">{hint}</p>
      </div>

      {/* Image preview */}
      {preview && (
        <div className="relative">
          <img src={preview} alt="Upload preview" className="max-h-64 rounded-lg border border-stone-200 mx-auto" />
        </div>
      )}

      {/* PDF indicator */}
      {file && file.type === 'application/pdf' && (
        <div className="flex items-center gap-2 text-sm text-stone-600">
          <svg className="h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
          </svg>
          <span>{file.name} ({(file.size / 1024).toFixed(0)} KB)</span>
        </div>
      )}
    </div>
  )
}

// ============================================
// RECEIPT REVIEW CARD
// ============================================

function ReceiptReviewCard({ receipt, eventOptions, selectedEventId, onEventChange, category, onCategoryChange, paymentMethod, onPaymentMethodChange }: {
  receipt: ReceiptExtraction
  eventOptions: { value: string; label: string }[]
  selectedEventId: string
  onEventChange: (id: string) => void
  category: string
  onCategoryChange: (cat: string) => void
  paymentMethod: string
  onPaymentMethodChange: (pm: string) => void
}) {
  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-stone-900">
            {receipt.storeName || 'Receipt'}
          </h3>
          <Badge variant="info">AI-Extracted</Badge>
        </div>
        <div className="text-sm text-stone-600">
          {receipt.purchaseDate && <span>{receipt.purchaseDate}</span>}
          {receipt.purchaseTime && <span> at {receipt.purchaseTime}</span>}
        </div>
      </div>

      {receipt.storeLocation && (
        <p className="text-sm text-stone-500">{receipt.storeLocation}</p>
      )}

      {/* Line items table */}
      {receipt.lineItems && receipt.lineItems.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-200 text-stone-500">
                <th className="text-left py-2 font-medium">Item</th>
                <th className="text-right py-2 font-medium w-16">Qty</th>
                <th className="text-right py-2 font-medium w-24">Price</th>
                <th className="text-right py-2 font-medium w-24">Total</th>
                <th className="text-left py-2 font-medium w-24 pl-4">Category</th>
              </tr>
            </thead>
            <tbody>
              {receipt.lineItems.map((item, i) => (
                <tr key={i} className="border-b border-stone-100">
                  <td className="py-2 text-stone-900">{item.description}</td>
                  <td className="py-2 text-right text-stone-600">{item.quantity}</td>
                  <td className="py-2 text-right text-stone-600">${(item.unitPriceCents / 100).toFixed(2)}</td>
                  <td className="py-2 text-right text-stone-900">${(item.totalPriceCents / 100).toFixed(2)}</td>
                  <td className="py-2 pl-4">
                    <Badge variant={item.category === 'personal' ? 'warning' : 'default'}>
                      {item.category}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Totals */}
      <div className="flex justify-end">
        <div className="space-y-1 text-sm">
          {receipt.subtotalCents != null && (
            <div className="flex justify-between gap-8">
              <span className="text-stone-500">Subtotal</span>
              <span className="text-stone-700">${(receipt.subtotalCents / 100).toFixed(2)}</span>
            </div>
          )}
          {receipt.taxCents != null && (
            <div className="flex justify-between gap-8">
              <span className="text-stone-500">Tax</span>
              <span className="text-stone-700">${(receipt.taxCents / 100).toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between gap-8 font-semibold border-t border-stone-200 pt-1">
            <span className="text-stone-900">Total</span>
            <span className="text-stone-900">${(receipt.totalCents / 100).toFixed(2)}</span>
          </div>
        </div>
      </div>

      {receipt.paymentMethod && (
        <p className="text-sm text-stone-500">Payment: {receipt.paymentMethod}</p>
      )}

      {/* Save options */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-stone-200">
        <Select
          label="Expense Category"
          options={CATEGORY_OPTIONS}
          value={category}
          onChange={(e) => onCategoryChange(e.target.value)}
        />
        <Select
          label="Payment Method"
          options={PAYMENT_METHOD_OPTIONS}
          value={paymentMethod}
          onChange={(e) => onPaymentMethodChange(e.target.value)}
        />
        {eventOptions.length > 0 && (
          <Select
            label="Attach to Event (optional)"
            options={eventOptions}
            value={selectedEventId}
            onChange={(e) => onEventChange(e.target.value)}
          />
        )}
      </div>
    </Card>
  )
}

// ============================================
// DOCUMENT REVIEW CARD
// ============================================

function DocumentReviewCard({ document }: { document: ParsedDocument }) {
  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-stone-900">{document.title}</h3>
          <Badge variant="info">AI-Extracted</Badge>
        </div>
        <Badge>{document.document_type}</Badge>
      </div>

      <p className="text-sm text-stone-600">{document.summary}</p>

      {/* Key terms */}
      {document.key_terms && document.key_terms.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-stone-700">Key Terms</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {document.key_terms.map((kt, i) => (
              <div key={i} className="text-sm">
                <span className="text-stone-500">{kt.term}: </span>
                <span className="text-stone-900">{kt.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tags */}
      {document.tags && document.tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {document.tags.map((tag, i) => <Badge key={i} variant="info">{tag}</Badge>)}
        </div>
      )}

      {/* Linked entities */}
      {(document.related_client_name || document.related_event_date) && (
        <div className="text-sm text-stone-600">
          {document.related_client_name && <span>Related client: {document.related_client_name}</span>}
          {document.related_client_name && document.related_event_date && <span> | </span>}
          {document.related_event_date && <span>Event date: {document.related_event_date}</span>}
        </div>
      )}

      {/* Content preview */}
      {document.content_text && (
        <details className="text-sm">
          <summary className="text-stone-500 cursor-pointer hover:text-stone-700">View full content</summary>
          <pre className="mt-2 p-3 bg-stone-50 rounded-lg text-stone-700 whitespace-pre-wrap text-xs max-h-64 overflow-y-auto">
            {document.content_text}
          </pre>
        </details>
      )}
    </Card>
  )
}

// ============================================
// CONFIDENCE BADGE
// ============================================

function ConfidenceBadge({ confidence }: { confidence: string }) {
  const variant = confidence === 'high' ? 'success' : confidence === 'medium' ? 'warning' : 'error'
  return (
    <Badge variant={variant}>
      {confidence} confidence
    </Badge>
  )
}

// ============================================
// CLIENT REVIEW CARD
// ============================================

function FieldRow({ label, value, confidence }: {
  label: string
  value: string | string[] | number | null | undefined
  confidence?: 'confirmed' | 'inferred' | 'unknown'
}) {
  if (value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0)) return null

  const displayValue = Array.isArray(value) ? value.join(', ') : String(value)

  return (
    <div className="flex items-start gap-2 text-sm">
      <span className="text-stone-500 min-w-[140px] shrink-0">{label}</span>
      <span className="text-stone-900">{displayValue}</span>
      {confidence === 'confirmed' && (
        <span className="text-green-600 shrink-0" title="Explicitly stated">&#10003;</span>
      )}
      {confidence === 'inferred' && (
        <span className="text-yellow-600 shrink-0" title="Inferred — please verify">?</span>
      )}
    </div>
  )
}

function ClientReviewCard({ client, onSave, onDiscard }: {
  client: ParsedClient
  onSave: () => void
  onDiscard: () => void
}) {
  const fc = client.field_confidence || {}

  // Check for allergy warnings
  const hasAllergies = client.allergies.length > 0

  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-stone-900">{client.full_name}</h3>
          <Badge variant="info">AI-Extracted</Badge>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={onSave}>Save</Button>
          <Button size="sm" variant="secondary" onClick={onDiscard}>Discard</Button>
        </div>
      </div>

      {hasAllergies && (
        <Alert variant="error" title="ALLERGY ALERT">
          {client.allergies.join(', ')} — Please verify before saving.
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
        <FieldRow label="Email" value={client.email} confidence={fc.email} />
        <FieldRow label="Phone" value={client.phone} confidence={fc.phone} />
        <FieldRow label="Partner" value={client.partner_name} confidence={fc.partner_name} />
        <FieldRow label="Contact Method" value={client.preferred_contact_method} confidence={fc.preferred_contact_method} />
        <FieldRow label="Referral" value={client.referral_source} confidence={fc.referral_source} />
        <FieldRow label="Status" value={client.status} confidence={fc.status} />
      </div>

      {/* Location & Access */}
      {(client.address || client.addresses.length > 0) && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-stone-700">Location</h4>
          <FieldRow label="Address" value={client.address} confidence={fc.address} />
          {client.addresses.map((addr, i) => (
            <FieldRow
              key={i}
              label={addr.label || `Address ${i + 1}`}
              value={[addr.address, addr.city, addr.state, addr.zip].filter(Boolean).join(', ')}
            />
          ))}
          <FieldRow label="Parking" value={client.parking_instructions} confidence={fc.parking_instructions} />
          <FieldRow label="Access" value={client.access_instructions} confidence={fc.access_instructions} />
        </div>
      )}

      {/* Dietary */}
      {(client.dietary_restrictions.length > 0 || client.allergies.length > 0 || client.dislikes.length > 0) && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-stone-700">Dietary</h4>
          <FieldRow label="Restrictions" value={client.dietary_restrictions} confidence={fc.dietary_restrictions} />
          <FieldRow label="Allergies" value={client.allergies} confidence={fc.allergies} />
          <FieldRow label="Dislikes" value={client.dislikes} confidence={fc.dislikes} />
          <FieldRow label="Spice" value={client.spice_tolerance} confidence={fc.spice_tolerance} />
          <FieldRow label="Favorites" value={client.favorite_cuisines} confidence={fc.favorite_cuisines} />
        </div>
      )}

      {/* People */}
      {(client.regular_guests.length > 0 || client.household_members.length > 0) && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-stone-700">People</h4>
          {client.household_members.map((m, i) => (
            <FieldRow key={`hm-${i}`} label={m.relationship || 'Household'} value={`${m.name}${m.notes ? ` — ${m.notes}` : ''}`} />
          ))}
          {client.regular_guests.map((g, i) => (
            <FieldRow key={`rg-${i}`} label="Regular Guest" value={`${g.name}${g.notes ? ` — ${g.notes}` : ''}`} />
          ))}
        </div>
      )}

      {/* Financial */}
      {(client.average_spend_cents || client.payment_behavior || client.tipping_pattern) && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-stone-700">Financial</h4>
          <FieldRow
            label="Avg Spend"
            value={client.average_spend_cents ? `$${(client.average_spend_cents / 100).toFixed(2)}` : null}
            confidence={fc.average_spend_cents}
          />
          <FieldRow label="Payment" value={client.payment_behavior} confidence={fc.payment_behavior} />
          <FieldRow label="Tipping" value={client.tipping_pattern} confidence={fc.tipping_pattern} />
        </div>
      )}

      {/* Kitchen & Vibe */}
      {(client.kitchen_size || client.vibe_notes || client.what_they_care_about) && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-stone-700">Kitchen & Vibe</h4>
          <FieldRow label="Kitchen" value={client.kitchen_size} confidence={fc.kitchen_size} />
          <FieldRow label="Constraints" value={client.kitchen_constraints} confidence={fc.kitchen_constraints} />
          <FieldRow label="Vibe" value={client.vibe_notes} confidence={fc.vibe_notes} />
          <FieldRow label="Cares About" value={client.what_they_care_about} confidence={fc.what_they_care_about} />
        </div>
      )}
    </Card>
  )
}

// ============================================
// RECIPE REVIEW CARD
// ============================================

function RecipeReviewCard({ recipe, onDiscard }: {
  recipe: ParsedRecipe
  onDiscard: () => void
}) {
  const fc = recipe.field_confidence || {}
  const hasAllergens = recipe.allergen_flags.length > 0

  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-stone-900">{recipe.name}</h3>
          <Badge>{recipe.category}</Badge>
          <Badge variant="info">AI-Extracted</Badge>
        </div>
        <Button size="sm" variant="secondary" onClick={onDiscard}>Discard</Button>
      </div>

      {hasAllergens && (
        <Alert variant="warning" title="Allergens Detected">
          {recipe.allergen_flags.join(', ')}
        </Alert>
      )}

      {recipe.description && (
        <p className="text-sm text-stone-600">{recipe.description}</p>
      )}

      {/* Ingredients */}
      {recipe.ingredients.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-stone-700">Ingredients ({recipe.ingredients.length})</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
            {recipe.ingredients.map((ing, i) => (
              <div key={i} className="text-sm flex items-center gap-1">
                <span className="text-stone-700">
                  {ing.quantity} {ing.unit} {ing.name}
                  {ing.preparation_notes && <span className="text-stone-500">, {ing.preparation_notes}</span>}
                </span>
                {ing.estimated && <span className="text-yellow-600 text-xs" title="Estimated quantity">~</span>}
                {ing.is_optional && <span className="text-stone-400 text-xs">(opt)</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Method */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-stone-700">Method</h4>
        <p className="text-sm text-stone-700 whitespace-pre-wrap">{recipe.method}</p>
      </div>

      {/* Yield & Time */}
      <div className="flex gap-6 text-sm text-stone-600">
        {recipe.yield_description && <span>Yield: {recipe.yield_description}</span>}
        {recipe.prep_time_minutes && <span>Prep: {recipe.prep_time_minutes}min</span>}
        {recipe.cook_time_minutes && <span>Cook: {recipe.cook_time_minutes}min</span>}
        {recipe.total_time_minutes && <span>Total: {recipe.total_time_minutes}min</span>}
      </div>

      {recipe.dietary_tags.length > 0 && (
        <div className="flex gap-2">
          {recipe.dietary_tags.map((tag, i) => <Badge key={i} variant="info">{tag}</Badge>)}
        </div>
      )}

      {recipe.notes && (
        <FieldRow label="Notes" value={recipe.notes} confidence={fc.notes} />
      )}
    </Card>
  )
}
