// Campaign Detail & Analytics Page
// Shows per-campaign stats, recipient list, and revenue attribution.

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import {
  getCampaign,
  getCampaignStats,
  getCampaignRecipients,
  getCampaignRevenueAttribution,
  saveAsTemplate,
} from '@/lib/marketing/actions'
import { CAMPAIGN_TYPE_LABELS } from '@/lib/marketing/constants'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'
import { SaveTemplateButton } from './save-template-button'

export const metadata: Metadata = { title: 'Campaign Details | ChefFlow' }

interface CampaignDetailPageProps {
  params: { id: string }
}

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

const CHANNEL_ICON: Record<string, string> = {
  email: '✉',
  sms: '💬',
  call: '📞',
  instagram: '📸',
}

export default async function CampaignDetailPage({ params }: CampaignDetailPageProps) {
  await requireChef()

  const [campaign, stats, recipients, attribution] = await Promise.all([
    getCampaign(params.id),
    getCampaignStats(params.id),
    getCampaignRecipients(params.id),
    getCampaignRevenueAttribution(params.id),
  ])

  if (!campaign) notFound()

  const statusCfg = STATUS_BADGE[campaign.status] ?? STATUS_BADGE.draft
  const isSent = campaign.status === 'sent'

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            href="/marketing"
            className="text-sm text-stone-500 hover:text-stone-300 mb-2 inline-block"
          >
            ← Campaigns
          </Link>
          <h1 className="text-2xl font-bold text-stone-100">{campaign.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="default">
              {CAMPAIGN_TYPE_LABELS[campaign.campaign_type] ?? campaign.campaign_type}
            </Badge>
            <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>
            {campaign.sent_at && (
              <span className="text-sm text-stone-500">
                Sent {format(new Date(campaign.sent_at), 'MMM d, yyyy')}
              </span>
            )}
          </div>
        </div>
        {isSent && <SaveTemplateButton campaignId={campaign.id} campaignName={campaign.name} />}
      </div>

      {/* Stats Row */}
      {isSent && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Sent" value={stats.sent} total={stats.total} />
          <StatCard
            label="Opened"
            value={stats.opened}
            total={stats.sent}
            suffix={`${stats.open_rate}%`}
          />
          <StatCard
            label="Clicked"
            value={stats.clicked}
            total={stats.sent}
            suffix={`${stats.click_rate}%`}
          />
          <StatCard label="Unsubscribed" value={stats.unsubscribed} total={stats.sent} />
        </div>
      )}

      {/* Revenue Attribution */}
      {isSent && (
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="text-2xl font-bold text-stone-100">{attribution.bookings}</div>
              <div>
                <p className="text-sm font-medium text-stone-100">
                  {attribution.bookings === 1 ? 'client booked' : 'clients booked'} within 30 days
                </p>
                {attribution.revenue_cents > 0 && (
                  <p className="text-xs text-stone-500">
                    ${(attribution.revenue_cents / 100).toLocaleString()} in attributed revenue
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Subject + Message Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-stone-500 uppercase tracking-wide">
            Message
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div>
            <span className="text-xs text-stone-400 uppercase tracking-wide mr-2">Subject</span>
            <span className="text-sm font-medium text-stone-100">{campaign.subject}</span>
          </div>
          <pre className="whitespace-pre-wrap text-sm text-stone-300 bg-stone-800 rounded-md p-4 border border-stone-800 max-h-48 overflow-y-auto">
            {campaign.body_html}
          </pre>
        </CardContent>
      </Card>

      {/* Recipients */}
      {recipients.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recipients ({recipients.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-stone-800">
              {recipients.map((r: any) => (
                <div key={r.id} className="flex items-center justify-between px-6 py-3 gap-4">
                  <div>
                    <p className="text-sm font-medium text-stone-100">{r.email}</p>
                    {r.error_message && <p className="text-xs text-red-500">{r.error_message}</p>}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-stone-400 shrink-0">
                    {r.opened_at && <span className="text-emerald-600 font-medium">Opened</span>}
                    {r.clicked_at && <span className="text-brand-600 font-medium">Clicked</span>}
                    {r.unsubscribed_at && <span className="text-stone-400">Unsubscribed</span>}
                    {r.sent_at && !r.error_message && !r.opened_at && <span>Delivered</span>}
                    {r.error_message && <span className="text-red-500">Failed</span>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {!isSent && campaign.status === 'draft' && (
        <p className="text-sm text-stone-500 text-center">
          This campaign is a draft.{' '}
          <Link href="/marketing" className="underline">
            Go to Campaigns
          </Link>{' '}
          to send it.
        </p>
      )}
    </div>
  )
}

function StatCard({
  label,
  value,
  total,
  suffix,
}: {
  label: string
  value: number
  total: number
  suffix?: string
}) {
  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        <p className="text-xs text-stone-500 uppercase tracking-wide mb-1">{label}</p>
        <p className="text-2xl font-bold text-stone-100">{suffix ?? value}</p>
        {!suffix && total > 0 && (
          <p className="text-xs text-stone-400">{Math.round((value / total) * 100)}%</p>
        )}
      </CardContent>
    </Card>
  )
}
