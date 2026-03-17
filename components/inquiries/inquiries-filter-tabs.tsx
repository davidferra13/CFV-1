'use client'

import { useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { usePersistentViewState } from '@/lib/view-state/use-persistent-view-state'

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
}: {
  initialStatus: InquiryFilter
  initialChannel: string | null
  initialBudgetMode: BudgetModeFilter
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
      <Button
        type="button"
        size="sm"
        variant={channel === 'take_a_chef' ? 'primary' : 'secondary'}
        className="shrink-0 whitespace-nowrap"
        onClick={() => setState({ channel: channel === 'take_a_chef' ? '' : 'take_a_chef' })}
      >
        TakeAChef
      </Button>
      <Button
        type="button"
        size="sm"
        variant={channel === 'yhangry' ? 'primary' : 'secondary'}
        className="shrink-0 whitespace-nowrap"
        onClick={() => setState({ channel: channel === 'yhangry' ? '' : 'yhangry' })}
      >
        Yhangry
      </Button>
      <span className="mx-1 h-6 w-px shrink-0 bg-stone-300" />
      <Button
        type="button"
        size="sm"
        variant={budgetMode === 'all' ? 'primary' : 'secondary'}
        className="shrink-0 whitespace-nowrap"
        onClick={() => setState({ budget_mode: 'all' })}
      >
        Budget: All
      </Button>
      <Button
        type="button"
        size="sm"
        variant={budgetMode === 'exact' ? 'primary' : 'secondary'}
        className="shrink-0 whitespace-nowrap"
        onClick={() => setState({ budget_mode: budgetMode === 'exact' ? 'all' : 'exact' })}
      >
        Exact
      </Button>
      <Button
        type="button"
        size="sm"
        variant={budgetMode === 'range' ? 'primary' : 'secondary'}
        className="shrink-0 whitespace-nowrap"
        onClick={() => setState({ budget_mode: budgetMode === 'range' ? 'all' : 'range' })}
      >
        Range
      </Button>
      <Button
        type="button"
        size="sm"
        variant={budgetMode === 'not_sure' ? 'primary' : 'secondary'}
        className="shrink-0 whitespace-nowrap"
        onClick={() => setState({ budget_mode: budgetMode === 'not_sure' ? 'all' : 'not_sure' })}
      >
        Not Sure
      </Button>
      <Button
        type="button"
        size="sm"
        variant={budgetMode === 'unset' ? 'primary' : 'secondary'}
        className="shrink-0 whitespace-nowrap"
        onClick={() => setState({ budget_mode: budgetMode === 'unset' ? 'all' : 'unset' })}
      >
        Unset
      </Button>
    </div>
  )
}
