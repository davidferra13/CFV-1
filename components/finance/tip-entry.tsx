'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DollarSign } from '@/components/ui/icons'
import {
  recordStaffTips,
  getStaffTipsForDate,
  deleteStaffTipEntry,
  type StaffTipEntry,
} from '@/lib/finance/staff-tip-actions'

interface StaffMember {
  id: string
  name: string
  role: string
}

interface TipEntryProps {
  staffMembers: StaffMember[]
  initialDate?: string
}

function formatCurrency(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
}

export function TipEntryForm({ staffMembers, initialDate }: TipEntryProps) {
  const today = initialDate || new Date().toISOString().split('T')[0]
  const [date, setDate] = useState(today)
  const [entries, setEntries] = useState<StaffTipEntry[]>([])
  const [loaded, setLoaded] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // Per-staff input state
  const [inputs, setInputs] = useState<
    Record<string, { cash: string; card: string; hours: string }>
  >({})

  function getInput(staffId: string) {
    return inputs[staffId] || { cash: '', card: '', hours: '' }
  }

  function setStaffInput(staffId: string, field: 'cash' | 'card' | 'hours', value: string) {
    setInputs((prev) => ({
      ...prev,
      [staffId]: { ...getInput(staffId), [field]: value },
    }))
  }

  function loadTips() {
    startTransition(async () => {
      try {
        const tips = await getStaffTipsForDate(date)
        setEntries(tips)
        setLoaded(true)
        setError(null)
      } catch (err) {
        setError('Failed to load tips')
      }
    })
  }

  function handleSaveTip(staffId: string) {
    const input = getInput(staffId)
    const cashCents = Math.round(parseFloat(input.cash || '0') * 100)
    const cardCents = Math.round(parseFloat(input.card || '0') * 100)
    const hours = input.hours ? parseFloat(input.hours) : undefined

    if (cashCents === 0 && cardCents === 0) return

    startTransition(async () => {
      try {
        await recordStaffTips(staffId, date, cashCents, cardCents, hours)
        setInputs((prev) => ({ ...prev, [staffId]: { cash: '', card: '', hours: '' } }))
        const tips = await getStaffTipsForDate(date)
        setEntries(tips)
        setError(null)
      } catch (err) {
        setError('Failed to save tip entry')
      }
    })
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      try {
        await deleteStaffTipEntry(id)
        const tips = await getStaffTipsForDate(date)
        setEntries(tips)
        setError(null)
      } catch (err) {
        setError('Failed to delete tip entry')
      }
    })
  }

  const totalCash = entries.reduce((s, e) => s + e.cashTipsCents, 0)
  const totalCard = entries.reduce((s, e) => s + e.cardTipsCents, 0)
  const totalAll = totalCash + totalCard

  return (
    <div className="space-y-6">
      {/* Date selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Daily Tip Entry
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-4">
            <div>
              <Label>Shift Date</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => {
                  setDate(e.target.value)
                  setLoaded(false)
                }}
                className="w-44"
              />
            </div>
            <Button onClick={loadTips} disabled={isPending}>
              {loaded ? 'Refresh' : 'Load Tips'}
            </Button>
          </div>

          {error && <p className="text-sm text-red-400 mt-2">{error}</p>}
        </CardContent>
      </Card>

      {/* Staff tip entry grid */}
      {loaded && (
        <Card>
          <CardHeader>
            <CardTitle>Enter Tips for {date}</CardTitle>
          </CardHeader>
          <CardContent>
            {staffMembers.length === 0 ? (
              <p className="text-sm text-stone-500">
                No active staff members found. Add staff in the Staff section first.
              </p>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-[1fr_100px_100px_80px_auto] gap-2 text-xs font-medium text-stone-500 uppercase px-1">
                  <span>Staff Member</span>
                  <span>Cash Tips</span>
                  <span>Card Tips</span>
                  <span>Hours</span>
                  <span></span>
                </div>

                {staffMembers.map((staff) => {
                  const input = getInput(staff.id)
                  return (
                    <div
                      key={staff.id}
                      className="grid grid-cols-[1fr_100px_100px_80px_auto] gap-2 items-center"
                    >
                      <div>
                        <p className="text-sm font-medium text-stone-200">{staff.name}</p>
                        <p className="text-xs text-stone-500">{staff.role}</p>
                      </div>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="$0.00"
                        value={input.cash}
                        onChange={(e) => setStaffInput(staff.id, 'cash', e.target.value)}
                        className="text-sm"
                      />
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="$0.00"
                        value={input.card}
                        onChange={(e) => setStaffInput(staff.id, 'card', e.target.value)}
                        className="text-sm"
                      />
                      <Input
                        type="number"
                        step="0.25"
                        min="0"
                        placeholder="hrs"
                        value={input.hours}
                        onChange={(e) => setStaffInput(staff.id, 'hours', e.target.value)}
                        className="text-sm"
                      />
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleSaveTip(staff.id)}
                        disabled={isPending}
                      >
                        Add
                      </Button>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Existing entries for the date */}
      {loaded && entries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recorded Tips - {date}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-700">
                  <th className="text-left px-6 py-3 text-xs font-medium text-stone-500 uppercase">
                    Staff
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-stone-500 uppercase">
                    Cash
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-stone-500 uppercase">
                    Card
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-stone-500 uppercase">
                    Total
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-stone-500 uppercase">
                    Hours
                  </th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-stone-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800">
                {entries.map((e) => (
                  <tr key={e.id} className="hover:bg-stone-800">
                    <td className="px-6 py-3">
                      <p className="font-medium text-stone-200">{e.staffName ?? 'Unknown'}</p>
                      <p className="text-xs text-stone-500">{e.staffRole}</p>
                    </td>
                    <td className="px-4 py-3 text-right text-stone-300">
                      {formatCurrency(e.cashTipsCents)}
                    </td>
                    <td className="px-4 py-3 text-right text-stone-300">
                      {formatCurrency(e.cardTipsCents)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-stone-100">
                      {formatCurrency(e.totalTipsCents)}
                    </td>
                    <td className="px-4 py-3 text-right text-stone-400">
                      {e.hoursWorked != null ? `${e.hoursWorked}h` : '-'}
                    </td>
                    <td className="px-6 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(e.id)}
                        disabled={isPending}
                        className="text-red-400 hover:text-red-300"
                      >
                        Remove
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-stone-600 bg-stone-900">
                  <td className="px-6 py-3 font-semibold text-stone-200">Totals</td>
                  <td className="px-4 py-3 text-right font-semibold text-stone-200">
                    {formatCurrency(totalCash)}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-stone-200">
                    {formatCurrency(totalCard)}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-emerald-400">
                    {formatCurrency(totalAll)}
                  </td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
