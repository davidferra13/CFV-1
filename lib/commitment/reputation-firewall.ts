import { createServerClient } from '@/lib/db/server'

// #55 Reputation Firewall
// Brand protection commitments. Checks compliance against reputation rules:
// no unplated photos shared, review response SLA, portfolio currency,
// no public pricing, brand-consistent templates.

export type ReputationRule =
  | 'no_unplated_photos'
  | 'review_response_sla'
  | 'portfolio_currency'
  | 'no_public_pricing'
  | 'brand_consistent_templates'

export interface ReputationCheckResult {
  rule: ReputationRule
  label: string
  compliant: boolean
  detail: string
  lastChecked: Date
}

export interface ReputationStatus {
  tenantId: string
  overallScore: number
  results: ReputationCheckResult[]
  checkedAt: Date
}

export interface ComplianceGap {
  rule: ReputationRule
  label: string
  severity: 'low' | 'medium' | 'high'
  recommendation: string
}

const RULE_LABELS: Record<ReputationRule, string> = {
  no_unplated_photos: 'No unplated photos shared publicly',
  review_response_sla: 'Review response within SLA',
  portfolio_currency: 'Portfolio updated quarterly',
  no_public_pricing: 'No public pricing exposed',
  brand_consistent_templates: 'Brand-consistent templates',
}

const RULE_SEVERITY: Record<ReputationRule, 'low' | 'medium' | 'high'> = {
  no_unplated_photos: 'medium',
  review_response_sla: 'high',
  portfolio_currency: 'low',
  no_public_pricing: 'high',
  brand_consistent_templates: 'low',
}

async function checkNoUnplatedPhotos(
  tenantId: string,
  client: any
): Promise<ReputationCheckResult> {
  const { data: photos } = await client
    .from('portfolio_photos' as any)
    .select('id, tags, shared_publicly')
    .eq('tenant_id', tenantId)
    .eq('shared_publicly', true)
    .limit(50)

  let compliant = true
  let detail = 'All shared photos meet plating standards.'

  if (photos && photos.length > 0) {
    const unplated = photos.filter((p: any) => {
      const tags = Array.isArray(p.tags) ? p.tags : []
      return !tags.includes('plated') && !tags.includes('styled')
    })
    if (unplated.length > 0) {
      compliant = false
      detail = unplated.length + ' publicly shared photo(s) lack plating/styling tags.'
    }
  } else {
    detail = 'No publicly shared photos found.'
  }

  return {
    rule: 'no_unplated_photos',
    label: RULE_LABELS.no_unplated_photos,
    compliant,
    detail,
    lastChecked: new Date(),
  }
}

async function checkReviewResponseSla(
  tenantId: string,
  client: any
): Promise<ReputationCheckResult> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  const { data: reviews } = await client
    .from('client_reviews' as any)
    .select('id, created_at, responded_at')
    .eq('tenant_id', tenantId)
    .gte('created_at', thirtyDaysAgo.toISOString())
    .limit(50)

  let compliant = true
  let detail = 'All recent reviews responded to within SLA.'

  if (reviews && reviews.length > 0) {
    const slaHours = 48
    const overdue = reviews.filter((r: any) => {
      if (!r.responded_at) return true
      const responseTime =
        new Date(r.responded_at).getTime() - new Date(r.created_at).getTime()
      return responseTime > slaHours * 60 * 60 * 1000
    })
    if (overdue.length > 0) {
      compliant = false
      detail = overdue.length + ' review(s) not responded to within 48 hours.'
    }
  } else {
    detail = 'No reviews in the last 30 days.'
  }

  return {
    rule: 'review_response_sla',
    label: RULE_LABELS.review_response_sla,
    compliant,
    detail,
    lastChecked: new Date(),
  }
}

async function checkPortfolioCurrency(
  tenantId: string,
  client: any
): Promise<ReputationCheckResult> {
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)

  const { data: recentPhotos } = await client
    .from('portfolio_photos' as any)
    .select('id')
    .eq('tenant_id', tenantId)
    .gte('created_at', ninetyDaysAgo.toISOString())
    .limit(1)

  const hasRecentUpdate = recentPhotos && recentPhotos.length > 0

  return {
    rule: 'portfolio_currency',
    label: RULE_LABELS.portfolio_currency,
    compliant: hasRecentUpdate || false,
    detail: hasRecentUpdate
      ? 'Portfolio updated within the last quarter.'
      : 'Portfolio has not been updated in over 90 days.',
    lastChecked: new Date(),
  }
}

async function checkNoPublicPricing(
  tenantId: string,
  client: any
): Promise<ReputationCheckResult> {
  const { data: profile } = await client
    .from('chef_profiles' as any)
    .select('public_pricing_visible')
    .eq('tenant_id', tenantId)
    .limit(1)

  let compliant = true
  let detail = 'No public pricing exposed.'

  if (profile && profile.length > 0) {
    const p = profile[0] as any
    if (p.public_pricing_visible) {
      compliant = false
      detail = 'Pricing is visible on your public profile. This can undercut negotiations.'
    }
  }

  return {
    rule: 'no_public_pricing',
    label: RULE_LABELS.no_public_pricing,
    compliant,
    detail,
    lastChecked: new Date(),
  }
}

async function checkBrandConsistentTemplates(
  tenantId: string,
  client: any
): Promise<ReputationCheckResult> {
  const { data: templates } = await client
    .from('email_templates' as any)
    .select('id, uses_brand_header')
    .eq('tenant_id', tenantId)
    .limit(20)

  let compliant = true
  let detail = 'All templates are brand-consistent.'

  if (templates && templates.length > 0) {
    const offBrand = templates.filter((t: any) => !t.uses_brand_header)
    if (offBrand.length > 0) {
      compliant = false
      detail = offBrand.length + ' template(s) missing brand header/styling.'
    }
  } else {
    detail = 'No templates configured yet.'
    compliant = true
  }

  return {
    rule: 'brand_consistent_templates',
    label: RULE_LABELS.brand_consistent_templates,
    compliant,
    detail,
    lastChecked: new Date(),
  }
}

export async function checkReputationCompliance(
  tenantId: string,
  action: string
): Promise<ReputationCheckResult[]> {
  const client = createServerClient()
  const results: ReputationCheckResult[] = []

  if (action === 'share_photo' || action === 'all') {
    results.push(await checkNoUnplatedPhotos(tenantId, client))
  }
  if (action === 'review_received' || action === 'all') {
    results.push(await checkReviewResponseSla(tenantId, client))
  }
  if (action === 'portfolio_audit' || action === 'all') {
    results.push(await checkPortfolioCurrency(tenantId, client))
  }
  if (action === 'profile_update' || action === 'all') {
    results.push(await checkNoPublicPricing(tenantId, client))
  }
  if (action === 'send_template' || action === 'all') {
    results.push(await checkBrandConsistentTemplates(tenantId, client))
  }

  return results
}

export async function getReputationStatus(tenantId: string): Promise<ReputationStatus> {
  const results = await checkReputationCompliance(tenantId, 'all')
  const compliantCount = results.filter((r: ReputationCheckResult) => r.compliant).length
  const overallScore =
    results.length > 0 ? Math.round((compliantCount / results.length) * 100) : 100

  return {
    tenantId,
    overallScore,
    results,
    checkedAt: new Date(),
  }
}

export async function getComplianceGaps(tenantId: string): Promise<ComplianceGap[]> {
  const results = await checkReputationCompliance(tenantId, 'all')
  const gaps: ComplianceGap[] = []

  const RECOMMENDATIONS: Record<ReputationRule, string> = {
    no_unplated_photos:
      'Review shared photos and remove or re-tag any that lack proper plating.',
    review_response_sla:
      'Set a daily reminder to check for new reviews. Respond within 48 hours.',
    portfolio_currency:
      'Add recent event photos to your portfolio. Quarterly updates keep your profile fresh.',
    no_public_pricing:
      'Disable public pricing in your profile settings. Custom quotes protect your margins.',
    brand_consistent_templates:
      'Update templates to include your brand header and consistent styling.',
  }

  for (const r of results) {
    if (!r.compliant) {
      gaps.push({
        rule: r.rule,
        label: r.label,
        severity: RULE_SEVERITY[r.rule],
        recommendation: RECOMMENDATIONS[r.rule],
      })
    }
  }

  const severityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 }
  gaps.sort((a: ComplianceGap, b: ComplianceGap) => severityOrder[a.severity] - severityOrder[b.severity])

  return gaps
}