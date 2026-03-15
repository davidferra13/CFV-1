import { getPlatformConnectionStatuses } from '@/lib/integrations/platform-connections'
import { PlatformConnectionCard } from '@/components/settings/platform-connection-card'
import { requireChef } from '@/lib/auth/auth-utils'

export default async function PlatformConnectionsPage() {
  await requireChef()
  const platforms = await getPlatformConnectionStatuses()

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-100">Platform Connections</h1>
        <p className="mt-1 text-sm text-stone-400">
          Connect your marketplace platform accounts for enhanced inquiry tracking.
        </p>
      </div>

      <div className="space-y-4">
        {platforms.map((connection) => (
          <PlatformConnectionCard key={connection.platform} connection={connection} />
        ))}
      </div>
    </div>
  )
}
