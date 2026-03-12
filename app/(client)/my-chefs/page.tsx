// My Chefs - Cross-chef relationship view
// Shows all chefs this marketplace client is linked to.

import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { requireClient } from '@/lib/auth/get-user'
import { getLinkedChefs, type LinkedChef } from '@/lib/marketplace/cross-tenant-actions'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'
import { ChefHat, Heart, Calendar, Search } from '@/components/ui/icons'

export const metadata: Metadata = {
  title: 'My Chefs - ChefFlow',
  description: 'View all your chef relationships in one place.',
}

function ChefCard({ chef }: { chef: LinkedChef }) {
  const profileHref = chef.slug ? `/marketplace/${chef.slug}` : '#'

  return (
    <Link href={profileHref}>
      <Card className="p-4 hover:shadow-md hover:border-stone-600 transition-all cursor-pointer group h-full">
        <div className="flex flex-col gap-3">
          {/* Chef avatar + name */}
          <div className="flex items-center gap-3">
            <div className="relative w-12 h-12 rounded-full overflow-hidden bg-stone-800 shrink-0 flex items-center justify-center">
              {chef.profileImageUrl ? (
                <Image
                  src={chef.profileImageUrl}
                  alt={chef.displayName}
                  fill
                  className="object-cover"
                  sizes="48px"
                />
              ) : (
                <ChefHat className="w-6 h-6 text-stone-500" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-stone-100 truncate">{chef.displayName}</p>
                {chef.isFavorite && (
                  <Heart className="w-4 h-4 text-red-400 fill-red-400 shrink-0" />
                )}
              </div>
              {chef.businessName && (
                <p className="text-sm text-stone-500 truncate">{chef.businessName}</p>
              )}
            </div>
          </div>

          {/* Cuisine badges */}
          {chef.cuisineTypes.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {chef.cuisineTypes.slice(0, 3).map((cuisine) => (
                <Badge key={cuisine} variant="default" className="text-xs">
                  {cuisine}
                </Badge>
              ))}
              {chef.cuisineTypes.length > 3 && (
                <Badge variant="default" className="text-xs">
                  +{chef.cuisineTypes.length - 3}
                </Badge>
              )}
            </div>
          )}

          {/* Stats row */}
          <div className="flex items-center gap-4 text-sm text-stone-400 pt-1 border-t border-stone-800">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              {chef.totalEvents} {chef.totalEvents === 1 ? 'event' : 'events'}
            </span>
            {chef.lastEventDate && (
              <span>Last: {format(new Date(chef.lastEventDate), 'MMM d, yyyy')}</span>
            )}
          </div>
        </div>
      </Card>
    </Link>
  )
}

export default async function MyChefPage() {
  await requireClient()

  let chefs: LinkedChef[] = []
  let fetchError = false

  try {
    chefs = await getLinkedChefs()
  } catch {
    fetchError = true
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-stone-100">My Chefs</h1>
          <p className="text-stone-500 mt-1">All your chef relationships in one place.</p>
        </div>
        <Link href="/marketplace">
          <Button variant="secondary" className="gap-2">
            <Search className="w-4 h-4" />
            Browse More Chefs
          </Button>
        </Link>
      </div>

      {/* Error state */}
      {fetchError && (
        <Card className="p-10 flex flex-col items-center text-center gap-3">
          <p className="text-red-400 font-medium">Could not load your chef relationships</p>
          <p className="text-sm text-stone-400">
            Please try refreshing the page. If the issue persists, contact support.
          </p>
        </Card>
      )}

      {/* Empty state */}
      {!fetchError && chefs.length === 0 && (
        <Card className="p-10 flex flex-col items-center text-center gap-3">
          <ChefHat className="w-10 h-10 text-stone-300" />
          <p className="text-stone-500 font-medium">No chef relationships yet</p>
          <p className="text-sm text-stone-400">
            When you book with a chef through the marketplace, they will appear here.
          </p>
          <Link href="/marketplace" className="mt-2">
            <Button variant="primary" className="gap-2">
              <Search className="w-4 h-4" />
              Browse Chefs
            </Button>
          </Link>
        </Card>
      )}

      {/* Chef grid */}
      {!fetchError && chefs.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {chefs.map((chef) => (
            <ChefCard key={chef.chefId} chef={chef} />
          ))}
        </div>
      )}
    </div>
  )
}
