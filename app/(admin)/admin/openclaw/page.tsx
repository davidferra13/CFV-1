import { requireAdmin } from '@/lib/auth/admin'
import { notFound } from 'next/navigation'
import { OpenClawUsagePage } from '@/components/admin/openclaw-usage-page'

export const metadata = {
  title: 'Data Engine | Admin',
}

export default async function OpenClawPage() {
  const admin = await requireAdmin()
  if (admin.accessLevel !== 'owner') {
    notFound()
  }
  return <OpenClawUsagePage />
}
