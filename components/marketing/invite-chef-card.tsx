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
 * "Invite a Chef" card - shows a shareable referral link.
 * Can be placed on the dashboard, settings, or anywhere in the chef app.
 * Uses the chef's public profile link as the share URL when available,
 * falls back to the main site URL.
 */
export function InviteChefCard({ chefSlug, chefName }: InviteChefCardProps) {
  const [copied, setCopied] = useState(false)

  const referralUrl = `${SITE_URL}/auth/signup${chefSlug ? `?ref=${chefSlug}` : ''}`
  const shareText = chefName
    ? `${chefName} invited you to try ChefFlow, the chef-built back office for private chefs.`
    : 'Check out ChefFlow, the chef-built back office for private chefs.'

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
        title: 'ChefFlow - Chef-built back office',
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
        <p className="mb-4 text-sm text-stone-400">
          Know a chef who would love ChefFlow? Share your invite link.
        </p>

        <div className="mb-3 flex items-center gap-2">
          <div className="flex-1 truncate rounded-md border border-stone-700 bg-stone-900 px-3 py-2 font-mono text-xs text-stone-400">
            {referralUrl}
          </div>
          <Button variant="secondary" size="sm" onClick={handleCopy} className="flex-shrink-0">
            {copied ? (
              <>
                <Check className="mr-1 h-3.5 w-3.5" />
                Copied
              </>
            ) : (
              <>
                <Copy className="mr-1 h-3.5 w-3.5" />
                Copy
              </>
            )}
          </Button>
        </div>

        <Button variant="primary" size="sm" onClick={handleNativeShare} className="w-full">
          <Share2 className="mr-1.5 h-3.5 w-3.5" />
          Share Invite Link
        </Button>
      </CardContent>
    </Card>
  )
}
