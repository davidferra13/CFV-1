'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { saveW9Data } from '@/lib/finance/contractor-actions'
import { CheckCircle, AlertTriangle, FileText } from 'lucide-react'

type W9Data = {
  staffMemberId: string
  contractorType: string | null
  tin: string | null
  tinType: 'ssn' | 'ein' | null
  businessName: string | null
  addressStreet: string | null
  addressCity: string | null
  addressState: string | null
  addressZip: string | null
  w9SignedDate: string | null
  w9DocumentUrl: string | null
  w9Collected: boolean
}

type StaffMemberWithW9 = {
  id: string
  name: string
  ytdPaymentsCents: number
  w9Collected: boolean
  contractorType: string | null
  tin: string | null
  tinType: 'ssn' | 'ein' | null
  businessName: string | null
  addressStreet: string | null
  addressCity: string | null
  addressState: string | null
  addressZip: string | null
  w9SignedDate: string | null
  w9DocumentUrl: string | null
}

type Props = {
  staffMembers: StaffMemberWithW9[]
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
}

function tinDisplay(tin: string | null): string {
  if (!tin) return '—'
  if (tin.length >= 4) return `***-**-${tin.slice(-4)}`
  return '***'
}

export function W9FormPanel({ staffMembers }: Props) {
  const [selected, setSelected] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState<Set<string>>(new Set())

  const [form, setForm] = useState<Omit<W9Data, 'staffMemberId'>>({
    contractorType: null,
    tin: null,
    tinType: null,
    businessName: null,
    addressStreet: null,
    addressCity: null,
    addressState: null,
    addressZip: null,
    w9SignedDate: null,
    w9DocumentUrl: null,
    w9Collected: false,
  })

  function openEdit(member: StaffMemberWithW9) {
    setSelected(member.id)
    setForm({
      contractorType: member.contractorType,
      tin: member.tin,
      tinType: member.tinType,
      businessName: member.businessName,
      addressStreet: member.addressStreet,
      addressCity: member.addressCity,
      addressState: member.addressState,
      addressZip: member.addressZip,
      w9SignedDate: member.w9SignedDate,
      w9DocumentUrl: member.w9DocumentUrl,
      w9Collected: member.w9Collected,
    })
  }

  function handleSave() {
    if (!selected) return
    startTransition(async () => {
      await saveW9Data({ staffMemberId: selected, ...form })
      setSaved((prev) => new Set([...prev, selected]))
      setSelected(null)
    })
  }

  const missing = staffMembers.filter((s) => !s.w9Collected && s.ytdPaymentsCents >= 60000)

  return (
    <div className="space-y-6">
      {missing.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="py-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-800">W-9 Required</p>
                <p className="text-xs text-amber-700 mt-1">
                  {missing
                    .map((m) => `${m.name} (${formatCents(m.ytdPaymentsCents)} YTD)`)
                    .join(', ')}{' '}
                  — received $600+ this year and have no W-9 on file.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-stone-400" />
            W-9 Status
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-200">
                <th className="text-left px-6 py-3 text-xs font-medium text-stone-500 uppercase">
                  Name
                </th>
                <th className="text-right px-6 py-3 text-xs font-medium text-stone-500 uppercase">
                  YTD Paid
                </th>
                <th className="text-center px-6 py-3 text-xs font-medium text-stone-500 uppercase">
                  W-9 Status
                </th>
                <th className="text-center px-6 py-3 text-xs font-medium text-stone-500 uppercase">
                  TIN
                </th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {staffMembers.map((s) => {
                const isSaved = saved.has(s.id)
                const isOnFile = s.w9Collected || isSaved
                return (
                  <tr key={s.id}>
                    <td className="px-6 py-3 font-medium text-stone-900">{s.name}</td>
                    <td className="px-6 py-3 text-right text-stone-600">
                      {formatCents(s.ytdPaymentsCents)}
                    </td>
                    <td className="px-6 py-3 text-center">
                      {isOnFile ? (
                        <Badge variant="success">On File</Badge>
                      ) : s.ytdPaymentsCents >= 60000 ? (
                        <Badge variant="warning">Missing</Badge>
                      ) : (
                        <Badge variant="default">Not Required Yet</Badge>
                      )}
                    </td>
                    <td className="px-6 py-3 text-center text-stone-500 font-mono text-xs">
                      {tinDisplay(s.tin)}
                    </td>
                    <td className="px-6 py-3 text-right">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(s)}>
                        {isOnFile ? 'Update' : 'Add W-9'}
                      </Button>
                    </td>
                  </tr>
                )
              })}
              {staffMembers.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-stone-400 text-sm">
                    No active staff members found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {selected && (
        <Card className="border-stone-300">
          <CardHeader>
            <CardTitle className="text-base">
              W-9 Information — {staffMembers.find((s) => s.id === selected)?.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">
                  Entity Type
                </label>
                <select
                  value={form.contractorType ?? ''}
                  onChange={(e) => setForm({ ...form, contractorType: e.target.value || null })}
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
                >
                  <option value="">Select…</option>
                  <option value="individual">Individual</option>
                  <option value="sole_proprietor">Sole Proprietor</option>
                  <option value="llc">LLC</option>
                  <option value="partnership">Partnership</option>
                  <option value="corporation">Corporation</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">TIN Type</label>
                <select
                  value={form.tinType ?? ''}
                  onChange={(e) =>
                    setForm({ ...form, tinType: (e.target.value as 'ssn' | 'ein') || null })
                  }
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
                >
                  <option value="">Select…</option>
                  <option value="ssn">SSN (Social Security Number)</option>
                  <option value="ein">EIN (Employer ID Number)</option>
                </select>
              </div>
            </div>

            <Input
              label="TIN (SSN or EIN)"
              value={form.tin ?? ''}
              onChange={(e) => setForm({ ...form, tin: e.target.value || null })}
              placeholder="e.g., 123-45-6789"
            />
            <p className="text-xs text-stone-400 -mt-2">
              Stored securely. Only last 4 digits are shown in reports.
            </p>

            <Input
              label="Business Name (if different from personal name)"
              value={form.businessName ?? ''}
              onChange={(e) => setForm({ ...form, businessName: e.target.value || null })}
              placeholder="Optional"
            />

            <Input
              label="Street Address"
              value={form.addressStreet ?? ''}
              onChange={(e) => setForm({ ...form, addressStreet: e.target.value || null })}
            />

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <Input
                label="City"
                value={form.addressCity ?? ''}
                onChange={(e) => setForm({ ...form, addressCity: e.target.value || null })}
              />
              <Input
                label="State"
                value={form.addressState ?? ''}
                onChange={(e) => setForm({ ...form, addressState: e.target.value || null })}
                placeholder="e.g., MA"
              />
              <Input
                label="ZIP"
                value={form.addressZip ?? ''}
                onChange={(e) => setForm({ ...form, addressZip: e.target.value || null })}
              />
            </div>

            <Input
              label="W-9 Signed Date"
              type="date"
              value={form.w9SignedDate ?? ''}
              onChange={(e) => setForm({ ...form, w9SignedDate: e.target.value || null })}
            />

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="w9_collected"
                checked={form.w9Collected}
                onChange={(e) => setForm({ ...form, w9Collected: e.target.checked })}
                className="rounded"
              />
              <label htmlFor="w9_collected" className="text-sm text-stone-700">
                W-9 form physically received and on file
              </label>
            </div>

            {form.w9Collected && (
              <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2">
                <CheckCircle className="h-4 w-4" />
                W-9 marked as on file
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button size="sm" onClick={handleSave} loading={isPending}>
                Save W-9 Data
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setSelected(null)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
