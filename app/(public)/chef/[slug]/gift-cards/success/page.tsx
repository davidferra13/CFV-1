// Gift Card Purchase Success — /chef/[slug]/gift-cards/success
// Shown after Stripe Checkout completes.
// Reads session_id from query param, looks up the purchase intent, shows confirmation.

import { getGiftCardPurchaseBySession } from '@/lib/loyalty/gift-card-purchase-actions'
import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Gift Card Sent — ChefFlow' }

export default async function GiftCardSuccessPage({
  params,
  searchParams,
}: {
  params: { slug: string }
  searchParams: { session_id?: string }
}) {
  const sessionId = searchParams.session_id ?? null
  const purchase = sessionId ? await getGiftCardPurchaseBySession(sessionId) : null

  return (
    <div className="min-h-screen bg-stone-800 flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full text-center">
        {/* Success icon */}
        <div className="w-20 h-20 bg-green-900 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg
            className="w-10 h-10 text-emerald-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h1 className="text-3xl font-bold text-stone-100 mb-3">Your gift is on its way!</h1>

        {purchase ? (
          <div className="space-y-2">
            <p className="text-stone-300">
              A <strong>${((purchase.amount_cents as number) / 100).toFixed(2)} gift card</strong>{' '}
              has been sent to <strong>{purchase.recipient_email as string}</strong>.
            </p>
            {purchase.recipient_name && (
              <p className="text-stone-500 text-sm">
                {purchase.recipient_name as string} will receive an email with their gift card code.
              </p>
            )}
            {purchase.incentive && (
              <div className="mt-4 bg-stone-900 border border-stone-700 rounded-xl p-4 text-left">
                <p className="text-xs text-stone-500 mb-1 uppercase tracking-wide font-medium">
                  Gift card code
                </p>
                <p className="font-mono font-bold text-stone-100 text-xl tracking-widest">
                  {(purchase.incentive as any).code}
                </p>
              </div>
            )}
          </div>
        ) : (
          <p className="text-stone-300">
            Your gift card has been sent. The recipient will receive an email with their code
            shortly.
          </p>
        )}

        <div className="mt-8 space-y-3">
          <p className="text-sm text-stone-500">
            Check your email for a purchase confirmation. The recipient will receive their gift card
            code immediately.
          </p>

          <Link
            href={`/chef/${params.slug}`}
            className="inline-block px-6 py-3 bg-stone-900 text-white font-medium rounded-lg hover:bg-stone-800 transition-colors mt-2"
          >
            Back to chef profile
          </Link>

          <div>
            <Link
              href={`/chef/${params.slug}/gift-cards`}
              className="text-sm text-brand-600 hover:text-brand-400"
            >
              Buy another gift card
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
