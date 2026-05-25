'use client'

import { ExitLinkButton } from '@/components/exit-links/ExitLinkButton'
import { QuickExitLink } from '@/components/exit-links/QuickExitLink'

/**
 * Bank portal link (Exit 68). Renders when bankUrl is available.
 */
export function BankPortalExitLink({
  bankUrl,
  className,
}: {
  bankUrl: string
  className?: string
}) {
  return (
    <ExitLinkButton exitId={68} context={{ bankUrl }} variant="outline" className={className} />
  )
}

/**
 * Email accountant monthly update (Exit 70).
 * Renders when accountantEmail is available.
 */
export function EmailAccountantExitLink({
  accountantEmail,
  className,
}: {
  accountantEmail: string
  className?: string
}) {
  return <QuickExitLink exitId={70} context={{ accountantEmail }} className={className} />
}

/**
 * Email tax package to accountant (Exit 69).
 * Renders when accountantEmail and year are available.
 */
export function EmailTaxPackageExitLink({
  accountantEmail,
  year,
  className,
}: {
  accountantEmail: string
  year: number
  className?: string
}) {
  return (
    <ExitLinkButton
      exitId={69}
      context={{ accountantEmail, year: String(year) }}
      variant="outline"
      className={className}
    />
  )
}

/**
 * View in Stripe (Exit 29). Inline link for invoice/payment rows.
 */
export function StripeExitLink({
  paymentId,
  className,
}: {
  paymentId: string
  className?: string
}) {
  return <QuickExitLink exitId={29} context={{ paymentId }} className={className} />
}

/**
 * Send Venmo request (Exit 44). Inline link for invoice rows with balance.
 */
export function VenmoRequestExitLink({
  clientPhone,
  amount,
  eventName,
  className,
}: {
  clientPhone: string
  amount: string
  eventName: string
  className?: string
}) {
  return (
    <QuickExitLink exitId={44} context={{ clientPhone, amount, eventName }} className={className} />
  )
}
