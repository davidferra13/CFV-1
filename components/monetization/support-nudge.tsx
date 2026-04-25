'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Heart } from '@/components/ui/icons'

type SupportNudgeProps = {
  context: string
  show: boolean
}

const COOLDOWN_MS = 1000 * 60 * 60 * 24 * 30

function storageKey(context: string): string {
  return `chefflow:support-nudge:${context}`
}

export function SupportNudge({ context, show }: SupportNudgeProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!show) {
      setVisible(false)
      return
    }

    const raw = window.localStorage.getItem(storageKey(context))
    const dismissedAt = raw ? Number(raw) : 0
    const cooledDown = !dismissedAt || Date.now() - dismissedAt > COOLDOWN_MS
    setVisible(cooledDown)
  }, [context, show])

  if (!visible) return null

  function dismiss() {
    window.localStorage.setItem(storageKey(context), String(Date.now()))
    setVisible(false)
  }

  return (
    <div className="rounded-lg border border-stone-800 bg-stone-950/90 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Heart className="mt-0.5 h-5 w-5 shrink-0 text-brand-300" />
          <div>
            <p className="text-sm font-semibold text-stone-100">Support ChefFlow</p>
            <p className="mt-1 text-sm leading-5 text-stone-400">
              ChefFlow stays fully available. Contributions help keep development moving.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={dismiss}>
            Not now
          </Button>
          <Button href="/settings/billing" variant="secondary" size="sm">
            Contribute
          </Button>
        </div>
      </div>
    </div>
  )
}
