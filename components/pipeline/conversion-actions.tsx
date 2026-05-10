'use client'

import { useTransition, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ArrowRight, Send, CheckCircle, FileText } from '@/components/ui/icons'
import {
  createProposalFromLead,
  createEventFromLead,
  createEventFromProposal,
  convertProposalToContract,
} from '@/lib/pipeline/conversions'

interface ConversionActionsProps {
  itemId: string
  itemType: 'inquiry' | 'proposal' | 'contract' | 'event'
  status: string
  onAction?: () => void
}

export function ConversionActions({ itemId, itemType, status, onAction }: ConversionActionsProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleAction(
    action: () => Promise<{ success: boolean; id?: string; error?: string; redirectTo?: string }>
  ) {
    setError(null)
    startTransition(async () => {
      try {
        const result = await action()
        if (!result.success) {
          setError(result.error || 'Action failed')
          return
        }
        router.refresh()
        if (result.redirectTo) {
          router.push(result.redirectTo)
        }
        onAction?.()
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Something went wrong'
        setError(message)
      }
    })
  }

  const buttons = getButtons(itemType, status, itemId, handleAction, isPending)

  if (buttons.length === 0) return null

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {buttons}
      {error && <div className="text-xs text-red-400 w-full mt-1">{error}</div>}
    </div>
  )
}

function getButtons(
  itemType: string,
  status: string,
  itemId: string,
  handleAction: (action: () => Promise<any>) => void,
  isPending: boolean
): React.ReactNode[] {
  const buttons: React.ReactNode[] = []

  if (itemType === 'inquiry') {
    buttons.push(
      <Button
        key="create-proposal"
        size="sm"
        variant="secondary"
        loading={isPending}
        onClick={() => handleAction(() => createProposalFromLead(itemId))}
      >
        <FileText size={14} className="mr-1" />
        Create Proposal
      </Button>
    )
    buttons.push(
      <Button
        key="create-event"
        size="sm"
        variant="secondary"
        loading={isPending}
        onClick={() => handleAction(() => createEventFromLead(itemId))}
      >
        <ArrowRight size={14} className="mr-1" />
        Create Event
      </Button>
    )
  }

  if (itemType === 'proposal' && status === 'draft') {
    buttons.push(
      <Button
        key="send-proposal"
        size="sm"
        variant="secondary"
        loading={isPending}
        onClick={() => handleAction(() => Promise.resolve({ success: true }))}
      >
        <Send size={14} className="mr-1" />
        Send to Client
      </Button>
    )
  }

  if (itemType === 'proposal' && status === 'approved') {
    buttons.push(
      <Button
        key="create-contract"
        size="sm"
        variant="secondary"
        loading={isPending}
        onClick={() => handleAction(() => convertProposalToContract(itemId))}
      >
        <FileText size={14} className="mr-1" />
        Create Contract
      </Button>
    )
    buttons.push(
      <Button
        key="create-event-from-proposal"
        size="sm"
        variant="secondary"
        loading={isPending}
        onClick={() => handleAction(() => createEventFromProposal(itemId))}
      >
        <ArrowRight size={14} className="mr-1" />
        Create Event
      </Button>
    )
  }

  if (itemType === 'contract' && status === 'draft') {
    buttons.push(
      <Button
        key="send-contract"
        size="sm"
        variant="secondary"
        loading={isPending}
        onClick={() => handleAction(() => Promise.resolve({ success: true }))}
      >
        <Send size={14} className="mr-1" />
        Send to Client
      </Button>
    )
  }

  if (itemType === 'contract' && status === 'signed') {
    buttons.push(
      <Button
        key="view-event"
        size="sm"
        variant="secondary"
        onClick={() => {
          // Navigate to the event linked to this contract
        }}
      >
        <CheckCircle size={14} className="mr-1" />
        View Event
      </Button>
    )
  }

  return buttons
}
