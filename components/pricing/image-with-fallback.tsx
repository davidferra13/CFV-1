'use client'

import { useEffect, useState } from 'react'
import { toOpenClawImageProxyUrl } from '@/lib/openclaw/image-proxy'

const CATEGORY_ICONS: Record<string, { svg: string; bgColor: string }> = {
  produce: {
    bgColor: 'bg-green-900/40',
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="w-8 h-8 text-green-400"><path d="M12 2C7 2 3 6 3 11c0 3.5 2 6.5 5 8l1 3h6l1-3c3-1.5 5-4.5 5-8 0-5-4-9-9-9z"/><path d="M12 2v4M9 6c1-2 5-2 6 0"/></svg>`,
  },
  meat: {
    bgColor: 'bg-red-900/40',
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="w-8 h-8 text-red-400"><path d="M15 3c-3 0-6 2-7 5-2 0-4 2-4 5s2 5 5 5c3 0 5-1 7-3s3-4 3-7c0-3-1-5-4-5z"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/></svg>`,
  },
  'meat & poultry': {
    bgColor: 'bg-red-900/40',
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="w-8 h-8 text-red-400"><path d="M15 3c-3 0-6 2-7 5-2 0-4 2-4 5s2 5 5 5c3 0 5-1 7-3s3-4 3-7c0-3-1-5-4-5z"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/></svg>`,
  },
  'meat & seafood': {
    bgColor: 'bg-red-900/40',
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="w-8 h-8 text-red-400"><path d="M15 3c-3 0-6 2-7 5-2 0-4 2-4 5s2 5 5 5c3 0 5-1 7-3s3-4 3-7c0-3-1-5-4-5z"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/></svg>`,
  },
  seafood: {
    bgColor: 'bg-blue-900/40',
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="w-8 h-8 text-blue-400"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12z"/><path d="M22 12l-3 2M22 12l-3-2"/></svg>`,
  },
  dairy: {
    bgColor: 'bg-sky-900/40',
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="w-8 h-8 text-sky-400"><rect x="7" y="8" width="10" height="13" rx="1"/><path d="M9 8V5c0-1 1-2 3-2s3 1 3 2v3"/><path d="M10 12h4"/></svg>`,
  },
  'dairy & eggs': {
    bgColor: 'bg-sky-900/40',
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="w-8 h-8 text-sky-400"><rect x="7" y="8" width="10" height="13" rx="1"/><path d="M9 8V5c0-1 1-2 3-2s3 1 3 2v3"/><path d="M10 12h4"/></svg>`,
  },
  'dairy/cheese/eggs': {
    bgColor: 'bg-sky-900/40',
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="w-8 h-8 text-sky-400"><rect x="7" y="8" width="10" height="13" rx="1"/><path d="M9 8V5c0-1 1-2 3-2s3 1 3 2v3"/><path d="M10 12h4"/></svg>`,
  },
  pantry: {
    bgColor: 'bg-amber-900/40',
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="w-8 h-8 text-amber-400"><rect x="6" y="3" width="12" height="18" rx="2"/><path d="M10 7h4M10 11h4M10 15h4"/></svg>`,
  },
  bakery: {
    bgColor: 'bg-orange-900/40',
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="w-8 h-8 text-orange-400"><path d="M5 18h14c1 0 2-1 2-2 0-2-2-4-5-4-1-2-3-3-4-3s-3 1-4 3c-3 0-5 2-5 4 0 1 1 2 2 2z"/><rect x="7" y="18" width="10" height="3" rx="1"/></svg>`,
  },
  'breads & bakery': {
    bgColor: 'bg-orange-900/40',
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="w-8 h-8 text-orange-400"><path d="M5 18h14c1 0 2-1 2-2 0-2-2-4-5-4-1-2-3-3-4-3s-3 1-4 3c-3 0-5 2-5 4 0 1 1 2 2 2z"/><rect x="7" y="18" width="10" height="3" rx="1"/></svg>`,
  },
  frozen: {
    bgColor: 'bg-slate-800/60',
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="w-8 h-8 text-slate-400"><path d="M12 2v20M2 12h20M4.93 4.93l14.14 14.14M19.07 4.93L4.93 19.07"/></svg>`,
  },
  spices: {
    bgColor: 'bg-emerald-900/40',
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="w-8 h-8 text-emerald-400"><path d="M12 2c-2 3-5 5-5 9 0 3 2 5 5 5s5-2 5-5c0-4-3-6-5-9z"/><path d="M12 16v6"/></svg>`,
  },
  'spices & herbs': {
    bgColor: 'bg-emerald-900/40',
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="w-8 h-8 text-emerald-400"><path d="M12 2c-2 3-5 5-5 9 0 3 2 5 5 5s5-2 5-5c0-4-3-6-5-9z"/><path d="M12 16v6"/></svg>`,
  },
  beverages: {
    bgColor: 'bg-indigo-900/40',
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="w-8 h-8 text-indigo-400"><path d="M8 2h8l-1 18H9L8 2z"/><path d="M6 6h12"/></svg>`,
  },
}

const DEFAULT_ICON = {
  bgColor: 'bg-stone-800/60',
  svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="w-8 h-8 text-stone-400"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4H6z"/><path d="M3 6h18M16 10a4 4 0 01-8 0"/></svg>`,
}

interface ImageWithFallbackProps {
  src: string | null
  alt: string
  category?: string
  className?: string
}

export function ImageWithFallback({ src, alt, category, className = '' }: ImageWithFallbackProps) {
  const [failed, setFailed] = useState(false)
  const resolvedSrc = toOpenClawImageProxyUrl(src)

  useEffect(() => {
    setFailed(false)
  }, [resolvedSrc])

  if (!resolvedSrc || failed) {
    const cat = category?.toLowerCase() || ''
    const icon = CATEGORY_ICONS[cat] || DEFAULT_ICON
    return (
      <div className={`flex items-center justify-center ${icon.bgColor} ${className}`} title={alt}>
        <div dangerouslySetInnerHTML={{ __html: icon.svg }} />
      </div>
    )
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={resolvedSrc}
      alt={alt}
      className={`object-cover ${className}`}
      onError={() => setFailed(true)}
      loading="lazy"
    />
  )
}
