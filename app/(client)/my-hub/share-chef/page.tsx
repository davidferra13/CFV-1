// Share a Chef - recommend chefs to friends

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireClient } from '@/lib/auth/get-user'
import { getMyChefsToShare, getMyChefRecommendations } from '@/lib/hub/chef-share-actions'
import { getMyFriends } from '@/lib/hub/friend-actions'
import { ShareChefForm } from '@/components/hub/share-chef-form'
import { ActivityTracker } from '@/components/activity/activity-tracker'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, ChefHat } from '@/components/ui/icons'

export const metadata: Metadata = { title: 'Share a Chef - ChefFlow' }

export default async function ShareChefPage() {
  await requireClient()

  const [chefs, friends, recommendations] = await Promise.all([
    getMyChefsToShare(),
    getMyFriends().catch(() => []),
    getMyChefRecommendations().catch(() => []),
  ])

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link
        href="/my-hub"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-stone-400 hover:text-stone-200 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to My Hub
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-stone-100">Share a Chef</h1>
        <p className="mt-1 text-stone-400">
          Recommend your favorite chefs to friends - help them discover great dining experiences
        </p>
      </div>

      <ShareChefForm chefs={chefs} friends={friends} />

      {/* Recommendations I've received */}
      {recommendations.length > 0 && (
        <div className="mt-10">
          <h2 className="mb-4 text-lg font-semibold text-stone-200">
            Chef Recommendations from Friends
          </h2>
          <div className="space-y-3">
            {recommendations.map((rec) => (
              <Card key={rec.id} className="border-stone-800 bg-stone-900/60">
                <CardContent className="flex items-start gap-3 p-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-500/20">
                    <ChefHat className="h-5 w-5 text-brand-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-stone-100">{rec.chef_business_name}</p>
                    <p className="mt-0.5 text-sm text-stone-400">
                      Recommended by <span className="text-brand-400">{rec.from.display_name}</span>
                    </p>
                    {rec.message && (
                      <p className="mt-2 rounded-lg bg-stone-800/50 px-3 py-2 text-sm italic text-stone-300">
                        &ldquo;{rec.message}&rdquo;
                      </p>
                    )}
                  </div>
                  {rec.chef_slug && (
                    <Link
                      href={`/chef/${rec.chef_slug}`}
                      className="shrink-0 rounded-lg border border-stone-700 px-3 py-1.5 text-xs text-stone-300 hover:border-brand-500 hover:text-brand-400 transition-colors"
                    >
                      View Chef
                    </Link>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <ActivityTracker eventType="page_viewed" />
    </div>
  )
}

export const dynamic = 'force-dynamic'
