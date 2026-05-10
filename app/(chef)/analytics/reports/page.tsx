import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { ReportsContent } from '@/components/analytics/reports-content'

export const metadata: Metadata = { title: 'Reports' }

export default async function ReportsPage() {
  await requireChef()
  return <ReportsContent />
}
