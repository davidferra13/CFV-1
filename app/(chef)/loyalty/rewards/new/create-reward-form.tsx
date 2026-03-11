// Client component for creating a new loyalty reward

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createReward, type CreateRewardInput } from '@/lib/loyalty/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const REWARD_TYPES = [
  { value: 'free_course', label: 'Free Course' },
  { value: 'discount_fixed', label: 'Fixed Discount ($)' },
  { value: 'discount_percent', label: 'Percentage Discount (%)' },
  { value: 'free_dinner', label: 'Free Dinner' },
  { value: 'upgrade', label: 'Upgrade / Enhancement' },
] as const

export function CreateRewardForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [rewardType, setRewardType] = useState<string>('free_course')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const formData = new FormData(e.currentTarget)

    try {
      const input: CreateRewardInput = {
        name: formData.get('name') as string,
        description: (formData.get('description') as string) || undefined,
        points_required: parseInt(formData.get('points_required') as string),
        reward_type: rewardType as CreateRewardInput['reward_type'],
      }

      if (rewardType === 'discount_fixed') {
        const dollars = parseFloat(formData.get('reward_value') as string)
        input.reward_value_cents = Math.round(dollars * 100)
      }

      if (rewardType === 'discount_percent') {
        input.reward_percent = parseInt(formData.get('reward_percent') as string)
      }

      await createReward(input)
      router.push('/loyalty')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create reward')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && <div className="p-3 rounded-lg bg-red-950 text-red-200 text-sm">{error}</div>}

      <div>
        <label htmlFor="name" className="block text-sm font-medium text-stone-300 mb-1">
          Reward Name
        </label>
        <Input id="name" name="name" required placeholder="e.g., Complimentary appetizer course" />
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-stone-300 mb-1">
          Description
        </label>
        <Input id="description" name="description" placeholder="Brief description of the reward" />
      </div>

      <div>
        <label htmlFor="points_required" className="block text-sm font-medium text-stone-300 mb-1">
          Points Required
        </label>
        <Input
          id="points_required"
          name="points_required"
          type="number"
          required
          min="1"
          placeholder="e.g., 100"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-stone-300 mb-1">Reward Type</label>
        <div className="grid grid-cols-2 gap-2">
          {REWARD_TYPES.map((type) => (
            <button
              key={type.value}
              type="button"
              onClick={() => setRewardType(type.value)}
              className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                rewardType === type.value
                  ? 'border-brand-500 bg-brand-950 text-brand-400'
                  : 'border-stone-700 text-stone-400 hover:bg-stone-800'
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      {rewardType === 'discount_fixed' && (
        <div>
          <label htmlFor="reward_value" className="block text-sm font-medium text-stone-300 mb-1">
            Discount Amount ($)
          </label>
          <Input
            id="reward_value"
            name="reward_value"
            type="number"
            step="0.01"
            min="0.01"
            required
            placeholder="e.g., 25.00"
          />
        </div>
      )}

      {rewardType === 'discount_percent' && (
        <div>
          <label htmlFor="reward_percent" className="block text-sm font-medium text-stone-300 mb-1">
            Discount Percentage
          </label>
          <Input
            id="reward_percent"
            name="reward_percent"
            type="number"
            min="1"
            max="100"
            required
            placeholder="e.g., 15"
          />
        </div>
      )}

      <div className="flex gap-3 pt-4">
        <Button type="submit" disabled={loading}>
          {loading ? 'Creating...' : 'Create Reward'}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
