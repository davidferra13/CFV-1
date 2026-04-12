'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { logVisit } from '@/lib/guests/visit-actions'

interface Visit {
  id: string
  visit_date: string
  party_size: number | null
  spend_cents: number | null
  server_id: string | null
  notes: string | null
}

interface VisitLogProps {
  guestId: string
  visits: Visit[]
  totalSpendCents: number
}

export function VisitLog({ guestId, visits, totalSpendCents }: VisitLogProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)

  // Log visit form state
  const [visitDate, setVisitDate] = useState(
    ((_vl) =>
      `${_vl.getFullYear()}-${String(_vl.getMonth() + 1).padStart(2, '0')}-${String(_vl.getDate()).padStart(2, '0')}`)(
      new Date()
    )
  )
  const [partySize, setPartySize] = useState('')
  const [spend, setSpend] = useState('')
  const [serverId, setServerId] = useState('')
  const [visitNotes, setVisitNotes] = useState('')

  const handleLogVisit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await logVisit({
        guest_id: guestId,
        visit_date: visitDate,
        party_size: partySize ? parseInt(partySize) : undefined,
        spend_cents: spend ? Math.round(parseFloat(spend) * 100) : undefined,
        server_id: serverId || undefined,
        notes: visitNotes || undefined,
      })
      setShowForm(false)
      setPartySize('')
      setSpend('')
      setServerId('')
      setVisitNotes('')
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Failed to log visit')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base">Visit History</CardTitle>
          {totalSpendCents > 0 && (
            <p className="text-xs text-stone-500 mt-0.5">
              Total spend: $
              {(totalSpendCents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
          )}
        </div>
        <Button variant="secondary" size="sm" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : 'Log Visit'}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-950 border border-red-800 px-3 py-2 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Log visit form */}
        {showForm && (
          <form
            onSubmit={handleLogVisit}
            className="border border-stone-700 rounded-lg p-4 space-y-3"
          >
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Input
                label="Date"
                type="date"
                value={visitDate}
                onChange={(e) => setVisitDate(e.target.value)}
                required
              />
              <Input
                label="Party Size"
                type="number"
                min="1"
                value={partySize}
                onChange={(e) => setPartySize(e.target.value)}
                placeholder="2"
              />
              <Input
                label="Spend ($)"
                type="number"
                step="0.01"
                min="0"
                value={spend}
                onChange={(e) => setSpend(e.target.value)}
                placeholder="0.00"
              />
              <Input
                label="Server"
                value={serverId}
                onChange={(e) => setServerId(e.target.value)}
                placeholder="Name"
              />
            </div>
            <Textarea
              label="Notes"
              value={visitNotes}
              onChange={(e) => setVisitNotes(e.target.value)}
              placeholder="Special requests, feedback..."
              rows={2}
            />
            <Button type="submit" size="sm" loading={loading}>
              Save Visit
            </Button>
          </form>
        )}

        {/* Visit table */}
        {visits.length === 0 ? (
          <p className="text-sm text-stone-500">No visits recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-700 text-left text-stone-400">
                  <th className="pb-2 pr-4">Date</th>
                  <th className="pb-2 pr-4">Party Size</th>
                  <th className="pb-2 pr-4">Spend</th>
                  <th className="pb-2 pr-4">Server</th>
                  <th className="pb-2">Notes</th>
                </tr>
              </thead>
              <tbody>
                {visits.map((v) => (
                  <tr key={v.id} className="border-b border-stone-800">
                    <td className="py-2 pr-4 text-stone-300">{v.visit_date}</td>
                    <td className="py-2 pr-4 text-stone-400">{v.party_size || '-'}</td>
                    <td className="py-2 pr-4 text-stone-200">
                      {v.spend_cents ? `$${(v.spend_cents / 100).toFixed(2)}` : '-'}
                    </td>
                    <td className="py-2 pr-4 text-stone-400">{v.server_id || '-'}</td>
                    <td className="py-2 text-stone-500 text-xs truncate max-w-[200px]">
                      {v.notes || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
