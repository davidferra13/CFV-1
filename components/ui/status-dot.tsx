// StatusDot - Tiny animated status indicator.
// Use inline next to labels to show live/active/error states.

interface StatusDotProps {
  /** Status determines the color */
  status: 'active' | 'idle' | 'warning' | 'error' | 'offline'
  /** Show a pulse animation for 'active' status */
  pulse?: boolean
  /** Size variant */
  size?: 'sm' | 'md'
  className?: string
}

const colors = {
  active: 'bg-emerald-500',
  idle: 'bg-stone-500',
  warning: 'bg-amber-500',
  error: 'bg-red-500',
  offline: 'bg-stone-600',
} as const

const pulseColors = {
  active: 'bg-emerald-400',
  idle: 'bg-stone-400',
  warning: 'bg-amber-400',
  error: 'bg-red-400',
  offline: 'bg-stone-500',
} as const

const sizes = {
  sm: 'h-1.5 w-1.5',
  md: 'h-2.5 w-2.5',
} as const

export function StatusDot({
  status,
  pulse = status === 'active',
  size = 'sm',
  className = '',
}: StatusDotProps) {
  return (
    <span className={`relative inline-flex ${className}`} aria-hidden="true">
      {pulse && (
        <span
          className={`absolute inset-0 rounded-full ${pulseColors[status]} animate-ping opacity-50`}
          style={{ animationDuration: '2s' }}
        />
      )}
      <span className={`relative inline-block rounded-full ${colors[status]} ${sizes[size]}`} />
    </span>
  )
}
