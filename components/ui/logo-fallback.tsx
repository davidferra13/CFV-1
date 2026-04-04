/**
 * Renders business name initials as a styled placeholder when no logo is uploaded.
 * Uses the chef's portal primary color as background, or a default stone tone.
 */

const SIZES = {
  sm: { box: 32, text: 'text-xs' },
  md: { box: 48, text: 'text-sm' },
  lg: { box: 80, text: 'text-xl' },
} as const

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/)
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

export function LogoFallback({
  businessName,
  primaryColor,
  size = 'md',
}: {
  businessName: string
  primaryColor?: string | null
  size?: 'sm' | 'md' | 'lg'
}) {
  const { box, text } = SIZES[size]
  const bg = primaryColor || '#44403c' // stone-700

  return (
    <div
      className={`inline-flex items-center justify-center rounded-lg font-semibold text-white/90 ${text}`}
      style={{
        width: box,
        height: box,
        minWidth: box,
        backgroundColor: bg,
      }}
      aria-label={`${businessName} logo placeholder`}
    >
      {getInitials(businessName)}
    </div>
  )
}
