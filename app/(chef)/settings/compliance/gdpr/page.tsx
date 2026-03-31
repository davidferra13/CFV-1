import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { GdprTools } from '@/components/settings/gdpr-tools'

export const metadata: Metadata = { title: 'GDPR & Privacy' }

export default async function GdprPage() {
  await requireChef()
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-stone-100">GDPR & Privacy</h1>
        <p className="text-stone-400 mt-1">Manage data privacy, exports, and compliance</p>
      </div>
      <GdprTools />
    </div>
  )
}
