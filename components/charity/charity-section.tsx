'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

type CharitySectionProps = {
  title: string
  count: number
  children: React.ReactNode
  defaultOpen?: boolean
}

export function CharitySection({
  title,
  count,
  children,
  defaultOpen = true,
}: CharitySectionProps) {
  const [open, setOpen] = useState(defaultOpen)

  if (count === 0) return null

  return (
    <Card className="overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full px-5 py-4 text-left hover:bg-stone-800/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <h2 className="text-base font-semibold text-stone-200">{title}</h2>
          <Badge variant="default">{count}</Badge>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-stone-400 transition-transform ${open ? '' : '-rotate-90'}`}
        />
      </button>
      {open && <div className="px-5 pb-4 border-t border-stone-800">{children}</div>}
    </Card>
  )
}
