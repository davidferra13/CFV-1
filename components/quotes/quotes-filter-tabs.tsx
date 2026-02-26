'use client'

import { Button } from '@/components/ui/button'
import { usePersistentViewState } from '@/lib/view-state/use-persistent-view-state'

type QuoteFilter = 'all' | 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired'

export function QuotesFilterTabs({ initialStatus }: { initialStatus: QuoteFilter }) {
  const { state, setState } = usePersistentViewState('quotes.list', {
    strategy: 'url',
    defaults: { status: initialStatus },
  })

  const current = state.status as QuoteFilter

  const tabs: { value: QuoteFilter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'draft', label: 'Draft' },
    { value: 'sent', label: 'Sent' },
    { value: 'accepted', label: 'Accepted' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'expired', label: 'Expired' },
  ]

  return (
    <div className="flex gap-2 flex-wrap">
      {tabs.map((tab) => (
        <Button
          key={tab.value}
          type="button"
          size="sm"
          variant={current === tab.value ? 'primary' : 'secondary'}
          onClick={() => setState({ status: tab.value })}
        >
          {tab.label}
        </Button>
      ))}
    </div>
  )
}
