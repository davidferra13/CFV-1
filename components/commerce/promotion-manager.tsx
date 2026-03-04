'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { parseCurrencyToCents } from '@/lib/utils/currency'
import {
  createPromotion,
  togglePromotionActive,
  type CommercePromotion,
} from '@/lib/commerce/promotion-actions'
import { TAX_CLASSES, TAX_CLASS_LABELS, type TaxClass } from '@/lib/commerce/constants'
import {
  PROMOTION_DISCOUNT_TYPES,
  type PromotionDiscountType,
} from '@/lib/commerce/promotion-engine'

type Props = {
  promotions: CommercePromotion[]
}

function discountTypeLabel(value: PromotionDiscountType) {
  if (value === 'percent_order') return 'Percent Off Order'
  if (value === 'fixed_order') return 'Fixed Off Order'
  if (value === 'percent_item') return 'Percent Off Item'
  return 'Fixed Off Item'
}

export function PromotionManager({ promotions }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [discountType, setDiscountType] = useState<PromotionDiscountType>('percent_order')
  const [valueInput, setValueInput] = useState('')
  const [minSubtotalInput, setMinSubtotalInput] = useState('')
  const [maxDiscountInput, setMaxDiscountInput] = useState('')
  const [autoApply, setAutoApply] = useState(false)
  const [startsAt, setStartsAt] = useState('')
  const [endsAt, setEndsAt] = useState('')
  const [targetTaxClasses, setTargetTaxClasses] = useState<TaxClass[]>([])

  const isPercentType = discountType === 'percent_order' || discountType === 'percent_item'
  const isItemType = discountType === 'percent_item' || discountType === 'fixed_item'

  const sortedPromotions = useMemo(
    () =>
      [...promotions].sort((a, b) => {
        if (a.isActive !== b.isActive) return a.isActive ? -1 : 1
        return Date.parse(b.createdAt) - Date.parse(a.createdAt)
      }),
    [promotions]
  )

  function resetForm() {
    setCode('')
    setName('')
    setDescription('')
    setDiscountType('percent_order')
    setValueInput('')
    setMinSubtotalInput('')
    setMaxDiscountInput('')
    setAutoApply(false)
    setStartsAt('')
    setEndsAt('')
    setTargetTaxClasses([])
  }

  function toggleTaxClass(value: TaxClass) {
    setTargetTaxClasses((prev) =>
      prev.includes(value) ? prev.filter((taxClass) => taxClass !== value) : [...prev, value]
    )
  }

  function handleCreatePromotion() {
    if (!code.trim() || !name.trim() || !valueInput.trim()) {
      toast.error('Code, name, and discount value are required')
      return
    }

    startTransition(async () => {
      try {
        await createPromotion({
          code,
          name,
          description,
          discountType,
          discountPercent: isPercentType ? Number.parseInt(valueInput, 10) : undefined,
          discountCents: isPercentType ? undefined : parseCurrencyToCents(valueInput),
          minSubtotalCents: minSubtotalInput ? parseCurrencyToCents(minSubtotalInput) : 0,
          maxDiscountCents: maxDiscountInput ? parseCurrencyToCents(maxDiscountInput) : null,
          targetTaxClasses: isItemType ? targetTaxClasses : [],
          autoApply,
          startsAt: startsAt || null,
          endsAt: endsAt || null,
        })
        toast.success('Promotion created')
        resetForm()
        router.refresh()
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to create promotion')
      }
    })
  }

  function handleTogglePromotion(promotion: CommercePromotion) {
    startTransition(async () => {
      try {
        await togglePromotionActive(promotion.id, !promotion.isActive)
        toast.success(promotion.isActive ? 'Promotion disabled' : 'Promotion enabled')
        router.refresh()
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to update promotion')
      }
    })
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Create Promotion</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-stone-400 block mb-1">Code</label>
              <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="LUNCH10" />
            </div>
            <div>
              <label className="text-sm text-stone-400 block mb-1">Name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Lunch Special"
              />
            </div>
          </div>

          <div>
            <label className="text-sm text-stone-400 block mb-1">Description</label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional note for cashiers"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-sm text-stone-400 block mb-1">Type</label>
              <select
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value as PromotionDiscountType)}
                className="w-full rounded-md border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-200"
              >
                {PROMOTION_DISCOUNT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {discountTypeLabel(type)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm text-stone-400 block mb-1">
                {isPercentType ? 'Percent (1-100)' : 'Fixed Amount ($)'}
              </label>
              <Input
                value={valueInput}
                onChange={(e) => setValueInput(e.target.value)}
                placeholder={isPercentType ? '10' : '5.00'}
              />
            </div>
            <div>
              <label className="text-sm text-stone-400 block mb-1">Minimum Order ($)</label>
              <Input
                value={minSubtotalInput}
                onChange={(e) => setMinSubtotalInput(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-sm text-stone-400 block mb-1">Max Discount ($)</label>
              <Input
                value={maxDiscountInput}
                onChange={(e) => setMaxDiscountInput(e.target.value)}
                placeholder="Optional"
              />
            </div>
            <div>
              <label className="text-sm text-stone-400 block mb-1">Starts At</label>
              <Input
                type="datetime-local"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm text-stone-400 block mb-1">Ends At</label>
              <Input
                type="datetime-local"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
              />
            </div>
          </div>

          {isItemType && (
            <div className="space-y-2">
              <p className="text-sm text-stone-400">Eligible Tax Classes</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {TAX_CLASSES.map((taxClass) => (
                  <label
                    key={taxClass}
                    className="flex items-center gap-2 rounded border border-stone-700 px-2 py-1 text-xs text-stone-300"
                  >
                    <input
                      type="checkbox"
                      checked={targetTaxClasses.includes(taxClass as TaxClass)}
                      onChange={() => toggleTaxClass(taxClass as TaxClass)}
                    />
                    {TAX_CLASS_LABELS[taxClass as TaxClass]}
                  </label>
                ))}
              </div>
              <p className="text-xs text-stone-500">
                Leave unchecked to allow all item tax classes.
              </p>
            </div>
          )}

          <label className="flex items-center gap-2 text-sm text-stone-300">
            <input
              type="checkbox"
              checked={autoApply}
              onChange={(e) => setAutoApply(e.target.checked)}
            />
            Auto apply when eligible
          </label>

          <div className="flex gap-2">
            <Button variant="primary" disabled={isPending} onClick={handleCreatePromotion}>
              {isPending ? 'Saving...' : 'Create Promotion'}
            </Button>
            <Button variant="ghost" disabled={isPending} onClick={resetForm}>
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Existing Promotions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {sortedPromotions.length === 0 ? (
            <p className="text-sm text-stone-500">No promotions yet.</p>
          ) : (
            sortedPromotions.map((promotion) => (
              <div
                key={promotion.id}
                className="rounded-lg border border-stone-800 p-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-stone-100">{promotion.code}</span>
                    <Badge variant={promotion.isActive ? 'success' : 'default'}>
                      {promotion.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                    {promotion.autoApply && <Badge variant="warning">Auto</Badge>}
                  </div>
                  <p className="text-sm text-stone-300">{promotion.name}</p>
                  <p className="text-xs text-stone-500">
                    {discountTypeLabel(promotion.discountType)}
                    {promotion.discountPercent != null ? ` - ${promotion.discountPercent}%` : ''}
                    {promotion.discountCents != null
                      ? ` - $${(promotion.discountCents / 100).toFixed(2)}`
                      : ''}
                    {promotion.minSubtotalCents > 0
                      ? ` - Min $${(promotion.minSubtotalCents / 100).toFixed(2)}`
                      : ''}
                  </p>
                </div>
                <Button
                  variant={promotion.isActive ? 'ghost' : 'primary'}
                  size="sm"
                  disabled={isPending}
                  onClick={() => handleTogglePromotion(promotion)}
                >
                  {promotion.isActive ? 'Disable' : 'Enable'}
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
