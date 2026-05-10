import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from '@/components/ui/icons'
import { requireChef } from '@/lib/auth/get-user'
import { SettingsCategory } from '@/components/settings/settings-category'

export const metadata: Metadata = { title: 'Settings - AI & Privacy' }

export default async function AiPrivacySettingsPage() {
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
        <h1 className="text-2xl font-bold text-stone-100 sm:text-3xl">AI &amp; Privacy</h1>
        <p className="mt-2 max-w-2xl text-sm text-stone-300">
          Control Remy, understand how your data is handled, and manage AI features.
        </p>
      </div>

      <div className="space-y-6">
        <SettingsCategory
          title="AI &amp; Privacy"
          description="Control Remy, understand how your data is handled, and manage AI features."
          icon="Brain"
          tone="neutral"
          defaultOpen={true}
        >
          <div className="space-y-3">
            <Link
              href="/settings/ai-privacy"
              className="block border border-emerald-200 rounded-lg p-4 bg-emerald-950/40 hover:bg-emerald-950 transition-colors"
            >
              <p className="font-semibold text-emerald-900">AI Trust Center</p>
              <p className="text-sm text-emerald-700 mt-1">
                See exactly how Remy works, where your data goes, and manage all AI controls. Walk
                through privacy practices and delete data anytime.
              </p>
            </Link>
            <Link
              href="/settings/culinary-profile"
              className="block border rounded-lg p-4 hover:bg-stone-800 transition-colors"
            >
              <p className="font-medium text-stone-100">Culinary Profile</p>
              <p className="text-sm text-stone-500 mt-1">
                Tell Remy about your cooking philosophy, signature dishes, and food identity.
              </p>
            </Link>
            <Link
              href="/settings/remy"
              className="block border rounded-lg p-4 hover:bg-stone-800 transition-colors"
            >
              <p className="font-medium text-stone-100">Remy Control Center</p>
              <p className="text-sm text-stone-500 mt-1">
                Set per-action approval policy rules and review server-side execution audit logs.
              </p>
            </Link>
          </div>
        </SettingsCategory>
      </div>
    </div>
  )
}
