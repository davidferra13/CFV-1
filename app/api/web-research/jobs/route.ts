import { NextResponse, type NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/auth/admin'
import {
  createMockWebResearchProvider,
  defaultUsageScopeForJob,
  runWebResearchJob,
  saveWebResearchJob,
  selectWebResearchProvider,
} from '@/lib/web-research'
import type { WebResearchJobType, WebResearchProviderId } from '@/lib/web-research'

const JOB_TYPES = new Set<WebResearchJobType>([
  'competitor_scan',
  'seo_query_check',
  'supplier_lookup',
  'ingredient_lookup',
  'chef_profile_research',
  'venue_client_public_research',
  'local_market_demand',
  'menu_service_trend',
  'source_freshness_recheck',
  'citation_refresh',
  'pie_supplier_research',
  'restaurant_browse_candidate_discovery',
  'restaurant_profile_enrichment',
  'public_listing_verification',
])

export async function POST(request: NextRequest) {
  await requireAdmin()

  const body = (await request.json().catch(() => ({}))) as {
    query?: unknown
    jobType?: unknown
    provider?: unknown
    maxResults?: unknown
  }
  const query = typeof body.query === 'string' ? body.query : ''
  const jobType =
    typeof body.jobType === 'string' && JOB_TYPES.has(body.jobType as WebResearchJobType)
      ? (body.jobType as WebResearchJobType)
      : 'chef_profile_research'
  const requestedProvider = typeof body.provider === 'string' ? body.provider : undefined
  const provider =
    requestedProvider === ('mock' satisfies WebResearchProviderId)
      ? createMockWebResearchProvider()
      : selectWebResearchProvider()

  const job = await runWebResearchJob({
    provider,
    request: {
      jobType,
      query,
      usageScope: defaultUsageScopeForJob(jobType),
      requestedBy: 'admin',
      maxResults: typeof body.maxResults === 'number' ? body.maxResults : 5,
    },
  })
  saveWebResearchJob({ ...job, requestedBy: 'admin', usageScope: defaultUsageScopeForJob(jobType) })

  return NextResponse.json(
    {
      job,
      citationsRequired: true,
      rawResultsPublic: false,
    },
    { status: job.status === 'failed' ? 400 : 200 }
  )
}
