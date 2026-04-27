// Marketing Hub - Tabbed command center for campaigns, sequences, and templates.

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { listCampaigns } from '@/lib/marketing/actions'
import { CAMPAIGN_TYPE_LABELS } from '@/lib/marketing/constants'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'
import { CampaignBuilderClient } from './campaign-builder-client'
import { TestimonialPanel } from '@/components/ai/testimonial-panel'

export const metadata: Metadata = { title: 'Marketing' }

const STATUS_BADGE: Record<
  string,
  { label: string; variant: 'default' | 'success' | 'warning' | 'error' }
> = {
  draft: { label: 'Draft', variant: 'default' },
  scheduled: { label: 'Scheduled', variant: 'warning' },
  sending: { label: 'Sending…', variant: 'warning' },
  sent: { label: 'Sent', variant: 'success' },
  cancelled: { label: 'Cancelled', variant: 'default' },
}

export default async function MarketingPage() {
  await requireChef()
  const campaigns = await listCampaigns()

  const sent = campaigns.filter((c: any) => c.status === 'sent')
  const drafts = campaigns.filter((c: any) => c.status === 'draft')
  const scheduled = campaigns.filter((c: any) => c.status === 'scheduled')

  const totalSent = sent.reduce((s: number, c: any) => s + (c.recipient_count ?? 0), 0)

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-100">Marketing</h1>
          <p className="mt-1 text-sm text-stone-500">
            Reach clients by email, SMS, or personal note - in bulk or one-by-one.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/marketing/sequences">
            <Button variant="ghost" size="sm">
              Sequences
            </Button>
          </Link>
          <Link href="/marketing/templates">
            <Button variant="ghost" size="sm">
              Templates
            </Button>
          </Link>
        </div>
      </div>

      {/* Summary stats */}
      {campaigns.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="rounded-lg border border-stone-700 bg-stone-900 p-4 text-center">
            <p className="text-2xl font-bold text-stone-100">{campaigns.length}</p>
            <p className="text-xs text-stone-500 mt-0.5">Campaigns</p>
          </div>
          <div className="rounded-lg border border-stone-700 bg-stone-900 p-4 text-center">
            <p className="text-2xl font-bold text-stone-100">{totalSent.toLocaleString()}</p>
            <p className="text-xs text-stone-500 mt-0.5">Emails sent</p>
          </div>
          <div className="rounded-lg border border-stone-700 bg-stone-900 p-4 text-center">
            <p className="text-2xl font-bold text-stone-100">{scheduled.length}</p>
            <p className="text-xs text-stone-500 mt-0.5">Scheduled</p>
          </div>
        </div>
      )}

      {/* Campaign list */}
      {campaigns.length > 0 && (
        <div className="space-y-1">
          <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wide px-1 mb-2">
            Campaigns
          </h2>
          {campaigns.map((c: any) => {
            const cfg = STATUS_BADGE[c.status] ?? STATUS_BADGE.draft
            return (
              <Link key={c.id} href={`/marketing/${c.id}`} className="block">
                <Card className="hover:bg-stone-800 transition-colors cursor-pointer">
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-stone-100 truncate">{c.name}</span>
                          <Badge variant="default">
                            {CAMPAIGN_TYPE_LABELS[c.campaign_type] ?? c.campaign_type}
                          </Badge>
                          <Badge variant={cfg.variant}>{cfg.label}</Badge>
                        </div>
                        <p className="text-sm text-stone-500 mt-0.5 truncate">{c.subject}</p>
                        <div className="flex gap-3 text-xs text-stone-400 mt-0.5">
                          {c.sent_at && (
                            <span>Sent {format(new Date(c.sent_at), 'MMM d, yyyy')}</span>
                          )}
                          {c.recipient_count != null && (
                            <span>{c.recipient_count.toLocaleString()} recipients</span>
                          )}
                          {c.scheduled_at && c.status === 'scheduled' && (
                            <span>
                              Scheduled for {format(new Date(c.scheduled_at), 'MMM d, h:mm a')}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="text-stone-300 text-lg shrink-0">›</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}

      {campaigns.length === 0 && (
        <p className="text-sm text-stone-500">No campaigns yet. Create your first below.</p>
      )}

      {/* New Campaign builder */}
      <div>
        <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wide px-1 mb-2">
          New Campaign
        </h2>
        <Card>
          <CardContent className="pt-5 pb-5">
            <CampaignBuilderClient />
          </CardContent>
        </Card>
      </div>

      {/* AI Testimonial Request */}
      <TestimonialPanel />
    </div>
  )
}
