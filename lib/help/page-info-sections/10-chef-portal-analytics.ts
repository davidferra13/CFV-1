import type { PageInfoEntry } from '../page-info-types'

export const CHEF_PORTAL_ANALYTICS_PAGE_INFO: Record<string, PageInfoEntry> = {
  '/analytics': {
    title: 'Analytics Hub',
    description:
      'Canonical reporting root for metrics, measurement, source performance, revenue, operations, clients, marketing, social, and culinary reporting.',
    features: [
      'Overview with monthly revenue and event counts',
      'Client analytics (retention, churn, acquisition, NPS)',
      'Pipeline analytics (funnel, ghost rate, lead time)',
      'Revenue analytics (per-unit, by day of week, by season)',
      'Validated tab deep-links for focused reporting sections',
    ],
  },

  '/insights': {
    title: 'Clientele Insights',
    description:
      'Companion interpretation surface for client behavior, event history, seasonality, operations patterns, and Take a Chef ROI.',
    features: [
      'Clientele and guest count patterns',
      'Seasonal and day-of-week trends',
      'Client base, retention, and lifetime value interpretation',
      'Operations and quality patterns from event history',
      'Validated tab deep-links for focused interpretation sections',
    ],
  },

  '/intelligence': {
    title: 'Intelligence Hub',
    description:
      'Deterministic recommendation and alert engine for forecasts, risks, client signals, and next-action prompts.',
    features: [
      'Recommendation engine panels',
      'Forecasts and proactive alerts',
      'Client, event, inquiry, pricing, and scheduling intelligence',
      'Upgrade-gated engine workspace',
    ],
  },

  '/analytics/demand': {
    title: 'Demand Trends',
    description: 'Market demand forecasting - understand booking patterns and seasonal trends.',
    features: ['Demand indicators', 'Seasonal patterns', 'Forecasting'],
  },

  '/analytics/benchmarks': {
    title: 'Industry Benchmarks',
    description: 'Compare your metrics against industry standards.',
    features: ['Industry comparison', 'Percentile ranking', 'Improvement suggestions'],
  },

  '/analytics/pipeline': {
    title: 'Pipeline Analysis',
    description: 'Sales pipeline health - conversion rates, bottlenecks, and velocity.',
    features: [
      'Funnel visualization',
      'Conversion rates',
      'Stage duration',
      'Bottleneck identification',
    ],
  },

  '/analytics/referral-sources': {
    title: 'Referral Sources',
    description: 'Where your clients come from - track referral partner performance.',
    features: ['Source attribution', 'Conversion by source', 'Partner ROI'],
  },

  '/analytics/client-ltv': {
    title: 'Client Lifetime Value',
    description: 'Lifetime revenue per client - understand your most valuable relationships.',
    features: ['LTV calculation', 'Client ranking', 'Retention correlation'],
  },

  '/analytics/reports': {
    title: 'Custom Reports',
    description: 'Build and export custom reports from your data.',
    features: ['Report builder', 'Data export', 'Scheduled reports'],
  },
}
