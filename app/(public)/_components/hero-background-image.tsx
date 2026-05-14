'use client'

import Image from 'next/image'
import { useState, useMemo } from 'react'

const HERO_PHOTOS = [
  'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1920&q=80&fm=webp',
  'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=1920&q=80&fm=webp',
  'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1920&q=80&fm=webp',
  'https://images.unsplash.com/photo-1547592180-85f173990554?w=1920&q=80&fm=webp',
  'https://images.unsplash.com/photo-1495521821757-a1efb6729352?w=1920&q=80&fm=webp',
  'https://images.unsplash.com/photo-1551218808-94e220e084d2?w=1920&q=80&fm=webp',
] as const

export function HeroBackgroundImage() {
  const [failed, setFailed] = useState(false)
  const src = useMemo(() => HERO_PHOTOS[Math.floor(Math.random() * HERO_PHOTOS.length)], [])

  if (failed) return null

  return (
    <>
      <style>{`
        @keyframes ken-burns {
          0% { transform: scale(1) translate(0, 0); }
          100% { transform: scale(1.08) translate(-1%, -0.5%); }
        }
        @media (prefers-reduced-motion: reduce) {
          .hero-bg-ken-burns { animation: none !important; }
        }
      `}</style>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 0,
          overflow: 'hidden',
          opacity: 0.18,
        }}
      >
        <Image
          src={src}
          alt=""
          fill
          sizes="100vw"
          priority
          onError={() => setFailed(true)}
          style={{
            objectFit: 'cover',
            animation: 'ken-burns 20s ease-out forwards',
          }}
          className="hero-bg-ken-burns"
          unoptimized
        />
      </div>
    </>
  )
}
