// Client component for creating a new loyalty reward

'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createReward, type CreateRewardInput } from '@/lib/loyalty/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useProtectedForm } from '@/lib/qol/use-protected-form'
import { FormShield } from '@/components/forms/form-shield'
import {
  LOYALTY_MAX_FIXED_DISCOUNT_CENTS,
  LOYALTY_MAX_PERCENT_DISCOUNT,
} from '@/lib/loyalty/reward-guardrails'

const REWARD_TYPES = [
  {
    value: 'free_course',
    label: 'Free Course',
    hint: 'Bonus course, welcome bite, dessert, or beverage.',
  },
  {
    value: 'upgrade',
    label: 'Experience Upgrade',
    hint: 'Priority booking, recipe cards, demo, or consultation.',
  },
  { value: 'free_dinner', label: 'Hosted Dinner', hint: 'High-tier service reward.' },
  { value: 'discount_fixed', label: 'Fixed Discount', hint: 'Capped cash credit.' },
  { value: 'discount_percent', label: 'Percent Discount', hint: 'Capped percent offer.' },
] as const

const REWARD_TEMPLATES = [
  {
    label: 'Priority access',
    rewardType: 'upgrade',
    name: 'Priority booking access',
    description: 'Move to the top of the next available booking window.',
    pointsRequired: '75',
  },
  {
    label: 'Chef consultation',
    rewardType: 'upgrade',
    name: 'Custom menu consultation',
    description: 'A focused menu planning session before the next event.',
    pointsRequired: '125',
  },
  {
    label: 'Course upgrade',
    rewardType: 'free_course',
    name: 'Complimentary seasonal course',
    description: 'A bonus seasonal course added to the next dinner.',
    pointsRequired: '80',
  },
] as const

export function CreateRewardForm({ chefId }: { chefId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [rewardType, setRewardType] = useState<string>('free_course')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [pointsRequired, setPointsRequired] = useState('')
  const [rewardValue, setRewardValue] = useState('')
  const [rewardPercent, setRewardPercent] = useState('')

  const defaultData = useMemo(
    () => ({
      name: '',
      description: '',
      pointsRequired: '',
      rewardType: 'free_course',
      rewardValue: '',
      rewardPercent: '',
    }),
    []
  )

  const currentData = useMemo(
    () => ({
      name,
      description,
      pointsRequired,
      rewardType,
      rewardValue,
      rewardPercent,
    }),
    [name, description, pointsRequired, rewardType, rewardValue, rewardPercent]
  )

  const protection = useProtectedForm({
    surfaceId: 'loyalty-reward',
    recordId: null,
    tenantId: chefId,
    defaultData,
    currentData,
    throttleMs: 10_000,
  })

  function applyDraftData(data: Record<string, unknown>) {
    if (typeof data.name === 'string') setName(data.name)
    if (typeof data.description === 'string') setDescription(data.description)
    if (typeof data.pointsRequired === 'string') setPointsRequired(data.pointsRequired)
    if (typeof data.rewardType === 'string') setRewardType(data.rewardType)
    if (typeof data.rewardValue === 'string') setRewardValue(data.rewardValue)
    if (typeof data.rewardPercent === 'string') setRewardPercent(data.rewardPercent)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const points = Number.parseInt(pointsRequired, 10)
      if (!Number.isFinite(points) || points <= 0) {
        throw new Error('Points must be a positive number')
      }

      const input: CreateRewardInput = {
        name: name.trim(),
        description: description || undefined,
        points_required: points,
        reward_type: rewardType as CreateRewardInput['reward_type'],
      }

      if (rewardType === 'discount_fixed') {
        const dollars = Number.parseFloat(rewardValue)
        if (
          !Number.isFinite(dollars) ||
          dollars <= 0 ||
          dollars > LOYALTY_MAX_FIXED_DISCOUNT_CENTS / 100
        ) {
          throw new Error(
            `Fixed discounts must be between $0.01 and $${LOYALTY_MAX_FIXED_DISCOUNT_CENTS / 100}`
          )
        }
        input.reward_value_cents = Math.round(dollars * 100)
      }

      if (rewardType === 'discount_percent') {
        const percent = Number.parseInt(rewardPercent, 10)
        if (!Number.isFinite(percent) || percent <= 0 || percent > LOYALTY_MAX_PERCENT_DISCOUNT) {
          throw new Error(`Percent discounts must be between 1 and ${LOYALTY_MAX_PERCENT_DISCOUNT}`)
        }
        input.reward_percent = percent
      }

      await createReward(input)
      protection.markCommitted()
      router.push('/loyalty')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create reward')
    } finally {
      setLoading(false)
    }
  }

  return (
    <FormShield
      guard={protection.guard}
      showRestorePrompt={protection.showRestorePrompt}
      lastSavedAt={protection.lastSavedAt}
      onRestore={() => {
        const d = protection.restoreDraft()
        if (d) applyDraftData(d)
      }}
      onDiscard={protection.discardDraft}
      saveState={protection.saveState}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && <div className="p-3 rounded-lg bg-red-950 text-red-700 text-sm">{error}</div>}

        <div className="rounded-lg border border-stone-700 bg-stone-900 p-4">
          <p className="text-sm font-semibold text-stone-100">Experience-first templates</p>
          <p className="mt-1 text-xs text-stone-500">
            Templates fill the form only. They do not save until you create the reward.
          </p>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
            {REWARD_TEMPLATES.map((template) => (
              <button
                key={template.label}
                type="button"
                onClick={() => {
                  setRewardType(template.rewardType)
                  setName(template.name)
                  setDescription(template.description)
                  setPointsRequired(template.pointsRequired)
                  setRewardValue('')
                  setRewardPercent('')
                }}
                className="rounded-lg border border-stone-700 px-3 py-2 text-left text-sm text-stone-300 hover:bg-stone-800"
              >
                {template.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="name" className="block text-sm font-medium text-stone-300 mb-1">
            Reward Name
          </label>
          <Input
            id="name"
            name="name"
            required
            placeholder="e.g., Complimentary appetizer course"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-stone-300 mb-1">
            Description
          </label>
          <Input
            id="description"
            name="description"
            placeholder="Brief description of the reward"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div>
          <label
            htmlFor="points_required"
            className="block text-sm font-medium text-stone-300 mb-1"
          >
            Points Required
          </label>
          <Input
            id="points_required"
            name="points_required"
            type="number"
            required
            min="1"
            placeholder="e.g., 100"
            value={pointsRequired}
            onChange={(e) => setPointsRequired(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-300 mb-1">Reward Type</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {REWARD_TYPES.map((type) => (
              <button
                key={type.value}
                type="button"
                onClick={() => {
                  setRewardType(type.value)
                  setRewardValue('')
                  setRewardPercent('')
                }}
                className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors text-left ${
                  rewardType === type.value
                    ? 'border-brand-500 bg-brand-950 text-brand-400'
                    : 'border-stone-700 text-stone-400 hover:bg-stone-800'
                }`}
              >
                <span className="block">{type.label}</span>
                <span className="block text-xs font-normal opacity-80">{type.hint}</span>
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
              max={LOYALTY_MAX_FIXED_DISCOUNT_CENTS / 100}
              required
              placeholder="e.g., 25.00"
              value={rewardValue}
              onChange={(e) => setRewardValue(e.target.value)}
            />
            <p className="mt-1 text-xs text-stone-500">
              Max ${LOYALTY_MAX_FIXED_DISCOUNT_CENTS / 100}. Use commerce promotions for broader
              campaigns.
            </p>
          </div>
        )}

        {rewardType === 'discount_percent' && (
          <div>
            <label
              htmlFor="reward_percent"
              className="block text-sm font-medium text-stone-300 mb-1"
            >
              Discount Percentage
            </label>
            <Input
              id="reward_percent"
              name="reward_percent"
              type="number"
              min="1"
              max={LOYALTY_MAX_PERCENT_DISCOUNT}
              required
              placeholder="e.g., 15"
              value={rewardPercent}
              onChange={(e) => setRewardPercent(e.target.value)}
            />
            <p className="mt-1 text-xs text-stone-500">
              Max {LOYALTY_MAX_PERCENT_DISCOUNT}%. Percent rewards do not stack with fixed reward
              values.
            </p>
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
    </FormShield>
  )
}
