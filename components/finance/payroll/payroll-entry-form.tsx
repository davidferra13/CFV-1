'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { recordPayroll } from '@/lib/finance/payroll-actions'
import type { Employee } from '@/lib/finance/payroll-actions'
import { computePayrollTaxes } from '@/lib/finance/payroll-constants'
import { CheckCircle } from 'lucide-react'

function formatCurrency(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
}

type Props = {
  employees: Employee[]
  onSaved?: () => void
}

export function PayrollEntryForm({ employees, onSaved }: Props) {
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)

  const today = new Date().toISOString().split('T')[0]

  const [form, setForm] = useState({
    employeeId: employees[0]?.id ?? '',
    payPeriodStart: '',
    payPeriodEnd: '',
    payDate: today,
    regularHours: 0,
    overtimeHours: 0,
    hourlyRateCents: 0,
    federalIncomeTaxCents: 0,
    stateIncomeTaxCents: 0,
    ytdWagesCents: 0,
    notes: '',
  })

  // Fill hourly rate from selected employee
  function handleEmployeeChange(id: string) {
    const emp = employees.find((e) => e.id === id)
    setForm({
      ...form,
      employeeId: id,
      hourlyRateCents: emp?.hourlyRateCents ?? 0,
    })
  }

  const regularPay = Math.round(form.regularHours * form.hourlyRateCents)
  const overtimePay = Math.round(form.overtimeHours * form.hourlyRateCents * 1.5)
  const grossPay = regularPay + overtimePay
  const taxes = computePayrollTaxes(grossPay, form.ytdWagesCents)
  const totalDeductions =
    form.federalIncomeTaxCents +
    taxes.employeeSsTaxCents +
    taxes.employeeMedicareTaxCents +
    form.stateIncomeTaxCents
  const netPay = grossPay - totalDeductions

  function handleSave() {
    startTransition(async () => {
      await recordPayroll({
        employeeId: form.employeeId,
        payPeriodStart: form.payPeriodStart,
        payPeriodEnd: form.payPeriodEnd,
        payDate: form.payDate,
        regularHours: form.regularHours,
        overtimeHours: form.overtimeHours,
        hourlyRateCents: form.hourlyRateCents,
        overtimeRateCents: Math.round(form.hourlyRateCents * 1.5),
        federalIncomeTaxCents: form.federalIncomeTaxCents,
        stateIncomeTaxCents: form.stateIncomeTaxCents,
        ytdWagesCents: form.ytdWagesCents,
        notes: form.notes || null,
      })
      setSaved(true)
      onSaved?.()
    })
  }

  if (employees.length === 0) {
    return (
      <Card>
        <CardContent className="py-6 text-sm text-stone-500">
          No active employees found. Add employees first.
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Record Payroll Run</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {saved && (
          <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-950 rounded-lg px-3 py-2">
            <CheckCircle className="h-4 w-4" />
            Payroll recorded.
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-stone-300 mb-1.5">Employee</label>
            <select
              value={form.employeeId}
              onChange={(e) => handleEmployeeChange(e.target.value)}
              className="w-full rounded-lg border border-stone-600 px-3 py-2 text-sm"
            >
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </div>
          <Input
            label="Pay Date"
            type="date"
            value={form.payDate}
            onChange={(e) => setForm({ ...form, payDate: e.target.value })}
          />
          <Input
            label="Pay Period Start"
            type="date"
            value={form.payPeriodStart}
            onChange={(e) => setForm({ ...form, payPeriodStart: e.target.value })}
          />
          <Input
            label="Pay Period End"
            type="date"
            value={form.payPeriodEnd}
            onChange={(e) => setForm({ ...form, payPeriodEnd: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Input
            label="Regular Hours"
            type="number"
            min="0"
            step="0.25"
            value={form.regularHours}
            onChange={(e) => setForm({ ...form, regularHours: parseFloat(e.target.value || '0') })}
          />
          <Input
            label="Overtime Hours"
            type="number"
            min="0"
            step="0.25"
            value={form.overtimeHours}
            onChange={(e) => setForm({ ...form, overtimeHours: parseFloat(e.target.value || '0') })}
          />
          <div>
            <label className="block text-sm font-medium text-stone-300 mb-1.5">
              Hourly Rate ($)
            </label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={(form.hourlyRateCents / 100).toFixed(2)}
              onChange={(e) =>
                setForm({
                  ...form,
                  hourlyRateCents: Math.round(parseFloat(e.target.value || '0') * 100),
                })
              }
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-300 mb-1.5">YTD Wages ($)</label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={(form.ytdWagesCents / 100).toFixed(2)}
              onChange={(e) =>
                setForm({
                  ...form,
                  ytdWagesCents: Math.round(parseFloat(e.target.value || '0') * 100),
                })
              }
            />
            <p className="text-xs text-stone-400 mt-1">Before this pay period</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-stone-300 mb-1.5">
              Federal Income Tax Withheld ($)
            </label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={(form.federalIncomeTaxCents / 100).toFixed(2)}
              onChange={(e) =>
                setForm({
                  ...form,
                  federalIncomeTaxCents: Math.round(parseFloat(e.target.value || '0') * 100),
                })
              }
            />
            <p className="text-xs text-stone-400 mt-1">From IRS withholding tables or W-4</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-300 mb-1.5">
              State Income Tax Withheld ($)
            </label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={(form.stateIncomeTaxCents / 100).toFixed(2)}
              onChange={(e) =>
                setForm({
                  ...form,
                  stateIncomeTaxCents: Math.round(parseFloat(e.target.value || '0') * 100),
                })
              }
            />
          </div>
        </div>

        {/* Tax Breakdown Preview */}
        <div className="rounded-lg border border-stone-700 bg-stone-800 p-4 space-y-1.5 text-sm">
          <p className="font-medium text-stone-300 mb-2">Pay Breakdown</p>
          <div className="flex justify-between">
            <span className="text-stone-500">Regular Pay ({form.regularHours}h)</span>
            <span>{formatCurrency(regularPay)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-stone-500">Overtime Pay ({form.overtimeHours}h × 1.5)</span>
            <span>{formatCurrency(overtimePay)}</span>
          </div>
          <div className="flex justify-between font-medium border-t border-stone-700 pt-1.5">
            <span>Gross Pay</span>
            <span>{formatCurrency(grossPay)}</span>
          </div>
          <div className="flex justify-between text-stone-500">
            <span>Federal Income Tax</span>
            <span>- {formatCurrency(form.federalIncomeTaxCents)}</span>
          </div>
          <div className="flex justify-between text-stone-500">
            <span>Social Security (6.2%)</span>
            <span>- {formatCurrency(taxes.employeeSsTaxCents)}</span>
          </div>
          <div className="flex justify-between text-stone-500">
            <span>Medicare (1.45%)</span>
            <span>- {formatCurrency(taxes.employeeMedicareTaxCents)}</span>
          </div>
          <div className="flex justify-between text-stone-500">
            <span>State Income Tax</span>
            <span>- {formatCurrency(form.stateIncomeTaxCents)}</span>
          </div>
          <div className="flex justify-between font-bold text-green-700 border-t border-stone-700 pt-1.5">
            <span>Net Pay</span>
            <span>{formatCurrency(netPay)}</span>
          </div>
          <div className="pt-2 border-t border-stone-800">
            <p className="text-xs text-stone-400 font-medium">
              Employer Costs (not deducted from employee)
            </p>
            <div className="flex justify-between text-xs text-stone-400 mt-1">
              <span>SS Match (6.2%)</span>
              <span>{formatCurrency(taxes.employerSsTaxCents)}</span>
            </div>
            <div className="flex justify-between text-xs text-stone-400">
              <span>Medicare Match (1.45%)</span>
              <span>{formatCurrency(taxes.employerMedicareTaxCents)}</span>
            </div>
            <div className="flex justify-between text-xs text-stone-400">
              <span>FUTA (0.6% of first $7k)</span>
              <span>{formatCurrency(taxes.employerFutaCents)}</span>
            </div>
          </div>
        </div>

        <Input
          label="Notes (optional)"
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
        />

        <Button size="sm" onClick={handleSave} loading={isPending}>
          Record Payroll
        </Button>
      </CardContent>
    </Card>
  )
}
