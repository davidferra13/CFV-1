import Link from 'next/link'
import { headers } from 'next/headers'
import { format } from 'date-fns'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { TokenExpiredPage } from '@/components/ui/token-expired-page'
import { QuoteExpiryCountdown } from '@/components/quotes/quote-expiry-countdown'
import { checkRateLimit } from '@/lib/api/rate-limit'
import { getClientPortalQuoteById } from '@/lib/quotes/client-actions'
import { formatCurrency } from '@/lib/utils/currency'
import { PortalQuoteResponseButtons } from './portal-quote-response-buttons'

type PageProps = {
  params: {
    token: string
    quoteId: string
  }
}

export const dynamic = 'force-dynamic'

export default async function ClientPortalQuoteDetailPage({ params }: PageProps) {
  const headersList = await headers()
  const ip =
    headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    headersList.get('x-real-ip') ??
    'unknown'

  const rl = await checkRateLimit(`portal-quote:${ip}`)
  if (!rl.success) {
    return (
      <div className="min-h-screen bg-stone-900 px-4 py-16">
        <div className="mx-auto max-w-lg">
          <Alert variant="warning" title="Too many requests">
            Please wait a moment and try the quote link again.
          </Alert>
        </div>
      </div>
    )
  }

  const quote = await getClientPortalQuoteById(params.token, params.quoteId)
  if (!quote) {
    return <TokenExpiredPage reason="not_found" noun="quote" />
  }

  const isPending = quote.status === 'sent'

  return (
    <div className="min-h-screen bg-stone-900 px-4 py-10">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
              Secure Quote Review
            </p>
            <div className="mt-2 flex items-center gap-2">
              <h1 className="text-2xl font-bold text-stone-100">{quote.quote_name || 'Quote'}</h1>
              {(quote.version as number) > 1 && (
                <Badge variant="info">Revision {quote.version as number}</Badge>
              )}
              {(quote.is_superseded as boolean) && <Badge variant="warning">Superseded</Badge>}
            </div>
            {(quote.inquiry as any)?.confirmed_occasion && (
              <p className="mt-1 text-stone-400">{(quote.inquiry as any).confirmed_occasion}</p>
            )}
          </div>
          <Link
            href={`/client/${params.token}`}
            className="inline-flex items-center rounded-lg border border-stone-700 px-3 py-2 text-sm font-medium text-stone-200 hover:bg-stone-800"
          >
            Back to Portal
          </Link>
        </div>

        {quote.status === 'accepted' && (
          <Alert variant="success" title="Quote accepted">
            You accepted this quote
            {quote.accepted_at ? ` on ${format(new Date(quote.accepted_at), 'MMMM d, yyyy')}` : ''}.
            Your chef can now move the booking forward from here.
          </Alert>
        )}

        {quote.status === 'rejected' && (
          <Alert variant="warning" title="Quote declined">
            You declined this quote
            {quote.rejected_at ? ` on ${format(new Date(quote.rejected_at), 'MMMM d, yyyy')}` : ''}.
          </Alert>
        )}

        <Card className="p-6">
          <h2 className="mb-4 text-xl font-semibold text-stone-100">Pricing Summary</h2>
          <div className="space-y-4">
            <div className="border-b border-stone-800 py-4 text-center">
              <p className="text-3xl font-bold text-stone-100">
                {formatCurrency(quote.total_quoted_cents)}
              </p>
              {quote.pricing_model === 'per_person' &&
                quote.price_per_person_cents &&
                quote.guest_count_estimated && (
                  <p className="mt-1 text-sm text-stone-500">
                    {formatCurrency(quote.price_per_person_cents)} per guest x{' '}
                    {quote.guest_count_estimated} guests
                  </p>
                )}
            </div>

            {quote.deposit_required && quote.deposit_amount_cents && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-stone-400">Deposit required</span>
                <span className="font-medium text-stone-100">
                  {formatCurrency(quote.deposit_amount_cents)}
                  {quote.deposit_percentage && ` (${quote.deposit_percentage}%)`}
                </span>
              </div>
            )}

            {quote.valid_until && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-stone-400">Valid until</span>
                <span className="flex items-center gap-2 font-medium text-stone-100">
                  {format(new Date(quote.valid_until), 'MMMM d, yyyy')}
                  {isPending ? (
                    <QuoteExpiryCountdown validUntil={quote.valid_until} />
                  ) : (
                    new Date(quote.valid_until) < new Date() && (
                      <Badge variant="warning">Expired</Badge>
                    )
                  )}
                </span>
              </div>
            )}
          </div>
        </Card>

        {quote.inquiry && (
          <Card className="p-6">
            <h2 className="mb-4 text-xl font-semibold text-stone-100">Event Details</h2>
            <dl className="space-y-3">
              {(quote.inquiry as any).confirmed_occasion && (
                <div>
                  <dt className="text-sm font-medium text-stone-500">Occasion</dt>
                  <dd className="mt-1 text-sm text-stone-100">
                    {(quote.inquiry as any).confirmed_occasion}
                  </dd>
                </div>
              )}
              {(quote.inquiry as any).confirmed_date && (
                <div>
                  <dt className="text-sm font-medium text-stone-500">Date</dt>
                  <dd className="mt-1 text-sm text-stone-100">
                    {format(new Date((quote.inquiry as any).confirmed_date), 'EEEE, MMMM d, yyyy')}
                  </dd>
                </div>
              )}
              {(quote.inquiry as any).confirmed_guest_count && (
                <div>
                  <dt className="text-sm font-medium text-stone-500">Guests</dt>
                  <dd className="mt-1 text-sm text-stone-100">
                    {(quote.inquiry as any).confirmed_guest_count} guests
                  </dd>
                </div>
              )}
            </dl>
          </Card>
        )}

        {quote.pricing_notes && (
          <Card className="p-6">
            <h2 className="mb-4 text-xl font-semibold text-stone-100">What&apos;s Included</h2>
            <p className="whitespace-pre-wrap text-sm text-stone-300">{quote.pricing_notes}</p>
          </Card>
        )}

        {quote.menus && (quote.menus as any[]).length > 0 && (
          <Card className="p-6">
            <h2 className="mb-4 text-xl font-semibold text-stone-100">Your Menu</h2>
            {(quote.menus as any[]).map((menu: any) => (
              <div key={menu.id} className="space-y-3">
                {menu.name && <h3 className="text-sm font-medium text-stone-300">{menu.name}</h3>}
                {menu.description && <p className="text-sm text-stone-400">{menu.description}</p>}
                {menu.dishes && menu.dishes.length > 0 && (
                  <div className="space-y-2">
                    {(menu.dishes as any[])
                      .sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
                      .map((dish: any) => (
                        <div key={dish.id} className="border-l-2 border-brand-700 pl-3 py-1">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              {dish.course_name && (
                                <span className="text-xs uppercase tracking-wide text-stone-500">
                                  {dish.course_name}
                                </span>
                              )}
                              {dish.description && (
                                <p className="text-sm text-stone-200">{dish.description}</p>
                              )}
                            </div>
                            <div className="flex gap-1">
                              {dish.dietary_tags?.map((tag: string) => (
                                <Badge key={tag} variant="default" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            ))}
          </Card>
        )}

        {isPending && (
          <PortalQuoteResponseButtons
            token={params.token}
            quoteId={quote.id}
            totalCents={quote.total_quoted_cents}
          />
        )}
      </div>
    </div>
  )
}
