import { requireChef } from '@/lib/auth/get-user'
import { getSocialConnections } from '@/lib/social/oauth-actions'
import { SocialConnectionsManager } from '@/components/social/social-connections-manager'

type Props = {
  searchParams: { connected?: string; error?: string; platform?: string }
}

export default async function SocialConnectionsPage({ searchParams }: Props) {
  await requireChef()

  const connections = await getSocialConnections()

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-stone-900">Platform Connections</h2>
        <p className="text-sm text-stone-500 mt-0.5">
          Connect your social accounts once — ChefFlow handles all the posting automatically.
        </p>
      </div>

      {/* OAuth error flash (e.g. user denied access) */}
      {searchParams.error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-800">
          {errorMessage(searchParams.error, searchParams.platform)}
        </div>
      )}

      <SocialConnectionsManager
        connections={connections}
        justConnected={searchParams.connected ?? null}
      />
    </div>
  )
}

function errorMessage(code: string, platform?: string): string {
  const name = platform ? ` for ${platform.replace('_', ' ')}` : ''
  switch (code) {
    case 'access_denied':
      return `Connection${name} was cancelled — you denied access. You can try again any time.`
    case 'invalid_state':
      return `OAuth session expired${name}. Please try connecting again.`
    case 'token_exchange_failed':
      return `Failed to complete the connection${name}. The platform may be temporarily unavailable.`
    case 'account_info_failed':
      return `Connected but couldn't retrieve your account info${name}. Try reconnecting.`
    case 'config_error':
      return `Platform configuration error${name}. Please contact support.`
    default:
      return `Something went wrong while connecting${name}. Please try again.`
  }
}
