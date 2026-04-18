import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { listEmployees, getPayrollRecords } from '@/lib/finance/payroll-actions'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Users, DollarSign, FileText, FileCheck } from '@/components/ui/icons'

export const metadata: Metadata = { title: 'Payroll' }

function formatCurrency(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
}

export default async function PayrollPage() {
  await requireChef()

  const currentYear = new Date().getFullYear()

  const [employees, records] = await Promise.all([
    listEmployees().catch(() => []),
    getPayrollRecords({ year: currentYear }).catch(() => []),
  ])

  const ytdWages = records.reduce((s, r) => s + r.grossPayCents, 0)
  const ytdNetPay = records.reduce((s, r) => s + r.netPayCents, 0)
  const ytdEmployerTaxes = records.reduce(
    (s, r) => s + r.employerSsTaxCents + r.employerMedicareTaxCents + r.employerFutaCents,
    0
  )

  const quickLinks = [
    {
      href: '/finance/payroll/employees',
      label: 'Employee Roster',
      description: 'Add and manage W-2 employees',
      icon: Users,
      count: `${employees.length} active`,
    },
    {
      href: '/finance/payroll/run',
      label: 'Run Payroll',
      description: 'Record a pay period',
      icon: DollarSign,
    },
    {
      href: '/finance/payroll/941',
      label: 'Form 941',
      description: 'Quarterly payroll tax summaries',
      icon: FileText,
    },
    {
      href: '/finance/payroll/w2',
      label: 'W-2 Summaries',
      description: 'Annual W-2 data per employee',
      icon: FileCheck,
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <Link href="/finance" className="text-sm text-stone-500 hover:text-stone-300">
          &larr; Finance
        </Link>
        <h1 className="text-3xl font-bold text-stone-100 mt-1">Payroll (W-2)</h1>
        <p className="text-stone-500 mt-1">
          Track employee wages, withholdings, employer taxes, and filing summaries.
        </p>
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-950 px-4 py-3 text-sm text-amber-800">
        <strong>Reference tool only.</strong> File payroll taxes and W-2s using IRS-approved payroll
        software. Consult a payroll professional for filing deadlines (Form 941 due 30 days after
        each quarter; W-2s due January 31).
      </div>

      {/* YTD Stats */}
      {records.length === 0 ? (
        <div className="rounded-lg border border-stone-700 bg-stone-800/50 p-6 text-center">
          <p className="text-stone-400">No payroll recorded yet for {currentYear}.</p>
          <p className="text-sm text-stone-500 mt-1">
            Add employees and run your first payroll to see YTD stats here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-stone-500 uppercase font-medium">YTD Gross Wages</p>
              <p className="text-2xl font-bold text-stone-100 mt-1">{formatCurrency(ytdWages)}</p>
              <p className="text-xs text-stone-400 mt-1">{records.length} pay runs</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-stone-500 uppercase font-medium">YTD Net Pay</p>
              <p className="text-2xl font-bold text-emerald-700 mt-1">
                {formatCurrency(ytdNetPay)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-stone-500 uppercase font-medium">Employer Tax Cost</p>
              <p className="text-2xl font-bold text-stone-100 mt-1">
                {formatCurrency(ytdEmployerTaxes)}
              </p>
              <p className="text-xs text-stone-400 mt-1">SS + Medicare + FUTA (deductible)</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Quick Links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {quickLinks.map((link) => {
          const Icon = link.icon
          return (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-lg border border-stone-700 bg-stone-900 hover:border-brand-600 hover:bg-brand-950 transition-colors p-5 flex items-start gap-4"
            >
              <div className="rounded-lg bg-stone-800 p-2.5">
                <Icon className="h-5 w-5 text-stone-400" />
              </div>
              <div>
                <p className="font-medium text-stone-100">{link.label}</p>
                <p className="text-sm text-stone-500 mt-0.5">{link.description}</p>
                {link.count && <p className="text-xs text-stone-400 mt-1">{link.count}</p>}
              </div>
            </Link>
          )
        })}
      </div>

      {/* Recent payroll runs */}
      {records.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-stone-100 mb-3">
            Recent Pay Runs ({currentYear})
          </h2>
          <div className="space-y-2">
            {records.slice(0, 5).map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between py-3 px-4 rounded-lg border border-stone-800 bg-stone-800"
              >
                <div>
                  <p className="text-sm font-medium text-stone-200">{r.employeeName ?? '-'}</p>
                  <p className="text-xs text-stone-500">
                    {r.payPeriodStart} → {r.payPeriodEnd} · Paid {r.payDate}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-stone-100">
                    {formatCurrency(r.netPayCents)}
                  </p>
                  <p className="text-xs text-stone-400">
                    net ({formatCurrency(r.grossPayCents)} gross)
                  </p>
                </div>
              </div>
            ))}
          </div>
          {records.length > 5 && (
            <Link
              href="/finance/payroll/run"
              className="text-sm text-brand-600 hover:underline mt-2 block"
            >
              View all {records.length} records →
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
