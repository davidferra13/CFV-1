'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Share2, Copy, Check } from '@/components/ui/icons'

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://cheflowhq.com'

type InviteChefCardProps = {
  chefSlug?: string | null
  chefName?: string
}

/**
 * "Invite a Chef" card — shows a shareable referral link.
 * Can be placed on the dashboard, settings, or anywhere in the chef app.
 * Uses the chef's public profile link as the share URL when available,
 * falls back to the main site URL.
 */
export function InviteChefCard({ chefSlug, chefName }: InviteChefCardProps) {
  const [copied, setCopied] = useState(false)

  const referralUrl = `${SITE_URL}/auth/signup${chefSlug ? `?ref=${chefSlug}` : ''}`
  const shareText = chefName
    ? `${chefName} invited you to try ChefFlow — the business OS for private chefs. Sign up free:`
    : 'Check out ChefFlow — the business OS for private chefs. Sign up free:'

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(referralUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for environments without clipboard API
      const textArea = document.createElement('textarea')
      textArea.value = referralUrl
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  function handleNativeShare() {
    if (navigator.share) {
      navigator.share({
        title: 'ChefFlow — Ops for Artists',
        text: shareText,
        url: referralUrl,
      })
    } else {
      handleCopy()
    }
  }

  return (
    <Card className="border-brand-800/30 bg-brand-950/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Share2 className="h-4 w-4 text-brand-400" />
          Invite a Chef
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-stone-400 mb-4">
          Know a chef who&apos;d love ChefFlow? Share your invite link.
        </p>

        {/* Link display + copy */}
        <div className="flex items-center gap-2 mb-3">
          <div className="flex-1 rounded-md border border-stone-700 bg-stone-900 px-3 py-2 text-xs text-stone-400 truncate font-mono">
            {referralUrl}
          </div>
          <Button variant="secondary" size="sm" onClick={handleCopy} className="flex-shrink-0">
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 mr-1" />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5 mr-1" />
                Copy
              </>
            )}
          </Button>
        </div>

        {/* Share button (uses native share on mobile, copy on desktop) */}
        <Button variant="primary" size="sm" onClick={handleNativeShare} className="w-full">
          <Share2 className="h-3.5 w-3.5 mr-1.5" />
          Share Invite Link
        </Button>
      </CardContent>
    </Card>
  )
}
