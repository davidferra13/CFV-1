'use client'

// Cannabis Portal Header
// Used across all chef/client cannabis pages.
// Signature dark-green aesthetic with the "green radiant" glow that makes
// you know immediately you're somewhere different.

import Link from 'next/link'
import { CannabisTierBadge } from './tier-badge'

interface CannabisPortalHeaderProps {
  title: string
  subtitle?: string
  backHref?: string
  backLabel?: string
  actions?: React.ReactNode
}

export function CannabisPortalHeader({
  title,
  subtitle,
  backHref,
  backLabel,
  actions,
}: CannabisPortalHeaderProps) {
  return (
    <div
      className="relative overflow-hidden rounded-xl mb-6"
      style={{
        background: 'linear-gradient(180deg, #0d1a0e 0%, #111f12 100%)',
        border: '1px solid rgba(74, 124, 78, 0.25)',
        boxShadow: '0 0 40px rgba(74, 124, 78, 0.15), inset 0 1px 0 rgba(168, 230, 171, 0.05)',
      }}
    >
      {/* Green radiant glow — the signature atmospheric effect */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(74, 124, 78, 0.22) 0%, transparent 70%)',
        }}
      />

      {/* Subtle leaf texture dots */}
      <div
        className="absolute top-3 right-4 pointer-events-none opacity-20"
        style={{ fontSize: '3rem', lineHeight: 1 }}
      >
        🌿
      </div>

      <div className="relative px-6 py-5">
        {backHref && (
          <Link
            href={backHref}
            className="inline-flex items-center gap-1.5 text-xs font-medium mb-3 transition-colors"
            style={{ color: '#6aaa6e' }}
          >
            <span>←</span>
            <span>{backLabel ?? 'Back'}</span>
          </Link>
        )}

        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-xl font-semibold tracking-tight" style={{ color: '#e8f5e9' }}>
                {title}
              </h1>
              <CannabisTierBadge size="xs" />
            </div>
            {subtitle && (
              <p className="text-sm" style={{ color: '#6aaa6e' }}>
                {subtitle}
              </p>
            )}
          </div>

          {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
        </div>
      </div>
    </div>
  )
}

// Shared page wrapper with the dark green background radiant
// Wrap the full page content in this for the full dispensary atmosphere
export function CannabisPageWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen" style={{ background: 'transparent' }}>
      {/* Full-page ambient green glow from the top */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          background:
            'radial-gradient(ellipse 100% 40% at 50% 0%, rgba(74, 124, 78, 0.08) 0%, transparent 60%)',
        }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  )
}
