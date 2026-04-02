import { requireAdmin } from '@/lib/auth/admin'
import { isFounderEmail } from '@/lib/platform/owner-account'
import { notFound } from 'next/navigation'
import { OpenClawUsagePage } from '@/components/admin/openclaw-usage-page'

export const metadata = {
  title: 'Data Engine | Admin',
}

export default async function OpenClawPage() {
  const admin = await requireAdmin()
  if (!isFounderEmail(admin.email)) {
    notFound()
  }
  return <OpenClawUsagePage />
}
