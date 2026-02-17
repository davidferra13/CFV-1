'use client'

interface ChatUnreadBadgeProps {
  count: number
  className?: string
}

export function ChatUnreadBadge({ count, className = '' }: ChatUnreadBadgeProps) {
  if (count <= 0) return null

  return (
    <span
      className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-semibold bg-brand-600 text-white ${className}`}
    >
      {count > 99 ? '99+' : count}
    </span>
  )
}
