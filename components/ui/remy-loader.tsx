// Branded loading indicator using Remy's whisk animation
// Use this for page-level loading states. For inline spinners, Loader2 still works.

import Image from 'next/image'

interface RemyLoaderProps {
  message?: string
  size?: 'sm' | 'md' | 'lg'
}

const sizes = {
  sm: { width: 48, height: 48 },
  md: { width: 72, height: 72 },
  lg: { width: 96, height: 96 },
}

export function RemyLoader({ message, size = 'md' }: RemyLoaderProps) {
  const { width, height } = sizes[size]

  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center gap-4">
      <div className="relative">
        <div className="absolute inset-0 -m-4 rounded-full bg-brand-500/5 blur-2xl" />
        <Image
          src="/images/remy/remy-idle.png"
          alt="Loading..."
          width={width}
          height={height}
          className="relative animate-[mascot-bob_2s_ease-in-out_infinite] opacity-90"
          priority
        />
      </div>
      {message && <p className="text-sm text-stone-400 animate-pulse">{message}</p>}
    </div>
  )
}
