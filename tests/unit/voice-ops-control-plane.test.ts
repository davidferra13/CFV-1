import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { scoreHangupRisk } from '@/lib/calling/hangup-risk'
import { coordinateMenuCall } from '@/lib/calling/menu-call-coordinator'
import { buildPostCallExecutionPlan } from '@/lib/calling/post-call-execution'
import { evaluateVoiceCallConsent } from '@/lib/calling/voice-call-consent'
import { planVoiceCallCampaign } from '@/lib/calling/voice-call-campaigns'
import { buildVoiceOpsReport } from '@/lib/calling/voice-ops-report'
import { buildVoiceSessionLedger } from '@/lib/calling/voice-session-ledger'
import { evaluateVoiceScriptQuality } from '@/lib/calling/voice-script-quality'

const ROOT = process.cwd()
const MIGRATION = resolve(ROOT, 'database/migrations/20260430000001_voice_ops_control_plane.sql')
const CALL_SHEET = resolve(ROOT, 'app/(chef)/culinary/call-sheet/page.tsx')
const CONTROL_TOWER = resolve(ROOT, 'components/calling/voice-ops-control-tower.tsx')
const ACTION_ROW = resolve(ROOT, 'components/calling/voice-post-call-action-row.tsx')
const STATUS_ROUTE = resolve(ROOT, 'app/api/calling/status/route.ts')
const RECORDING_ROUTE = resolve(ROOT, 'app/api/calling/recording/route.ts')
const VOICEMAIL_ROUTE = resolve(ROOT, 'app/api/calling/voicemail/route.ts')

test('campaign planner reserves multiple allowed business recipients and gates risky contacts', () => {
  const plan = planVoiceCallCampaign({
    name: 'Friday prep calls',
    purpose: 'Confirm specialty vendors',
    launchMode: 'parallel_limited',
    maxConcurrentLaunches: 4,
    recipients: [
      {
        contactPhone: '(617) 555-0100',
        contactName: 'Fish vendor',
        contactType: 'vendor',
        role: 'vendor_availability',
        subject: 'haddock',
        consentState: 'allowed',
      },
      {
        contactPhone: '(617) 555-0101',
        contactName: 'Venue',
        contactType: 'venue',
        role: 'venue_confirmation',
        subject: 'Saturday dinner',
        consentState: 'allowed',
      },
      {
        contactPhone: '(617) 555-0102',
        contactName: 'Client',
        contactType: 'client',
        role: 'vendor_availability',
        consentState: 'allowed',
      },
      {
        contactPhone: '(617) 555-0103',
        contactName: 'Unknown vendor',
        contactType: 'vendor',
        role: 'vendor_delivery',
        consentState: 'unknown',
      },
    ],
  })

  assert.equal(plan.maxConcurrentLaunches, 4)
  assert.equal(plan.reservedCount, 2)
  assert.equal(plan.skippedCount, 1)
  assert.equal(plan.manualReviewCount, 1)
  assert.equal(plan.summary.canLaunchAutomatically, false)
  assert.ok(plan.summary.blockedReasons.some((reason) => reason.includes('client')))
})

test('consent gate blocks opt-outs, clients, and unknown contacts by default', () => {
  assert.equal(
    evaluateVoiceCallConsent({
      phone: '+16175550100',
      contactType: 'vendor',
      record: { contactPhone: '+16175550100', consentState: 'allowed' },
    }).allowed,
    true
  )
  assert.equal(
    evaluateVoiceCallConsent({ phone: '+16175550101', contactType: 'client' }).nextStep,
    'manual_review'
  )
  assert.equal(
    evaluateVoiceCallConsent({
      phone: '+16175550102',
      contactType: 'vendor',
      latestUtterance: 'please stop calling',
    }).nextStep,
    'do_not_call'
  )
  assert.equal(
    evaluateVoiceCallConsent({ phone: '+16175550103', contactType: 'vendor' }).allowed,
    false
  )
})

test('menu coordinator records confirmations and refuses creative menu generation', () => {
  const confirmation = coordinateMenuCall('I approve the tasting menu for Saturday.')
  assert.equal(confirmation.category, 'menu_confirmation')
  assert.equal(confirmation.allowedToHandleByVoice, true)

  const allergy = coordinateMenuCall('One guest has a severe shellfish allergy.')
  assert.equal(allergy.category, 'dietary_review')
  assert.equal(allergy.urgency, 'urgent')

  const creative = coordinateMenuCall('Can you build us a menu and suggest dishes?')
  assert.equal(creative.category, 'restricted_creative_request')
  assert.equal(creative.allowedToHandleByVoice, false)
  assert.match(creative.response, /cannot create recipes/)
})

test('hang-up risk flags missing disclosures and caller trust concerns', () => {
  const risk = scoreHangupRisk({
    openingScript:
      'Hello this is a very long opening that keeps going before asking the vendor a simple question about whether the item is available for the chef today.',
    transcript: 'Who is this and are you a robot?',
    identityDisclosed: false,
    recordingDisclosed: false,
    averageLatencyMs: 2000,
    recoveryPromptCount: 2,
  })

  assert.equal(risk.level, 'high')
  assert.ok(risk.reasons.length >= 4)
  assert.match(risk.recommendedAdjustment, /disclose AI/)
})

test('post-call execution plans safe follow-up actions without menu invention', () => {
  const plan = buildPostCallExecutionPlan({
    id: 'call-1',
    role: 'inbound_unknown',
    direction: 'inbound',
    contactPhone: '+16175550100',
    contactName: 'Avery',
    status: 'completed',
    fullTranscript: 'Please swap the second course on the menu.',
    extractedData: {
      voice_agent_decision: {
        type: 'handoff_required',
        category: 'menu',
        answer: 'I can record menu notes.',
        followUpPrompt: 'Leave menu details.',
        escalationReason: 'chef review',
        allowedToAnswer: true,
      },
    },
  })

  assert.ok(plan.actions.some((action) => action.type === 'review_menu'))
  assert.ok(plan.actions.some((action) => action.type === 'create_quick_note'))
  assert.ok(!plan.actions.some((action) => action.type === 'create_inquiry'))
})

test('session ledger records disclosures, decisions, actions, and terminal status', () => {
  const events = buildVoiceSessionLedger({
    id: 'call-2',
    role: 'inbound_unknown',
    direction: 'inbound',
    contactPhone: '+16175550100',
    status: 'completed',
    recordingUrl: 'https://example.test/recording.mp3',
    fullTranscript: 'Please stop calling this number.',
    extractedData: {
      voice_agent_decision: {
        type: 'opt_out',
        category: 'opt_out',
        answer: 'Understood.',
        followUpPrompt: '',
        escalationReason: null,
        allowedToAnswer: true,
      },
    },
  })

  assert.deepEqual(
    events.map((event) => event.sequence),
    events.map((_, index) => index + 1)
  )
  assert.ok(events.some((event) => event.eventType === 'identity_disclosed'))
  assert.ok(events.some((event) => event.eventType === 'opt_out_recorded'))
  assert.ok(events.some((event) => event.eventType === 'recording_attached'))
  assert.equal(events.at(-1)?.eventType, 'call_completed')
})

test('voice ops report aggregates status, recordings, reviews, and professional risk', () => {
  const report = buildVoiceOpsReport([
    {
      id: 'ai-1',
      direction: 'inbound',
      role: 'inbound_unknown',
      contact_phone: '+16175550100',
      contact_name: 'Avery',
      status: 'completed',
      full_transcript: 'One guest has a nut allergy.',
      extracted_data: {
        voice_agent_decision: {
          type: 'handoff_required',
          category: 'dietary',
          answer: 'I can record that.',
          followUpPrompt: 'Share allergy details.',
          escalationReason: 'chef review',
          allowedToAnswer: true,
        },
      },
    },
    {
      id: 'ai-2',
      direction: 'outbound',
      role: 'vendor_availability',
      contact_phone: '+16175550101',
      status: 'ringing',
      recording_url: 'https://example.test/r.mp3',
    },
  ])

  assert.equal(report.totalCalls, 2)
  assert.equal(report.activeCalls, 1)
  assert.equal(report.missingRecordingCount, 1)
  assert.equal(report.urgentReviewCount, 1)
  assert.ok(report.topNextActions.some((action) => action.type === 'review_dietary_safety'))
})

test('voice ops report prefers persisted post-call actions when available', () => {
  const report = buildVoiceOpsReport(
    [
      {
        id: 'ai-1',
        direction: 'inbound',
        role: 'inbound_unknown',
        contact_phone: '+16175550100',
        status: 'completed',
      },
    ],
    [
      {
        id: 'action-1',
        ai_call_id: 'ai-1',
        action_type: 'review_pricing',
        status: 'needs_review',
        urgency: 'review',
        label: 'Persisted pricing review',
        detail: 'Review the quote before replying.',
        metadata: {
          voiceOpsSource: 'twilio_status_callback',
          evidenceReason: 'Pricing scope was discussed.',
        },
      },
    ],
    [
      {
        ai_call_id: 'ai-1',
        event_type: 'identity_disclosed',
        payload: { voiceOpsSource: 'twilio_status_callback' },
      },
      {
        ai_call_id: 'ai-1',
        event_type: 'recording_disclosed',
        payload: { voiceOpsSource: 'twilio_status_callback' },
      },
    ]
  )

  assert.equal(report.topNextActions[0].id, 'action-1')
  assert.equal(report.topNextActions[0].evidence?.source, 'twilio_status_callback')
  assert.ok(report.topNextActions[0].evidence?.trustChecklist.length)
  assert.deepEqual(report.topNextActions[0].evidence?.eventTypes, [
    'identity_disclosed',
    'recording_disclosed',
  ])
  assert.equal(report.pricingReviewCount, 0)
})

test('voice ops report separates failed recovery and snoozed actions', () => {
  const future = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  const report = buildVoiceOpsReport(
    [
      {
        id: 'ai-2',
        direction: 'outbound',
        role: 'vendor_availability',
        contact_phone: '+16175550101',
        status: 'failed',
      },
    ],
    [
      {
        id: 'action-failed',
        ai_call_id: 'ai-2',
        action_type: 'create_task',
        status: 'planned',
        urgency: 'review',
        label: 'Call did not connect',
        detail: 'Review whether to retry manually.',
      },
      {
        id: 'action-snoozed',
        ai_call_id: 'ai-2',
        action_type: 'review_pricing',
        status: 'skipped',
        urgency: 'review',
        label: 'Snoozed quote review',
        detail: 'Review the quote later.',
        metadata: {
          closeoutIntent: 'snoozed',
          snoozedUntil: future,
          recoveryIntent: 'retry_manual',
          recoveryLabel: 'Manual retry queued',
          recoveryQueuedAt: future,
        },
      },
    ],
    []
  )

  assert.equal(report.failedRecoveryActions[0].id, 'action-failed')
  assert.equal(report.snoozedActions[0].id, 'action-snoozed')
  assert.equal(report.snoozedActions[0].evidence?.recoveryIntent, 'retry_manual')
  assert.equal(report.topNextActions.some((action) => action.id === 'action-snoozed'), false)
})

test('script quality gate blocks weak scripts and allows required disclosures', () => {
  const weak = evaluateVoiceScriptQuality('Hi, I need to ask about fish.')
  assert.equal(weak.allowedToLaunch, false)
  assert.ok(weak.requiredFixes.length >= 2)

  const strong = evaluateVoiceScriptQuality(
    'I am an AI assistant calling on behalf of the chef. This call may be recorded and transcribed for the chef. Say stop calling at any time and AI assistant calls to this number stop. I am calling to check availability for haddock.'
  )
  assert.equal(strong.allowedToLaunch, true)
  assert.notEqual(strong.level, 'high')
})

test('migration is additive and includes required voice ops tables', () => {
  const sql = readFileSync(MIGRATION, 'utf8')

  assert.match(sql, /CREATE TABLE IF NOT EXISTS voice_call_campaigns/)
  assert.match(sql, /CREATE TABLE IF NOT EXISTS voice_call_campaign_recipients/)
  assert.match(sql, /CREATE TABLE IF NOT EXISTS voice_call_consent/)
  assert.match(sql, /CREATE TABLE IF NOT EXISTS voice_session_events/)
  assert.match(sql, /CREATE TABLE IF NOT EXISTS voice_post_call_actions/)
  assert.doesNotMatch(sql, /\bDROP\s+TABLE\b/i)
  assert.doesNotMatch(sql, /\bDROP\s+COLUMN\b/i)
  assert.doesNotMatch(sql, /\bTRUNCATE\b/i)
  assert.doesNotMatch(sql, /\bDELETE\s+FROM\b/i)
})

test('Voice Hub renders the control tower on the canonical call sheet surface', () => {
  const callSheet = readFileSync(CALL_SHEET, 'utf8')
  const controlTower = readFileSync(CONTROL_TOWER, 'utf8')
  const actionRow = readFileSync(ACTION_ROW, 'utf8')

  assert.match(callSheet, /VoiceOpsControlTower/)
  assert.match(callSheet, /buildVoiceOpsReport/)
  assert.match(controlTower, /Voice Ops Control Tower/)
  assert.match(controlTower, /Next actions/)
  assert.match(controlTower, /Failed-call recovery/)
  assert.match(controlTower, /Snoozed/)
  assert.match(controlTower, /VoicePostCallActionRow/)
  assert.match(controlTower, /showRecoveryActions/)
  assert.match(actionRow, /Optional operator note/)
  assert.match(actionRow, /Plan SMS/)
  assert.match(actionRow, /Queue task/)
  assert.match(actionRow, /recoverVoicePostCallAction/)
  assert.match(callSheet, /voice_session_events/)
  assert.match(callSheet, /'planned', 'needs_review', 'skipped'/)
})

test('terminal Twilio callbacks record Voice Ops automatically', () => {
  const statusRoute = readFileSync(STATUS_ROUTE, 'utf8')
  const recordingRoute = readFileSync(RECORDING_ROUTE, 'utf8')
  const voicemailRoute = readFileSync(VOICEMAIL_ROUTE, 'utf8')

  assert.match(statusRoute, /recordVoiceOpsForAiCallWithDb/)
  assert.match(statusRoute, /isTerminal && effectiveAiCallId/)
  assert.match(recordingRoute, /recordVoiceOpsForAiCallWithDb/)
  assert.match(voicemailRoute, /recordVoiceOpsForAiCallWithDb/)
})
