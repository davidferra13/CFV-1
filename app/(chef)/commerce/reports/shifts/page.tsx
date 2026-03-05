// Shift Reports Page - closed register session summaries
import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, Download } from 'lucide-react'
import { requireChef } from '@/lib/auth/get-user'
import { requirePro } from '@/lib/billing/require-pro'
import {
  getCurrentRegisterSession,
  getRegisterSessionHistory,
} from '@/lib/commerce/register-actions'
import { ShiftReport } from '@/components/commerce/shift-report'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = { title: 'Shift Reports - ChefFlow' }

export default async function ShiftReportsPage() {
  await requireChef()
  await requirePro('commerce')

  const [{ sessions }, currentSession] = await Promise.all([
    getRegisterSessionHistory({ status: 'closed', limit: 30 }),
    getCurrentRegisterSession(),
  ])

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-stone-100">Shift Reports</h1>
        <Link href="/commerce/reports">
          <Button variant="ghost">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Reports
          </Button>
        </Link>
      </div>
      <p className="text-stone-400 text-sm">
        Summary of closed register sessions with explicit X and Z report exports.
      </p>

      {currentSession?.id && (
        <div className="rounded-lg border border-stone-800 bg-stone-900/40 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-stone-100 font-medium">Current X Report</p>
              <p className="text-xs text-stone-500">
                Export interim register totals before close for audit checks.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="ghost"
                size="sm"
                href="/api/documents/commerce-shift-report/current?format=csv"
              >
                <Download className="w-4 h-4 mr-2" />X CSV
              </Button>
              <Button
                variant="secondary"
                size="sm"
                href="/api/documents/commerce-shift-report/current?format=pdf"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Download className="w-4 h-4 mr-2" />X PDF
              </Button>
            </div>
          </div>
        </div>
      )}

      <ShiftReport sessions={sessions as any} />
    </div>
  )
}
