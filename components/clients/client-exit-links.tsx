'use client'

import { ExitLinkButton } from '@/components/exit-links/ExitLinkButton'
import { getClientContext } from '@/lib/exit-links/context-helpers'

interface ClientExitLinksProps {
  client: {
    full_name: string
    email?: string | null
    phone?: string | null
    instagram_handle?: string | null
    company_name?: string | null
    company_url?: string | null
    zip?: string | null
  }
}

/**
 * Compact row of exit links for client contact, social, and gifting.
 * Renders only the links whose required context is available.
 */
export function ClientExitLinks({ client }: ClientExitLinksProps) {
  const ctx = getClientContext({
    name: client.full_name,
    phone: client.phone ?? '',
    email: client.email ?? '',
    instagramHandle: client.instagram_handle ?? '',
    companyName: client.company_name ?? '',
    companyUrl: client.company_url ?? '',
    zip: client.zip ?? '',
  })

  const context: Record<string, string> = {
    ...ctx,
    message: '',
  }

  return (
    <div className="flex flex-wrap items-center gap-1">
      {/* Contact: Call, Text, WhatsApp */}
      <ExitLinkButton exitId={32} context={context} variant="compact" />
      <ExitLinkButton exitId={30} context={context} variant="compact" />
      <ExitLinkButton exitId={31} context={context} variant="compact" />

      {/* Email: Gmail */}
      <ExitLinkButton exitId={34} context={context} variant="compact" />

      {/* Social: Instagram/Facebook/LinkedIn */}
      <ExitLinkButton exitId={48} context={context} variant="compact" />

      {/* Company website */}
      <ExitLinkButton exitId={49} context={context} variant="compact" />

      {/* Gifts: Send flowers */}
      <ExitLinkButton exitId={47} context={context} variant="compact" />
    </div>
  )
}
