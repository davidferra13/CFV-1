'use client'

interface ChatPresenceDotProps {
  online: boolean
  size?: 'sm' | 'md'
}

export function ChatPresenceDot({ online, size = 'sm' }: ChatPresenceDotProps) {
  const sizeClasses = size === 'sm' ? 'w-2.5 h-2.5' : 'w-3 h-3'

  return (
    <span
      className={`inline-block rounded-full ${sizeClasses} ${
        online ? 'bg-emerald-500' : 'bg-stone-300'
      }`}
      title={online ? 'Online' : 'Offline'}
    />
  )
}
