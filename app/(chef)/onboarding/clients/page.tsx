import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { getImportedClients } from '@/lib/clients/import-actions'
import { ClientImportForm } from '@/components/onboarding/client-import-form'

export const metadata = { title: 'Import Clients — ChefFlow Setup' }

export default async function OnboardingClientsPage() {
  const clients = await getImportedClients()

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="max-w-5xl mx-auto px-4 py-12">

        <div className="mb-8">
          <Link
            href="/onboarding"
            className="inline-flex items-center gap-1 text-sm text-stone-500 hover:text-stone-800 mb-4"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Setup
          </Link>
          <h1 className="text-3xl font-bold text-stone-900">Import Your Client Ledger</h1>
          <p className="text-stone-600 mt-2 max-w-xl">
            Add each existing client. They won&apos;t receive any emails — this is a direct import.
            You can send portal invitations later from the Clients section.
          </p>
        </div>

        <ClientImportForm initialClients={clients} />

      </div>
    </div>
  )
}
