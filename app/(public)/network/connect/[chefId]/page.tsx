import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PublicNetworkConnectCard } from '@/components/network/public-network-connect-card'

type Props = {
  params: { chefId: string }
}

type ConnectionState =
  | 'none'
  | 'pending_sent'
  | 'pending_received'
  | 'accepted'
  | 'declined'
  | 'self'

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const supabase = createServerClient({ admin: true })
  const { data: chef } = await supabase
    .from('chefs')
    .select('display_name, business_name')
    .eq('id', params.chefId)
    .maybeSingle()

  const chefName = chef?.display_name || chef?.business_name || 'Chef'

  return {
    title: `Connect with ${chefName} - ChefFlow`,
    robots: { index: false, follow: false },
  }
}

export default async function PublicNetworkConnectPage({ params }: Props) {
  const supabase = createServerClient({ admin: true })
  const viewer = await getCurrentUser()

  const { data: chef } = await supabase
    .from('chefs')
    .select(
      `
        id,
        display_name,
        business_name,
        bio,
        profile_image_url,
        chef_preferences!chef_preferences_chef_id_fkey(home_city, home_state, network_discoverable)
      `
    )
    .eq('id', params.chefId)
    .maybeSingle()

  if (!chef) {
    notFound()
  }

  const prefs = Array.isArray((chef as any).chef_preferences)
    ? (chef as any).chef_preferences[0]
    : (chef as any).chef_preferences
  const chefName = (chef as any).display_name || (chef as any).business_name || 'Chef'
  const viewerRole = viewer?.role === 'chef' ? 'chef' : viewer?.role === 'client' ? 'client' : 'guest'
  const acceptingRequests = prefs?.network_discoverable !== false

  let connectionState: ConnectionState = 'none'

  if (viewerRole === 'chef') {
    if (viewer?.entityId === params.chefId) {
      connectionState = 'self'
    } else {
      const { data: connection } = await supabase
        .from('chef_connections')
        .select('status, requester_id, addressee_id')
        .or(
          `and(requester_id.eq.${viewer?.entityId},addressee_id.eq.${params.chefId}),and(requester_id.eq.${params.chefId},addressee_id.eq.${viewer?.entityId})`
        )
        .maybeSingle()

      if (connection) {
        if ((connection as any).status === 'accepted') {
          connectionState = 'accepted'
        } else if ((connection as any).status === 'pending') {
          connectionState =
            (connection as any).requester_id === viewer?.entityId
              ? 'pending_sent'
              : 'pending_received'
        } else {
          connectionState = 'declined'
        }
      }
    }
  }

  return (
    <div className="min-h-screen bg-stone-950 px-4 py-12">
      <div className="mx-auto max-w-2xl space-y-6">
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-br from-brand-950 via-stone-900 to-stone-950 px-6 py-10">
            <div className="mx-auto flex max-w-xl flex-col items-center text-center">
              {(chef as any).profile_image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={(chef as any).profile_image_url}
                  alt={chefName}
                  className="h-24 w-24 rounded-full object-cover ring-4 ring-white/10"
                />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-stone-800 text-3xl font-bold text-stone-300 ring-4 ring-white/10">
                  {chefName.charAt(0).toUpperCase()}
                </div>
              )}

              <div className="mt-5 space-y-3">
                <Badge variant="default">ChefFlow Network</Badge>
                <h1 className="text-3xl font-bold text-stone-100">{chefName}</h1>
                {((chef as any).bio as string | null) && (
                  <p className="max-w-xl text-sm leading-relaxed text-stone-300">
                    {(chef as any).bio}
                  </p>
                )}
                {(prefs?.home_city || prefs?.home_state) && (
                  <p className="text-sm text-stone-400">
                    {[prefs?.home_city, prefs?.home_state].filter(Boolean).join(', ')}
                  </p>
                )}
              </div>
            </div>
          </div>
        </Card>

        <PublicNetworkConnectCard
          chefId={params.chefId}
          chefName={chefName}
          viewerRole={viewerRole}
          connectionState={connectionState}
          acceptingRequests={acceptingRequests}
        />
      </div>
    </div>
  )
}
