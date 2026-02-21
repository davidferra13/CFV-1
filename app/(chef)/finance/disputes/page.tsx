import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getDisputes } from '@/lib/finance/dispute-actions'
import { DisputeTracker } from '@/components/finance/dispute-tracker'

export const metadata: Metadata = { title: 'Payment Disputes - ChefFlow' }

export default async function DisputesPage() {
  await requireChef()

  const disputes = await getDisputes().catch(() => null)

  return (
    <div className="space-y-6">
      <div>
        <Link href="/finance" className="text-sm text-stone-500 hover:text-stone-700">&larr; Finance</Link>
        <h1 className="text-3xl font-bold text-stone-900 mt-1">Payment Disputes</h1>
        <p className="text-stone-500 mt-1">Track and respond to chargebacks, refund requests, and payment disputes</p>
      </div>

      <DisputeTracker initialDisputes={disputes ?? []} />
    </div>
  )
}
