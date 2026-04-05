'use client'

import { useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { usePersistentViewState } from '@/lib/view-state/use-persistent-view-state'
import { MARKETPLACE_PLATFORMS } from '@/lib/marketplace/platforms'

type InquiryFilter =
  | 'all'
  | 'new'
  | 'awaiting_client'
  | 'awaiting_chef'
  | 'quoted'
  | 'confirmed'
  | 'closed'

type BudgetModeFilter = 'all' | 'exact' | 'range' | 'not_sure' | 'unset'

export function InquiriesFilterTabs({
  initialStatus,
  initialChannel,
  initialBudgetMode,
  activePlatforms,
}: {
  initialStatus: InquiryFilter
  initialChannel: string | null
  initialBudgetMode: BudgetModeFilter
  activePlatforms?: string[]
}) {
  const defaults = useMemo(
    () => ({
      status: initialStatus,
      channel: initialChannel ?? '',
      budget_mode: initialBudgetMode,
    }),
    [initialStatus, initialChannel, initialBudgetMode]
  )

  const { state, setState } = usePersistentViewState('inquiries.filters', {
    strategy: 'url',
    defaults,
  })

  const status = (state.status as InquiryFilter) || 'all'
  const channel = String(state.channel || '')
  const budgetMode = (state.budget_mode as BudgetModeFilter) || 'all'

  // Build dynamic platform filter buttons from active platforms (or fallback to TAC + Yhangry)
  const platformButtons = useMemo(() => {
    const channels =
      activePlatforms && activePlatforms.length > 0 ? activePlatforms : ['take_a_chef', 'yhangry']
    return channels
      .map((ch) => MARKETPLACE_PLATFORMS.find((p) => p.channel === ch))
      .filter((p): p is (typeof MARKETPLACE_PLATFORMS)[number] => p != null)
  }, [activePlatforms])

  const tabs: { value: InquiryFilter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'new', label: 'New' },
    { value: 'awaiting_client', label: 'Client Reply' },
    { value: 'awaiting_chef', label: 'Your Reply' },
    { value: 'quoted', label: 'Quoted' },
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'closed', label: 'Closed' },
  ]

  return (
    <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 scrollbar-none sm:mx-0 sm:flex-wrap sm:items-center sm:overflow-visible sm:px-0 sm:pb-0">
      {tabs.map((tab) => (
        <Button
          key={tab.value}
          type="button"
          size="sm"
          variant={status === tab.value ? 'primary' : 'secondary'}
          className="shrink-0 whitespace-nowrap"
          onClick={() => setState({ status: tab.value })}
        >
          {tab.label}
        </Button>
      ))}
      <span className="mx-1 h-6 w-px shrink-0 bg-stone-300" />
      {platformButtons.length <= 4 ? (
        platformButtons.map((p) => (
          <Button
            key={p.channel}
            type="button"
            size="sm"
            variant={channel === p.channel ? 'primary' : 'secondary'}
            className="shrink-0 whitespace-nowrap"
            onClick={() => setState({ channel: channel === p.channel ? '' : p.channel })}
          >
            {p.shortLabel}
          </Button>
        ))
      ) : (
        <select
          value={channel}
          onChange={(e) => setState({ channel: e.target.value })}
          aria-label="Filter by platform"
          className="h-8 shrink-0 rounded-md border border-stone-700 bg-stone-900 px-2 text-xs text-stone-300 focus:outline-none focus:ring-1 focus:ring-brand-500"
        >
          <option value="">All platforms</option>
          {platformButtons.map((p) => (
            <option key={p.channel} value={p.channel}>
              {p.label}
            </option>
          ))}
        </select>
      )}
      <span className="mx-1 h-6 w-px shrink-0 bg-stone-300" />
      <select
        value={budgetMode}
        onChange={(e) => setState({ budget_mode: e.target.value as BudgetModeFilter })}
        aria-label="Filter by budget type"
        className="h-8 shrink-0 rounded-md border border-stone-700 bg-stone-900 px-2 text-xs text-stone-300 focus:outline-none focus:ring-1 focus:ring-brand-500"
      >
        <option value="all">Budget: All</option>
        <option value="exact">Exact</option>
        <option value="range">Range</option>
        <option value="not_sure">Not Sure</option>
        <option value="unset">Unset</option>
      </select>
    </div>
  )
}
