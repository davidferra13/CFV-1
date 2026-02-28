'use client'

// Take a Chef AI Import Component
// Paste a TakeaChef booking notification email → AI parses it → review & save
// Lives inside the Smart Import Hub as a dedicated tab

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { Alert } from '@/components/ui/alert'
import {
  importTakeAChefBooking,
  type TakeAChefImportResult,
} from '@/lib/ai/import-take-a-chef-action'

// ─── Types ────────────────────────────────────────────────────────────────

type Phase = 'input' | 'parsing' | 'review' | 'saving' | 'done'

// ─── Component ────────────────────────────────────────────────────────────

export function TakeAChefImport({ aiConfigured }: { aiConfigured: boolean }) {
  const router = useRouter()
  const [phase, setPhase] = useState<Phase>('input')
  const [rawText, setRawText] = useState('')
  const [commissionPercent, setCommissionPercent] = useState(25)
  const [logCommission, setLogCommission] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<TakeAChefImportResult | null>(null)

  const handleParse = async () => {
    if (!rawText.trim()) {
      setError('Paste your Take a Chef booking notification text first.')
      return
    }
    setError(null)
    setPhase('parsing')

    try {
      setPhase('review')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Parsing failed')
      setPhase('input')
    }
  }

  const handleSave = async () => {
    setError(null)
    setPhase('saving')

    try {
      const res = await importTakeAChefBooking({
        rawText,
        commissionPercent,
        logCommission,
      })

      if (!res.success) {
        setError(res.error || 'Import failed')
        setPhase('review')
        return
      }

      setResult(res)
      setPhase('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed')
      setPhase('review')
    }
  }

  const handleReset = () => {
    setPhase('input')
    setRawText('')
    setCommissionPercent(25)
    setLogCommission(true)
    setError(null)
    setResult(null)
  }

  // ── Done State ──────────────────────────────────────────────────────────
  if (phase === 'done' && result) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-green-200 bg-green-950 p-5">
          <div className="flex items-start gap-3">
            <span className="text-2xl">✓</span>
            <div>
              <p className="font-semibold text-green-900 text-lg">Take a Chef Booking Captured</p>
              <p className="text-green-700 text-sm mt-1">
                {result.clientCreated ? 'New client created' : 'Existing client matched'} · Inquiry
                and draft event created · Tagged as Take a Chef source
              </p>
              {result.commissionExpenseId && (
                <p className="text-emerald-600 text-sm mt-0.5">
                  Platform commission logged as a business expense
                </p>
              )}
              {result.warnings && result.warnings.length > 0 && (
                <p className="text-amber-600 text-sm mt-1">Note: {result.warnings.join('; ')}</p>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          {result.inquiryId && (
            <Button onClick={() => router.push(`/inquiries/${result.inquiryId}`)}>
              View Inquiry
            </Button>
          )}
          {result.eventId && (
            <Button variant="secondary" onClick={() => router.push(`/events/${result.eventId}`)}>
              View Event
            </Button>
          )}
          <Button variant="ghost" onClick={handleReset}>
            Import Another
          </Button>
        </div>
      </div>
    )
  }

  // ── Input / Review State ────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {!aiConfigured && (
        <Alert variant="warning" title="Parsing Not Configured">
          Auto parsing requires configuration. You can still use the manual capture form at the
          bottom.
        </Alert>
      )}

      <div className="space-y-2">
        <label className="text-sm font-medium text-stone-300">
          Paste your Take a Chef booking notification
        </label>
        <p className="text-xs text-stone-500">
          Copy the booking confirmation email or message you received from Take a Chef and paste it
          below. This will extract the client name, date, guest count, location, occasion, and
          dietary notes.
        </p>
        <Textarea
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          placeholder={`Example:\n\nNew booking confirmed!\nClient: Sarah Mitchell\nDate: March 15, 2026 at 7:00 PM\nGuests: 6 adults\nLocation: 45 Oceanview Drive, Malibu, CA 90265\nOccasion: Birthday dinner\nMenu: Mediterranean tasting menu\nTotal: $1,200\nDietary notes: One guest is gluten-free\n\nPaste your actual notification here...`}
          rows={10}
          className="font-mono text-sm resize-none"
          disabled={phase === 'saving'}
        />
      </div>

      {/* Commission Settings */}
      <Card className="p-4 bg-stone-800 border-stone-700">
        <p className="text-sm font-medium text-stone-300 mb-3">Platform Commission</p>
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm text-stone-400 w-36">Commission %</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={50}
                step={1}
                value={commissionPercent}
                onChange={(e) =>
                  setCommissionPercent(Math.max(0, Math.min(50, Number(e.target.value))))
                }
                className="w-20 px-3 py-1.5 border border-stone-700 rounded-md text-sm text-center focus:outline-none focus:ring-2 focus:ring-brand-500"
                disabled={phase === 'saving'}
              />
              <span className="text-sm text-stone-500">% (typical: 20–30%)</span>
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-stone-400 cursor-pointer">
            <input
              type="checkbox"
              checked={logCommission}
              onChange={(e) => setLogCommission(e.target.checked)}
              className="rounded border-stone-600"
              disabled={phase === 'saving'}
            />
            Log commission as business expense
          </label>
        </div>
        <p className="text-xs text-stone-400 mt-2">
          If a price is detected in the notification, we&apos;ll automatically log the commission as
          a professional services expense tied to this event.
        </p>
      </Card>

      {error && (
        <Alert variant="error" title="Import Error">
          {error}
        </Alert>
      )}

      <div className="flex flex-wrap gap-3">
        <Button
          onClick={phase === 'review' ? handleSave : handleParse}
          disabled={!rawText.trim() || phase === 'parsing' || phase === 'saving' || !aiConfigured}
        >
          {phase === 'parsing'
            ? 'Parsing...'
            : phase === 'review'
              ? 'Confirm & Save'
              : phase === 'saving'
                ? 'Saving...'
                : 'Parse & Review'}
        </Button>

        {/* If AI isn't configured or user wants to skip review, just save directly */}
        {rawText.trim() && phase === 'input' && aiConfigured && (
          <Button variant="secondary" onClick={handleSave} disabled={phase === 'saving'}>
            Save Directly (No Review)
          </Button>
        )}

        {phase !== 'input' && (
          <Button variant="ghost" onClick={handleReset} disabled={phase === 'saving'}>
            Start Over
          </Button>
        )}
      </div>

      {/* Helper callout */}
      <div className="rounded-lg border border-brand-100 bg-brand-950 p-4 text-sm text-stone-400">
        <p className="font-medium text-stone-200 mb-1">What gets created</p>
        <ul className="space-y-1 text-xs text-stone-400 list-disc pl-4">
          <li>Client record tagged as &quot;Take a Chef&quot; acquisition source</li>
          <li>Inquiry with channel = Take a Chef (tracked in your pipeline)</li>
          <li>Draft event pre-filled with all extracted details</li>
          <li>Platform commission logged as a business expense (so it hits your P&amp;L)</li>
        </ul>
      </div>
    </div>
  )
}
