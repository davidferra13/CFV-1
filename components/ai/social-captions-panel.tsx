'use client'

import { useState } from 'react'
import { Share2, Copy, Loader2, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  generateSocialCaptions,
  type SocialCaptionsResult,
  type CaptionTone,
} from '@/lib/ai/social-captions'
import { toast } from 'sonner'

const TONES: { value: CaptionTone; label: string }[] = [
  { value: 'warm_personal', label: 'Personal' },
  { value: 'elegant_professional', label: 'Elegant' },
  { value: 'playful_casual', label: 'Casual' },
]

export function SocialCaptionsPanel({ eventId }: { eventId: string }) {
  const [result, setResult] = useState<SocialCaptionsResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [tone, setTone] = useState<CaptionTone>('warm_personal')
  const [platform, setPlatform] = useState<'instagram' | 'facebook' | 'twitter'>('instagram')

  async function run() {
    setLoading(true)
    try {
      const data = await generateSocialCaptions(eventId, tone)
      setResult(data)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Caption generation failed')
    } finally {
      setLoading(false)
    }
  }

  function copy(text: string) {
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard')
  }

  const currentCaption = result?.captions.find((c) => c.platform === platform)

  if (!result) {
    return (
      <div className="bg-white border border-stone-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Share2 className="w-4 h-4 text-brand-600" />
            <span className="text-sm font-medium text-stone-700">Social Captions</span>
            <Badge variant="info">Auto</Badge>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-stone-100 rounded p-0.5">
              {TONES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setTone(t.value)}
                  className={`text-xs px-2 py-0.5 rounded ${tone === t.value ? 'bg-white shadow-sm font-medium' : 'text-stone-500'}`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <Button variant="secondary" onClick={run} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  Writing...
                </>
              ) : (
                <>
                  <Sparkles className="w-3 h-3 mr-1" />
                  Generate
                </>
              )}
            </Button>
          </div>
        </div>
        <p className="text-xs text-stone-500 mt-1">
          Instagram, Facebook, and Twitter captions — no client details included.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white border border-stone-200 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Share2 className="w-4 h-4 text-brand-600" />
          <span className="text-sm font-medium text-stone-700">Social Captions</span>
        </div>
        <div className="flex items-center gap-1">
          {(['instagram', 'facebook', 'twitter'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPlatform(p)}
              className={`text-xs px-2 py-1 rounded capitalize ${platform === p ? 'bg-stone-100 font-medium' : 'text-stone-500'}`}
            >
              {p === 'twitter' ? 'X/Twitter' : p}
            </button>
          ))}
          <Button variant="ghost" onClick={run} disabled={loading}>
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Redo'}
          </Button>
        </div>
      </div>

      {currentCaption && (
        <div className="space-y-2">
          <div className="bg-stone-50 rounded p-3 text-sm text-stone-800 leading-relaxed">
            {currentCaption.caption}
            {currentCaption.hashtags.length > 0 && (
              <div className="text-brand-600 mt-2">{currentCaption.hashtags.join(' ')}</div>
            )}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-stone-400">
              {currentCaption.characterCount} chars
            </span>
            <Button
              variant="secondary"
              onClick={() =>
                copy(platform === 'instagram' ? result.instagramFirst : currentCaption.caption)
              }
            >
              <Copy className="w-3 h-3 mr-1" />
              Copy
            </Button>
          </div>
        </div>
      )}

      <p className="text-[11px] text-stone-400">
        Auto draft · Client details omitted · Review before posting
      </p>
    </div>
  )
}
