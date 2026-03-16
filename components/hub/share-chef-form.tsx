'use client'

import { useState, useTransition } from 'react'
import { Share2, Check, Loader2, ChefHat, Star } from '@/components/ui/icons'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { shareChefWithFriend } from '@/lib/hub/chef-share-actions'
import type { ShareableChef } from '@/lib/hub/chef-share-actions'
import type { HubFriend } from '@/lib/hub/friend-actions'

export function ShareChefForm({
  chefs,
  friends,
}: {
  chefs: ShareableChef[]
  friends: HubFriend[]
}) {
  const [selectedChef, setSelectedChef] = useState<string | null>(null)
  const [selectedFriends, setSelectedFriends] = useState<Set<string>>(new Set())
  const [message, setMessage] = useState('')
  const [isPending, startTransition] = useTransition()
  const [sentTo, setSentTo] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)

  function toggleFriend(profileId: string) {
    setSelectedFriends((prev) => {
      const next = new Set(prev)
      if (next.has(profileId)) next.delete(profileId)
      else next.add(profileId)
      return next
    })
  }

  function handleShare() {
    if (!selectedChef || selectedFriends.size === 0) return
    setError(null)

    startTransition(async () => {
      const newSent = new Set(sentTo)
      for (const friendProfileId of selectedFriends) {
        try {
          await shareChefWithFriend({
            chefId: selectedChef,
            friendProfileId,
            message: message || undefined,
          })
          newSent.add(friendProfileId)
        } catch (err) {
          // Skip already-recommended, continue with others
          if (err instanceof Error && err.message.includes('Already recommended')) {
            newSent.add(friendProfileId)
          } else {
            setError(err instanceof Error ? err.message : 'Failed to share')
          }
        }
      }
      setSentTo(newSent)
      setSelectedFriends(new Set())
    })
  }

  if (chefs.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-stone-700 bg-stone-900/30 px-6 py-16 text-center">
        <ChefHat className="mx-auto h-10 w-10 text-stone-600" />
        <h2 className="mt-4 text-lg font-semibold text-stone-200">No chefs to share yet</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-stone-400">
          After you book an event with a chef, you&apos;ll be able to recommend them to your
          friends.
        </p>
      </div>
    )
  }

  if (friends.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-stone-700 bg-stone-900/30 px-6 py-16 text-center">
        <Share2 className="mx-auto h-10 w-10 text-stone-600" />
        <h2 className="mt-4 text-lg font-semibold text-stone-200">Add friends first</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-stone-400">
          Connect with friends on the app, then you can share your favorite chefs with them.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Step 1: Pick a Chef */}
      <Card className="border-stone-800 bg-stone-900/60">
        <CardHeader>
          <CardTitle className="text-stone-100">1. Pick a chef to recommend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {chefs.map((chef) => (
              <button
                key={chef.id}
                type="button"
                onClick={() => setSelectedChef(chef.id)}
                className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-all ${
                  selectedChef === chef.id
                    ? 'border-brand-500 bg-brand-500/10 ring-1 ring-brand-500'
                    : 'border-stone-800 bg-stone-800/50 hover:border-stone-600'
                }`}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-500/20">
                  <ChefHat className="h-5 w-5 text-brand-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-stone-100">{chef.business_name}</p>
                  <p className="text-xs text-stone-400">
                    {chef.event_count} {chef.event_count === 1 ? 'event' : 'events'} together
                  </p>
                </div>
                {selectedChef === chef.id && <Check className="h-5 w-5 shrink-0 text-brand-400" />}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Step 2: Pick Friends */}
      {selectedChef && (
        <Card className="border-stone-800 bg-stone-900/60">
          <CardHeader>
            <CardTitle className="text-stone-100">2. Share with friends</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {friends.map((friend) => {
                const alreadySent = sentTo.has(friend.profile.id)
                const isSelected = selectedFriends.has(friend.profile.id)
                return (
                  <button
                    key={friend.friendship_id}
                    type="button"
                    onClick={() => !alreadySent && toggleFriend(friend.profile.id)}
                    disabled={alreadySent}
                    className={`flex items-center gap-2 rounded-full border py-1.5 pl-1.5 pr-3 transition-all ${
                      alreadySent
                        ? 'border-green-500/30 bg-green-500/10 text-green-400'
                        : isSelected
                          ? 'border-brand-500 bg-brand-500/10 text-brand-400'
                          : 'border-stone-700 bg-stone-800/50 text-stone-300 hover:border-stone-500'
                    }`}
                  >
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-stone-700 text-xs font-semibold">
                      {alreadySent ? (
                        <Check className="h-3.5 w-3.5 text-green-400" />
                      ) : (
                        friend.profile.display_name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <span className="text-sm">
                      {friend.profile.display_name}
                      {alreadySent && ' (sent)'}
                    </span>
                  </button>
                )
              })}
            </div>

            {/* Optional message */}
            <div className="mt-4">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Add a note (optional) - e.g. 'They made the best pasta for my birthday!'"
                rows={2}
                className="w-full rounded-lg border border-stone-700 bg-stone-800 px-4 py-2.5 text-sm text-stone-100 placeholder-stone-500 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 resize-none"
                maxLength={500}
              />
            </div>

            {error && (
              <p className="mt-2 rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-400">
                {error}
              </p>
            )}

            <Button
              variant="primary"
              onClick={handleShare}
              disabled={isPending || selectedFriends.size === 0}
              className="mt-4 w-full"
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sharing...
                </>
              ) : (
                <>
                  <Share2 className="mr-2 h-4 w-4" />
                  Share with {selectedFriends.size}{' '}
                  {selectedFriends.size === 1 ? 'friend' : 'friends'}
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
