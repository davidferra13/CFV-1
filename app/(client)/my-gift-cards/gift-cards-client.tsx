'use client'

import { Gift, CreditCard } from '@/components/ui/icons'
import { Card, CardContent } from '@/components/ui/card'
import type { ClientGiftCard } from '@/lib/gift-cards/client-gift-card-actions'

const STATUS_BADGE: Record<string, { label: string; color: string }> = {
  active: { label: 'Active', color: 'bg-emerald-950/50 text-emerald-400' },
  redeemed: { label: 'Fully Used', color: 'bg-stone-800 text-stone-400' },
  expired: { label: 'Expired', color: 'bg-red-950/50 text-red-400' },
  cancelled: { label: 'Cancelled', color: 'bg-stone-800 text-stone-500' },
}

function formatCents(cents: number) {
  return `$${(cents / 100).toFixed(2)}`
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function GiftCardsClient({ cards }: { cards: ClientGiftCard[] }) {
  if (cards.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Gift className="w-10 h-10 text-stone-600 mx-auto mb-3" />
          <p className="text-stone-400 text-sm">No gift cards yet.</p>
          <p className="text-stone-500 text-xs mt-1">
            When someone sends you a gift card, it will appear here.
          </p>
        </CardContent>
      </Card>
    )
  }

  const totalBalance = cards.reduce((sum, c) => sum + c.currentBalanceCents, 0)
  const activeCards = cards.filter((c) => c.status === 'active')

  return (
    <div className="space-y-4">
      {/* Balance Summary */}
      {activeCards.length > 0 && (
        <Card className="border-brand-600/30 bg-brand-950/20">
          <CardContent className="pt-6 text-center">
            <p className="text-sm text-stone-400">Available Balance</p>
            <p className="text-3xl font-bold text-stone-100 mt-1">{formatCents(totalBalance)}</p>
            <p className="text-xs text-stone-500 mt-1">
              {activeCards.length} active card{activeCards.length !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {cards.map((card) => {
          const badge = STATUS_BADGE[card.status] || STATUS_BADGE.cancelled
          const usedPct =
            card.initialValueCents > 0
              ? Math.round(
                  ((card.initialValueCents - card.currentBalanceCents) / card.initialValueCents) *
                    100
                )
              : 0

          return (
            <Card key={card.id} className="overflow-hidden">
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-brand-400" />
                    <span className="text-xs font-mono text-stone-400">{card.code}</span>
                  </div>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${badge.color}`}
                  >
                    {badge.label}
                  </span>
                </div>

                <div>
                  <p className="text-xl font-bold text-stone-100">
                    {formatCents(card.currentBalanceCents)}
                  </p>
                  <p className="text-xs text-stone-500">
                    of {formatCents(card.initialValueCents)} original
                  </p>
                </div>

                {/* Usage bar */}
                {card.status === 'active' && (
                  <div className="w-full h-1.5 bg-stone-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-brand-500 rounded-full transition-all"
                      style={{ width: `${100 - usedPct}%` }}
                    />
                  </div>
                )}

                {card.message && (
                  <p className="text-xs text-stone-400 italic p-2 bg-stone-800/50 rounded">
                    &ldquo;{card.message}&rdquo;
                  </p>
                )}

                <div className="flex items-center justify-between text-xs text-stone-500">
                  <span>{card.purchaserName ? `From ${card.purchaserName}` : 'Gift'}</span>
                  <span>{formatDate(card.issuedAt)}</span>
                </div>

                {card.expiresAt && (
                  <p className="text-xs text-amber-500">Expires {formatDate(card.expiresAt)}</p>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
