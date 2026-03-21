'use client'

import NextImage from 'next/image'
import type { SocialPlatform } from '@/lib/social/types'
import { SOCIAL_PLATFORM_LABELS } from '@/lib/social/types'
import { Image as ImageIcon } from '@/components/ui/icons'

const PLATFORM_CHAR_LIMITS: Record<SocialPlatform, number> = {
  instagram: 2200,
  facebook: 63206,
  tiktok: 2200,
  linkedin: 3000,
  x: 280,
  pinterest: 500,
  youtube_shorts: 5000,
}

const PLATFORM_HASHTAG_LIMITS: Record<SocialPlatform, number> = {
  instagram: 30,
  facebook: 0,
  tiktok: 0,
  linkedin: 5,
  x: 0,
  pinterest: 20,
  youtube_shorts: 0,
}

type Props = {
  platform: SocialPlatform
  caption: string
  hashtags: string[]
  mediaUrl: string | null
  accountName?: string | null
}

export function SocialPlatformPreview({
  platform,
  caption,
  hashtags,
  mediaUrl,
  accountName,
}: Props) {
  const charLimit = PLATFORM_CHAR_LIMITS[platform]
  const hashtagLimit = PLATFORM_HASHTAG_LIMITS[platform]
  const platformLabel = SOCIAL_PLATFORM_LABELS[platform]
  const charCount = caption.length
  const isOverLimit = charCount > charLimit

  const previewCaption = caption.length > 200 ? caption.slice(0, 200) + '…' : caption
  const visibleHashtags = hashtagLimit > 0 ? hashtags.slice(0, hashtagLimit) : hashtags.slice(0, 5)

  return (
    <div className="bg-stone-900 rounded-xl border border-stone-700 overflow-hidden">
      {/* Platform header */}
      <div className="flex items-center justify-between px-3 py-2 bg-stone-800 border-b border-stone-800">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-stone-700 flex items-center justify-center text-xxs font-bold text-stone-400">
            {accountName ? accountName[0].toUpperCase() : '?'}
          </div>
          <div>
            <div className="text-xs font-semibold text-stone-200">
              {accountName ?? 'Your Account'}
            </div>
            <div className="text-xxs text-stone-400">{platformLabel}</div>
          </div>
        </div>
        <div className={`text-xxs font-medium ${isOverLimit ? 'text-red-500' : 'text-stone-400'}`}>
          {charCount}/{charLimit}
        </div>
      </div>

      {/* Media preview */}
      <div className="relative aspect-square bg-stone-800 flex items-center justify-center">
        {mediaUrl ? (
          <NextImage
            src={mediaUrl}
            alt="Post media"
            fill
            sizes="(max-width: 768px) 100vw, 400px"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="text-center text-stone-400">
            <ImageIcon className="w-8 h-8 mx-auto mb-1 opacity-30" />
            <span className="text-xs">No media attached</span>
          </div>
        )}
      </div>

      {/* Caption */}
      <div className="px-3 py-2 space-y-1">
        {previewCaption ? (
          <p className="text-xs text-stone-300 leading-relaxed">{previewCaption}</p>
        ) : (
          <p className="text-xs text-stone-400 italic">No caption yet</p>
        )}
        {visibleHashtags.length > 0 && (
          <p className="text-xs text-brand-600">
            {visibleHashtags.map((h) => `#${h.replace(/^#/, '')}`).join(' ')}
            {hashtagLimit > 0 && hashtags.length > hashtagLimit && (
              <span className="text-stone-400"> (+{hashtags.length - hashtagLimit} more)</span>
            )}
          </p>
        )}
        {isOverLimit && (
          <p className="text-xxs text-red-500 font-medium">
            ⚠ Caption exceeds {platformLabel} limit by {charCount - charLimit} characters
          </p>
        )}
        {hashtagLimit > 0 && hashtags.length > hashtagLimit && (
          <p className="text-xxs text-amber-600">
            ⚠ {platformLabel} recommends max {hashtagLimit} hashtags
          </p>
        )}
      </div>
    </div>
  )
}
