'use client'

import { useMemo, useState, useTransition, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { DollarSign, Lock, Store, Target, Ticket } from '@/components/ui/icons'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { formatCurrency } from '@/lib/utils/currency'
import {
  normalizePopUpConfig,
  type PopUpConfig,
  type PopUpLifecycleStage,
  type PopUpProductLibraryItem,
} from './pop-up-model'
import { updatePopUpConfigAction } from './pop-up-actions'
import { PopUpCloseoutPanel } from './pop-up-closeout-panel'
import { PopUpLocationConstraints } from './pop-up-location-constraints'
import { PopUpMenuPlanner } from './pop-up-menu-planner'
import { PopUpOrderBoard } from './pop-up-order-board'
import { PopUpProductionBoard } from './pop-up-production-board'

export type PopUpOperatingSnapshot = {
  event: {
    id: string
    title: string
    date: string | null
    status: string
    location: string | null
  }
  stage: PopUpLifecycleStage
  nextActions: Array<{
    id: string
    label: string
    href?: string
    severity: 'info' | 'warning' | 'critical'
  }>
  menuItems: Array<{
    name: string
    ticketTypeId: string | null
    dishIndexId: string | null
    recipeId: string | null
    plannedUnits: number
    producedUnits: number
    soldUnits: number
    remainingUnits: number
    suggestedUnits: number
    priceCents: number
    unitCostCents: number | null
    marginPercent: number | null
    sellThroughPercent: number
    productionStatus: string
    forecastReason: string
    batchSize: number | null
    equipmentNeeded: string[]
  }>
  orders: {
    totalOrders: number
    totalUnits: number
    revenueCents: number
    bySource: Record<string, number>
    pickupWindows: Array<{ label: string; orderCount: number; unitCount: number }>
  }
  orderRows: Array<{
    id: string
    ticketTypeId: string | null
    itemName: string
    buyerName: string
    quantity: number
    totalCents: number
    source: string
    createdAt: string
  }>
  production: {
    totalPlannedUnits: number
    totalSoldUnits: number
    totalRemainingUnits: number
    estimatedIngredientCostCents: number
    estimatedMarginCents: number
    batchWarnings: string[]
    locationWarnings: string[]
  }
  closeout?: {
    sellThroughPercent: number
    wasteUnits: number
    wasteCostCents: number
    topItem: string | null
    underperformers: string[]
  }
}

type Props = {
  initialConfig: PopUpConfig
  snapshot: PopUpOperatingSnapshot
  productLibrary: PopUpProductLibraryItem[]
}

const STAGE_OPTIONS: { value: PopUpLifecycleStage; label: string }[] = [
  { value: 'concept', label: 'Concept' },
  { value: 'menu_build', label: 'Menu build' },
  { value: 'orders_open', label: 'Orders open' },
  { value: 'production_lock', label: 'Production lock' },
  { value: 'day_of', label: 'Day-of' },
  { value: 'closed', label: 'Closed' },
  { value: 'analyzed', label: 'Analyzed' },
]

export function PopUpOperatingPanel({ initialConfig, snapshot, productLibrary }: Props) {
  const router = useRouter()
  const [config, setConfig] = useState(() => normalizePopUpConfig(initialConfig))
  const [, startTransition] = useTransition()
  const [status, setStatus] = useState<string | null>(null)
  const eventId = snapshot.event.id

  const soldPlannedLabel = `${snapshot.production.totalSoldUnits}/${snapshot.production.totalPlannedUnits}`
  const lockStatus = useMemo(() => {
    if (!config.productionLocksAt) return 'Not set'
    return new Date(config.productionLocksAt) <= new Date() ? 'Locked' : 'Pending'
  }, [config.productionLocksAt])

  function updateHeader(patch: Partial<PopUpConfig>) {
    const next = normalizePopUpConfig({ ...config, ...patch })
    setConfig(next)
    setStatus(null)
    startTransition(async () => {
      try {
        const result = await updatePopUpConfigAction({ eventId, patch })
        setConfig(result.config)
        router.refresh()
        setStatus('Pop-Up OS saved')
      } catch (error) {
        setStatus(error instanceof Error ? error.message : 'Unable to save')
      }
    })
  }

  return (
    <Card className="overflow-hidden rounded-lg" id="popup-os">
      <div className="border-b border-stone-800 px-5 py-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-brand-700 bg-brand-950/40 px-2.5 py-1 text-xs font-semibold uppercase text-brand-300">
                Pop-Up OS
              </span>
              <span className="rounded-full border border-stone-700 px-2.5 py-1 text-xs capitalize text-stone-300">
                {config.dropType.replace(/_/g, ' ')}
              </span>
              <span className="rounded-full border border-stone-700 px-2.5 py-1 text-xs capitalize text-stone-300">
                {config.stage.replace(/_/g, ' ')}
              </span>
            </div>
            <h2 className="mt-2 text-xl font-semibold text-stone-50">{snapshot.event.title}</h2>
            <p className="mt-1 text-sm text-stone-400">
              {[snapshot.event.date, snapshot.event.location].filter(Boolean).join(' | ') ||
                'Date and location pending'}
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 xl:min-w-[34rem]">
            <Select
              label="Stage"
              value={config.stage}
              onChange={(event) =>
                updateHeader({ stage: event.target.value as PopUpLifecycleStage })
              }
              options={STAGE_OPTIONS}
            />
            <Select
              label="Drop type"
              value={config.dropType}
              onChange={(event) => updateHeader({ dropType: event.target.value as any })}
              options={[
                { value: 'cafe_collab', label: 'Cafe collab' },
                { value: 'weekend_drop', label: 'Weekend drop' },
                { value: 'private_dessert_event', label: 'Private dessert event' },
                { value: 'other', label: 'Other' },
              ]}
            />
            <Input
              label="Preorder closes"
              type="datetime-local"
              value={config.preorderClosesAt?.slice(0, 16) ?? ''}
              onChange={(event) => updateHeader({ preorderClosesAt: event.target.value || null })}
            />
            <Input
              label="Production locks"
              type="datetime-local"
              value={config.productionLocksAt?.slice(0, 16) ?? ''}
              onChange={(event) => updateHeader({ productionLocksAt: event.target.value || null })}
            />
          </div>
        </div>
        {status && <p className="mt-2 text-xs text-stone-400">{status}</p>}
      </div>

      <div className="space-y-5 p-5">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <CommandMetric
            icon={<Ticket className="h-4 w-4" />}
            label="Sold / planned"
            value={soldPlannedLabel}
          />
          <CommandMetric
            icon={<Target className="h-4 w-4" />}
            label="Remaining"
            value={snapshot.production.totalRemainingUnits}
          />
          <CommandMetric
            icon={<DollarSign className="h-4 w-4" />}
            label="Projected revenue"
            value={formatCurrency(snapshot.orders.revenueCents)}
          />
          <CommandMetric
            icon={<Store className="h-4 w-4" />}
            label="Est. margin"
            value={formatCurrency(snapshot.production.estimatedMarginCents)}
          />
          <CommandMetric icon={<Lock className="h-4 w-4" />} label="Lock" value={lockStatus} />
        </div>

        <div className="grid gap-2 md:grid-cols-3">
          {snapshot.nextActions.map((action) => (
            <a
              key={action.id}
              href={action.href ?? '#popup-os'}
              className={`rounded-lg border px-3 py-2 text-sm ${
                action.severity === 'critical'
                  ? 'border-red-900 bg-red-950/25 text-red-200'
                  : action.severity === 'warning'
                    ? 'border-amber-900 bg-amber-950/25 text-amber-200'
                    : 'border-stone-800 bg-stone-950 text-stone-300'
              }`}
            >
              {action.label}
            </a>
          ))}
        </div>

        <PopUpMenuPlanner
          eventId={eventId}
          config={config}
          snapshot={snapshot}
          productLibrary={productLibrary}
          onConfigChange={setConfig}
        />
        <PopUpOrderBoard eventId={eventId} snapshot={snapshot} />
        <PopUpProductionBoard snapshot={snapshot} />
        <PopUpLocationConstraints
          eventId={eventId}
          config={config}
          snapshot={snapshot}
          onConfigChange={setConfig}
        />
        <PopUpCloseoutPanel
          eventId={eventId}
          eventStatus={snapshot.event.status}
          config={config}
          snapshot={snapshot}
          onConfigChange={setConfig}
        />
      </div>
    </Card>
  )
}

function CommandMetric({
  icon,
  label,
  value,
}: {
  icon: ReactNode
  label: string
  value: string | number
}) {
  return (
    <div className="min-h-[5rem] rounded-lg border border-stone-800 px-3 py-2">
      <p className="flex items-center gap-1.5 text-xs text-stone-500">
        {icon}
        {label}
      </p>
      <p className="mt-2 break-words text-lg font-semibold text-stone-100">{value}</p>
    </div>
  )
}
