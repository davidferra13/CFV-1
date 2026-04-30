import { requireAdmin } from '@/lib/auth/admin'
import { getBuilderMonitorSnapshot } from '@/lib/admin/v1-builder-monitor'
import { V1BuilderMonitorClient } from './v1-builder-monitor-client'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export const metadata = {
  title: 'V1 Builder | Admin',
}

export default async function V1BuilderPage() {
  await requireAdmin()
  const snapshot = await getBuilderMonitorSnapshot()

  return <V1BuilderMonitorClient initialSnapshot={snapshot} />
}
