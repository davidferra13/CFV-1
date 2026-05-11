// Client Relationship Summary Page
// Printable, comprehensive view of everything about a client.

import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { generateClientSummary } from '@/lib/reports/client-summary'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils/currency'
import { format } from 'date-fns'
import { ClientHeaderCard } from '@/components/reports/client-summary/client-header-card'
import { EventHistoryList } from '@/components/reports/client-summary/event-history-list'
import { SpendingSummary } from '@/components/reports/client-summary/spending-summary'
import { PreferenceTags } from '@/components/reports/client-summary/preference-tags'
import { PrintButton } from './print-button'

export const metadata: Metadata = { title: 'Client Summary' }

interface Props {
  params: { id: string }
}

export default async function ClientSummaryPage({ params }: Props) {
  const user = await requireChef()

  let report
  try {
    report = await generateClientSummary(params.id, user.tenantId!)
  } catch {
    notFound()
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto print:max-w-none print:space-y-4">
      {/* Print-only header */}
      <div className="hidden print:block text-center mb-6">
        <h1 className="text-2xl font-bold text-stone-900">Client Relationship Summary</h1>
        <p className="text-sm text-stone-500">
          Generated {format(new Date(report.generatedAt), 'MMMM d, yyyy h:mm a')}
        </p>
      </div>

      {/* Screen-only nav */}
      <div className="flex items-center justify-between print:hidden">
        <div>
          <Link
            href={`/clients/${params.id}`}
            className="text-sm text-brand-500 hover:text-brand-400 mb-2 inline-block"
          >
            &larr; Back to {report.fullName}
          </Link>
          <h1 className="text-2xl font-bold text-stone-100">Client Relationship Summary</h1>
          <p className="text-stone-400 mt-1 text-sm">
            Everything about {report.fullName} in one place
          </p>
        </div>
        <PrintButton />
      </div>

      {/* Client header */}
      <ClientHeaderCard report={report} />

      {/* Preferences */}
      <PreferenceTags preferences={report.preferences} />

      {/* Financial summary */}
      <SpendingSummary financials={report.financials} />

      {/* Event history */}
      <EventHistoryList events={report.events} />

      {/* Reviews */}
      {report.reviews.length > 0 && (
        <Card className="print:shadow-none print:border-stone-300">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-base print:text-stone-900">
                Client Reviews ({report.reviews.length})
              </CardTitle>
              {report.averageRating !== null && (
                <span className="text-lg font-bold text-amber-400 print:text-amber-600">
                  {report.averageRating}/5 avg
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-stone-800 print:divide-stone-300">
              {report.reviews.map((review) => (
                <div key={review.eventId} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <span
                            key={n}
                            className={
                              n <= review.rating
                                ? 'text-amber-400 print:text-amber-500'
                                : 'text-stone-600 print:text-stone-300'
                            }
                          >
                            *
                          </span>
                        ))}
                      </div>
                      <span className="text-sm font-medium text-stone-200 print:text-stone-800">
                        {review.rating}/5
                      </span>
                    </div>
                    <span className="text-xs text-stone-500">
                      {review.occasion || 'Event'}
                      {review.eventDate &&
                        ` \u00b7 ${format(new Date(review.eventDate + 'T12:00:00'), 'MMM d, yyyy')}`}
                    </span>
                  </div>
                  {review.whatTheyLoved && (
                    <p className="text-sm text-stone-300 print:text-stone-700 mt-1">
                      <span className="font-medium text-emerald-400 print:text-emerald-700">
                        Loved:{' '}
                      </span>
                      {review.whatTheyLoved}
                    </p>
                  )}
                  {review.feedbackText && (
                    <p className="text-sm text-stone-300 print:text-stone-700 mt-1">
                      {review.feedbackText}
                    </p>
                  )}
                  {review.whatCouldImprove && (
                    <p className="text-sm text-stone-300 print:text-stone-700 mt-1">
                      <span className="font-medium text-amber-400 print:text-amber-600">
                        Improve:{' '}
                      </span>
                      {review.whatCouldImprove}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Communication summary */}
      <Card className="print:shadow-none print:border-stone-300">
        <CardHeader>
          <CardTitle className="text-base print:text-stone-900">Communication</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                Total Interactions
              </p>
              <p className="text-xl font-bold text-stone-100 print:text-stone-900 mt-1">
                {report.communication.totalInteractions}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                Last Contact
              </p>
              <p className="text-sm text-stone-200 print:text-stone-800 mt-1">
                {report.communication.lastContactDate
                  ? format(new Date(report.communication.lastContactDate), 'MMM d, yyyy')
                  : 'No contact recorded'}
              </p>
            </div>
          </div>

          {report.communication.recentItems.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-2">
                Recent Messages
              </p>
              <div className="divide-y divide-stone-800 print:divide-stone-300">
                {report.communication.recentItems.map((item, i) => (
                  <div key={i} className="py-2 first:pt-0 last:pb-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-stone-300 print:text-stone-700">
                        {item.type}
                      </span>
                      <span className="text-xs text-stone-500">
                        {format(new Date(item.date), 'MMM d, yyyy')}
                      </span>
                    </div>
                    {item.description && (
                      <p className="text-xs text-stone-400 print:text-stone-600 mt-0.5">
                        {item.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notes */}
      {report.notes.length > 0 && (
        <Card className="print:shadow-none print:border-stone-300">
          <CardHeader>
            <CardTitle className="text-base print:text-stone-900">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-stone-800 print:divide-stone-300">
              {report.notes.map((note, i) => (
                <div key={i} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      {note.pinned && (
                        <Badge
                          variant="info"
                          className="text-xs print:border print:border-sky-300"
                        >
                          Pinned
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-stone-500">
                      {format(new Date(note.date), 'MMM d, yyyy')}
                    </span>
                  </div>
                  <p className="text-sm text-stone-300 print:text-stone-700 whitespace-pre-wrap">
                    {note.text}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Print-only footer */}
      <div className="hidden print:block text-center mt-8 pt-4 border-t border-stone-300">
        <p className="text-xs text-stone-500">
          Generated on {format(new Date(report.generatedAt), 'MMMM d, yyyy')} at{' '}
          {format(new Date(report.generatedAt), 'h:mm a')}
        </p>
      </div>
    </div>
  )
}
