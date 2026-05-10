import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft } from '@/components/ui/icons'
import { requireChef } from '@/lib/auth/get-user'
import { SettingsCategory } from '@/components/settings/settings-category'
import { hasChefFeatureFlag, CHEF_FEATURE_FLAGS } from '@/lib/features/chef-feature-flags'

export const metadata: Metadata = { title: 'Settings - API & Developer' }

export default async function DeveloperSettingsPage() {
  await requireChef()

  const developerToolsEnabled = await hasChefFeatureFlag(CHEF_FEATURE_FLAGS.developerTools).catch(
    () => false
  )
  if (!developerToolsEnabled) {
    redirect('/settings')
  }

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
        <h1 className="text-2xl font-bold text-stone-100 sm:text-3xl">API &amp; Developer</h1>
        <p className="mt-2 max-w-2xl text-sm text-stone-300">
          API keys and webhooks for integrating ChefFlow with external tools.
        </p>
      </div>

      <div className="space-y-6">
        <SettingsCategory
          title="API & Developer"
          description="API keys and webhooks for integrating ChefFlow with external tools."
          icon="Code"
          tone="neutral"
          defaultOpen={true}
        >
          <div className="space-y-3">
            <Link
              href="/settings/api-keys"
              className="block border rounded-lg p-4 hover:bg-stone-800 transition-colors"
            >
              <p className="font-medium text-stone-100">API Keys</p>
              <p className="text-sm text-stone-500 mt-1">
                Create API keys to integrate ChefFlow with other tools and services.
              </p>
            </Link>
            <Link
              href="/settings/webhooks"
              className="block border rounded-lg p-4 hover:bg-stone-800 transition-colors"
            >
              <p className="font-medium text-stone-100">Webhooks</p>
              <p className="text-sm text-stone-500 mt-1">
                Send real-time data to external services when events occur in ChefFlow.
              </p>
            </Link>
          </div>
        </SettingsCategory>
      </div>
    </div>
  )
}
