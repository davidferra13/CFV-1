'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { upsertDailyRevenue, getDailyRevenue } from '@/lib/vendors/revenue-actions'

interface DailyRevenueFormProps {
  existingRevenue?: {
    date: string
    total_revenue_cents: number
    source: string
    notes: string | null
  } | null
}

export function DailyRevenueForm({ existingRevenue }: DailyRevenueFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [revenue, setRevenue] = useState(
    existingRevenue ? (existingRevenue.total_revenue_cents / 100).toFixed(2) : ''
  )
  const [source, setSource] = useState<'manual' | 'csv'>(
    (existingRevenue?.source as 'manual' | 'csv') || 'manual'
  )
  const [notes, setNotes] = useState(existingRevenue?.notes ?? '')
  const [existingEntry, setExistingEntry] = useState(existingRevenue ?? null)

  // Check for existing entry when date changes
  useEffect(() => {
    let cancelled = false
    const checkExisting = async () => {
      setChecking(true)
      try {
        const entry = await getDailyRevenue(date)
        if (!cancelled) {
          setExistingEntry(entry)
          if (entry) {
            setRevenue((entry.total_revenue_cents / 100).toFixed(2))
            setSource((entry.source as 'manual' | 'csv') || 'manual')
            setNotes(entry.notes ?? '')
          } else {
            setRevenue('')
            setNotes('')
          }
        }
      } catch {
        // Ignore errors during check
      } finally {
        if (!cancelled) setChecking(false)
      }
    }
    checkExisting()
    return () => {
      cancelled = true
    }
  }, [date])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!revenue.trim()) return
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      await upsertDailyRevenue({
        date,
        total_revenue_cents: Math.round(parseFloat(revenue) * 100),
        source,
        notes: notes || undefined,
      })
      setSuccess(true)
      router.refresh()
    } catch (err: any) {
      console.error('[DailyRevenueForm] error:', err)
      setError(err.message || 'Failed to save revenue')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Daily Revenue Entry</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-red-950 border border-red-800 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}
          {success && (
            <div className="rounded-lg bg-emerald-950 border border-emerald-800 px-4 py-3 text-sm text-emerald-400">
              Revenue saved successfully.
            </div>
          )}

          {existingEntry && (
            <div className="rounded-lg bg-brand-950 border border-brand-800 px-4 py-3 text-sm text-brand-400">
              An entry already exists for this date. Saving will update it.
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
            <Input
              label="Revenue ($)"
              type="number"
              step="0.01"
              min="0"
              value={revenue}
              onChange={(e) => setRevenue(e.target.value)}
              required
              placeholder="0.00"
            />
            <div>
              <label className="block text-sm font-medium text-stone-300 mb-1.5">Source</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSource('manual')}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    source === 'manual'
                      ? 'bg-brand-600 text-white'
                      : 'bg-stone-800 text-stone-400 hover:bg-stone-700'
                  }`}
                >
                  Manual
                </button>
                <button
                  type="button"
                  onClick={() => setSource('csv')}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    source === 'csv'
                      ? 'bg-brand-600 text-white'
                      : 'bg-stone-800 text-stone-400 hover:bg-stone-700'
                  }`}
                >
                  CSV
                </button>
              </div>
            </div>
          </div>

          <Textarea
            label="Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional notes..."
            rows={2}
          />

          <Button type="submit" loading={loading || checking}>
            {existingEntry ? 'Update Revenue' : 'Save Revenue'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
