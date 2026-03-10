import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { SocialPostGenerator } from '@/components/food-truck/social-post-generator'

export const metadata: Metadata = { title: 'Social Posts - ChefFlow' }

export default async function SocialPostsPage() {
  await requireChef()

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Location Announcements</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Generate social media posts for your scheduled stops. Copy and paste to your favorite
          platform.
        </p>
      </div>
      <SocialPostGenerator />
    </div>
  )
}
