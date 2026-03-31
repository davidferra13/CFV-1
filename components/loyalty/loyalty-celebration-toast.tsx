'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useSSE } from '@/lib/realtime/sse-client'

interface PointsEvent {
  type: 'trigger_awarded'
  clientId: string
  triggerKey: string
  points: number
  newBalance: number
  description: string
}

interface TierEvent {
  type: 'tier_upgraded'
  clientId: string
  oldTier: string
  newTier: string
}

type LoyaltyEvent = PointsEvent | TierEvent

interface ToastItem {
  id: string
  event: LoyaltyEvent
  visible: boolean
}

const TIER_LABELS: Record<string, string> = {
  bronze: 'Bronze',
  silver: 'Silver',
  gold: 'Gold',
  platinum: 'Platinum',
}

function ConfettiPieces() {
  const [prefersReduced, setPrefersReduced] = useState(false)

  useEffect(() => {
    setPrefersReduced(window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  }, [])

  if (prefersReduced) return null

  const pieces = Array.from({ length: 24 }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    delay: `${Math.random() * 0.5}s`,
    duration: `${1.5 + Math.random() * 1}s`,
    size: `${4 + Math.random() * 4}px`,
    color: ['#f59e0b', '#10b981', '#6366f1', '#ec4899', '#f97316', '#14b8a6'][i % 6],
  }))

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {pieces.map((p) => (
        <span
          key={p.id}
          className="absolute top-0 rounded-sm animate-confetti-fall"
          style={{
            left: p.left,
            animationDelay: p.delay,
            animationDuration: p.duration,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
          }}
        />
      ))}
      <style>{`
        @keyframes confetti-fall {
          0% { transform: translateY(-10px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(120px) rotate(720deg); opacity: 0; }
        }
        .animate-confetti-fall {
          animation-name: confetti-fall;
          animation-timing-function: ease-in;
          animation-fill-mode: forwards;
        }
      `}</style>
    </div>
  )
}

function PointsToast({ event, onDismiss }: { event: PointsEvent; onDismiss: () => void }) {
  const router = useRouter()

  return (
    <button
      type="button"
      onClick={() => {
        onDismiss()
        router.push('/my-rewards')
      }}
      className="w-full text-left bg-stone-900 border-l-4 border-brand-500 rounded-lg p-4 shadow-xl cursor-pointer hover:bg-stone-800 transition-colors"
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl animate-pulse">&#11088;</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-brand-400">+{event.points} points earned!</p>
          <p className="text-xs text-stone-400 mt-0.5 truncate">{event.description}</p>
          <p className="text-xs text-stone-500 mt-1">
            Balance: {event.newBalance.toLocaleString()} pts
          </p>
        </div>
      </div>
    </button>
  )
}

function TierToast({ event, onDismiss }: { event: TierEvent; onDismiss: () => void }) {
  const router = useRouter()

  return (
    <button
      type="button"
      onClick={() => {
        onDismiss()
        router.push('/my-rewards')
      }}
      className="relative w-full text-left bg-stone-900 border border-yellow-500/50 rounded-lg p-5 shadow-xl cursor-pointer hover:bg-stone-800 transition-colors overflow-hidden"
    >
      <ConfettiPieces />
      <div className="relative flex items-start gap-3">
        <span className="text-3xl animate-bounce">&#127942;</span>
        <div className="flex-1 min-w-0">
          <p className="text-base font-bold text-yellow-400">
            You reached {TIER_LABELS[event.newTier] || event.newTier} tier!
          </p>
          <p className="text-sm text-stone-400 mt-0.5">Congratulations! New perks unlocked.</p>
        </div>
      </div>
    </button>
  )
}

export function LoyaltyCelebrationToast({
  tenantId,
  clientId,
}: {
  tenantId: string
  clientId: string
}) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const addToast = useCallback((event: LoyaltyEvent) => {
    const id = `${Date.now()}-${Math.random()}`
    setToasts((prev) => [...prev, { id, event, visible: true }])

    const dismissMs = event.type === 'tier_upgraded' ? 8000 : 5000
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, dismissMs)
  }, [])

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  useSSE(`loyalty:${tenantId}`, {
    onMessage: (msg: any) => {
      // broadcastUpdate wraps in { new: {...} }
      const data = msg?.data?.new || msg?.data
      if (!data || data.clientId !== clientId) return
      if (data.type === 'trigger_awarded' || data.type === 'tier_upgraded') {
        addToast(data as LoyaltyEvent)
      }
    },
  })

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto animate-slide-up">
          {toast.event.type === 'trigger_awarded' ? (
            <PointsToast event={toast.event as PointsEvent} onDismiss={() => dismiss(toast.id)} />
          ) : (
            <TierToast event={toast.event as TierEvent} onDismiss={() => dismiss(toast.id)} />
          )}
        </div>
      ))}
      <style>{`
        @keyframes slide-up {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}
