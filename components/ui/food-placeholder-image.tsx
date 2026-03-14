'use client'

// FoodPlaceholderImage — displays a stock food photo with proper attribution.
// Used on recipe and menu pages when no user-uploaded photo exists.
//
// Two sizes:
//   - "hero" — large banner image for detail pages (aspect-ratio 21:9)
//   - "thumb" — small square thumbnail for list/table rows
//
// Falls back to a CSS gradient if no image is available.
// Attribution is required by Unsplash/Pexels TOS and always displayed.

import Image from 'next/image'
import type { PlaceholderImage } from '@/lib/images/placeholder-actions'

interface FoodPlaceholderImageProps {
  /** Pre-fetched placeholder image data from getPlaceholderImage() */
  image: PlaceholderImage | null
  /** Display size: "hero" for detail pages, "thumb" for list rows */
  size: 'hero' | 'thumb'
  /** CSS class name for the outer container */
  className?: string
}

/**
 * CSS gradient fallback when no stock photo is available.
 * Uses the brand terracotta color palette.
 */
function GradientFallback({ size, className }: { size: 'hero' | 'thumb'; className?: string }) {
  if (size === 'thumb') {
    return (
      <div
        className={`w-10 h-10 rounded-md flex-shrink-0 ${className ?? ''}`}
        style={{
          background: 'linear-gradient(135deg, #e88f47 0%, #d47530 50%, #b85d1a 100%)',
        }}
      />
    )
  }

  return (
    <div
      className={`w-full rounded-xl overflow-hidden ${className ?? ''}`}
      style={{
        aspectRatio: '21/9',
        background: 'linear-gradient(135deg, #e88f47 0%, #d47530 50%, #b85d1a 100%)',
      }}
    />
  )
}

export function FoodPlaceholderImage({ image, size, className }: FoodPlaceholderImageProps) {
  if (!image) {
    return <GradientFallback size={size} className={className} />
  }

  if (size === 'thumb') {
    return (
      <div
        className={`relative w-10 h-10 rounded-md overflow-hidden flex-shrink-0 ${className ?? ''}`}
        style={{ backgroundColor: image.dominantColor }}
      >
        <Image
          src={image.thumbUrl}
          alt={image.alt}
          fill
          sizes="40px"
          className="object-cover"
          unoptimized
        />
      </div>
    )
  }

  // Hero size
  return (
    <div className={`relative w-full rounded-xl overflow-hidden ${className ?? ''}`}>
      <div
        className="w-full"
        style={{
          aspectRatio: '21/9',
          backgroundColor: image.dominantColor,
        }}
      >
        <Image
          src={image.url}
          alt={image.alt}
          fill
          sizes="(max-width: 768px) 100vw, 800px"
          className="object-cover"
          priority
          unoptimized
        />
      </div>
      {/* Attribution — required by Unsplash/Pexels TOS */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-3 py-2">
        <p className="text-xs text-white/70">
          Photo by{' '}
          <a
            href={image.photographerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-white/90"
          >
            {image.photographerName}
          </a>
          {' on '}
          <a
            href={image.source === 'unsplash' ? 'https://unsplash.com' : 'https://www.pexels.com'}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-white/90"
          >
            {image.source === 'unsplash' ? 'Unsplash' : 'Pexels'}
          </a>
        </p>
      </div>
    </div>
  )
}

/**
 * Inline attribution text for use in table rows next to thumbnails.
 * Smaller and more compact than the overlay used in hero images.
 */
export function PlaceholderAttribution({ image }: { image: PlaceholderImage | null }) {
  if (!image) return null

  return (
    <span className="text-[10px] text-stone-500">
      <a
        href={image.photographerUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="hover:text-stone-400"
      >
        {image.photographerName}
      </a>
      {' / '}
      {image.source === 'unsplash' ? 'Unsplash' : 'Pexels'}
    </span>
  )
}
