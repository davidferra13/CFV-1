'use client'

import { useState, useTransition, useCallback, useRef, useEffect } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Wine, ChevronDown, ChevronUp } from '@/components/ui/icons'
import { updateBeverageDiscovery } from '@/lib/events/beverage-discovery-actions'
import Link from 'next/link'

type BeverageServiceType =
  | 'chef_provides'
  | 'client_provides'
  | 'byob'
  | 'no_alcohol'
  | 'tbd'
  | null

const SERVICE_TYPE_OPTIONS: { value: BeverageServiceType; label: string }[] = [
  { value: 'chef_provides', label: 'Chef provides' },
  { value: 'client_provides', label: 'Client provides' },
  { value: 'byob', label: 'BYOB' },
  { value: 'no_alcohol', label: 'No alcohol' },
  { value: 'tbd', label: 'TBD' },
]

type Props = {
  eventId: string
  initialData: {
    beverage_expectations: string | null
    beverage_service_type: string | null
    alcohol_being_served: boolean
  }
}

export function BeverageDiscoverySection({ eventId, initialData }: Props) {
  const [expanded, setExpanded] = useState(
    !!(initialData.beverage_service_type || initialData.beverage_expectations)
  )
  const [serviceType, setServiceType] = useState<BeverageServiceType>(
    (initialData.beverage_service_type as BeverageServiceType) ?? null
  )
  const [alcoholServed, setAlcoholServed] = useState(initialData.alcohol_being_served)
  const [expectations, setExpectations] = useState(initialData.beverage_expectations ?? '')
  const [isPending, startTransition] = useTransition()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const save = useCallback(
    (overrides?: {
      serviceType?: BeverageServiceType
      alcoholServed?: boolean
      expectations?: string
    }) => {
      const data = {
        beverage_service_type: overrides?.serviceType ?? serviceType,
        alcohol_being_served: overrides?.alcoholServed ?? alcoholServed,
        beverage_expectations: overrides?.expectations ?? expectations,
      }

      startTransition(async () => {
        try {
          const result = await updateBeverageDiscovery(eventId, data)
          if (!result.success) {
            toast.error(result.error || 'Failed to save')
          }
        } catch {
          toast.error('Failed to save beverage discovery')
        }
      })
    },
    [eventId, serviceType, alcoholServed, expectations]
  )

  const debouncedSave = useCallback(
    (overrides?: {
      serviceType?: BeverageServiceType
      alcoholServed?: boolean
      expectations?: string
    }) => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => save(overrides), 800)
    },
    [save]
  )

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  function handleServiceTypeChange(value: BeverageServiceType) {
    setServiceType(value)
    if (value === 'no_alcohol') {
      setAlcoholServed(false)
      save({ serviceType: value, alcoholServed: false })
    } else {
      save({ serviceType: value })
    }
  }

  function handleAlcoholToggle() {
    const next = !alcoholServed
    setAlcoholServed(next)
    save({ alcoholServed: next })
  }

  function handleExpectationsChange(value: string) {
    setExpectations(value)
    debouncedSave({ expectations: value })
  }

  const hasData = !!(serviceType || expectations)

  return (
    <Card>
      <CardHeader className="cursor-pointer select-none" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wine size={20} className="text-brand-400" />
            <CardTitle as="h3" className="text-base">
              Beverage Discovery
            </CardTitle>
            {!expanded && hasData && (
              <span className="text-xs text-stone-400 ml-2">
                {SERVICE_TYPE_OPTIONS.find((o) => o.value === serviceType)?.label ?? ''}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isPending && <span className="text-xs text-stone-500">Saving...</span>}
            {expanded ? (
              <ChevronUp size={16} className="text-stone-400" />
            ) : (
              <ChevronDown size={16} className="text-stone-400" />
            )}
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-5">
          {/* Service Type Selection */}
          <div>
            <label className="text-sm font-medium text-stone-200 mb-2 block">
              Who provides beverages?
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {SERVICE_TYPE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleServiceTypeChange(option.value)}
                  className={`px-3 py-2 rounded-lg text-sm border transition-colors ${
                    serviceType === option.value
                      ? 'border-brand-500 bg-brand-500/10 text-brand-300'
                      : 'border-stone-700 bg-stone-800/50 text-stone-300 hover:border-stone-600'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Alcohol Toggle */}
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-stone-200">Alcohol being served?</label>
            <button
              type="button"
              onClick={handleAlcoholToggle}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                alcoholServed ? 'bg-brand-500' : 'bg-stone-700'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                  alcoholServed ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Expectations Textarea */}
          <div>
            <label className="text-sm font-medium text-stone-200 mb-2 block">
              Beverage notes / client expectations
            </label>
            <textarea
              value={expectations}
              onChange={(e) => handleExpectationsChange(e.target.value)}
              placeholder="e.g. Client wants a signature cocktail, wine pairings for each course, mocktails for non-drinkers..."
              rows={3}
              className="w-full rounded-lg border border-stone-700 bg-stone-800/50 px-3 py-2 text-sm text-stone-200 placeholder:text-stone-500 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 resize-y"
            />
          </div>

          {/* Link to beverage library when chef_provides */}
          {serviceType === 'chef_provides' && (
            <div className="pt-1">
              <Link
                href="/beverages"
                className="text-sm text-brand-400 hover:text-brand-300 underline underline-offset-2"
              >
                Open beverage library for pairing
              </Link>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}
