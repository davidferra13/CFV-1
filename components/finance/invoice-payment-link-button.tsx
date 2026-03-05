'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { generateHostedInvoicePaymentLink } from '@/lib/finance/invoice-payment-link-actions'
import { toast } from 'sonner'

type Props = {
  eventId: string
}

export function InvoicePaymentLinkButton({ eventId }: Props) {
  const [isPending, startTransition] = useTransition()
  const [lastLink, setLastLink] = useState<string | null>(null)

  const handleGenerate = () => {
    startTransition(async () => {
      try {
        const result = await generateHostedInvoicePaymentLink(eventId)
        setLastLink(result.url)
        try {
          await navigator.clipboard.writeText(result.url)
          toast.success('Hosted payment link copied to clipboard')
        } catch {
          toast.success('Hosted payment link generated')
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to generate payment link')
      }
    })
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="ghost" size="sm" onClick={handleGenerate} disabled={isPending}>
        {isPending ? 'Generating...' : 'Payment Link'}
      </Button>
      {lastLink && (
        <a
          href={lastLink}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-brand-600 hover:underline"
        >
          Open
        </a>
      )}
    </div>
  )
}
