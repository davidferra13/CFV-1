'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  parseCatchupDump,
  createCatchupInquiries,
  type CatchupEntry,
} from '@/lib/inquiries/catchup-actions'

type Phase = 'input' | 'review' | 'done'

export function CatchupClient() {
  const [phase, setPhase] = useState<Phase>('input')
  const [rawText, setRawText] = useState('')
  const [entries, setEntries] = useState<(CatchupEntry & { included: boolean })[]>([])
  const [warnings, setWarnings] = useState<string[]>([])
  const [createdCount, setCreatedCount] = useState(0)
  const [createdInquiries, setCreatedInquiries] = useState<
    Array<{ id: string; clientName: string; occasion: string; href: string }>
  >([])
  const [createErrors, setCreateErrors] = useState<string[]>([])
  const [error, setError] = useState('')
  const [isParsing, startParsing] = useTransition()
  const [isCreating, startCreating] = useTransition()

  function handleParse() {
    setError('')
    startParsing(async () => {
      try {
        const result = await parseCatchupDump(rawText)
        if (result.entries.length === 0) {
          setError(
            'No clients or dinners could be extracted. Try including names, dates, or occasions.'
          )
          return
        }
        setEntries(result.entries.map((e) => ({ ...e, included: true })))
        setWarnings(result.warnings)
        setPhase('review')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to parse text. Please try again.')
      }
    })
  }

  function handleCreate() {
    const selected = entries.filter((e) => e.included)
    if (selected.length === 0) return

    setCreateErrors([])
    startCreating(async () => {
      try {
        const result = await createCatchupInquiries(
          selected.map(({ included: _, ...entry }) => entry)
        )
        setCreatedCount(result.created)
        setCreatedInquiries(result.createdInquiries)
        setCreateErrors(result.errors)
        setPhase('done')
      } catch (err) {
        setCreateErrors([
          err instanceof Error ? err.message : 'Failed to create inquiries. Please try again.',
        ])
      }
    })
  }

  function updateEntry(index: number, field: keyof CatchupEntry, value: string | number | null) {
    setEntries((prev) => prev.map((e, i) => (i === index ? { ...e, [field]: value } : e)))
  }

  function toggleEntry(index: number) {
    setEntries((prev) => prev.map((e, i) => (i === index ? { ...e, included: !e.included } : e)))
  }

  // Phase 1: Input
  if (phase === 'input') {
    return (
      <div className="mx-auto max-w-3xl space-y-6 p-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-100">Quick Catchup</h1>
          <p className="mt-1 text-stone-400">
            Got active dinners that aren't in the system yet? Paste everything you know and AI will
            sort it into inquiries you can review.
          </p>
        </div>

        <textarea
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          placeholder="Paste everything you know about your current clients and dinners. Names, dates, occasions, guest counts, notes, anything. AI will sort it out."
          className="h-64 w-full rounded-lg border border-stone-700 bg-stone-900 p-4 text-stone-200 placeholder:text-stone-500 focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500"
        />

        {error && (
          <div className="rounded-lg border border-red-800 bg-red-950/50 p-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <div className="flex justify-end">
          <Button
            variant="primary"
            onClick={handleParse}
            disabled={isParsing || rawText.trim().length === 0}
          >
            {isParsing ? 'Parsing...' : 'Parse'}
          </Button>
        </div>
      </div>
    )
  }

  // Phase 2: Review
  if (phase === 'review') {
    const selectedCount = entries.filter((e) => e.included).length

    return (
      <div className="mx-auto max-w-3xl space-y-6 p-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-100">Review Entries</h1>
          <p className="mt-1 text-stone-400">
            {entries.length} {entries.length === 1 ? 'entry' : 'entries'} extracted. Edit details
            and uncheck any you want to skip.
          </p>
        </div>

        {warnings.length > 0 && (
          <div className="rounded-lg border border-amber-800 bg-amber-950/50 p-3 text-sm text-amber-300">
            {warnings.map((w, i) => (
              <p key={i}>{w}</p>
            ))}
          </div>
        )}

        <div className="space-y-4">
          {entries.map((entry, index) => (
            <Card
              key={index}
              className={`border-stone-700 bg-stone-800/50 p-4 ${!entry.included ? 'opacity-50' : ''}`}
            >
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={entry.included}
                  onChange={() => toggleEntry(index)}
                  className="mt-1.5 h-4 w-4 rounded border-stone-600 bg-stone-900"
                />
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={entry.clientName}
                      onChange={(e) => updateEntry(index, 'clientName', e.target.value)}
                      className="flex-1 rounded border border-stone-700 bg-stone-900 px-2 py-1 text-sm font-medium text-stone-200 focus:border-stone-500 focus:outline-none"
                      placeholder="Client name"
                    />
                    <Badge variant="info">New</Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-xs text-stone-500">Occasion</label>
                      <input
                        type="text"
                        value={entry.occasion}
                        onChange={(e) => updateEntry(index, 'occasion', e.target.value)}
                        className="w-full rounded border border-stone-700 bg-stone-900 px-2 py-1 text-sm text-stone-200 focus:border-stone-500 focus:outline-none"
                        placeholder="e.g. Birthday dinner"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-stone-500">Date</label>
                      <input
                        type="date"
                        value={entry.date}
                        onChange={(e) => updateEntry(index, 'date', e.target.value)}
                        className="w-full rounded border border-stone-700 bg-stone-900 px-2 py-1 text-sm text-stone-200 focus:border-stone-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-stone-500">Guest count</label>
                      <input
                        type="number"
                        value={entry.guestCount ?? ''}
                        onChange={(e) =>
                          updateEntry(
                            index,
                            'guestCount',
                            e.target.value ? parseInt(e.target.value, 10) : null
                          )
                        }
                        className="w-full rounded border border-stone-700 bg-stone-900 px-2 py-1 text-sm text-stone-200 focus:border-stone-500 focus:outline-none"
                        placeholder="e.g. 8"
                        min={1}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-stone-500">Email</label>
                      <input
                        type="email"
                        value={entry.email}
                        onChange={(e) => updateEntry(index, 'email', e.target.value)}
                        className="w-full rounded border border-stone-700 bg-stone-900 px-2 py-1 text-sm text-stone-200 focus:border-stone-500 focus:outline-none"
                        placeholder="client@email.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs text-stone-500">Notes</label>
                    <textarea
                      value={entry.notes}
                      onChange={(e) => updateEntry(index, 'notes', e.target.value)}
                      className="w-full rounded border border-stone-700 bg-stone-900 px-2 py-1 text-sm text-stone-200 focus:border-stone-500 focus:outline-none"
                      rows={2}
                      placeholder="Dietary notes, preferences, details..."
                    />
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {createErrors.length > 0 && (
          <div className="rounded-lg border border-red-800 bg-red-950/50 p-3 text-sm text-red-300">
            {createErrors.map((e, i) => (
              <p key={i}>{e}</p>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => setPhase('input')}>
            Back
          </Button>
          <Button
            variant="primary"
            onClick={handleCreate}
            disabled={isCreating || selectedCount === 0}
          >
            {isCreating
              ? 'Creating...'
              : `Create ${selectedCount} ${selectedCount === 1 ? 'Inquiry' : 'Inquiries'}`}
          </Button>
        </div>
      </div>
    )
  }

  // Phase 3: Done
  const primaryDoneHref =
    createdInquiries.length === 1
      ? createdInquiries[0]?.href || '/inquiries'
      : '/inquiries?status=respond_next'
  const primaryDoneLabel = createdInquiries.length === 1 ? 'Open Inquiry' : 'Respond Next'

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div className="rounded-lg border border-green-800 bg-green-950/50 p-6 text-center">
        <h1 className="text-2xl font-bold text-green-300">
          {createdCount} {createdCount === 1 ? 'Inquiry' : 'Inquiries'} Created
        </h1>
        <p className="mt-2 text-stone-400">
          Your active dinners are now in the pipeline. Open the new inquiries directly or start with
          the response queue.
        </p>

        {createdInquiries.length > 0 && (
          <div className="mt-5 rounded-lg border border-stone-700 bg-stone-900/70 p-3 text-left">
            <p className="text-xs font-medium uppercase tracking-wide text-stone-500">
              Created inquiries
            </p>
            <div className="mt-2 space-y-2">
              {createdInquiries.map((inquiry) => (
                <Link
                  key={inquiry.id}
                  href={inquiry.href}
                  className="block rounded-md border border-stone-800 bg-stone-950/70 px-3 py-2 transition-colors hover:border-stone-700 hover:bg-stone-900"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="min-w-0 truncate text-sm font-medium text-stone-200">
                      {inquiry.clientName}
                    </span>
                    <span className="shrink-0 text-xs font-medium text-green-300">Open</span>
                  </div>
                  {inquiry.occasion && (
                    <p className="mt-1 truncate text-xs text-stone-500">{inquiry.occasion}</p>
                  )}
                </Link>
              ))}
            </div>
          </div>
        )}

        {createErrors.length > 0 && (
          <div className="mt-4 rounded-lg border border-amber-800 bg-amber-950/50 p-3 text-left text-sm text-amber-300">
            <p className="font-medium">Some entries had issues:</p>
            {createErrors.map((e, i) => (
              <p key={i} className="mt-1">
                {e}
              </p>
            ))}
          </div>
        )}

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href={primaryDoneHref}>
            <Button variant="primary">{primaryDoneLabel}</Button>
          </Link>
          <Link href="/inquiries">
            <Button variant="secondary">View All</Button>
          </Link>
          <Button
            variant="ghost"
            onClick={() => {
              setPhase('input')
              setRawText('')
              setEntries([])
              setWarnings([])
              setCreatedCount(0)
              setCreatedInquiries([])
              setCreateErrors([])
              setError('')
            }}
          >
            Import More
          </Button>
        </div>
      </div>
    </div>
  )
}
