'use client'

import { useState, type ReactNode } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { UserPlus, ChevronDown } from '@/components/ui/icons'

export function ClientInvitationPanel({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)

  return (
    <Card variant="glass">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-between w-full px-6 py-4 text-left group"
      >
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-brand-950/80 p-2">
            <UserPlus className="h-4 w-4 text-brand-400" />
          </div>
          <div>
            <p className="font-semibold text-stone-100 text-sm">Invite or Add Client</p>
            <p className="text-xs text-stone-500">Send invitation link or create client record</p>
          </div>
        </div>
        <ChevronDown
          className={`h-4 w-4 text-stone-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      <div
        className={`grid transition-[grid-template-rows] duration-200 ease-out ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
      >
        <div className="overflow-hidden">
          <CardContent className="pt-0 pb-5 space-y-4 border-t border-stone-800">
            {children}
          </CardContent>
        </div>
      </div>
    </Card>
  )
}
