// Chef social profile page
// Shows a chef's public presence within the community
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import {
  getPublicChefSocialProfile,
  getProfilePosts,
  followChef,
  unfollowChef,
} from '@/lib/social/chef-social-actions'
import { sendConnectionRequest } from '@/lib/network/actions'
import { SocialPostCard } from '@/components/social/social-post-card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ArrowLeft, MapPin, Grid3X3 } from '@/components/ui/icons'
import { ChefProfileActions } from './chef-profile-actions'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ chefId: string }>
}): Promise<Metadata> {
  return { title: 'Chef Profile — Chef Community' }
}

export default async function ChefProfilePage({ params }: { params: Promise<{ chefId: string }> }) {
  const user = await requireChef()
  const { chefId } = await params

  if (chefId === user.entityId) {
    // Redirect to own profile in settings
    return (
      <div className="text-center py-12 space-y-3">
        <p className="text-stone-500">This is your own profile.</p>
        <Link href="/settings/profile" className="text-amber-700 font-medium hover:underline">
          Edit your profile →
        </Link>
      </div>
    )
  }

  let profile
  try {
    profile = await getPublicChefSocialProfile(chefId)
  } catch {
    notFound()
  }

  const posts = await getProfilePosts({ chefId, limit: 24 })

  const authorName = profile.display_name ?? profile.business_name

  return (
    <div className="space-y-6">
      {/* Back */}
      <Link
        href="/network"
        className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-300"
      >
        <ArrowLeft className="h-4 w-4" />
        Community
      </Link>

      {/* Profile header */}
      <div className="bg-stone-900 rounded-2xl border border-stone-700 shadow-sm p-6">
        <div className="flex items-start gap-6">
          <Avatar className="w-20 h-20 flex-shrink-0">
            {profile.profile_image_url && (
              <AvatarImage src={profile.profile_image_url} alt={authorName} />
            )}
            <AvatarFallback className="bg-amber-900 text-amber-800 text-2xl font-bold">
              {authorName
                .split(' ')
                .map((w) => w[0])
                .join('')
                .toUpperCase()
                .slice(0, 2)}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-stone-100">{authorName}</h1>
            {profile.business_name !== authorName && (
              <p className="text-stone-500 text-sm">{profile.business_name}</p>
            )}
            {(profile.city || profile.state) && (
              <p className="flex items-center gap-1 text-sm text-stone-400 mt-1">
                <MapPin className="h-3.5 w-3.5" />
                {[profile.city, profile.state].filter(Boolean).join(', ')}
              </p>
            )}
            {profile.bio && (
              <p className="text-stone-400 text-sm mt-2 leading-relaxed">{profile.bio}</p>
            )}

            {/* Stats */}
            <div className="flex items-center gap-6 mt-3">
              <div className="text-center">
                <p className="text-lg font-bold text-stone-100">{profile.post_count}</p>
                <p className="text-xs text-stone-400">Posts</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-stone-100">{profile.followers_count}</p>
                <p className="text-xs text-stone-400">Followers</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-stone-100">{profile.following_count}</p>
                <p className="text-xs text-stone-400">Following</p>
              </div>
            </div>
          </div>

          {/* Action buttons (client component for follow/connect toggling) */}
          <ChefProfileActions
            chefId={chefId}
            isFollowing={profile.is_following}
            isConnected={profile.is_connected}
          />
        </div>
      </div>

      {/* Posts grid */}
      <div className="bg-stone-900 rounded-2xl border border-stone-700 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-stone-800 flex items-center gap-2">
          <Grid3X3 className="h-4 w-4 text-stone-400" />
          <h2 className="text-sm font-semibold text-stone-300">Posts</h2>
        </div>

        {posts.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-stone-400 text-sm">No public posts yet</p>
          </div>
        ) : (
          <div className="divide-y divide-stone-800">
            {posts.map((post) => (
              <div key={post.id} className="p-4">
                <SocialPostCard post={post} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
