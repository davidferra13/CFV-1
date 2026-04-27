import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import {
  getFirstWeekActivationProgress,
  type FirstWeekActivationProgress,
} from '@/lib/onboarding/first-week-activation'

export type PilotActivationStepKey =
  | 'first_booking_loop'
  | 'public_booking_ready'
  | 'booking_test_captured'
  | 'event_money_loop'
  | 'feedback_captured'
  | 'pay_intent_recorded'

export type PilotActivationStepStatus = 'done' | 'needs_action' | 'manual'

export type PilotActivationStep = {
  key: PilotActivationStepKey
  label: string
  description: string
  evidence: string
  href: string | null
  status: PilotActivationStepStatus
}

export type PilotActivationFacts = {
  firstWeek: FirstWeekActivationProgress
  bookingEnabled: boolean
  bookingSlug: string | null
  surveysSentCount: number
  surveysCompletedCount: number
  feedbackLoggedCount: number
}

export type PilotActivationStatus = {
  chefName: string
  completedSteps: number
  totalSteps: number
  publicBookingHref: string | null
  steps: PilotActivationStep[]
  nextStep: PilotActivationStep | null
}

function getStepDone(progress: FirstWeekActivationProgress, key: string): boolean {
  return progress.steps.some((step) => step.key === key && step.done)
}

function getStepEvidence(progress: FirstWeekActivationProgress, key: string): string {
  return (
    progress.steps.find((step) => step.key === key)?.evidenceLabel ??
    progress.steps.find((step) => step.key === key)?.description ??
    'No system evidence yet'
  )
}

function countLabel(count: number, singular: string, plural: string): string {
  if (count === 1) return `1 ${singular}`
  return `${count} ${plural}`
}

export function buildPilotActivationStatus(input: {
  chefName: string
  facts: PilotActivationFacts
}): PilotActivationStatus {
  const { chefName, facts } = input
  const publicBookingHref =
    facts.bookingEnabled && facts.bookingSlug ? `/book/${facts.bookingSlug}` : null
  const firstWeekComplete = facts.firstWeek.completedSteps >= facts.firstWeek.totalSteps
  const bookingTestCaptured = getStepDone(facts.firstWeek, 'lead_captured')
  const eventCreated = getStepDone(facts.firstWeek, 'event_created')
  const invoiceReady = getStepDone(facts.firstWeek, 'invoice_ready')
  const feedbackSignals = facts.surveysCompletedCount + facts.feedbackLoggedCount

  const steps: PilotActivationStep[] = [
    {
      key: 'first_booking_loop',
      label: 'Complete the first booking loop',
      description: 'Lead, quote, event, prep, and invoice must be proven with tenant data.',
      evidence: `${facts.firstWeek.completedSteps}/${facts.firstWeek.totalSteps} activation steps complete`,
      href: facts.firstWeek.nextStep?.href ?? '/dashboard',
      status: firstWeekComplete ? 'done' : 'needs_action',
    },
    {
      key: 'public_booking_ready',
      label: 'Make the public booking link testable',
      description: 'The pilot needs a live link a non-developer can open and submit.',
      evidence: publicBookingHref
        ? publicBookingHref
        : 'Booking page is not enabled or has no slug',
      href: publicBookingHref ?? '/settings',
      status: publicBookingHref ? 'done' : 'needs_action',
    },
    {
      key: 'booking_test_captured',
      label: 'Capture a booking test',
      description: 'A public booking test should create a real inquiry or lead record.',
      evidence: getStepEvidence(facts.firstWeek, 'lead_captured'),
      href: '/inquiries',
      status: bookingTestCaptured ? 'done' : 'needs_action',
    },
    {
      key: 'event_money_loop',
      label: 'Reach the event and money loop',
      description: 'The pilot is not useful until an event and billing artifact both exist.',
      evidence:
        eventCreated && invoiceReady
          ? 'Event and invoice evidence found'
          : `${getStepEvidence(facts.firstWeek, 'event_created')}; ${getStepEvidence(
              facts.firstWeek,
              'invoice_ready'
            )}`,
      href: eventCreated ? '/finance/invoices' : '/events/new',
      status: eventCreated && invoiceReady ? 'done' : 'needs_action',
    },
    {
      key: 'feedback_captured',
      label: 'Capture real feedback',
      description: 'Launch proof needs a submitted survey or logged client feedback.',
      evidence:
        feedbackSignals > 0
          ? `${countLabel(facts.surveysCompletedCount, 'completed survey', 'completed surveys')}; ${countLabel(
              facts.feedbackLoggedCount,
              'logged feedback item',
              'logged feedback items'
            )}`
          : `${countLabel(facts.surveysSentCount, 'survey sent', 'surveys sent')}; no completed feedback yet`,
      href: '/surveys',
      status: feedbackSignals > 0 ? 'done' : 'needs_action',
    },
    {
      key: 'pay_intent_recorded',
      label: 'Record pay intent',
      description: 'This stays manual until a dedicated pay-intent field exists.',
      evidence: 'Needs operator interview evidence outside the product database',
      href: null,
      status: 'manual',
    },
  ]

  return {
    chefName,
    completedSteps: steps.filter((step) => step.status === 'done').length,
    totalSteps: steps.length,
    publicBookingHref,
    steps,
    nextStep: steps.find((step) => step.status === 'needs_action') ?? null,
  }
}

function getCount(result: { count: number | null } | null | undefined): number {
  return result?.count ?? 0
}

export async function getPilotActivationStatus(): Promise<PilotActivationStatus> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()
  const firstWeek = await getFirstWeekActivationProgress()

  const [chefRow, surveysSent, surveysCompleted, feedbackLogged] = await Promise.all([
    db
      .from('chefs')
      .select('business_name, display_name, booking_enabled, booking_slug')
      .eq('id', tenantId)
      .single(),
    db
      .from('post_event_surveys')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId),
    db
      .from('post_event_surveys')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .not('completed_at', 'is', null),
    db.from('chef_feedback').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
  ])

  if (chefRow.error) {
    throw chefRow.error
  }

  const chef = chefRow.data
  const chefName =
    chef?.business_name?.trim() || chef?.display_name?.trim() || user.email || 'ChefFlow pilot'

  return buildPilotActivationStatus({
    chefName,
    facts: {
      firstWeek,
      bookingEnabled: chef?.booking_enabled === true,
      bookingSlug: chef?.booking_slug?.trim() || null,
      surveysSentCount: getCount(surveysSent),
      surveysCompletedCount: getCount(surveysCompleted),
      feedbackLoggedCount: getCount(feedbackLogged),
    },
  })
}
