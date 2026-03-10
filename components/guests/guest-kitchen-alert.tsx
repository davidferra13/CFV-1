'use client'

import { useState } from 'react'
import type { AlertLevel, KitchenAlert } from '@/lib/guests/kitchen-sync-actions'

// ============================================
// STYLES
// ============================================

const LEVEL_STYLES: Record<AlertLevel, { bg: string; border: string; text: string; icon: string }> =
  {
    critical: {
      bg: 'bg-red-950',
      border: 'border-red-700',
      text: 'text-red-300',
      icon: '!!',
    },
    warning: {
      bg: 'bg-amber-950',
      border: 'border-amber-700',
      text: 'text-amber-300',
      icon: '!',
    },
    info: {
      bg: 'bg-amber-950/50',
      border: 'border-amber-600',
      text: 'text-amber-400',
      icon: '*',
    },
    caution: {
      bg: 'bg-orange-950',
      border: 'border-orange-700',
      text: 'text-orange-300',
      icon: '!',
    },
    note: {
      bg: 'bg-stone-900',
      border: 'border-stone-700',
      text: 'text-stone-300',
      icon: 'i',
    },
  }

// ============================================
// COMPACT ALERT CARD (for KDS tickets)
// ============================================

interface GuestKitchenAlertProps {
  guestName: string
  alerts: KitchenAlert[]
  compact?: boolean
}

export function GuestKitchenAlert({ guestName, alerts, compact = false }: GuestKitchenAlertProps) {
  const [expanded, setExpanded] = useState(false)

  if (alerts.length === 0) return null

  const hasAllergy = alerts.some((a) => a.level === 'critical')
  const isVip = alerts.some((a) => a.level === 'info' && a.detail.toLowerCase().includes('vip'))

  // Compact mode: single-line for KDS tickets
  if (compact) {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        {hasAllergy && (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-red-900 text-red-200 border border-red-700">
            ALLERGY
          </span>
        )}
        {isVip && (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-amber-900/60 text-amber-300 border border-amber-700">
            VIP
          </span>
        )}
        {alerts
          .filter((a) => a.level === 'warning')
          .map((a, i) => (
            <span
              key={i}
              className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-amber-950 text-amber-300 border border-amber-800"
            >
              {a.detail}
            </span>
          ))}
      </div>
    )
  }

  // Full alert card
  const topAlerts = expanded ? alerts : alerts.slice(0, 3)
  const hasMore = alerts.length > 3

  return (
    <div className="space-y-1">
      {/* Header banner */}
      {hasAllergy && (
        <div className="rounded-t-md bg-red-900 border border-red-700 px-3 py-1.5 flex items-center gap-2">
          <span className="text-red-200 font-bold text-xs tracking-wide">ALLERGY ALERT</span>
          <span className="text-red-300 text-xs">
            {alerts
              .filter((a) => a.level === 'critical')
              .map((a) => a.detail)
              .join(', ')}
          </span>
        </div>
      )}

      {/* VIP badge */}
      {isVip && !hasAllergy && (
        <div className="rounded-t-md bg-amber-900/40 border border-amber-700 px-3 py-1.5 flex items-center gap-2">
          <span className="text-amber-400 font-bold text-xs tracking-wide">VIP GUEST</span>
          <span className="text-amber-300/80 text-xs">{guestName}</span>
        </div>
      )}

      {/* Alert list */}
      <div className="space-y-1">
        {topAlerts
          .filter((a) => !(a.level === 'critical' && hasAllergy)) // Already shown in banner
          .map((alert, idx) => {
            const style = LEVEL_STYLES[alert.level]
            return (
              <div
                key={idx}
                className={`flex items-center gap-2 px-3 py-1 rounded text-xs ${style.bg} border ${style.border}`}
              >
                <span className={`font-bold ${style.text}`}>{alert.label}</span>
                <span className={style.text}>{alert.detail}</span>
              </div>
            )
          })}
      </div>

      {/* Expand/collapse */}
      {hasMore && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-stone-500 hover:text-stone-300 transition-colors px-3"
        >
          {expanded ? 'Show less' : `+${alerts.length - 3} more alerts`}
        </button>
      )}
    </div>
  )
}
