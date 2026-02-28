'use client'

import { useState, useEffect, useTransition } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { EmployeeForm } from '@/components/finance/payroll/employee-form'
import { listEmployees, terminateEmployee } from '@/lib/finance/payroll-actions'
import type { Employee } from '@/lib/finance/payroll-actions'
import { EMPLOYEE_STATUS_LABELS, PAY_TYPE_LABELS } from '@/lib/finance/payroll-constants'
import { Plus, Pencil } from 'lucide-react'
import { toast } from 'sonner'

function formatCurrency(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
}

export default function PayrollEmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<Employee | null>(null)
  const [showTerminated, setShowTerminated] = useState(false)
  const [isPending, startTransition] = useTransition()

  function reload() {
    listEmployees(showTerminated).then(setEmployees)
  }

  useEffect(() => {
    reload()
  }, [showTerminated])

  function handleTerminate(id: string) {
    const date = new Date().toISOString().split('T')[0]
    startTransition(async () => {
      try {
        await terminateEmployee(id, date)
        reload()
      } catch (err) {
        toast.error('Failed to terminate employee')
      }
    })
  }

  const statusVariant: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
    active: 'success',
    on_leave: 'warning',
    terminated: 'error',
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/finance/payroll" className="text-sm text-stone-500 hover:text-stone-300">
          &larr; Payroll
        </Link>
        <h1 className="text-3xl font-bold text-stone-100 mt-1">Employee Roster</h1>
        <p className="text-stone-500 mt-1">Manage W-2 employees, W-4 settings, and pay rates.</p>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-stone-400 cursor-pointer">
            <input
              type="checkbox"
              checked={showTerminated}
              onChange={(e) => setShowTerminated(e.target.checked)}
              className="rounded"
            />
            Show terminated
          </label>
        </div>
        <Button
          size="sm"
          onClick={() => {
            setShowAdd(true)
            setEditing(null)
          }}
        >
          <Plus className="h-4 w-4 mr-1.5" />
          Add Employee
        </Button>
      </div>

      {showAdd && !editing && (
        <EmployeeForm
          onSaved={() => {
            setShowAdd(false)
            reload()
          }}
          onCancel={() => setShowAdd(false)}
        />
      )}

      {editing && (
        <EmployeeForm
          employee={editing}
          onSaved={() => {
            setEditing(null)
            reload()
          }}
          onCancel={() => setEditing(null)}
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle>Employees</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-700">
                <th className="text-left px-6 py-3 text-xs font-medium text-stone-500 uppercase">
                  Name
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-stone-500 uppercase">
                  Status
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-stone-500 uppercase">
                  Pay Type
                </th>
                <th className="text-right px-4 py-3 text-xs font-medium text-stone-500 uppercase">
                  Rate
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-stone-500 uppercase">
                  Hired
                </th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800">
              {employees.map((e) => (
                <tr key={e.id} className="hover:bg-stone-800">
                  <td className="px-6 py-3 font-medium text-stone-100">
                    {e.name}
                    {e.ssnLast4 && (
                      <span className="block text-xs text-stone-400 font-normal">
                        SSN: ***-**-{e.ssnLast4}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={statusVariant[e.status] ?? 'default'}>
                      {EMPLOYEE_STATUS_LABELS[e.status] ?? e.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-stone-400">{PAY_TYPE_LABELS[e.payType]}</td>
                  <td className="px-4 py-3 text-right text-stone-400">
                    {e.payType === 'hourly'
                      ? `${formatCurrency(e.hourlyRateCents ?? 0)}/hr`
                      : `${formatCurrency(e.annualSalaryCents ?? 0)}/yr`}
                  </td>
                  <td className="px-4 py-3 text-stone-500">{e.hireDate}</td>
                  <td className="px-6 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditing(e)
                          setShowAdd(false)
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      {e.status === 'active' && (
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => handleTerminate(e.id)}
                          loading={isPending}
                        >
                          Terminate
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {employees.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-stone-400">
                    No employees found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
