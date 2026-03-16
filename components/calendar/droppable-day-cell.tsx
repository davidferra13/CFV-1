'use client'

import { useDroppable } from '@dnd-kit/core'
import type { ReactNode } from 'react'

type Props = {
  date: string // YYYY-MM-DD - used as the droppable ID
  children: ReactNode
}

export function DroppableDayCell({ date, children }: Props) {
  const { isOver, setNodeRef } = useDroppable({
    id: date,
  })

  return (
    <div
      ref={setNodeRef}
      className={[
        'transition-all rounded-lg',
        isOver ? 'ring-2 ring-brand-500 bg-brand-500/10' : '',
      ].join(' ')}
    >
      {children}
    </div>
  )
}
