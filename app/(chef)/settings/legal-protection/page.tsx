import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from '@/components/ui/icons'
import { requireChef } from '@/lib/auth/get-user'
import { SettingsCategory } from '@/components/settings/settings-category'

export const metadata: Metadata = { title: 'Settings - Legal & Protection' }

export default async function LegalProtectionSettingsPage() {
  await requireChef()

  return (
    <div>
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
        <h1 className="text-2xl font-bold text-stone-100 sm:text-3xl">Legal &amp; Protection</h1>
        <p className="mt-2 max-w-2xl text-sm text-stone-300">
          Insurance, certifications, contracts, compliance, emergency contacts, and crisis planning.
        </p>
      </div>

      <div className="space-y-6">
        <SettingsCategory
          title="Legal & Protection"
          description="Insurance, certifications, contracts, compliance, emergency contacts, and crisis planning."
          icon="ShieldCheck"
          primary
          tone="neutral"
          defaultOpen={true}
          summary={['Protection hub', 'Contracts', 'Compliance']}
        >
          <div className="space-y-3">
            <Link
              href="/settings/legal-readiness"
              className="block border border-orange-700 rounded-lg p-4 bg-orange-950/30 hover:bg-orange-950 transition-colors"
            >
              <p className="font-semibold text-orange-200">Legal Readiness Center</p>
              <p className="text-sm text-orange-400 mt-1">
                Track policy acceptance, consent, data rights, tax, payment, marketplace, and
                takedown readiness without treating draft records as legal approval.
              </p>
            </Link>
            <Link
              href="/settings/protection"
              className="block border border-amber-700 rounded-lg p-4 bg-amber-950/40 hover:bg-amber-950 transition-colors"
            >
              <p className="font-semibold text-amber-200">Protection Hub</p>
              <p className="text-sm text-amber-400 mt-1">
                Insurance, certifications, NDA, business continuity, and crisis response, all in one
                dashboard.
              </p>
            </Link>
            <Link
              href="/settings/contracts"
              className="block border rounded-lg p-4 hover:bg-stone-800 transition-colors"
            >
              <p className="font-medium text-stone-100">Contract Templates</p>
              <p className="text-sm text-stone-500 mt-1">
                Create reusable contract templates with merge fields for event-specific values.
              </p>
            </Link>
            <Link
              href="/settings/compliance"
              className="block border rounded-lg p-4 hover:bg-stone-800 transition-colors"
            >
              <p className="font-medium text-stone-100">Food Safety &amp; Compliance</p>
              <p className="text-sm text-stone-500 mt-1">
                Track certifications, licenses, and insurance with expiry reminders.
              </p>
            </Link>
            <Link
              href="/settings/compliance/gdpr"
              className="block border rounded-lg p-4 hover:bg-stone-800 transition-colors"
            >
              <p className="font-medium text-stone-100">GDPR &amp; Privacy</p>
              <p className="text-sm text-stone-500 mt-1">
                Manage data privacy, exports, and compliance tools.
              </p>
            </Link>
            <Link
              href="/settings/emergency"
              className="block border rounded-lg p-4 hover:bg-stone-800 transition-colors"
            >
              <p className="font-medium text-stone-100">Emergency Contacts</p>
              <p className="text-sm text-stone-500 mt-1">
                Backup contacts for event or service disruption, a partner, lead, or peer who can
                step in.
              </p>
            </Link>
          </div>
        </SettingsCategory>
      </div>
    </div>
  )
}
