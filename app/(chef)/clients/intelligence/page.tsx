import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { getClientIntelligenceIndex } from '@/lib/client-intelligence/actions'
import { ClientIntelligenceLedger } from '@/components/client-intelligence/client-intelligence-ledger'

export const metadata: Metadata = {
  title: 'Client Intelligence Ledger',
}

export default async function ClientIntelligencePage() {
  await requireChef()
  const { projections, sourceWarnings } = await getClientIntelligenceIndex({ limit: 50 })

  return <ClientIntelligenceLedger projections={projections} sourceWarnings={sourceWarnings} />
}
