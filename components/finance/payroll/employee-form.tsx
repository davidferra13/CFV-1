'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createEmployee, updateEmployee, terminateEmployee } from '@/lib/finance/payroll-actions'
import type { Employee } from '@/lib/finance/payroll-actions'
import { FILING_STATUS_LABELS, PAY_TYPE_LABELS } from '@/lib/finance/payroll-constants'
import { CheckCircle } from '@/components/ui/icons'
import { toast } from 'sonner'

type Props = {
  employee?: Employee
  onSaved?: () => void
  onCancel?: () => void
}

export function EmployeeForm({ employee, onSaved, onCancel }: Props) {
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)

  const [form, setForm] = useState({
    name: employee?.name ?? '',
    ssnLast4: employee?.ssnLast4 ?? '',
    email: employee?.email ?? '',
    phone: employee?.phone ?? '',
    addressStreet: employee?.addressStreet ?? '',
    addressCity: employee?.addressCity ?? '',
    addressState: employee?.addressState ?? '',
    addressZip: employee?.addressZip ?? '',
    filingStatus: employee?.filingStatus ?? ('single' as const),
    allowances: employee?.allowances ?? 0,
    additionalWithholdingCents: employee?.additionalWithholdingCents ?? 0,
    hireDate: employee?.hireDate ?? '',
    payType: employee?.payType ?? ('hourly' as const),
    hourlyRateCents: employee?.hourlyRateCents ?? 0,
    annualSalaryCents: employee?.annualSalaryCents ?? 0,
  })

  function handleSave() {
    startTransition(async () => {
      try {
        if (employee) {
          await updateEmployee(employee.id, {
            name: form.name,
            ssnLast4: form.ssnLast4 || null,
            email: form.email || null,
            phone: form.phone || null,
            addressStreet: form.addressStreet || null,
            addressCity: form.addressCity || null,
            addressState: form.addressState || null,
            addressZip: form.addressZip || null,
            filingStatus: form.filingStatus,
            allowances: form.allowances,
            additionalWithholdingCents: form.additionalWithholdingCents,
            payType: form.payType,
            hourlyRateCents: form.payType === 'hourly' ? form.hourlyRateCents : null,
            annualSalaryCents: form.payType === 'salary' ? form.annualSalaryCents : null,
          })
        } else {
          await createEmployee({
            name: form.name,
            ssnLast4: form.ssnLast4 || null,
            email: form.email || null,
            phone: form.phone || null,
            addressStreet: form.addressStreet || null,
            addressCity: form.addressCity || null,
            addressState: form.addressState || null,
            addressZip: form.addressZip || null,
            filingStatus: form.filingStatus,
            allowances: form.allowances,
            additionalWithholdingCents: form.additionalWithholdingCents,
            hireDate: form.hireDate,
            payType: form.payType,
            hourlyRateCents: form.payType === 'hourly' ? form.hourlyRateCents : null,
            annualSalaryCents: form.payType === 'salary' ? form.annualSalaryCents : null,
          })
        }
        setSaved(true)
        onSaved?.()
      } catch (err) {
        toast.error('Failed to save employee')
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          {employee ? `Edit — ${employee.name}` : 'Add W-2 Employee'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {saved && (
          <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-950 rounded-lg px-3 py-2">
            <CheckCircle className="h-4 w-4" />
            Saved.
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Full Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <div>
            <label className="block text-sm font-medium text-stone-300 mb-1.5">
              SSN (last 4 digits)
            </label>
            <Input
              type="text"
              maxLength={4}
              value={form.ssnLast4}
              onChange={(e) => setForm({ ...form, ssnLast4: e.target.value.replace(/\D/g, '') })}
              placeholder="1234"
            />
            <p className="text-xs text-stone-400 mt-1">Store last 4 only. Never enter full SSN.</p>
          </div>
          <Input
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <Input
            label="Phone"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
        </div>

        <Input
          label="Street Address"
          value={form.addressStreet}
          onChange={(e) => setForm({ ...form, addressStreet: e.target.value })}
        />
        <div className="grid grid-cols-3 gap-4">
          <Input
            label="City"
            value={form.addressCity}
            onChange={(e) => setForm({ ...form, addressCity: e.target.value })}
          />
          <Input
            label="State"
            value={form.addressState}
            onChange={(e) => setForm({ ...form, addressState: e.target.value })}
            placeholder="MA"
          />
          <Input
            label="ZIP"
            value={form.addressZip}
            onChange={(e) => setForm({ ...form, addressZip: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-stone-300 mb-1.5">
              W-4 Filing Status
            </label>
            <select
              value={form.filingStatus}
              onChange={(e) =>
                setForm({
                  ...form,
                  filingStatus: e.target.value as Employee['filingStatus'],
                })
              }
              className="w-full rounded-lg border border-stone-600 px-3 py-2 text-sm"
            >
              {Object.entries(FILING_STATUS_LABELS).map(([val, label]) => (
                <option key={val} value={val}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <Input
            label="Allowances (W-4)"
            type="number"
            min="0"
            value={form.allowances}
            onChange={(e) => setForm({ ...form, allowances: parseInt(e.target.value || '0', 10) })}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-stone-300 mb-1.5">Pay Type</label>
            <select
              value={form.payType}
              onChange={(e) => setForm({ ...form, payType: e.target.value as 'hourly' | 'salary' })}
              className="w-full rounded-lg border border-stone-600 px-3 py-2 text-sm"
            >
              {Object.entries(PAY_TYPE_LABELS).map(([val, label]) => (
                <option key={val} value={val}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          {form.payType === 'hourly' ? (
            <div>
              <label className="block text-sm font-medium text-stone-300 mb-1.5">
                Hourly Rate ($)
              </label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={((form.hourlyRateCents || 0) / 100).toFixed(2)}
                onChange={(e) =>
                  setForm({
                    ...form,
                    hourlyRateCents: Math.round(parseFloat(e.target.value || '0') * 100),
                  })
                }
              />
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-stone-300 mb-1.5">
                Annual Salary ($)
              </label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={((form.annualSalaryCents || 0) / 100).toFixed(2)}
                onChange={(e) =>
                  setForm({
                    ...form,
                    annualSalaryCents: Math.round(parseFloat(e.target.value || '0') * 100),
                  })
                }
              />
            </div>
          )}
        </div>

        {!employee && (
          <Input
            label="Hire Date"
            type="date"
            value={form.hireDate}
            onChange={(e) => setForm({ ...form, hireDate: e.target.value })}
          />
        )}

        <div className="flex gap-2 pt-2">
          <Button size="sm" onClick={handleSave} loading={isPending}>
            {employee ? 'Save Changes' : 'Add Employee'}
          </Button>
          {onCancel && (
            <Button size="sm" variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
