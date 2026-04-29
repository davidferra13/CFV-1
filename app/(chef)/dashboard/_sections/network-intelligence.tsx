import Link from 'next/link'
import { getIntegrationHubOverview } from '@/lib/integrations/integration-hub'
import { getNetworkInsights } from '@/lib/network/actions'
import { getCollabMetrics } from '@/lib/network/collab-actions'
import { getNetworkIntelligence } from '@/lib/intelligence/network-referrals'
import { getReferralChainMapping } from '@/lib/intelligence/referral-chain-mapping'
import { getPartnerLeaderboard } from '@/lib/partners/analytics'
import { getRegionalSettings } from '@/lib/chef/actions'
import { formatCurrency } from '@/lib/utils/format'
import { WidgetCardShell } from '@/components/dashboard/widget-cards/widget-card-shell'

type LoadResult<T> =
  | { ok: true; data: T }
  | { ok: false; data: T; label: string; error: unknown }

async function safe<T>(label: string, fn: () => Promise<T>, fallback: T): Promise<LoadResult<T>> {
  try {
    return { ok: true, data: await fn() }
  } catch (error) {
    console.error(`[Dashboard/NetworkIntelligence] ${label} failed:`, error)
    return { ok: false, data: fallback, label, error }
  }
}

function percent(value: number | null | undefined): string {
  if (value == null) return 'No data'
  return `${value}%`
}

function sourceLabel(value: string | null | undefined): string {
  if (!value) return 'No source yet'
  return value
    .split(/[_-]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export async function NetworkIntelligenceSection() {
  const [
    networkResult,
    chainResult,
    insightsResult,
    collabResult,
    partnersResult,
    integrationsResult,
    regionalResult,
  ] = await Promise.all([
    safe('networkIntelligence', getNetworkIntelligence, null),
    safe('referralChainMapping', getReferralChainMapping, null),
    safe('networkInsights', getNetworkInsights, null),
    safe('collabMetrics', () => getCollabMetrics(90), null),
    safe('partnerLeaderboard', getPartnerLeaderboard, []),
    safe('integrationOverview', getIntegrationHubOverview, null),
    safe('regionalSettings', getRegionalSettings, null),
  ])

  const failedLoads = [
    networkResult,
    chainResult,
    insightsResult,
    collabResult,
    partnersResult,
    integrationsResult,
    regionalResult,
  ].filter((result) => !result.ok)

  const network = networkResult.data
  const chain = chainResult.data
  const insights = insightsResult.data
  const collab = collabResult.data
  const partners = partnersResult.data
  const integrations = integrationsResult.data
  const regional = regionalResult.data

  const activeSignals = [
    (network?.networkStats.totalReferralInquiries ?? 0) > 0,
    (network?.topReferringClients.length ?? 0) > 0,
    (network?.referralSourcePerformance.length ?? 0) > 0,
    (chain?.networkEffectScore ?? 0) > 0,
    (insights?.shares_sent_total ?? 0) + (insights?.shares_received_total ?? 0) > 0,
    (collab?.outgoing_total ?? 0) + (collab?.incoming_total ?? 0) > 0,
    partners.length > 0,
    (integrations?.totals.connected ?? 0) > 0,
  ].some(Boolean)

  if (!activeSignals && failedLoads.length === 0) return null

  const topPartner = partners[0] ?? null
  const topSource = network?.referralSourcePerformance[0] ?? null
  const currencyOptions = regional
    ? { locale: regional.locale, currency: regional.currencyCode }
    : undefined
  const topSourceValue =
    topSource && currencyOptions ? formatCurrency(topSource.avgValueCents, currencyOptions) : null

  const stats = [
    {
      label: 'Referral Conversion',
      value: percent(network?.networkStats.referralConversionRate),
      detail: network ? `${network.networkStats.totalReferralInquiries} referral inquiries` : 'Data unavailable',
    },
    {
      label: 'Network Effect',
      value: percent(chain?.networkEffectScore),
      detail: chain
        ? `${chain.percentFromReferrals}% of active clients from referrals`
        : 'Data unavailable',
    },
    {
      label: 'Collab Response',
      value: percent(collab?.acceptance_rate_pct),
      detail: collab ? `${collab.incoming_actionable} incoming actions` : 'Data unavailable',
    },
    {
      label: 'Connected Systems',
      value: integrations ? String(integrations.totals.connected) : 'No data',
      detail: integrations ? `${integrations.totals.reauth_required} need reauth` : 'Data unavailable',
    },
  ]

  return (
    <section>
      <div className="section-label mb-4">Network Intelligence</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 stagger-grid">
        <WidgetCardShell
          widgetId="network_collab_growth"
          title="Referral Network"
          size="md"
          href="/analytics/referral-sources"
        >
          <div className="space-y-4">
            {failedLoads.length > 0 && (
              <div className="rounded-lg border border-amber-800/40 bg-amber-950/30 px-3 py-2">
                <p className="text-xs font-medium text-amber-200">Partial network data</p>
                <p className="mt-1 text-xs text-amber-100/75">
                  {failedLoads.map((result) => result.label).join(', ')} could not be loaded.
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              {stats.map((item) => (
                <div key={item.label} className="rounded-lg border border-stone-800/70 p-3">
                  <p className="text-xxs font-semibold uppercase text-stone-500">{item.label}</p>
                  <p className="mt-1 text-xl font-semibold text-stone-100">{item.value}</p>
                  <p className="mt-1 text-xs text-stone-500">{item.detail}</p>
                </div>
              ))}
            </div>

            {(topSource || topPartner || network?.topReferringClients[0]) && (
              <div className="grid gap-2">
                {topSource && (
                  <Link
                    href="/analytics/referral-sources"
                    className="rounded-lg border border-stone-800/70 px-3 py-2 transition-colors hover:border-brand-800/60 hover:bg-brand-950/20"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-stone-200">
                        {sourceLabel(topSource.source)}
                      </p>
                      <span className="text-xs text-brand-400">{topSource.conversionRate}%</span>
                    </div>
                    <p className="mt-1 text-xs text-stone-500">
                      Best current source
                      {topSourceValue ? `, ${topSourceValue} average value` : ''}
                    </p>
                  </Link>
                )}

                {topPartner && (
                  <Link
                    href="/partners"
                    className="rounded-lg border border-stone-800/70 px-3 py-2 transition-colors hover:border-brand-800/60 hover:bg-brand-950/20"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-stone-200">{topPartner.name}</p>
                      <span className="text-xs text-brand-400">
                        {topPartner.conversion_rate}%
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-stone-500">
                      Top partner by linked revenue and bookings
                    </p>
                  </Link>
                )}

                {network?.topReferringClients[0] && (
                  <Link
                    href="/clients"
                    className="rounded-lg border border-stone-800/70 px-3 py-2 transition-colors hover:border-brand-800/60 hover:bg-brand-950/20"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-stone-200">
                        {network.topReferringClients[0].clientName}
                      </p>
                      <span className="text-xs text-brand-400">
                        {network.topReferringClients[0].likelihood}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-stone-500">Strong referral ask candidate</p>
                  </Link>
                )}
              </div>
            )}
          </div>
        </WidgetCardShell>
      </div>
    </section>
  )
}
