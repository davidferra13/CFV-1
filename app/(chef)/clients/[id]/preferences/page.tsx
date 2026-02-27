import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireChef } from '@/lib/auth/get-user'
import { getClientById } from '@/lib/clients/actions'
import { ClientPreferences } from '@/components/clients/client-preferences'

export const metadata: Metadata = { title: 'Client Preferences - ChefFlow' }

interface ClientPreferencesPageProps {
  params: {
    id: string
  }
}

export default async function ClientPreferencesPage({ params }: ClientPreferencesPageProps) {
  await requireChef()
  const client = await getClientById(params.id)

  if (!client) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/clients/${params.id}`}
          className="text-sm text-stone-500 hover:text-stone-300"
        >
          &larr; Back to client profile
        </Link>
        <h1 className="mt-1 text-3xl font-bold text-stone-100">
          Preferences for {client.full_name}
        </h1>
        <p className="mt-1 text-stone-400">
          Manage dietary needs, communication defaults, budget ranges, and service expectations.
        </p>
      </div>

      <ClientPreferences
        clientId={params.id}
        initialValues={{
          dietary_restrictions: (client as any).dietary_restrictions || [],
          allergies: (client as any).allergies || [],
          dislikes: (client as any).dislikes || [],
          preferred_contact_method: (client as any).preferred_contact_method || null,
          preferred_event_days: (client as any).preferred_event_days || [],
          preferred_service_style: (client as any).preferred_service_style || null,
          budget_range_min_cents: (client as any).budget_range_min_cents || null,
          budget_range_max_cents: (client as any).budget_range_max_cents || null,
          cleanup_expectations: (client as any).cleanup_expectations || null,
          leftovers_preference: (client as any).leftovers_preference || null,
        }}
      />
    </div>
  )
}
