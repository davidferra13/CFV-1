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
    { value: 'awaiting_chef', label: 'Needs Response' },
    { value: 'awaiting_client', label: 'Waiting for Reply' },
    { value: 'quoted', label: 'Quote Sent' },
    { value: 'confirmed', label: 'Ready to Book' },
    { value: 'closed', label: 'Declined / Expired' },
  ]

  return (
    <div className="flex gap-2 flex-wrap items-center">
      {tabs.map((tab) => (
        <Button
          key={tab.value}
          type="button"
          size="sm"
          variant={status === tab.value ? 'primary' : 'secondary'}
          onClick={() => setState({ status: tab.value })}
        >
          {tab.label}
        </Button>
      ))}
      <span className="w-px h-6 bg-stone-300 mx-1" />
      <Button
        type="button"
        size="sm"
        variant={channel === 'take_a_chef' ? 'primary' : 'secondary'}
        onClick={() => setState({ channel: channel === 'take_a_chef' ? '' : 'take_a_chef' })}
      >
        TakeAChef
      </Button>
      <Button
        type="button"
        size="sm"
        variant={channel === 'yhangry' ? 'primary' : 'secondary'}
        onClick={() => setState({ channel: channel === 'yhangry' ? '' : 'yhangry' })}
      >
        Yhangry
      </Button>
      <span className="w-px h-6 bg-stone-300 mx-1" />
      <Button
        type="button"
        size="sm"
        variant={budgetMode === 'all' ? 'primary' : 'secondary'}
        onClick={() => setState({ budget_mode: 'all' })}
      >
        Budget: All
      </Button>
      <Button
        type="button"
        size="sm"
        variant={budgetMode === 'exact' ? 'primary' : 'secondary'}
        onClick={() => setState({ budget_mode: budgetMode === 'exact' ? 'all' : 'exact' })}
      >
        Exact
      </Button>
      <Button
        type="button"
        size="sm"
        variant={budgetMode === 'range' ? 'primary' : 'secondary'}
        onClick={() => setState({ budget_mode: budgetMode === 'range' ? 'all' : 'range' })}
      >
        Range
      </Button>
      <Button
        type="button"
        size="sm"
        variant={budgetMode === 'not_sure' ? 'primary' : 'secondary'}
        onClick={() => setState({ budget_mode: budgetMode === 'not_sure' ? 'all' : 'not_sure' })}
      >
        Not Sure
      </Button>
      <Button
        type="button"
        size="sm"
        variant={budgetMode === 'unset' ? 'primary' : 'secondary'}
        onClick={() => setState({ budget_mode: budgetMode === 'unset' ? 'all' : 'unset' })}
      >
        Unset
      </Button>
    </div>
  )
}
