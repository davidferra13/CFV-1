import Link from 'next/link'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { TokenExpiredPage } from '@/components/ui/token-expired-page'
import { Alert } from '@/components/ui/alert'
import { checkRateLimit } from '@/lib/api/rate-limit'
import { getClientPortalPaymentCheckoutUrl } from '@/lib/client-portal/actions'

type Props = {
  params: {
    token: string
    eventId: string
  }
}

export const dynamic = 'force-dynamic'

export default async function ClientPortalPaymentRedirectPage({ params }: Props) {
  const headersList = await headers()
  const ip =
    headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    headersList.get('x-real-ip') ??
    'unknown'

  const rl = await checkRateLimit(`portal-pay:${ip}`)
  if (!rl.success) {
    return (
      <div className="min-h-screen bg-stone-900 px-4 py-16">
        <div className="mx-auto max-w-lg">
          <Alert variant="warning" title="Too many requests">
            Please wait a moment and try the payment link again.
          </Alert>
        </div>
      </div>
    )
  }

  const result = await getClientPortalPaymentCheckoutUrl(params.token, params.eventId)

  if (result.status === 'not_found') {
    return <TokenExpiredPage reason="not_found" noun="payment" />
  }

  if (result.status === 'rate_limited') {
    return (
      <div className="min-h-screen bg-stone-900 px-4 py-16">
        <div className="mx-auto max-w-lg">
          <Alert variant="warning" title="Too many requests">
            Please wait a moment and try the payment link again.
          </Alert>
        </div>
      </div>
    )
  }

  if (result.status === 'unavailable') {
    return (
      <div className="min-h-screen bg-stone-900 px-4 py-16">
        <div className="mx-auto max-w-lg space-y-6">
          <Alert variant="info" title="Payment is not ready yet">
            This event does not have a payable balance right now, or your chef still needs to unlock
            the next step before payment can be collected.
          </Alert>
          <div className="rounded-2xl border border-stone-700 bg-stone-950/70 p-6">
            <p className="text-sm leading-relaxed text-stone-300">
              Return to your portal to review the current status. If you just approved a proposal,
              the next payment step may take a moment to appear.
            </p>
            <Link
              href={`/client/${params.token}`}
              className="mt-5 inline-flex items-center rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
            >
              Back to portal
            </Link>
          </div>
        </div>
      </div>
    )
  }

  redirect(result.checkoutUrl)
}
