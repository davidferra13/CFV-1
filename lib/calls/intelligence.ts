export type CallIntelligenceSource = 'scheduled_calls' | 'ai_calls' | 'supplier_calls'

export type CallIntelligenceUrgency = 'critical' | 'high' | 'normal'

export type CallIntelligenceSourceError = {
  source: CallIntelligenceSource
  error: string
}

export type CallIntelligenceHumanCall = {
  id: string
  client_id: string | null
  contact_name: string | null
  contact_phone: string | null
  contact_company: string | null
  call_type: string
  scheduled_at: string
  duration_minutes: number | null
  status: string
  outcome_summary: string | null
  call_notes: string | null
  next_action: string | null
  next_action_due_at: string | null
  actual_duration_minutes: number | null
  completed_at: string | null
  created_at: string
}

export type CallIntelligenceAiCall = {
  id: string
  direction: string | null
  role: string | null
  contact_phone: string | null
  contact_name: string | null
  subject: string | null
  status: string | null
  result: string | null
  full_transcript: string | null
  extracted_data: unknown
  action_log: unknown
  recording_url: string | null
  duration_seconds: number | null
  created_at: string
}

export type CallIntelligenceSupplierCall = {
  id: string
  vendor_name: string | null
  vendor_phone: string | null
  ingredient_name: string | null
  status: string | null
  result: string | null
  duration_seconds: number | null
  recording_url: string | null
  speech_transcript: string | null
  created_at: string
}

export type CallIntelligenceIntervention = {
  id: string
  source: 'scheduled_call' | 'ai_call' | 'supplier_call'
  label: string
  target: string
  reason: string
  urgency: CallIntelligenceUrgency
  href: string
  nextStep: string
  evidence: string | null
}

export type CallIntelligenceLifecycleStep = {
  id: string
  source: 'scheduled_call' | 'ai_call' | 'supplier_call'
  target: string
  occurredAt: string
  trigger: string
  action: string
  result: string
  stateChange: string
  nextStep: string
  href: string
  evidence: string | null
}

export type CallIntelligenceSlaStatus = 'overdue' | 'due_now' | 'upcoming'

export type CallIntelligenceSlaItem = {
  id: string
  source: 'scheduled_call' | 'ai_call' | 'supplier_call'
  target: string
  rule: string
  dueAt: string
  status: CallIntelligenceSlaStatus
  urgency: CallIntelligenceUrgency
  minutesUntilDue: number
  href: string
  nextStep: string
}

export type CallIntelligenceSnapshot = {
  generatedAt: string
  sourceErrors: CallIntelligenceSourceError[]
  stats: {
    humanScheduled: number | null
    humanCompleted: number | null
    humanMissed: number | null
    humanOverdue: number | null
    aiCalls: number | null
    supplierCalls: number | null
    totalVoiceRecords: number | null
    recordings: number | null
    transcripts: number | null
    outcomesLogged: number | null
    averageHumanDurationMinutes: number | null
    averageVoiceDurationSeconds: number | null
  }
  humanInterventions: CallIntelligenceIntervention[]
  slaQueue: CallIntelligenceSlaItem[]
  lifecycleTrace: CallIntelligenceLifecycleStep[]
  automationCoverage: {
    aiAllowedOnlyFor: string
    voiceRecordsWithRecordings: number | null
    voiceRecordsWithTranscripts: number | null
    voiceRecordsMissingTranscripts: number | null
    humanCallsMissingOutcomes: number | null
  }
  engineGaps: string[]
}

export type BuildCallIntelligenceSnapshotInput = {
  now?: Date
  humanCalls?: CallIntelligenceHumanCall[] | null
  aiCalls?: CallIntelligenceAiCall[] | null
  supplierCalls?: CallIntelligenceSupplierCall[] | null
  sourceErrors?: CallIntelligenceSourceError[]
}

const FAILED_STATUSES = new Set(['failed', 'no_answer', 'busy', 'cancelled'])

export function buildCallIntelligenceSnapshot(
  input: BuildCallIntelligenceSnapshotInput
): CallIntelligenceSnapshot {
  const now = input.now ?? new Date()
  const sourceErrors = input.sourceErrors ?? []
  const failedSources = new Set(sourceErrors.map((error) => error.source))
  const humanCalls = input.humanCalls ?? []
  const aiCalls = input.aiCalls ?? []
  const supplierCalls = input.supplierCalls ?? []

  const humanInterventions = [
    ...buildHumanCallInterventions(humanCalls, now),
    ...buildAiCallInterventions(aiCalls),
    ...buildSupplierCallInterventions(supplierCalls),
  ]
    .sort((a, b) => urgencyRank(b.urgency) - urgencyRank(a.urgency))
    .slice(0, 8)
  const slaQueue = [
    ...buildHumanCallSla(humanCalls, now),
    ...buildAiCallSla(aiCalls, now),
    ...buildSupplierCallSla(supplierCalls, now),
  ]
    .sort(compareSlaItems)
    .slice(0, 10)
  const lifecycleTrace = [
    ...buildHumanCallLifecycle(humanCalls, now),
    ...buildAiCallLifecycle(aiCalls),
    ...buildSupplierCallLifecycle(supplierCalls),
  ]
    .sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt))
    .slice(0, 10)

  const humanCompleted = humanCalls.filter((call) => call.status === 'completed')
  const humanMissed = humanCalls.filter((call) => call.status === 'no_show')
  const humanOverdue = humanCalls.filter(
    (call) =>
      (call.status === 'scheduled' || call.status === 'confirmed') &&
      Date.parse(call.scheduled_at) < now.getTime()
  )
  const humanCallsMissingOutcomes = humanCompleted.filter((call) => !hasHumanOutcome(call))
  const voiceRecords = [
    ...aiCalls.map((call) => ({
      transcript: call.full_transcript,
      recording: call.recording_url,
      duration: call.duration_seconds,
    })),
    ...supplierCalls.map((call) => ({
      transcript: call.speech_transcript,
      recording: call.recording_url,
      duration: call.duration_seconds,
    })),
  ]
  const voiceRecordsWithRecordings = voiceRecords.filter((call) => hasText(call.recording)).length
  const voiceRecordsWithTranscripts = voiceRecords.filter((call) => hasText(call.transcript)).length
  const voiceDurations = [...aiCalls, ...supplierCalls]
    .map((call) => call.duration_seconds)
    .filter((duration): duration is number => typeof duration === 'number' && duration > 0)
  const humanDurations = humanCalls
    .map((call) => call.actual_duration_minutes)
    .filter((duration): duration is number => typeof duration === 'number' && duration > 0)

  const engineGaps: string[] = []
  if (humanCalls.length > 0) {
    engineGaps.push('Human scheduled calls do not yet store call recordings or transcripts.')
  }
  if (voiceRecords.length > voiceRecordsWithTranscripts) {
    engineGaps.push('Some AI or vendor voice records are missing transcripts.')
  }
  if (sourceErrors.length > 0) {
    engineGaps.push('One or more call data sources could not be read for this snapshot.')
  }
  engineGaps.push('The human versus automation decision record is computed live, not persisted yet.')

  return {
    generatedAt: now.toISOString(),
    sourceErrors,
    stats: {
      humanScheduled: nullableCount(humanCalls.length, failedSources.has('scheduled_calls')),
      humanCompleted: nullableCount(humanCompleted.length, failedSources.has('scheduled_calls')),
      humanMissed: nullableCount(humanMissed.length, failedSources.has('scheduled_calls')),
      humanOverdue: nullableCount(humanOverdue.length, failedSources.has('scheduled_calls')),
      aiCalls: nullableCount(aiCalls.length, failedSources.has('ai_calls')),
      supplierCalls: nullableCount(supplierCalls.length, failedSources.has('supplier_calls')),
      totalVoiceRecords: nullableCount(
        aiCalls.length + supplierCalls.length,
        failedSources.has('ai_calls') || failedSources.has('supplier_calls')
      ),
      recordings: nullableCount(
        voiceRecordsWithRecordings,
        failedSources.has('ai_calls') || failedSources.has('supplier_calls')
      ),
      transcripts: nullableCount(
        voiceRecordsWithTranscripts,
        failedSources.has('ai_calls') || failedSources.has('supplier_calls')
      ),
      outcomesLogged: nullableCount(
        humanCompleted.length - humanCallsMissingOutcomes.length,
        failedSources.has('scheduled_calls')
      ),
      averageHumanDurationMinutes: average(humanDurations),
      averageVoiceDurationSeconds: average(voiceDurations),
    },
    humanInterventions,
    slaQueue,
    lifecycleTrace,
    automationCoverage: {
      aiAllowedOnlyFor:
        'Vendor, supplier, venue, delivery, and business contact calls. Client calls stay human-led.',
      voiceRecordsWithRecordings: nullableCount(
        voiceRecordsWithRecordings,
        failedSources.has('ai_calls') || failedSources.has('supplier_calls')
      ),
      voiceRecordsWithTranscripts: nullableCount(
        voiceRecordsWithTranscripts,
        failedSources.has('ai_calls') || failedSources.has('supplier_calls')
      ),
      voiceRecordsMissingTranscripts: nullableCount(
        voiceRecords.length - voiceRecordsWithTranscripts,
        failedSources.has('ai_calls') || failedSources.has('supplier_calls')
      ),
      humanCallsMissingOutcomes: nullableCount(
        humanCallsMissingOutcomes.length,
        failedSources.has('scheduled_calls')
      ),
    },
    engineGaps,
  }
}

function buildHumanCallInterventions(
  calls: CallIntelligenceHumanCall[],
  now: Date
): CallIntelligenceIntervention[] {
  return calls.flatMap((call) => {
    const target = humanTarget(call)
    const href = `/calls/${call.id}`
    const interventions: CallIntelligenceIntervention[] = []
    const scheduledAt = Date.parse(call.scheduled_at)
    const nextActionDueAt = call.next_action_due_at ? Date.parse(call.next_action_due_at) : null

    if (
      (call.status === 'scheduled' || call.status === 'confirmed') &&
      Number.isFinite(scheduledAt) &&
      scheduledAt < now.getTime()
    ) {
      interventions.push({
        id: `scheduled-overdue-${call.id}`,
        source: 'scheduled_call',
        label: 'Overdue human call',
        target,
        reason: 'A scheduled human touchpoint is past due.',
        urgency: 'critical',
        href,
        nextStep: 'Call now or reschedule the client-facing touchpoint.',
        evidence: call.call_type.replace(/_/g, ' '),
      })
    }

    if (call.status === 'no_show') {
      interventions.push({
        id: `scheduled-no-show-${call.id}`,
        source: 'scheduled_call',
        label: 'Missed call recovery',
        target,
        reason: 'A call was marked no-show and needs a recovery attempt.',
        urgency: 'high',
        href,
        nextStep: 'Send a recovery message and schedule a new call.',
        evidence: call.call_type.replace(/_/g, ' '),
      })
    }

    if (call.status === 'completed' && !hasHumanOutcome(call)) {
      interventions.push({
        id: `scheduled-missing-outcome-${call.id}`,
        source: 'scheduled_call',
        label: 'Outcome missing',
        target,
        reason: 'The call is complete but the result was not logged.',
        urgency: 'normal',
        href,
        nextStep: 'Log outcome, notes, next action, and due date.',
        evidence: call.completed_at ?? call.scheduled_at,
      })
    }

    if (
      call.status === 'completed' &&
      nextActionDueAt !== null &&
      Number.isFinite(nextActionDueAt) &&
      nextActionDueAt < now.getTime()
    ) {
      interventions.push({
        id: `scheduled-next-action-${call.id}`,
        source: 'scheduled_call',
        label: 'Follow-up due',
        target,
        reason: 'The logged next action is due now.',
        urgency: 'high',
        href,
        nextStep: call.next_action ?? 'Complete the promised follow-up.',
        evidence: call.next_action_due_at,
      })
    }

    return interventions
  })
}

function buildAiCallInterventions(calls: CallIntelligenceAiCall[]): CallIntelligenceIntervention[] {
  return calls.flatMap((call) => {
    const decisionText = JSON.stringify(call.extracted_data ?? call.action_log ?? {})
    const target = call.contact_name ?? call.contact_phone ?? call.subject ?? 'Voice contact'
    const href = '/culinary/call-sheet?tab=log'
    const interventions: CallIntelligenceIntervention[] = []

    if (call.direction === 'inbound' || call.role?.includes('inbound')) {
      interventions.push({
        id: `ai-inbound-${call.id}`,
        source: 'ai_call',
        label: 'Inbound voice review',
        target,
        reason: 'A voice message came in and should be reviewed by a human.',
        urgency: hasText(call.full_transcript) ? 'high' : 'critical',
        href,
        nextStep: 'Review transcript and recording, then decide whether to call back.',
        evidence: transcriptEvidence(call.full_transcript, call.subject),
      })
    }

    if (decisionText.includes('escalat') || decisionText.includes('human')) {
      interventions.push({
        id: `ai-escalation-${call.id}`,
        source: 'ai_call',
        label: 'AI escalation',
        target,
        reason: 'The voice agent recorded a human intervention signal.',
        urgency: 'critical',
        href,
        nextStep: 'Review the call and take ownership of the next response.',
        evidence: trimEvidence(decisionText),
      })
    }

    if (call.status && FAILED_STATUSES.has(call.status)) {
      interventions.push({
        id: `ai-failed-${call.id}`,
        source: 'ai_call',
        label: 'Automation failed',
        target,
        reason: 'An automated business-contact call did not complete.',
        urgency: 'normal',
        href,
        nextStep: 'Retry through the Voice Hub or switch to a human call.',
        evidence: call.status,
      })
    }

    return interventions
  })
}

function buildSupplierCallInterventions(
  calls: CallIntelligenceSupplierCall[]
): CallIntelligenceIntervention[] {
  return calls.flatMap((call) => {
    const target = call.vendor_name ?? call.vendor_phone ?? 'Supplier'
    const href = '/culinary/call-sheet?tab=log'
    const interventions: CallIntelligenceIntervention[] = []

    if (call.status && FAILED_STATUSES.has(call.status)) {
      interventions.push({
        id: `supplier-failed-${call.id}`,
        source: 'supplier_call',
        label: 'Supplier call failed',
        target,
        reason: 'A supplier availability call did not complete.',
        urgency: 'normal',
        href,
        nextStep: 'Retry the supplier or choose another source.',
        evidence: ingredientEvidence(call),
      })
    }

    if (call.result === 'no') {
      interventions.push({
        id: `supplier-no-${call.id}`,
        source: 'supplier_call',
        label: 'Ingredient unavailable',
        target,
        reason: 'A supplier said the requested ingredient was not available.',
        urgency: 'normal',
        href,
        nextStep: 'Choose an alternate supplier or update the sourcing plan.',
        evidence: ingredientEvidence(call),
      })
    }

    return interventions
  })
}

function buildHumanCallSla(
  calls: CallIntelligenceHumanCall[],
  now: Date
): CallIntelligenceSlaItem[] {
  return calls.flatMap((call) => {
    const target = humanTarget(call)
    const href = `/calls/${call.id}`
    const items: CallIntelligenceSlaItem[] = []

    if (call.status === 'scheduled' || call.status === 'confirmed') {
      items.push(
        createSlaItem({
          id: `human-call-time-${call.id}`,
          source: 'scheduled_call',
          target,
          rule: 'Complete scheduled human calls at the committed call time.',
          dueAt: call.scheduled_at,
          now,
          href,
          nextStep: 'Call now, join the scheduled call, or reschedule with the contact.',
        })
      )
    }

    if (call.status === 'completed' && !hasHumanOutcome(call)) {
      items.push(
        createSlaItem({
          id: `human-outcome-${call.id}`,
          source: 'scheduled_call',
          target,
          rule: 'Log human call outcomes within two hours of completion.',
          dueAt: addMinutesIso(call.completed_at ?? call.scheduled_at, 120),
          now,
          href,
          nextStep: 'Log outcome, notes, next action, and due date.',
        })
      )
    }

    if (call.status === 'completed' && call.next_action_due_at) {
      items.push(
        createSlaItem({
          id: `human-next-action-${call.id}`,
          source: 'scheduled_call',
          target,
          rule: 'Complete promised call follow-ups by the logged due date.',
          dueAt: call.next_action_due_at,
          now,
          href,
          nextStep: call.next_action ?? 'Complete the promised follow-up.',
        })
      )
    }

    if (call.status === 'no_show') {
      items.push(
        createSlaItem({
          id: `human-no-show-${call.id}`,
          source: 'scheduled_call',
          target,
          rule: 'Recover missed calls within thirty minutes.',
          dueAt: addMinutesIso(call.scheduled_at, 30),
          now,
          href,
          nextStep: 'Send a recovery message and schedule a new call.',
        })
      )
    }

    return items
  })
}

function buildAiCallSla(
  calls: CallIntelligenceAiCall[],
  now: Date
): CallIntelligenceSlaItem[] {
  return calls.flatMap((call) => {
    const isInbound = call.direction === 'inbound' || call.role?.includes('inbound')
    const decisionText = JSON.stringify(call.extracted_data ?? call.action_log ?? {})
    const hasEscalation = decisionText.includes('escalat') || decisionText.includes('human')
    if (!isInbound && !hasEscalation) return []

    const target = call.contact_name ?? call.contact_phone ?? call.subject ?? 'Voice contact'
    return [
      createSlaItem({
        id: `ai-review-${call.id}`,
        source: 'ai_call',
        target,
        rule: hasEscalation
          ? 'Review AI voice escalations immediately.'
          : 'Review inbound voice messages within one hour.',
        dueAt: hasEscalation ? call.created_at : addMinutesIso(call.created_at, 60),
        now,
        href: '/culinary/call-sheet?tab=inbox',
        nextStep: 'Review transcript and recording, then decide whether a callback is needed.',
      }),
    ]
  })
}

function buildSupplierCallSla(
  calls: CallIntelligenceSupplierCall[],
  now: Date
): CallIntelligenceSlaItem[] {
  return calls.flatMap((call) => {
    const failed = Boolean(call.status && FAILED_STATUSES.has(call.status))
    const unavailable = call.result === 'no'
    if (!failed && !unavailable) return []

    const target = call.vendor_name ?? call.vendor_phone ?? 'Supplier'
    return [
      createSlaItem({
        id: `supplier-resolution-${call.id}`,
        source: 'supplier_call',
        target,
        rule: unavailable
          ? 'Resolve ingredient unavailability within four hours.'
          : 'Retry or replace failed supplier calls within four hours.',
        dueAt: addMinutesIso(call.created_at, 240),
        now,
        href: '/culinary/call-sheet?tab=log',
        nextStep: unavailable
          ? 'Choose an alternate supplier or update the sourcing plan.'
          : 'Retry the supplier or switch to a human follow-up.',
      }),
    ]
  })
}

function buildHumanCallLifecycle(
  calls: CallIntelligenceHumanCall[],
  now: Date
): CallIntelligenceLifecycleStep[] {
  return calls.map((call) => {
    const target = humanTarget(call)
    const href = `/calls/${call.id}`
    const scheduledAt = Date.parse(call.scheduled_at)
    const isPastDue =
      (call.status === 'scheduled' || call.status === 'confirmed') &&
      Number.isFinite(scheduledAt) &&
      scheduledAt < now.getTime()

    if (call.status === 'completed') {
      return {
        id: `human-lifecycle-${call.id}`,
        source: 'scheduled_call',
        target,
        occurredAt: call.completed_at ?? call.scheduled_at,
        trigger: 'A human call reached completion.',
        action: 'Capture the conversation as an outcome, notes, duration, and next action.',
        result: call.outcome_summary ?? call.call_notes ?? 'No outcome has been logged yet.',
        stateChange: call.completed_at
          ? `Call moved to completed at ${call.completed_at}.`
          : 'Call is marked completed.',
        nextStep: call.next_action ?? 'Log the missing outcome and decide the next action.',
        href,
        evidence: call.next_action_due_at ?? call.actual_duration_minutes?.toString() ?? null,
      }
    }

    if (call.status === 'no_show') {
      return {
        id: `human-lifecycle-${call.id}`,
        source: 'scheduled_call',
        target,
        occurredAt: call.scheduled_at,
        trigger: 'The contact missed the scheduled human call.',
        action: 'Recover the touchpoint instead of letting the client cycle stall.',
        result: 'Call marked no-show.',
        stateChange: 'Call moved to no-show.',
        nextStep: 'Send a recovery message and schedule a new call.',
        href,
        evidence: call.call_type.replace(/_/g, ' '),
      }
    }

    return {
      id: `human-lifecycle-${call.id}`,
      source: 'scheduled_call',
      target,
      occurredAt: call.scheduled_at,
      trigger: isPastDue
        ? 'A scheduled human touchpoint is past due.'
        : 'A human touchpoint is scheduled.',
      action: 'Prepare the agenda and complete the call at the committed time.',
      result: `Call is currently ${call.status.replace(/_/g, ' ')}.`,
      stateChange: isPastDue ? 'No completion state has been recorded.' : 'Call is still active.',
      nextStep: isPastDue
        ? 'Call now or reschedule the client-facing touchpoint.'
        : 'Use the prep checklist, then log the outcome after the call.',
      href,
      evidence: call.call_type.replace(/_/g, ' '),
    }
  })
}

function buildAiCallLifecycle(calls: CallIntelligenceAiCall[]): CallIntelligenceLifecycleStep[] {
  return calls.map((call) => {
    const decisionText = JSON.stringify(call.extracted_data ?? call.action_log ?? {})
    const target = call.contact_name ?? call.contact_phone ?? call.subject ?? 'Voice contact'
    const isInbound = call.direction === 'inbound' || call.role?.includes('inbound')
    const hasEscalation = decisionText.includes('escalat') || decisionText.includes('human')
    const hasTranscript = hasText(call.full_transcript)

    return {
      id: `ai-lifecycle-${call.id}`,
      source: 'ai_call',
      target,
      occurredAt: call.created_at,
      trigger: isInbound
        ? 'A voice message or inbound call reached the AI voice path.'
        : 'A permitted business-contact voice task used automation.',
      action: 'Record the call, transcript, status, and any extracted handoff signal.',
      result: hasTranscript
        ? 'Transcript captured.'
        : `Voice record status is ${call.status ?? 'unknown'}.`,
      stateChange: call.status
        ? `AI voice record moved to ${call.status}.`
        : 'AI voice record has no final status yet.',
      nextStep: hasEscalation
        ? 'Human should review the transcript and take over the next response.'
        : isInbound
          ? 'Review transcript and recording, then decide whether to call back.'
          : 'Use the result in the sourcing or coordination workflow.',
      href: '/culinary/call-sheet?tab=log',
      evidence: transcriptEvidence(call.full_transcript, call.subject),
    }
  })
}

function buildSupplierCallLifecycle(
  calls: CallIntelligenceSupplierCall[]
): CallIntelligenceLifecycleStep[] {
  return calls.map((call) => {
    const target = call.vendor_name ?? call.vendor_phone ?? 'Supplier'
    const resultLabel = call.result
      ? `Supplier result: ${call.result}.`
      : `Supplier call status is ${call.status ?? 'unknown'}.`

    return {
      id: `supplier-lifecycle-${call.id}`,
      source: 'supplier_call',
      target,
      occurredAt: call.created_at,
      trigger: 'A vendor or supplier availability task needed a voice check.',
      action: 'Call the supplier and capture status, transcript, recording, and result.',
      result: resultLabel,
      stateChange: call.status
        ? `Supplier call moved to ${call.status}.`
        : 'Supplier call has no final status yet.',
      nextStep:
        call.result === 'no'
          ? 'Choose an alternate supplier or update the sourcing plan.'
          : 'Use the supplier result in procurement planning.',
      href: '/culinary/call-sheet?tab=log',
      evidence: ingredientEvidence(call),
    }
  })
}

function createSlaItem(params: {
  id: string
  source: CallIntelligenceSlaItem['source']
  target: string
  rule: string
  dueAt: string
  now: Date
  href: string
  nextStep: string
}): CallIntelligenceSlaItem {
  const dueMs = Date.parse(params.dueAt)
  const minutesUntilDue = Number.isFinite(dueMs)
    ? Math.round((dueMs - params.now.getTime()) / 60_000)
    : 0
  const status: CallIntelligenceSlaStatus =
    minutesUntilDue < 0 ? 'overdue' : minutesUntilDue <= 60 ? 'due_now' : 'upcoming'
  const urgency: CallIntelligenceUrgency =
    status === 'overdue' ? 'critical' : status === 'due_now' ? 'high' : 'normal'

  return {
    id: params.id,
    source: params.source,
    target: params.target,
    rule: params.rule,
    dueAt: params.dueAt,
    status,
    urgency,
    minutesUntilDue,
    href: params.href,
    nextStep: params.nextStep,
  }
}

function compareSlaItems(a: CallIntelligenceSlaItem, b: CallIntelligenceSlaItem): number {
  const statusDelta = slaStatusRank(b.status) - slaStatusRank(a.status)
  if (statusDelta !== 0) return statusDelta
  const urgencyDelta = urgencyRank(b.urgency) - urgencyRank(a.urgency)
  if (urgencyDelta !== 0) return urgencyDelta
  return a.minutesUntilDue - b.minutesUntilDue
}

function slaStatusRank(status: CallIntelligenceSlaStatus): number {
  if (status === 'overdue') return 3
  if (status === 'due_now') return 2
  return 1
}

function addMinutesIso(value: string, minutes: number): string {
  const timestamp = Date.parse(value)
  if (!Number.isFinite(timestamp)) return value
  return new Date(timestamp + minutes * 60_000).toISOString()
}

function hasHumanOutcome(call: CallIntelligenceHumanCall): boolean {
  return hasText(call.outcome_summary) || hasText(call.call_notes) || hasText(call.next_action)
}

function hasText(value: string | null | undefined): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function humanTarget(call: CallIntelligenceHumanCall): string {
  return call.contact_name ?? call.contact_company ?? call.contact_phone ?? 'Client contact'
}

function transcriptEvidence(transcript: string | null, subject: string | null): string | null {
  return trimEvidence(transcript ?? subject)
}

function ingredientEvidence(call: CallIntelligenceSupplierCall): string | null {
  return trimEvidence(call.ingredient_name ?? call.status)
}

function trimEvidence(value: string | null | undefined): string | null {
  if (!hasText(value)) return null
  const normalized = value.trim().replace(/\s+/g, ' ')
  return normalized.length > 120 ? `${normalized.slice(0, 117)}...` : normalized
}

function urgencyRank(urgency: CallIntelligenceUrgency): number {
  if (urgency === 'critical') return 3
  if (urgency === 'high') return 2
  return 1
}

function average(values: number[]): number | null {
  if (values.length === 0) return null
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
}

function nullableCount(value: number, unavailable: boolean): number | null {
  return unavailable ? null : value
}
