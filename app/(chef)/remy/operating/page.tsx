import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { loadRemyOperatingHub } from '@/lib/remy/operating-hub-actions'
import { RemyOperatingHub } from '@/components/remy/remy-operating-hub'

export const metadata: Metadata = {
  title: 'Remy Operating Hub',
  description: 'Remy briefing, safety, approvals, source ledger, and memory controls',
}

export default async function RemyOperatingPage({
  searchParams,
}: {
  searchParams?: { q?: string; domain?: string; urgency?: string }
}) {
  await requireChef()
  const query = searchParams?.q?.trim() ?? ''
  const domain = searchParams?.domain?.trim() ?? ''
  const urgency = searchParams?.urgency?.trim() ?? ''
  const data = await loadRemyOperatingHub(query)

  return <RemyOperatingHub data={data} query={query} domain={domain} urgency={urgency} />
}
