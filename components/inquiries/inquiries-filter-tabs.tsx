'use client'

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

export function InquiriesFilterTabs({
  initialStatus,
  initialChannel,
}: {
  initialStatus: InquiryFilter
  initialChannel: string | null
}) {
  const { state, setState } = usePersistentViewState('inquiries.filters', {
    strategy: 'url',
    defaults: { status: initialStatus, channel: initialChannel ?? '' },
  })

  const status = (state.status as InquiryFilter) || 'all'
  const channel = String(state.channel || '')

  const tabs: { value: InquiryFilter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'new', label: 'New' },
    { value: 'awaiting_client', label: 'Awaiting Client' },
    { value: 'awaiting_chef', label: 'Awaiting Chef' },
    { value: 'quoted', label: 'Quoted' },
    { value: 'confirmed', label: 'Confirmed' },
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
    </div>
  )
}
