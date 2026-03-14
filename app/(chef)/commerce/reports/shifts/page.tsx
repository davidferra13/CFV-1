// Shift Reports Page — closed register session summaries
import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { requirePro } from '@/lib/billing/require-pro'
import { getRegisterSessionHistory } from '@/lib/commerce/register-actions'
import { ShiftReport } from '@/components/commerce/shift-report'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export const metadata: Metadata = { title: 'Shift Reports — ChefFlow' }

export default async function ShiftReportsPage() {
  await requireChef()
  await requirePro('commerce')

  const { sessions } = await getRegisterSessionHistory({ status: 'closed', limit: 30 })

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
        Summary of closed register sessions — sales count, revenue, tips, and cash variance.
      </p>
      <ShiftReport sessions={sessions as any} />
    </div>
  )
}
