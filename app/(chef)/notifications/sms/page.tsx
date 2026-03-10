import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import Link from 'next/link'
import { ArrowLeft } from '@/components/ui/icons'
import { SMSHistory } from '@/components/sms/sms-history'

export const metadata: Metadata = { title: 'SMS History - ChefFlow' }

export default async function SMSHistoryPage() {
  await requireChef()

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <Link
          href="/settings/sms"
          className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-300 mb-2"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to SMS Settings
        </Link>
        <h1 className="text-3xl font-bold text-stone-100">SMS History</h1>
        <p className="text-stone-400 mt-1">
          Recent text messages sent to customers with delivery status.
        </p>
      </div>

      <SMSHistory />
    </div>
  )
}
