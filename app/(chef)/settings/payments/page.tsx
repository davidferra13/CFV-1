import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from '@/components/ui/icons'
import { requireChef } from '@/lib/auth/get-user'
import { SettingsCategory } from '@/components/settings/settings-category'

export const metadata: Metadata = { title: 'Settings - Payments & Support' }

export default async function PaymentsSettingsPage() {
  await requireChef()

  return (
    <div>
      {/* Mobile back */}
      <div className="mb-4 md:hidden">
        <Link
          href="/settings"
          className="inline-flex items-center gap-2 text-sm text-stone-400 hover:text-stone-200"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Settings</span>
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-stone-100 sm:text-3xl">Payments &amp; Support</h1>
        <p className="mt-2 max-w-2xl text-sm text-stone-300">
          Stripe payouts, voluntary support, workspace modules, and digital wallets.
        </p>
      </div>

      <div className="space-y-6">
        <SettingsCategory
          title="Payments & Support"
          description="Payment processing and workspace configuration."
          icon="CreditCard"
          primary
          tone="neutral"
          defaultOpen={true}
        >
          <div className="space-y-3">
            <Link
              href="/settings/stripe-connect"
              className="block border border-brand-700 rounded-lg p-4 bg-brand-950/40 hover:bg-brand-950 transition-colors"
            >
              <p className="font-semibold text-brand-200">Stripe Payouts</p>
              <p className="text-sm text-brand-400 mt-1">
                Connect your Stripe account to receive client payments directly to your bank
                account.
              </p>
            </Link>

            <Link
              href="/settings/billing"
              className="block border rounded-lg p-4 hover:bg-stone-800 transition-colors"
            >
              <p className="font-medium text-stone-100">Support ChefFlow</p>
              <p className="text-sm text-stone-500 mt-1">
                Every feature is free. Optionally support ongoing development with a voluntary
                contribution.
              </p>
            </Link>

            <Link
              href="/settings/modules"
              className="block border rounded-lg p-4 hover:bg-stone-800 transition-colors"
            >
              <p className="font-medium text-stone-100">Modules</p>
              <p className="text-sm text-stone-500 mt-1">
                Choose which features appear in your sidebar. Toggle modules on or off to keep your
                workspace focused.
              </p>
            </Link>

            <Link
              href="/settings/payment-methods"
              className="block border rounded-lg p-4 hover:bg-stone-800 transition-colors"
            >
              <p className="font-medium text-stone-100">Digital Wallets</p>
              <p className="text-sm text-stone-500 mt-1">
                Enable or disable Apple Pay and Google Pay for your client checkout sessions.
              </p>
            </Link>
          </div>
        </SettingsCategory>
      </div>
    </div>
  )
}
