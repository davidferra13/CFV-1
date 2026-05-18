// New Contract - Server Component
// Loads clients, templates, and events for the standalone contract creation form.

import type { Metadata } from 'next'
import { getClients } from '@/lib/clients/actions'
import { listContractTemplates } from '@/lib/contracts/actions'
import { getEvents } from '@/lib/events/actions'
import { NewContractForm } from '@/components/contracts/new-contract-form'

export const metadata: Metadata = { title: 'New Contract | ChefFlow' }

export default async function NewContractPage() {
  let clients: any[] = []
  let templates: any[] = []
  let events: any[] = []
  let loadError: string | null = null

  try {
    ;[clients, templates, events] = await Promise.all([
      getClients(),
      listContractTemplates(),
      getEvents(),
    ])
  } catch (err) {
    console.error('[NewContractPage] Load error:', err)
    loadError = 'Failed to load required data. Please try refreshing.'
  }

  if (loadError) {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="rounded-lg border border-red-800 bg-red-950/30 p-6 text-center">
          <p className="text-red-300 font-medium">Could not load form data</p>
          <p className="text-red-400 text-sm mt-1">{loadError}</p>
        </div>
      </div>
    )
  }

  const clientOptions = clients.map((c: any) => ({
    id: c.id,
    name: c.full_name ?? c.email ?? 'Unnamed client',
  }))

  const templateOptions = templates.map((t: any) => ({
    id: t.id,
    name: t.name,
    body: t.body_markdown,
    isDefault: t.is_default,
  }))

  const eventOptions = events
    .filter((e: any) => !['cancelled', 'completed'].includes(e.status))
    .map((e: any) => ({
      id: e.id,
      label: `${e.occasion || 'Untitled'} - ${e.client?.full_name || 'No client'}${e.event_date ? ` (${new Date(e.event_date).toLocaleDateString()})` : ''}`,
    }))

  return (
    <div className="max-w-5xl mx-auto">
      <NewContractForm clients={clientOptions} templates={templateOptions} events={eventOptions} />
    </div>
  )
}
