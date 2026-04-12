'use client'

import { useState, useTransition } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  recordContractorPayment,
  type ContractorPayment,
  type Contractor1099Summary,
} from '@/lib/finance/contractor-actions'
import { Users, AlertTriangle, Plus } from '@/components/ui/icons'
import { toast } from 'sonner'
import { todayLocalDateString } from '@/lib/utils/format'

type StaffMember = { id: string; name: string; contractorType: string | null }

type Props = {
  summaries: Contractor1099Summary[]
  recentPayments: ContractorPayment[]
  staffMembers: StaffMember[]
  taxYear: number
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
}

export function Contractor1099Panel({ summaries, recentPayments, staffMembers, taxYear }: Props) {
  const [payments, setPayments] = useState(recentPayments)
  const [isPending, startTransition] = useTransition()
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({
    staffMemberId: '',
    amountCents: 0,
    paymentDate: todayLocalDateString(),
    paymentMethod: 'venmo' as string,
    description: '',
  })

  const threshold = summaries.filter((s) => s.threshold1099)
  const totalPaid = summaries.reduce((s, c) => s + c.ytdPaymentsCents, 0)

  function handleRecord() {
    startTransition(async () => {
      try {
        const payment = await recordContractorPayment({
          staffMemberId: form.staffMemberId,
          amountCents: form.amountCents,
          paymentDate: form.paymentDate,
          paymentMethod: form.paymentMethod as any,
          description: form.description || undefined,
          taxYear,
        })
        setPayments((prev) => [payment, ...prev])
        setShowAdd(false)
        setForm({
          staffMemberId: '',
          amountCents: 0,
          paymentDate: todayLocalDateString(),
          paymentMethod: 'venmo',
          description: '',
        })
      } catch (err) {
        toast.error('Failed to record contractor payment')
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="py-3">
            <p className="text-xs text-stone-500">Contractors</p>
            <p className="text-2xl font-semibold text-stone-100">{summaries.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3">
            <p className="text-xs text-stone-500">YTD Payments</p>
            <p className="text-2xl font-semibold text-stone-100">{formatCents(totalPaid)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3">
            <p className="text-xs text-stone-500">1099 Required</p>
            <p className="text-2xl font-semibold text-amber-600">{threshold.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3">
            <p className="text-xs text-stone-500">Tax Year</p>
            <p className="text-2xl font-semibold text-stone-400">{taxYear}</p>
          </CardContent>
        </Card>
      </div>

      {/* 1099 Alerts */}
      {threshold.length > 0 && (
        <Card className="border-amber-200 bg-amber-950">
          <CardContent className="py-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800">1099 Filing Required</p>
                <p className="text-xs text-amber-700 mt-1">
                  {threshold
                    .map((t) => `${t.staffName} (${formatCents(t.ytdPaymentsCents)})`)
                    .join(', ')}{' '}
                  - these contractors have received $600+ this year.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Record Payment */}
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setShowAdd(true)}>
          <Plus className="h-4 w-4" />
          Record Payment
        </Button>
      </div>

      {showAdd && (
        <Card className="border-stone-600">
          <CardContent className="py-4 space-y-3">
            <div>
              <label className="block text-sm font-medium text-stone-300 mb-1.5">
                Staff Member
              </label>
              <select
                value={form.staffMemberId}
                onChange={(e) => setForm({ ...form, staffMemberId: e.target.value })}
                className="w-full rounded-lg border border-stone-600 px-3 py-2 text-sm"
              >
                <option value="">Select contractor…</option>
                {staffMembers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <Input
              label="Amount ($)"
              type="number"
              min="0"
              step="0.01"
              value={(form.amountCents / 100).toString()}
              onChange={(e) =>
                setForm({
                  ...form,
                  amountCents: Math.round(parseFloat(e.target.value || '0') * 100),
                })
              }
            />
            <Input
              label="Payment Date"
              type="date"
              value={form.paymentDate}
              onChange={(e) => setForm({ ...form, paymentDate: e.target.value })}
            />
            <div>
              <label className="block text-sm font-medium text-stone-300 mb-1.5">
                Payment Method
              </label>
              <select
                value={form.paymentMethod}
                onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
                className="w-full rounded-lg border border-stone-600 px-3 py-2 text-sm"
              >
                <option value="check">Check</option>
                <option value="venmo">Venmo</option>
                <option value="zelle">Zelle</option>
                <option value="cash">Cash</option>
                <option value="direct_deposit">Direct Deposit</option>
                <option value="other">Other</option>
              </select>
            </div>
            <Input
              label="Description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="e.g., Event staff payment"
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleRecord}
                loading={isPending}
                disabled={!form.staffMemberId}
              >
                Record
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowAdd(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Contractor Summary Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-stone-400" />
            Contractor Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-700">
                <th className="text-left px-6 py-3 text-xs font-medium text-stone-500 uppercase">
                  Name
                </th>
                <th className="text-right px-6 py-3 text-xs font-medium text-stone-500 uppercase">
                  YTD Paid
                </th>
                <th className="text-right px-6 py-3 text-xs font-medium text-stone-500 uppercase">
                  Payments
                </th>
                <th className="text-center px-6 py-3 text-xs font-medium text-stone-500 uppercase">
                  1099
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800">
              {summaries.map((s) => (
                <tr key={s.staffMemberId}>
                  <td className="px-6 py-3 font-medium text-stone-100">{s.staffName}</td>
                  <td className="px-6 py-3 text-right">{formatCents(s.ytdPaymentsCents)}</td>
                  <td className="px-6 py-3 text-right text-stone-400">{s.paymentCount}</td>
                  <td className="px-6 py-3 text-center">
                    {s.threshold1099 ? (
                      <Badge variant="warning">Required</Badge>
                    ) : (
                      <Badge variant="default">Under $600</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Recent Payments */}
      {payments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Payments</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-stone-800">
              {payments.slice(0, 20).map((p) => (
                <div key={p.id} className="px-6 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-stone-100">
                      {p.staffName || 'Contractor'}
                    </p>
                    <p className="text-xs text-stone-500">
                      {p.paymentDate} · {p.paymentMethod}
                      {p.description && ` · ${p.description}`}
                    </p>
                  </div>
                  <p className="text-sm font-medium text-stone-100">{formatCents(p.amountCents)}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
