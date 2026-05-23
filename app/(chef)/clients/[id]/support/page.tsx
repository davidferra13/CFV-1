// Client Support Network Page
// Shows all operational relationships around a specific client.

import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { getClientNetwork } from '@/lib/support-network/client-network'
import { SupportNetworkMap } from '@/components/support-network/support-network-map'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Support Network' }

export default async function ClientSupportPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireChef()
  const { id } = await params
  const network = await getClientNetwork(id)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href={`/clients/${id}`}
          className="text-sm text-stone-500 hover:text-stone-300 transition-colors"
        >
          Back to client
        </Link>
      </div>
      <div>
        <h1 className="text-xl font-semibold text-stone-100">
          Support Network: {network.centerName}
        </h1>
        <p className="text-sm text-stone-400 mt-1">
          Operational relationships, connections, and context around this client.
        </p>
      </div>
      <SupportNetworkMap network={network} />
    </div>
  )
}
