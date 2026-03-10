'use client'

import { useState } from 'react'
import { AlertTriangle, X, ExternalLink } from '@/components/ui/icons'
import type { CertExpiryAlert } from '@/lib/protection/cert-alert-actions'

type Props = {
  alerts: CertExpiryAlert[]
}

const SEVERITY_STYLES = {
  critical: {
    border: 'border-red-800/40',
    bg: 'bg-red-950/30',
    text: 'text-red-300',
    icon: 'text-red-400',
    badge: 'bg-red-900/50 text-red-300',
  },
  warning: {
    border: 'border-amber-800/40',
    bg: 'bg-amber-950/30',
    text: 'text-amber-300',
    icon: 'text-amber-400',
    badge: 'bg-amber-900/50 text-amber-300',
  },
  info: {
    border: 'border-blue-800/40',
    bg: 'bg-blue-950/30',
    text: 'text-blue-300',
    icon: 'text-blue-400',
    badge: 'bg-blue-900/50 text-blue-300',
  },
}

export function CertExpiryBanner({ alerts }: Props) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  const visible = alerts.filter((a) => !dismissed.has(a.id))

  if (visible.length === 0) return null

  // Show the most urgent alert prominently
  const sorted = [...visible].sort((a, b) => a.daysRemaining - b.daysRemaining)
  const primary = sorted[0]
  const others = sorted.slice(1)
  const styles = SEVERITY_STYLES[primary.severity]

  function dismiss(id: string) {
    setDismissed((prev) => new Set(prev).add(id))
  }

  return (
    <div className="col-span-full space-y-2">
      {/* Primary alert */}
      <div
        className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${styles.border} ${styles.bg}`}
      >
        <AlertTriangle className={`w-5 h-5 mt-0.5 shrink-0 ${styles.icon}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className={`text-sm font-medium ${styles.text}`}>
              {primary.certName} expires in {primary.daysRemaining} day
              {primary.daysRemaining !== 1 ? 's' : ''}
            </p>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${styles.badge}`}>
              {primary.expiryDate}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs text-stone-400 capitalize">
              {primary.certType.replace(/_/g, ' ')}
            </span>
            {primary.renewalUrl && (
              <a
                href={primary.renewalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1"
              >
                Renew <ExternalLink className="w-3 h-3" />
              </a>
            )}
            <a
              href="/settings/protection/certifications"
              className="text-xs text-stone-400 hover:text-stone-200"
            >
              View all certifications
            </a>
          </div>

          {/* Other alerts summary */}
          {others.length > 0 && (
            <p className="text-xs text-stone-400 mt-2">
              +{others.length} more certification{others.length !== 1 ? 's' : ''} expiring soon:{' '}
              {others.map((a) => `${a.certName} (${a.daysRemaining}d)`).join(', ')}
            </p>
          )}
        </div>
        <button
          onClick={() => dismiss(primary.id)}
          className="text-stone-500 hover:text-stone-300 shrink-0"
          aria-label="Dismiss alert"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
