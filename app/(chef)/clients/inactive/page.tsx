import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getClientsWithStats } from '@/lib/clients/actions'
import { ClientsTable } from '../clients-table'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

export const metadata: Metadata = { title: 'Inactive Clients - ChefFlow' }

export default async function InactiveClientsPage() {
  await requireChef()

  const allClients = await getClientsWithStats()
  // "dormant" is the DB status for inactive clients
  const clients = allClients.filter((c) => c.status === 'dormant')

  return (
    <div className="space-y-6">
      <div>
        <Link href="/clients" className="text-sm text-stone-500 hover:text-stone-300">
          ← All Clients
        </Link>
        <div className="flex items-center gap-3 mt-1">
          <h1 className="text-3xl font-bold text-stone-100">Inactive Clients</h1>
          <span className="bg-stone-800 text-stone-400 text-sm px-2 py-0.5 rounded-full">
            {clients.length}
          </span>
        </div>
        <p className="text-stone-500 mt-1">Clients who haven&apos;t had a recent booking</p>
      </div>

      {clients.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-stone-400 font-medium mb-1">No inactive clients</p>
          <p className="text-stone-400 text-sm mb-4">Clients marked as dormant will appear here</p>
          <Link href="/clients">
            <Button variant="secondary" size="sm">
              View All Clients
            </Button>
          </Link>
        </Card>
      ) : (
        <Card>
          <div className="p-6">
            <ClientsTable clients={clients} />
          </div>
        </Card>
      )}
    </div>
  )
}
