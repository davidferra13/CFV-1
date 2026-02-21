import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { listEmployees, getPayrollRecords } from '@/lib/finance/payroll-actions'
import { PayrollEntryForm } from '@/components/finance/payroll/payroll-entry-form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export const metadata: Metadata = { title: 'Run Payroll — ChefFlow' }

function formatCurrency(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
}

export default async function RunPayrollPage() {
  await requireChef()

  const currentYear = new Date().getFullYear()

  const [employees, records] = await Promise.all([
    listEmployees().catch(() => []),
    getPayrollRecords({ year: currentYear }).catch(() => []),
  ])

  return (
    <div className="space-y-6">
      <div>
        <Link href="/finance/payroll" className="text-sm text-stone-500 hover:text-stone-700">
          &larr; Payroll
        </Link>
        <h1 className="text-3xl font-bold text-stone-900 mt-1">Run Payroll</h1>
        <p className="text-stone-500 mt-1">Record a pay period for a W-2 employee.</p>
      </div>

      <PayrollEntryForm employees={employees} />

      {/* Recent Records */}
      {records.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Payroll Records ({currentYear})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-200">
                  <th className="text-left px-6 py-3 text-xs font-medium text-stone-500 uppercase">
                    Employee
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-stone-500 uppercase">
                    Period
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-stone-500 uppercase">
                    Gross
                  </th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-stone-500 uppercase">
                    Net
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {records.slice(0, 10).map((r) => (
                  <tr key={r.id} className="hover:bg-stone-50">
                    <td className="px-6 py-3 font-medium text-stone-800">
                      {r.employeeName ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-stone-500 text-xs">
                      {r.payPeriodStart} → {r.payPeriodEnd}
                      <span className="block">Paid {r.payDate}</span>
                    </td>
                    <td className="px-4 py-3 text-right text-stone-600">
                      {formatCurrency(r.grossPayCents)}
                    </td>
                    <td className="px-6 py-3 text-right font-semibold text-stone-900">
                      {formatCurrency(r.netPayCents)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
