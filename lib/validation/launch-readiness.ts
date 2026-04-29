import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { requireAdmin } from '@/lib/auth/admin'
import { createAdminClient } from '@/lib/db/admin'
import {
  buildFirstWeekActivationProgress,
  type FirstWeekActivationFacts,
} from '@/lib/onboarding/first-week-activation'
import { buildPilotActivationStatus } from '@/lib/pilot/activation'

export type LaunchReadinessStatus = 'verified' | 'needs_action' | 'operator_review'

export type LaunchReadinessCheckKey =
  | 'real_chef_two_weeks'
  | 'public_booking_test'
  | 'first_booking_loop'
  | 'event_money_loop'
  | 'feedback_captured'
  | 'operator_survey'
  | 'onboarding_test'
  | 'build_integrity'
  | 'backup_integrity'

export type LaunchReadinessCheck = {
  key: LaunchReadinessCheckKey
  label: string
  status: LaunchReadinessStatus
  evidence: string
  nextStep: string
  href: string | null
}

export type PilotCandidate = {
  chefId: string
  chefName: string
  createdAt: string | null
  activeSpanDays: number
  publicBookingHref: string | null
  completedSystemSteps: number
  totalSystemSteps: number
  nextStepLabel: string | null
  evidence: {
    inquiries: number
    publicBookingTests: number
    sentQuotes: number
    events: number
    prepSignals: number
    invoiceArtifacts: number
    feedbackSignals: number
    onboardingCompleted: boolean
  }
}

export type LaunchReadinessFacts = {
  generatedAt: string
  pilotCandidates: PilotCandidate[]
  operatorSurvey: {
    activeSurveys: number
    submittedResponses: number
    totalResponses: number
  }
  buildIntegrity: {
    typecheckGreen: boolean
    buildGreen: boolean
    lastVerified: string | null
    commit: string | null
  }
  backupIntegrity: {
    latestStatus: 'success' | 'error' | 'missing'
    latestExecutedAt: string | null
    hoursSinceSuccess: number | null
  }
}

export type LaunchReadinessReport = {
  generatedAt: string
  status: 'ready' | 'blocked'
  verifiedChecks: number
  totalChecks: number
  checks: LaunchReadinessCheck[]
  pilotCandidates: PilotCandidate[]
  evidenceLog: Array<{
    label: string
    value: string
    source: string
    href: string | null
  }>
}

type CountResult = { count: number | null; error?: unknown }

function countFrom(result: CountResult, label: string): number {
  if (result.error) {
    throw new Error(`Launch readiness query failed: ${label}`)
  }
  return result.count ?? 0
}

function countLabel(count: number, singular: string, plural: string): string {
  if (count === 1) return `1 ${singular}`
  return `${count} ${plural}`
}

function daysBetween(start: string | null, endIso: string): number {
  if (!start) return 0
  const startMs = new Date(start).getTime()
  const endMs = new Date(endIso).getTime()
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) return 0
  return Math.floor((endMs - startMs) / 86_400_000)
}

function buildPilotCandidate(input: {
  chefId: string
  chefName: string
  createdAt: string | null
  generatedAt: string
  firstWeekFacts: FirstWeekActivationFacts
  bookingEnabled: boolean
  bookingSlug: string | null
  openBookingTestCount: number
  surveysSentCount: number
  surveysCompletedCount: number
  feedbackLoggedCount: number
}): PilotCandidate {
  const firstWeek = buildFirstWeekActivationProgress(input.firstWeekFacts)
  const pilotStatus = buildPilotActivationStatus({
    chefName: input.chefName,
    facts: {
      firstWeek,
      bookingEnabled: input.bookingEnabled,
      bookingSlug: input.bookingSlug,
      openBookingTestCount: input.openBookingTestCount,
      surveysSentCount: input.surveysSentCount,
      surveysCompletedCount: input.surveysCompletedCount,
      feedbackLoggedCount: input.feedbackLoggedCount,
    },
  })

  return {
    chefId: input.chefId,
    chefName: input.chefName,
    createdAt: input.createdAt,
    activeSpanDays: daysBetween(input.createdAt, input.generatedAt),
    publicBookingHref: pilotStatus.publicBookingHref,
    completedSystemSteps: pilotStatus.completedSteps,
    totalSystemSteps: pilotStatus.totalSteps,
    nextStepLabel: pilotStatus.nextStep?.label ?? null,
    evidence: {
      inquiries: input.firstWeekFacts.inquiriesCount,
      publicBookingTests: input.openBookingTestCount,
      sentQuotes: input.firstWeekFacts.sentQuotesCount,
      events: input.firstWeekFacts.eventsCount,
      prepSignals: input.firstWeekFacts.prepEvidenceCount,
      invoiceArtifacts: input.firstWeekFacts.invoiceArtifactCount,
      feedbackSignals: input.surveysCompletedCount + input.feedbackLoggedCount,
      onboardingCompleted: input.firstWeekFacts.profileBasicsReady && input.firstWeekFacts.serviceSetupReady,
    },
  }
}

function bestPilotCandidate(candidates: PilotCandidate[]): PilotCandidate | null {
  return [...candidates].sort((a, b) => {
    if (b.completedSystemSteps !== a.completedSystemSteps) {
      return b.completedSystemSteps - a.completedSystemSteps
    }
    if (b.evidence.feedbackSignals !== a.evidence.feedbackSignals) {
      return b.evidence.feedbackSignals - a.evidence.feedbackSignals
    }
    if (b.evidence.publicBookingTests !== a.evidence.publicBookingTests) {
      return b.evidence.publicBookingTests - a.evidence.publicBookingTests
    }
    return b.activeSpanDays - a.activeSpanDays
  })[0] ?? null
}

export function buildLaunchReadinessReport(
  facts: LaunchReadinessFacts
): LaunchReadinessReport {
  const bestPilot = bestPilotCandidate(facts.pilotCandidates)
  const publicBookingTests = facts.pilotCandidates.reduce(
    (sum, chef) => sum + chef.evidence.publicBookingTests,
    0
  )
  const feedbackSignals = facts.pilotCandidates.reduce(
    (sum, chef) => sum + chef.evidence.feedbackSignals,
    0
  )
  const moneyLoopCandidates = facts.pilotCandidates.filter(
    (chef) => chef.evidence.events > 0 && chef.evidence.invoiceArtifacts > 0
  )
  const firstBookingLoopCandidates = facts.pilotCandidates.filter(
    (chef) => chef.completedSystemSteps >= 5
  )
  const activeTwoWeekCandidates = facts.pilotCandidates.filter(
    (chef) =>
      chef.activeSpanDays >= 14 &&
      chef.evidence.inquiries + chef.evidence.events + chef.evidence.feedbackSignals > 0
  )
  const onboardingCandidates = facts.pilotCandidates.filter(
    (chef) => chef.evidence.onboardingCompleted || chef.evidence.inquiries > 0 || chef.publicBookingHref
  )
  const backupFresh =
    facts.backupIntegrity.latestStatus === 'success' &&
    facts.backupIntegrity.hoursSinceSuccess !== null &&
    facts.backupIntegrity.hoursSinceSuccess <= 36

  const checks: LaunchReadinessCheck[] = [
    {
      key: 'real_chef_two_weeks',
      label: 'Real chef used ChefFlow for 2 weeks',
      status: activeTwoWeekCandidates.length > 0 ? 'operator_review' : 'needs_action',
      evidence:
        activeTwoWeekCandidates.length > 0
          ? `${countLabel(activeTwoWeekCandidates.length, 'chef has', 'chefs have')} 14+ days of account age plus activity evidence`
          : 'No chef has both 14+ days of account age and activity evidence yet',
      nextStep:
        activeTwoWeekCandidates.length > 0
          ? 'Confirm this is a real non-developer pilot, then record the operator decision.'
          : 'Run one pilot chef through two calendar weeks of real workflow activity.',
      href: '/admin/users',
    },
    {
      key: 'public_booking_test',
      label: 'Public booking tested by a non-developer',
      status: publicBookingTests > 0 ? 'operator_review' : 'needs_action',
      evidence:
        publicBookingTests > 0
          ? countLabel(publicBookingTests, 'public booking inquiry exists', 'public booking inquiries exist')
          : 'No public booking inquiry exists yet',
      nextStep:
        publicBookingTests > 0
          ? 'Confirm the tester was not a developer and that the full handoff worked.'
          : 'Send a chef booking link to a non-developer tester and capture the inquiry.',
      href: bestPilot?.publicBookingHref ?? '/admin/users',
    },
    {
      key: 'first_booking_loop',
      label: 'First booking loop reached system proof',
      status: firstBookingLoopCandidates.length > 0 ? 'verified' : 'needs_action',
      evidence:
        firstBookingLoopCandidates.length > 0
          ? `${firstBookingLoopCandidates[0].chefName} has booking, public test, money, and feedback proof`
          : bestPilot
            ? `${bestPilot.chefName} is at ${bestPilot.completedSystemSteps}/${bestPilot.totalSystemSteps} pilot proof checks`
            : 'No pilot candidate exists yet',
      nextStep:
        firstBookingLoopCandidates.length > 0
          ? 'Keep the pilot warm and collect qualitative feedback.'
          : bestPilot?.nextStepLabel ?? 'Create the first pilot chef and complete the booking loop.',
      href: '/admin/users',
    },
    {
      key: 'event_money_loop',
      label: 'Event and money loop exist',
      status: moneyLoopCandidates.length > 0 ? 'verified' : 'needs_action',
      evidence:
        moneyLoopCandidates.length > 0
          ? `${moneyLoopCandidates[0].chefName} has event and invoice artifacts`
          : 'No chef has both an event and invoice artifact yet',
      nextStep:
        moneyLoopCandidates.length > 0
          ? 'Use the loop in pilot validation instead of adding more finance surface.'
          : 'Create a real event and issue the invoice artifact.',
      href: '/admin/events',
    },
    {
      key: 'feedback_captured',
      label: 'Real feedback captured',
      status: feedbackSignals > 0 ? 'verified' : 'needs_action',
      evidence:
        feedbackSignals > 0
          ? countLabel(feedbackSignals, 'feedback signal exists', 'feedback signals exist')
          : 'No completed survey or logged chef feedback exists yet',
      nextStep:
        feedbackSignals > 0
          ? 'Review the feedback and translate it into launch decisions.'
          : 'Send a post-event survey or log pilot feedback after the first event.',
      href: '/admin/feedback',
    },
    {
      key: 'operator_survey',
      label: 'Wave-1 operator survey has responses',
      status: facts.operatorSurvey.submittedResponses > 0 ? 'operator_review' : 'needs_action',
      evidence:
        facts.operatorSurvey.submittedResponses > 0
          ? `${countLabel(facts.operatorSurvey.submittedResponses, 'submitted survey response', 'submitted survey responses')} across ${countLabel(facts.operatorSurvey.activeSurveys, 'active survey', 'active surveys')}`
          : `${countLabel(facts.operatorSurvey.activeSurveys, 'active survey', 'active surveys')}; no submitted responses yet`,
      nextStep:
        facts.operatorSurvey.submittedResponses > 0
          ? 'Analyze responses and decide which launch claims survive contact with operators.'
          : 'Launch the operator survey and collect responses before expanding the backlog.',
      href: '/admin/beta-surveys',
    },
    {
      key: 'onboarding_test',
      label: 'Onboarding tested with a non-technical user',
      status: onboardingCandidates.length > 0 ? 'operator_review' : 'needs_action',
      evidence:
        onboardingCandidates.length > 0
          ? `${onboardingCandidates[0].chefName} has enough setup evidence to run the onboarding test`
          : 'No chef has enough setup evidence for a meaningful onboarding test yet',
      nextStep:
        onboardingCandidates.length > 0
          ? 'Watch a non-technical user complete onboarding and record the friction points.'
          : 'Prepare one pilot chef profile and public booking surface for a watched onboarding run.',
      href: '/admin/users',
    },
    {
      key: 'build_integrity',
      label: 'Build integrity is green',
      status:
        facts.buildIntegrity.typecheckGreen && facts.buildIntegrity.buildGreen
          ? 'verified'
          : 'needs_action',
      evidence:
        facts.buildIntegrity.typecheckGreen && facts.buildIntegrity.buildGreen
          ? `Type check and build green${facts.buildIntegrity.lastVerified ? ` as of ${facts.buildIntegrity.lastVerified}` : ''}`
          : 'Build-state file does not show both type check and build as green',
      nextStep:
        facts.buildIntegrity.typecheckGreen && facts.buildIntegrity.buildGreen
          ? 'Re-run release validation before shipping, not before every pilot learning step.'
          : 'Run the approved verification flow and update build state after it passes.',
      href: '/admin/system',
    },
    {
      key: 'backup_integrity',
      label: 'Database backup heartbeat is fresh',
      status: backupFresh ? 'verified' : 'needs_action',
      evidence: backupFresh
        ? `Latest backup heartbeat succeeded ${facts.backupIntegrity.hoursSinceSuccess} hours ago`
        : facts.backupIntegrity.latestExecutedAt
          ? `Latest backup heartbeat is ${facts.backupIntegrity.latestStatus} at ${facts.backupIntegrity.latestExecutedAt}`
          : 'No backup heartbeat found in cron executions',
      nextStep: backupFresh
        ? 'Keep backup monitoring active through launch.'
        : 'Run or repair the approved backup heartbeat path before launch.',
      href: '/admin/system',
    },
  ]

  const verifiedChecks = checks.filter((check) => check.status === 'verified').length

  return {
    generatedAt: facts.generatedAt,
    status: checks.every((check) => check.status === 'verified') ? 'ready' : 'blocked',
    verifiedChecks,
    totalChecks: checks.length,
    checks,
    pilotCandidates: facts.pilotCandidates,
    evidenceLog: [
      {
        label: 'Best pilot candidate',
        value: bestPilot
          ? `${bestPilot.chefName}: ${bestPilot.completedSystemSteps}/${bestPilot.totalSystemSteps} system checks`
          : 'No pilot candidate yet',
        source: 'chefs plus first-week activation evidence',
        href: '/admin/users',
      },
      {
        label: 'Public booking tests',
        value: countLabel(publicBookingTests, 'test', 'tests'),
        source: 'open_booking_inquiries',
        href: bestPilot?.publicBookingHref ?? null,
      },
      {
        label: 'Feedback signals',
        value: countLabel(feedbackSignals, 'signal', 'signals'),
        source: 'post_event_surveys and chef_feedback',
        href: '/admin/feedback',
      },
      {
        label: 'Operator survey responses',
        value: countLabel(facts.operatorSurvey.submittedResponses, 'response', 'responses'),
        source: 'beta_survey_responses',
        href: '/admin/beta-surveys',
      },
      {
        label: 'Backup heartbeat',
        value:
          facts.backupIntegrity.latestStatus === 'missing'
            ? 'No heartbeat'
            : `${facts.backupIntegrity.latestStatus} at ${facts.backupIntegrity.latestExecutedAt}`,
        source: 'cron_executions',
        href: '/admin/system',
      },
    ],
  }
}

async function count(db: any, table: string, label: string, apply: (query: any) => any) {
  const query = db.from(table).select('id', { count: 'exact', head: true })
  return countFrom(await apply(query), label)
}

async function loadPilotCandidate(db: any, chef: any, generatedAt: string): Promise<PilotCandidate> {
  const chefId = String(chef.id)
  const [
    pricingConfig,
    serviceTypes,
    bookingEventTypes,
    inquiries,
    clients,
    sentQuotes,
    events,
    prepBlocks,
    eventMenus,
    prepStartedEvents,
    invoicedEvents,
    recurringInvoiceHistory,
    loyaltyConfig,
    recipes,
    staff,
    openBookingTests,
    surveysSent,
    surveysCompleted,
    feedbackLogged,
  ] = await Promise.all([
    count(db, 'chef_pricing_config', 'chef pricing config', (q) => q.eq('chef_id', chefId)),
    count(db, 'chef_service_types', 'chef service types', (q) =>
      q.eq('tenant_id', chefId).eq('is_active', true)
    ),
    count(db, 'booking_event_types', 'booking event types', (q) =>
      q.eq('chef_id', chefId).eq('is_active', true)
    ),
    count(db, 'inquiries', 'inquiries', (q) => q.eq('tenant_id', chefId).is('deleted_at', null)),
    count(db, 'clients', 'clients', (q) => q.eq('tenant_id', chefId)),
    count(db, 'quotes', 'sent quotes', (q) =>
      q
        .eq('tenant_id', chefId)
        .in('status', ['sent', 'accepted', 'rejected', 'expired'])
        .is('deleted_at', null)
    ),
    count(db, 'events', 'events', (q) => q.eq('tenant_id', chefId).is('deleted_at', null)),
    count(db, 'event_prep_blocks', 'prep blocks', (q) => q.eq('chef_id', chefId)),
    count(db, 'menus', 'event menus', (q) =>
      q.eq('tenant_id', chefId).not('event_id', 'is', null).is('deleted_at', null)
    ),
    count(db, 'events', 'prep started events', (q) =>
      q.eq('tenant_id', chefId).not('prep_started_at', 'is', null).is('deleted_at', null)
    ),
    count(db, 'events', 'invoiced events', (q) =>
      q.eq('tenant_id', chefId).not('invoice_number', 'is', null).is('deleted_at', null)
    ),
    count(db, 'recurring_invoice_history', 'recurring invoice history', (q) =>
      q.eq('chef_id', chefId).in('status', ['sent', 'paid', 'overdue'])
    ),
    db.from('loyalty_config').select('is_active').eq('tenant_id', chefId).maybeSingle(),
    count(db, 'recipes', 'recipes', (q) => q.eq('tenant_id', chefId).eq('archived', false)),
    count(db, 'staff_members', 'staff members', (q) => q.eq('chef_id', chefId)),
    count(db, 'open_booking_inquiries', 'open booking inquiries', (q) => q.eq('chef_id', chefId)),
    count(db, 'post_event_surveys', 'post-event surveys sent', (q) => q.eq('tenant_id', chefId)),
    count(db, 'post_event_surveys', 'post-event surveys completed', (q) =>
      q.eq('tenant_id', chefId).not('completed_at', 'is', null)
    ),
    count(db, 'chef_feedback', 'chef feedback', (q) => q.eq('tenant_id', chefId)),
  ])

  if (loyaltyConfig.error) {
    throw new Error('Launch readiness query failed: loyalty config')
  }

  const profileBasicsReady =
    Boolean(chef.business_name && chef.display_name) || Boolean(chef.onboarding_completed_at)
  const bookingSurfaceReady = Boolean(
    chef.booking_enabled &&
      chef.booking_slug &&
      (chef.booking_base_price_cents || chef.booking_headline || chef.booking_bio_short)
  )
  const serviceSetupReady =
    pricingConfig > 0 || serviceTypes > 0 || bookingEventTypes > 0 || bookingSurfaceReady

  return buildPilotCandidate({
    chefId,
    chefName: chef.business_name?.trim() || chef.display_name?.trim() || chef.email || 'Unnamed chef',
    createdAt: chef.created_at ?? null,
    generatedAt,
    firstWeekFacts: {
      profileBasicsReady,
      serviceSetupReady,
      inquiriesCount: inquiries,
      clientsCount: clients,
      sentQuotesCount: sentQuotes,
      eventsCount: events,
      prepEvidenceCount: prepBlocks + eventMenus + prepStartedEvents,
      invoiceArtifactCount: invoicedEvents + recurringInvoiceHistory,
      recipesCount: recipes,
      loyaltyConfigured: loyaltyConfig.data !== null,
      staffCount: staff,
    },
    bookingEnabled: chef.booking_enabled === true,
    bookingSlug: chef.booking_slug?.trim() || null,
    openBookingTestCount: openBookingTests,
    surveysSentCount: surveysSent,
    surveysCompletedCount: surveysCompleted,
    feedbackLoggedCount: feedbackLogged,
  })
}

async function loadBuildIntegrity() {
  try {
    const file = await readFile(path.join(process.cwd(), 'docs', 'build-state.md'), 'utf8')
    const currentRow = file.match(/\|\s*`npx tsc --noEmit --skipLibCheck`\s*\|\s*(\w+)\s*\|\s*([^|]+)\|\s*([^|]+)\|/)
    const buildRow = file.match(/\|\s*`npm run build -- --no-lint`[^|]*\|\s*(\w+)\s*\|\s*([^|]+)\|\s*([^|]+)\|/)

    return {
      typecheckGreen: currentRow?.[1]?.trim() === 'green',
      buildGreen: buildRow?.[1]?.trim() === 'green',
      lastVerified: buildRow?.[2]?.trim() || currentRow?.[2]?.trim() || null,
      commit: buildRow?.[3]?.trim() || currentRow?.[3]?.trim() || null,
    }
  } catch {
    return {
      typecheckGreen: false,
      buildGreen: false,
      lastVerified: null,
      commit: null,
    }
  }
}

async function loadOperatorSurveyFacts(db: any) {
  const activeSurveys = countFrom(
    await db
      .from('beta_survey_definitions')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true),
    'active beta surveys'
  )
  const totalResponses = countFrom(
    await db.from('beta_survey_responses').select('id', { count: 'exact', head: true }),
    'beta survey responses'
  )
  const submittedResponses = countFrom(
    await db
      .from('beta_survey_responses')
      .select('id', { count: 'exact', head: true })
      .not('submitted_at', 'is', null),
    'submitted beta survey responses'
  )

  return { activeSurveys, totalResponses, submittedResponses }
}

async function loadBackupIntegrity(db: any, generatedAt: string) {
  const { data, error } = await db
    .from('cron_executions')
    .select('cron_name, status, executed_at')
    .eq('cron_name', 'db-backup')
    .order('executed_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    throw new Error('Launch readiness query failed: backup heartbeat')
  }

  if (!data) {
    return {
      latestStatus: 'missing' as const,
      latestExecutedAt: null,
      hoursSinceSuccess: null,
    }
  }

  const executedAt = typeof data.executed_at === 'string' ? data.executed_at : null
  const latestStatus: 'success' | 'error' = data.status === 'success' ? 'success' : 'error'
  const hoursSinceSuccess =
    latestStatus === 'success' && executedAt
      ? Math.floor((new Date(generatedAt).getTime() - new Date(executedAt).getTime()) / 3_600_000)
      : null

  return {
    latestStatus,
    latestExecutedAt: executedAt,
    hoursSinceSuccess,
  }
}

export async function getLaunchReadinessReport(): Promise<LaunchReadinessReport> {
  await requireAdmin()
  const db: any = createAdminClient()
  const generatedAt = new Date().toISOString()

  const { data: chefs, error } = await db
    .from('chefs')
    .select(
      'id, email, display_name, business_name, created_at, onboarding_completed_at, booking_enabled, booking_slug, booking_base_price_cents, booking_headline, booking_bio_short'
    )
    .order('created_at', { ascending: true })

  if (error) {
    throw new Error('Launch readiness query failed: chefs')
  }

  const [pilotCandidates, operatorSurvey, buildIntegrity, backupIntegrity] = await Promise.all([
    Promise.all((chefs ?? []).map((chef: any) => loadPilotCandidate(db, chef, generatedAt))),
    loadOperatorSurveyFacts(db),
    loadBuildIntegrity(),
    loadBackupIntegrity(db, generatedAt),
  ])

  return buildLaunchReadinessReport({
    generatedAt,
    pilotCandidates,
    operatorSurvey,
    buildIntegrity,
    backupIntegrity,
  })
}
