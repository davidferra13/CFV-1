'use client'

import { useTransition } from 'react'
import { acknowledgeCOC } from '@/lib/staff/coc-actions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export function COCAcknowledgmentButton({
  assignmentId,
  acknowledged,
  staffName,
}: {
  assignmentId: string
  acknowledged: boolean
  staffName: string
}) {
  const [isPending, startTransition] = useTransition()

  if (acknowledged) {
    return <Badge variant="success">Code of Conduct Confirmed</Badge>
  }

  return (
    <div className="flex items-center gap-2">
      <Badge variant="warning">Pending</Badge>
      <Button
        variant="secondary"
        size="sm"
        disabled={isPending}
        onClick={() => startTransition(() => acknowledgeCOC(assignmentId))}
      >
        {isPending ? 'Confirming...' : 'Confirm'}
      </Button>
    </div>
  )
}
