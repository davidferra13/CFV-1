import { listPushDinners } from '@/lib/campaigns/push-dinner-actions'
import { CAMPAIGN_TYPE_LABELS } from '@/lib/marketing/constants'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { format } from 'date-fns'
import { Plus, Utensils, ArrowRight } from '@/components/ui/icons'
import { Button } from '@/components/ui/button'

function statusVariant(status: string): 'default' | 'success' | 'warning' | 'error' | 'info' {
  switch (status) {
    case 'draft':
      return 'default'
    case 'sending':
      return 'warning'
    case 'sent':
      return 'success'
    case 'scheduled':
      return 'info'
    case 'cancelled':
      return 'error'
    default:
      return 'default'
  }
}

export default async function PushDinnersPage() {
  const campaigns = await listPushDinners()

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-stone-200">Push Dinners</h1>
          <p className="text-sm text-stone-500 mt-0.5">
            Create a dinner concept, invite clients personally, fill your calendar on your terms.
          </p>
        </div>
        <Link href="/marketing/push-dinners/new">
          <Button variant="primary" className="gap-1.5">
            <Plus className="w-4 h-4" />
            New push dinner
          </Button>
        </Link>
      </div>

      {/* List */}
      {campaigns.length === 0 ? (
        <div className="border border-dashed border-stone-700 rounded-xl p-12 text-center space-y-3">
          <Utensils className="w-10 h-10 text-stone-300 mx-auto" />
          <h3 className="text-base font-medium text-stone-400">Push your first dinner</h3>
          <p className="text-sm text-stone-400 max-w-xs mx-auto">
            Create a themed dinner - Halloween, Valentine's Day, anything - and invite past clients
            with personalised messages. Get a shareable booking link to fill your seats.
          </p>
          <Link href="/marketing/push-dinners/new">
            <Button variant="primary" className="mt-2 gap-1.5">
              <Plus className="w-4 h-4" />
              Create push dinner
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns.map((campaign) => {
            const dateDisplay = campaign.proposed_date
              ? format(new Date(campaign.proposed_date + 'T12:00:00'), 'EEE, MMM d, yyyy')
              : null
            const priceDisplay = campaign.price_per_person_cents
              ? `$${Math.round(campaign.price_per_person_cents / 100)}/person`
              : null
            const seatDisplay = campaign.seats_available
              ? `${campaign.seats_booked}/${campaign.seats_available} seats`
              : null
            const isFull =
              campaign.seats_available != null && campaign.seats_booked >= campaign.seats_available

            return (
              <Link
                key={campaign.id}
                href={`/marketing/push-dinners/${campaign.id}`}
                className="block border border-stone-700 rounded-xl bg-stone-900 p-4 hover:border-stone-600 hover:shadow-sm transition-all group"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-stone-200 truncate">
                        {campaign.name}
                      </span>
                      <Badge variant={statusVariant(campaign.status)}>
                        {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
                      </Badge>
                      {isFull && <Badge variant="success">Full</Badge>}
                    </div>

                    <div className="flex items-center gap-3 flex-wrap text-xs text-stone-500">
                      {dateDisplay && <span>{dateDisplay}</span>}
                      {priceDisplay && <span>{priceDisplay}</span>}
                      {campaign.occasion && <span>{campaign.occasion}</span>}
                    </div>

                    {seatDisplay && (
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-stone-800 rounded-full max-w-[120px]">
                          <div
                            className="h-1.5 bg-green-500 rounded-full transition-all"
                            style={{
                              width: `${Math.min(100, (campaign.seats_booked / (campaign.seats_available ?? 1)) * 100)}%`,
                            }}
                          />
                        </div>
                        <span className="text-xs text-stone-400">{seatDisplay}</span>
                      </div>
                    )}
                  </div>

                  <ArrowRight className="w-4 h-4 text-stone-300 group-hover:text-stone-500 mt-1 shrink-0 transition-colors" />
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
