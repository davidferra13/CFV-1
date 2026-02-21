'use server'

// Stage Conversion Analytics
// Computes how many records pass through each pipeline stage and the
// conversion rate between adjacent stages. Covers both the inquiry pipeline
// (new → confirmed) and the event pipeline (draft → completed).

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'

export interface PipelineStage {
  key: string
  label: string
  count: number
  conversionFromPrev: number | null   // % that reached this from the previous stage
  dropoffFromPrev: number | null       // % that dropped off (1 - conversionFromPrev)
}

export interface StageConversionData {
  inquiryFunnel: PipelineStage[]
  eventFunnel: PipelineStage[]
  inquiryTotalStarted: number
  inquiryTotalConverted: number
  inquiryOverallConversionRate: number | null
  eventTotalStarted: number
  eventTotalCompleted: number
  eventOverallCompletionRate: number | null
}

const INQUIRY_STAGE_ORDER = ['new', 'awaiting_client', 'awaiting_chef', 'quoted', 'confirmed']
const INQUIRY_LABELS: Record<string, string> = {
  new: 'New Lead',
  awaiting_client: 'Awaiting Client',
  awaiting_chef: 'Awaiting Chef',
  quoted: 'Quote Sent',
  confirmed: 'Confirmed',
}

const EVENT_STAGE_ORDER = ['draft', 'proposed', 'accepted', 'paid', 'confirmed', 'in_progress', 'completed']
const EVENT_LABELS: Record<string, string> = {
  draft: 'Draft',
  proposed: 'Proposed',
  accepted: 'Accepted',
  paid: 'Deposit Paid',
  confirmed: 'Confirmed',
  in_progress: 'In Progress',
  completed: 'Completed',
}

function buildFunnel(
  countMap: Map<string, number>,
  stageOrder: string[],
  labels: Record<string, string>
): PipelineStage[] {
  const stages: PipelineStage[] = []
  let prevCount: number | null = null

  for (const key of stageOrder) {
    const count = countMap.get(key) ?? 0
    const conversionFromPrev =
      prevCount !== null && prevCount > 0
        ? Math.round((count / prevCount) * 100)
        : null
    const dropoffFromPrev =
      conversionFromPrev !== null ? 100 - conversionFromPrev : null

    stages.push({ key, label: labels[key] ?? key, count, conversionFromPrev, dropoffFromPrev })
    if (count > 0) prevCount = count   // Only update if non-zero to avoid divide-by-zero cascades
  }

  return stages
}

export async function getStageConversionData(): Promise<StageConversionData> {
  const user = await requireChef()
  const supabase = createServerClient()

  const [inquiriesRes, eventsRes] = await Promise.all([
    // Count per status for ALL inquiries (including terminal states)
    supabase
      .from('inquiries')
      .select('status')
      .eq('tenant_id', user.tenantId!),

    supabase
      .from('events')
      .select('status')
      .eq('tenant_id', user.tenantId!),
  ])

  // Build count maps
  const inquiryCountMap = new Map<string, number>()
  for (const row of inquiriesRes.data ?? []) {
    inquiryCountMap.set(row.status, (inquiryCountMap.get(row.status) ?? 0) + 1)
  }

  const eventCountMap = new Map<string, number>()
  for (const row of eventsRes.data ?? []) {
    eventCountMap.set(row.status, (eventCountMap.get(row.status) ?? 0) + 1)
  }

  // Total started = all inquiries ever created (all statuses)
  const inquiryTotalStarted = Array.from(inquiryCountMap.values()).reduce((s, c) => s + c, 0)
  const inquiryTotalConverted = inquiryCountMap.get('confirmed') ?? 0
  const inquiryOverallConversionRate =
    inquiryTotalStarted > 0 ? Math.round((inquiryTotalConverted / inquiryTotalStarted) * 100) : null

  const eventTotalStarted = Array.from(eventCountMap.values()).reduce((s, c) => s + c, 0)
  const eventTotalCompleted = eventCountMap.get('completed') ?? 0
  const eventOverallCompletionRate =
    eventTotalStarted > 0 ? Math.round((eventTotalCompleted / eventTotalStarted) * 100) : null

  return {
    inquiryFunnel: buildFunnel(inquiryCountMap, INQUIRY_STAGE_ORDER, INQUIRY_LABELS),
    eventFunnel: buildFunnel(eventCountMap, EVENT_STAGE_ORDER, EVENT_LABELS),
    inquiryTotalStarted,
    inquiryTotalConverted,
    inquiryOverallConversionRate,
    eventTotalStarted,
    eventTotalCompleted,
    eventOverallCompletionRate,
  }
}
