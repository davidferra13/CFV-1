'use client'

// Cannabis Tier Badge - small indicator used in nav and headers

export function CannabisTierBadge({ size = 'sm' }: { size?: 'xs' | 'sm' | 'md' }) {
  const styles = {
    xs: 'text-2xs px-1.5 py-0.5',
    sm: 'text-xxs px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
  }

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-semibold tracking-wide ${styles[size]}`}
      style={{
        background: 'linear-gradient(135deg, #2d5a30 0%, #4a7c4e 100%)',
        color: '#a8e6ab',
        border: '1px solid rgba(168, 230, 171, 0.3)',
        boxShadow: '0 0 8px rgba(74, 124, 78, 0.4)',
      }}
    >
      <span>🌿</span>
      <span>Cannabis Tier</span>
    </span>
  )
}

// Simpler leaf-only dot for nav items
export function CannabisNavDot() {
  return (
    <span
      className="inline-block w-1.5 h-1.5 rounded-full"
      style={{
        background: '#4a7c4e',
        boxShadow: '0 0 4px rgba(74, 124, 78, 0.8)',
      }}
    />
  )
}
