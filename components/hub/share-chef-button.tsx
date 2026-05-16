// Share Chef Button (Referral Deep Link Generator)
// One-tap share from client portal/hub that generates a deep link
// with the client's referral code embedded.
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Share2, Check, Copy } from '@/components/ui/icons'

interface ShareChefButtonProps {
  chefSlug: string
  chefName: string
  referralCode: string | null
  referrerName: string
}

export function ShareChefButton({
  chefSlug,
  chefName,
  referralCode,
  referrerName,
}: ShareChefButtonProps) {
  const [copied, setCopied] = useState(false)

  function generateDeepLink(): string {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.cheflowhq.com'
    const params = new URLSearchParams()
    if (referralCode) params.set('ref', referralCode)
    params.set('via', referrerName)
    return `${baseUrl}/chef/${chefSlug}/inquire?${params.toString()}`
  }

  async function handleShare() {
    const url = generateDeepLink()
    const shareText = `I had an amazing experience with ${chefName}. Book your own dinner here:`

    // Try native share first (mobile)
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `Book ${chefName}`,
          text: shareText,
          url,
        })
        return
      } catch {
        // Fallback to clipboard
      }
    }

    // Clipboard fallback
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 3000)
    } catch {
      // Last resort: select+copy via input
    }
  }

  return (
    <Button variant="secondary" size="sm" onClick={handleShare} className="gap-1.5">
      {copied ? (
        <>
          <Check className="h-3.5 w-3.5 text-green-600" />
          <span className="text-green-700">Link Copied</span>
        </>
      ) : (
        <>
          <Share2 className="h-3.5 w-3.5" />
          Share {chefName}
        </>
      )}
    </Button>
  )
}
