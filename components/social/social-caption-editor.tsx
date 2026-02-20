'use client'

import { Textarea } from '@/components/ui/textarea'
import type { SocialPlatform, SocialPost } from '@/lib/social/types'
import { SOCIAL_PLATFORM_LABELS } from '@/lib/social/types'

const PLATFORM_CAPTION_KEYS: { platform: SocialPlatform; key: keyof SocialPost }[] = [
  { platform: 'instagram', key: 'caption_instagram' },
  { platform: 'facebook', key: 'caption_facebook' },
  { platform: 'tiktok', key: 'caption_tiktok' },
  { platform: 'linkedin', key: 'caption_linkedin' },
  { platform: 'x', key: 'caption_x' },
  { platform: 'pinterest', key: 'caption_pinterest' },
  { platform: 'youtube_shorts', key: 'caption_youtube_shorts' },
]

const CHAR_LIMITS: Record<SocialPlatform, number> = {
  instagram: 2200,
  facebook: 63206,
  tiktok: 2200,
  linkedin: 3000,
  x: 280,
  pinterest: 500,
  youtube_shorts: 5000,
}

type CaptionState = {
  caption_master: string
  caption_instagram: string
  caption_facebook: string
  caption_tiktok: string
  caption_linkedin: string
  caption_x: string
  caption_pinterest: string
  caption_youtube_shorts: string
}

type Props = {
  captions: CaptionState
  activePlatform: SocialPlatform | 'master'
  onChange: (key: keyof CaptionState, value: string) => void
  onSetActivePlatform: (p: SocialPlatform | 'master') => void
}

export function SocialCaptionEditor({ captions, activePlatform, onChange, onSetActivePlatform }: Props) {
  const tabs: { key: SocialPlatform | 'master'; label: string }[] = [
    { key: 'master', label: 'Master' },
    ...PLATFORM_CAPTION_KEYS.map(({ platform }) => ({
      key: platform as SocialPlatform | 'master',
      label: SOCIAL_PLATFORM_LABELS[platform],
    })),
  ]

  const currentCaption =
    activePlatform === 'master'
      ? captions.caption_master
      : (captions[`caption_${activePlatform}` as keyof CaptionState] as string)

  const currentKey =
    activePlatform === 'master'
      ? 'caption_master'
      : (`caption_${activePlatform}` as keyof CaptionState)

  const charLimit = activePlatform !== 'master' ? CHAR_LIMITS[activePlatform] : null
  const charCount = currentCaption.length
  const isOver = charLimit !== null && charCount > charLimit

  const handleAutoFill = () => {
    if (activePlatform !== 'master') {
      onChange(currentKey, captions.caption_master)
    }
  }

  return (
    <div className="space-y-3">
      {/* Platform tab strip */}
      <div className="flex gap-0.5 overflow-x-auto pb-1">
        {tabs.map(({ key, label }) => {
          const isActive = activePlatform === key
          const hasContent =
            key === 'master'
              ? !!captions.caption_master
              : !!(captions[`caption_${key}` as keyof CaptionState] as string)
          return (
            <button
              key={key}
              type="button"
              onClick={() => onSetActivePlatform(key)}
              className={[
                'px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors flex items-center gap-1',
                isActive
                  ? 'bg-stone-900 text-white'
                  : 'text-stone-500 hover:text-stone-700 hover:bg-stone-100',
              ].join(' ')}
            >
              {label}
              {hasContent && !isActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
              )}
            </button>
          )
        })}
      </div>

      {/* Caption textarea */}
      <div className="relative">
        <Textarea
          value={currentCaption}
          onChange={(e) => onChange(currentKey, e.target.value)}
          rows={8}
          placeholder={
            activePlatform === 'master'
              ? 'Write your master caption here — this is the default for all platforms...'
              : `Caption for ${SOCIAL_PLATFORM_LABELS[activePlatform]}...`
          }
          className="resize-none"
        />
        <div className="flex items-center justify-between mt-1">
          <div className="flex items-center gap-2">
            {activePlatform !== 'master' && (
              <button
                type="button"
                onClick={handleAutoFill}
                className="text-xs text-stone-400 hover:text-stone-600 underline underline-offset-2"
              >
                Auto-fill from master
              </button>
            )}
          </div>
          <span className={`text-xs ${isOver ? 'text-red-500 font-medium' : 'text-stone-400'}`}>
            {charCount}
            {charLimit !== null && `/${charLimit}`}
            {isOver && ' — over limit'}
          </span>
        </div>
      </div>
    </div>
  )
}

export type { CaptionState }
