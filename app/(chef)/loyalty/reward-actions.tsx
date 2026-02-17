// Client component for reward management actions (deactivate)

'use client'

import { useState } from 'react'
import { deactivateReward } from '@/lib/loyalty/actions'
import { Button } from '@/components/ui/button'

export function RewardActions({ rewardId }: { rewardId: string }) {
  const [loading, setLoading] = useState(false)

  async function handleDeactivate() {
    if (!confirm('Deactivate this reward? Clients will no longer be able to redeem it.')) return

    setLoading(true)
    try {
      await deactivateReward(rewardId)
    } catch (err) {
      alert('Failed to deactivate reward')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleDeactivate}
      disabled={loading}
    >
      {loading ? 'Removing...' : 'Remove'}
    </Button>
  )
}
