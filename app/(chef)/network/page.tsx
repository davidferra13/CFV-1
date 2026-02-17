// Chef Network Page - Find and connect with other private chefs
// Cross-tenant feature: connections span across chef tenants

import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { getMyConnections, getPendingRequests, getNetworkDiscoverable } from '@/lib/network/actions'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { ChefSearch } from './chef-search'
import { PendingRequests } from './pending-requests'
import { FriendsList } from './friends-list'
import Link from 'next/link'
import { Settings, ShieldOff } from 'lucide-react'

export const metadata: Metadata = { title: 'Chef Network - ChefFlow' }

export default async function NetworkPage() {
  await requireChef()

  const [friends, pending, discoverable] = await Promise.all([
    getMyConnections(),
    getPendingRequests(),
    getNetworkDiscoverable(),
  ])

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-stone-900">Chef Network</h1>
          <p className="text-stone-600 mt-1">
            Connect with other private chefs
          </p>
        </div>
        <Link
          href="/settings/profile"
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-stone-700 bg-white border border-stone-300 rounded-lg hover:bg-stone-50 transition-colors shadow-sm"
        >
          <Settings className="h-4 w-4" />
          Edit Profile
        </Link>
      </div>

      {/* Privacy notice if not discoverable */}
      {!discoverable && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
          <ShieldOff className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800">You are hidden from the network</p>
            <p className="text-sm text-amber-700 mt-0.5">
              Other chefs cannot find or connect with you. To appear in the directory,{' '}
              <Link href="/settings" className="underline font-medium hover:text-amber-900">
                enable network discovery in Settings
              </Link>.
            </p>
          </div>
        </div>
      )}

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle>Find Chefs</CardTitle>
        </CardHeader>
        <CardContent>
          <ChefSearch />
        </CardContent>
      </Card>

      {/* Pending Requests */}
      {pending.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pending Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <PendingRequests requests={pending} />
          </CardContent>
        </Card>
      )}

      {/* Friends List */}
      <Card>
        <CardHeader>
          <CardTitle>Your Connections</CardTitle>
        </CardHeader>
        <CardContent>
          <FriendsList friends={friends} />
        </CardContent>
      </Card>
    </div>
  )
}
