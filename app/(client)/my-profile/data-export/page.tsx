import type { Metadata } from 'next'
import Link from 'next/link'
import { requireClient } from '@/lib/auth/get-user'
import { ClientDataExportButton } from './data-export-client'

export const metadata: Metadata = { title: 'My Data Export' }

export default async function ClientDataExportPage() {
  await requireClient()

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="space-y-3">
        <Link
          href="/my-profile"
          className="inline-flex text-sm text-stone-500 hover:text-stone-300"
        >
          Back to My Profile
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-stone-100">My Data Export</h1>
          <p className="mt-1 text-stone-400">
            Download a copy of your ChefFlow client data. This does not delete your account or
            change any records.
          </p>
        </div>
      </div>

      <ClientDataExportButton />
    </div>
  )
}
