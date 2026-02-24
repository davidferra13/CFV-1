// Client component for loyalty actions on client detail page
// Award bonus points, redeem rewards

'use client'

import { useState } from 'react'
import { awardBonusPoints, redeemReward, type LoyaltyReward } from '@/lib/loyalty/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function AwardBonusForm({ clientId }: { clientId: string }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const formData = new FormData(e.currentTarget)
    const points = parseInt(formData.get('points') as string)
    const description = formData.get('description') as string

    try {
      await awardBonusPoints(clientId, points, description)
      setOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to award points')
    } finally {
      setLoading(false)
    }
  }

  if (!open) {
    return (
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        Award Bonus Points
      </Button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 p-4 rounded-lg bg-stone-800 space-y-3">
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-stone-500">Points</label>
          <Input name="points" type="number" min="1" required placeholder="50" />
        </div>
        <div>
          <label className="text-xs font-medium text-stone-500">Reason</label>
          <Input name="description" required placeholder="Referral bonus" />
        </div>
      </div>
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={loading}>
          {loading ? 'Awarding...' : 'Award'}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  )
}

export function RedeemRewardButton({
  clientId,
  reward,
}: {
  clientId: string
  reward: LoyaltyReward
}) {
  const [loading, setLoading] = useState(false)

  async function handleRedeem() {
    if (!confirm(`Redeem "${reward.name}" for ${reward.points_required} points?`)) return

    setLoading(true)
    try {
      await redeemReward(clientId, reward.id)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to redeem reward')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button variant="secondary" size="sm" onClick={handleRedeem} disabled={loading}>
      {loading ? 'Redeeming...' : 'Redeem'}
    </Button>
  )
}
