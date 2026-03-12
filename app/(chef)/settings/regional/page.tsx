import { getRegionalSettings } from '@/lib/settings/regional-actions'
import { RegionalSettingsForm } from './regional-settings-form'

export const metadata = {
  title: 'Regional Settings | ChefFlow',
}

export default async function RegionalSettingsPage() {
  const settings = await getRegionalSettings()

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Regional Settings</h1>
        <p className="mt-1 text-sm text-gray-500">
          Configure your currency and language preferences. These affect how prices are displayed in
          quotes, invoices, and payment links.
        </p>
      </div>

      <RegionalSettingsForm initialCurrency={settings.currency} initialLocale={settings.locale} />
    </div>
  )
}
