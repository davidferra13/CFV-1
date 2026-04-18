'use client'

import { ShoppingCart } from '@/components/ui/icons'

function formatCurrency(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

interface CartSummaryBarProps {
  itemCount: number
  totalCents: number
  onOpen: () => void
}

export function CartSummaryBar({ itemCount, totalCents, onOpen }: CartSummaryBarProps) {
  if (itemCount === 0) return null

  return (
    <button
      onClick={onOpen}
      className="fixed bottom-4 right-4 z-30 flex items-center gap-3 px-4 py-3 bg-brand-600 hover:bg-brand-500 text-white rounded-full shadow-lg shadow-black/30 transition-colors"
    >
      <div className="relative">
        <ShoppingCart className="w-5 h-5" />
        <span className="absolute -top-2 -right-2 w-4 h-4 bg-white text-brand-700 text-[10px] font-bold rounded-full flex items-center justify-center">
          {itemCount > 99 ? '99+' : itemCount}
        </span>
      </div>
      <span className="text-sm font-medium">View Cart</span>
      <span className="text-sm font-semibold">{formatCurrency(totalCents)}</span>
    </button>
  )
}
