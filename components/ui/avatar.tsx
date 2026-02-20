'use client'

import { HTMLAttributes, ImgHTMLAttributes, useState } from 'react'

export function Avatar({ className = '', children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden rounded-full bg-stone-100 ${className}`}
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
  ...props
}: ImgHTMLAttributes<HTMLImageElement>) {
  const [failed, setFailed] = useState(false)
  if (!src || failed) return null
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      onError={() => setFailed(true)}
      className={`absolute inset-0 h-full w-full object-cover ${className}`}
      {...props}
    />
  )
}

export function AvatarFallback({ className = '', children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`flex h-full w-full items-center justify-center text-sm font-medium ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}
