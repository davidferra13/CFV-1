'use client'

import { useRouter } from 'next/navigation'
import { KitchenMode } from '@/components/kitchen/kitchen-mode'
import type { KitchenEventContext } from '@/lib/kitchen/kitchen-steps-actions'

interface KitchenModeLauncherProps {
  context: KitchenEventContext | null
}

export function KitchenModeLauncher({ context }: KitchenModeLauncherProps) {
  const router = useRouter()

  if (!context) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 space-y-4">
        <div className="text-5xl">🍳</div>
        <h2 className="text-xl font-semibold text-stone-100">No Active Event Today</h2>
        <p className="text-stone-400 text-sm max-w-xs">
          Kitchen mode shows prep steps for your active or confirmed events today. Confirm an event
          for today to get started.
        </p>
        <button
          type="button"
          onClick={() => router.push('/events')}
          className="mt-2 px-4 py-2 text-sm rounded-lg bg-brand-600 text-white hover:bg-brand-700 transition-colors"
        >
          View Events
        </button>
      </div>
    )
  }

  return (
    <KitchenMode
      steps={context.steps}
      title={
        context.clientName ? `${context.eventTitle} - ${context.clientName}` : context.eventTitle
      }
      onExit={() => router.back()}
    />
  )
}
