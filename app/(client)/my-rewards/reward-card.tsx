'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { clientRedeemReward } from '@/lib/loyalty/client-loyalty-actions'
import type { LoyaltyReward } from '@/lib/loyalty/actions'

function rewardSubtitle(reward: LoyaltyReward) {
  if (reward.reward_type === 'discount_fixed' && reward.reward_value_cents) {
    return `$${(reward.reward_value_cents / 100).toFixed(2)} off`
  }
  if (reward.reward_type === 'discount_percent' && reward.reward_percent) {
    return `${reward.reward_percent}% off`
  }
  if (reward.reward_type === 'free_course') return 'Free course'
  if (reward.reward_type === 'free_dinner') return 'Free dinner'
  return 'Upgrade'
}

export function RewardCard({
  reward,
  pointsBalance,
}: {
  reward: LoyaltyReward
  pointsBalance: number
}) {
  const router = useRouter()
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const canRedeem = pointsBalance >= reward.points_required

  function handleRedeem() {
    setError(null)
    startTransition(async () => {
      try {
        await clientRedeemReward(reward.id)
        setShowConfirm(false)
        router.refresh()
      } catch (err: any) {
        setError(err?.message || 'Failed to redeem reward')
      }
    })
  }

  return (
    <>
      {error && (
        <Alert variant="error" className="mb-3">
          {error}
        </Alert>
      )}

      <div
        className={`rounded-xl border p-4 ${canRedeem ? 'border-emerald-200 bg-emerald-950/40' : 'border-stone-700 bg-stone-900'}`}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold text-stone-100">{reward.name}</h3>
            <p className="text-sm text-stone-400 mt-1">
              {reward.description || rewardSubtitle(reward)}
            </p>
          </div>
          <Badge variant={canRedeem ? 'success' : 'default'}>{reward.points_required} pts</Badge>
        </div>

        <div className="mt-4">
          <Button
            variant={canRedeem ? 'primary' : 'secondary'}
            size="sm"
            disabled={!canRedeem || isPending}
            onClick={() => setShowConfirm(true)}
          >
            {canRedeem ? 'Redeem' : `Need ${reward.points_required - pointsBalance} more`}
          </Button>
        </div>
      </div>

      <ConfirmModal
        open={showConfirm}
        title="Redeem Reward?"
        description={`You are redeeming ${reward.name}. This will deduct ${reward.points_required} points from your balance.`}
        confirmLabel="Confirm Redeem"
        loading={isPending}
        onConfirm={handleRedeem}
        onCancel={() => setShowConfirm(false)}
      />
    </>
  )
}
