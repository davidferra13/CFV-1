'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Link as LinkIcon, CheckCircle } from '@/components/ui/icons'

interface Props {
  referralUrl: string
}

export function CopyReferralLinkButton({ referralUrl }: Props) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(referralUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for non-secure contexts
      const el = document.createElement('textarea')
      el.value = referralUrl
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <Button type="button" variant="secondary" onClick={handleCopy}>
      {copied ? (
        <>
          <CheckCircle className="h-4 w-4 mr-1.5 text-emerald-400" />
          Copied
        </>
      ) : (
        <>
          <LinkIcon className="h-4 w-4 mr-1.5" />
          Copy Referral Link
        </>
      )}
    </Button>
  )
}
