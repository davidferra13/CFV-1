// Print & Document Settings
// Controls attribution line, default print mode, custom footer text.
// Smart defaults — works out of the box, chef can customize if they want.

import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { getPrintPreferences } from '@/lib/print/actions'
import { PrintSettingsForm } from '@/components/settings/print-settings-form'

export const metadata: Metadata = { title: 'Print & Documents — ChefFlow' }

export default async function PrintSettingsPage() {
  await requireChef()
  const prefs = await getPrintPreferences()

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Print & Documents</h1>
        <p className="text-stone-400 mt-1">
          Control what appears on your printed documents and PDFs. Changes apply to all future
          documents.
        </p>
      </div>
      <PrintSettingsForm initialPrefs={prefs} />
    </div>
  )
}
