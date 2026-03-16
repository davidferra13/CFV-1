'use client'

// RemyAvatar - Simple static image avatar for Remy.
// Replaces the animation system (lip-sync, sprite sheets, visemes) with a
// single friendly image. The animation system is archived - not deleted - in:
//   components/ai/remy-talking-avatar.tsx
//   components/ai/remy-animated-mascot.tsx
//   components/ai/remy-sprite-animator.tsx
//   lib/ai/remy-visemes.ts
//   lib/ai/remy-body-state.ts
//   lib/ai/remy-eye-blink.ts
//   lib/ai/remy-sprite-manifests.ts
//   lib/ai/remy-sprite-loader.ts
//   lib/ai/use-remy-lip-sync.ts

import Image from 'next/image'

const SIZES = {
  sm: 40,
  md: 56,
  lg: 80,
  xl: 120,
} as const

interface RemyAvatarProps {
  size?: keyof typeof SIZES
  className?: string
}

export function RemyAvatar({ size = 'md', className = '' }: RemyAvatarProps) {
  const px = SIZES[size]
  return (
    <Image
      src="/images/remy/remy-idle.png"
      alt="Remy"
      width={px}
      height={px}
      className={`rounded-full flex-shrink-0 ${className}`}
    />
  )
}
