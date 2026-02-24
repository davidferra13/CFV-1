import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getClientsWithStats } from '@/lib/clients/actions'
import { Card } from '@/components/ui/card'

export const metadata: Metadata = { title: 'Client Notes - ChefFlow' }

export default async function ClientNotesPage() {
  await requireChef()
  const clients = await getClientsWithStats()

  const clientsWithNotes = clients
    .filter((c) => c.vibe_notes && (c.vibe_notes as string).trim().length > 0)
    .sort((a, b) => a.full_name.localeCompare(b.full_name))

  const clientsWithoutNotes = clients
    .filter((c) => !c.vibe_notes || (c.vibe_notes as string).trim().length === 0)
    .sort((a, b) => a.full_name.localeCompare(b.full_name))

  return (
    <div className="space-y-6">
      <div>
        <Link href="/clients/communication" className="text-sm text-stone-500 hover:text-stone-300">
          ← Communication
        </Link>
        <div className="flex items-center gap-3 mt-1">
          <h1 className="text-3xl font-bold text-stone-100">Client Notes</h1>
          <span className="bg-stone-800 text-stone-400 text-sm px-2 py-0.5 rounded-full">
            {clientsWithNotes.length} / {clients.length}
          </span>
        </div>
        <p className="text-stone-500 mt-1">
          Private vibe notes and context attached to each client profile
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4">
          <p className="text-2xl font-bold text-green-700">{clientsWithNotes.length}</p>
          <p className="text-sm text-stone-500 mt-1">Clients with notes</p>
        </Card>
        <Card className="p-4">
          <p className="text-2xl font-bold text-stone-400">{clientsWithoutNotes.length}</p>
          <p className="text-sm text-stone-500 mt-1">Missing notes</p>
        </Card>
      </div>

      {clientsWithNotes.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-stone-300 mb-3">Clients with Notes</h2>
          <div className="space-y-3">
            {clientsWithNotes.map((client) => (
              <Card key={client.id} className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/clients/${client.id}`}
                      className="font-medium text-brand-600 hover:text-brand-300 hover:underline"
                    >
                      {client.full_name}
                    </Link>
                    {client.email && <p className="text-xs text-stone-400">{client.email}</p>}
                    <p className="text-sm text-stone-400 mt-2 line-clamp-2">
                      {client.vibe_notes as string}
                    </p>
                  </div>
                  <Link
                    href={`/clients/${client.id}`}
                    className="text-xs text-brand-600 hover:underline shrink-0"
                  >
                    Edit
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {clientsWithoutNotes.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-stone-500 mb-3">No Notes Yet</h2>
          <div className="flex flex-wrap gap-2">
            {clientsWithoutNotes.map((client) => (
              <Link
                key={client.id}
                href={`/clients/${client.id}`}
                className="bg-stone-800 hover:bg-stone-700 text-stone-400 text-sm px-3 py-1.5 rounded-full transition-colors"
              >
                {client.full_name}
              </Link>
            ))}
          </div>
        </div>
      )}

      {clients.length === 0 && (
        <Card className="p-12 text-center">
          <p className="text-stone-400 font-medium mb-1">No clients yet</p>
          <p className="text-stone-400 text-sm">Add clients to start tracking notes</p>
        </Card>
      )}
    </div>
  )
}
