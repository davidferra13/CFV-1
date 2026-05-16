// Chef Invoice Settings Page
// Configure payment terms, tax ID, and footer note that appear on all invoices.

import { requireChef } from '@/lib/auth/get-user'
import { getChefInvoiceSettings } from '@/lib/invoices/corporate-billing-actions'
import { InvoiceSettingsForm } from './invoice-settings-form'

export const metadata = { title: 'Invoice Settings' }

export default async function InvoiceSettingsPage() {
  await requireChef()
  const settings = await getChefInvoiceSettings()

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8" data-cf-surface="configuring">
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-300">Settings</p>
        <h1 className="mt-2 text-2xl font-bold text-stone-100">Invoice Settings</h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-stone-400">
          Configure details that appear on every invoice PDF you send to clients.
        </p>
      </div>

      <InvoiceSettingsForm settings={settings} />
    </div>
  )
}
