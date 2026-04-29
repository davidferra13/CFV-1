import { getPlatformConnectionStatuses } from '@/lib/integrations/platform-connections'
import { PlatformConnectionCard } from '@/components/settings/platform-connection-card'
import { requireChef } from '@/lib/auth/get-user'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

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
        <Card className="p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-stone-100">POS and Payments</h2>
              <p className="mt-1 text-sm text-stone-400">
                Connect Square or route Stripe Terminal sales through the existing Commerce
                register, then review sales, payments, and event-linked transaction analytics.
              </p>
              <p className="mt-2 text-xs text-stone-500">
                Real-time external POS sync requires approved provider credentials before it can be
                enabled.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/settings/integrations">
                <Button variant="secondary" size="sm">
                  Integrations
                </Button>
              </Link>
              <Link href="/commerce/register">
                <Button variant="primary" size="sm">
                  Open Register
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
