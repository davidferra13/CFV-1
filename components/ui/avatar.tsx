'use client'

import { HTMLAttributes, ImgHTMLAttributes, useState } from 'react'
import { getOptimizedAvatar } from '@/lib/images/cloudinary'

export function Avatar({ className = '', children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden rounded-full bg-stone-800 ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}

export function AvatarImage({
  src,
  alt = '',
  className = '',
  width,
  height,
  ...props
}: ImgHTMLAttributes<HTMLImageElement>) {
  const [failed, setFailed] = useState(false)
  if (!src || failed) return null

  // Optimize through Cloudinary CDN — falls back to original URL if env var missing
  // Use the larger of width/height for avatar size, default 200px
  const size =
    Math.max(typeof width === 'number' ? width : 0, typeof height === 'number' ? height : 0) || 200
  const optimizedSrc = getOptimizedAvatar(src, size)

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={optimizedSrc}
      alt={alt}
      onError={() => {
        // If Cloudinary fetch fails, the fallback is handled by hiding the image
        // (the AvatarFallback will show instead)
        setFailed(true)
      }}
      className={`absolute inset-0 h-full w-full object-cover ${className}`}
      width={width}
      height={height}
      {...props}
    />
  )
}

export function AvatarFallback({
  className = '',
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`flex h-full w-full items-center justify-center text-sm font-medium ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}
