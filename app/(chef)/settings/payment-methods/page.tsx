import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from '@/components/ui/icons'
import { requireChef } from '@/lib/auth/get-user'
import { getPaymentMethodSettings } from '@/lib/integrations/payments/payment-method-settings'
import { PaymentMethodsSettings } from '@/components/settings/payment-methods-settings'
import { UpgradeGate } from '@/components/billing/upgrade-gate'

export const metadata: Metadata = { title: 'Payment Methods' }

async function PaymentMethodsContent() {
  const settings = await getPaymentMethodSettings()

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <Link
          href="/settings"
          className="inline-flex items-center gap-1 text-sm text-stone-500 hover:text-stone-300 mb-2"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Settings
        </Link>
        <h1 className="text-3xl font-bold text-stone-100">Payment Methods</h1>
        <p className="text-stone-400 mt-1">
          Control which payment methods are available to your clients.
        </p>
      </div>

      <PaymentMethodsSettings
        applePayEnabled={settings.applePayEnabled}
        googlePayEnabled={settings.googlePayEnabled}
        achEnabled={settings.achEnabled}
      />
    </div>
  )
}

export default async function PaymentMethodsPage() {
  const user = await requireChef()

  return (
    <UpgradeGate chefId={user.entityId} featureSlug="integrations">
      <PaymentMethodsContent />
    </UpgradeGate>
  )
}
