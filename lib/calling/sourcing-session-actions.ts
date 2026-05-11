'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { checkVendorEligibility, recordCallAttempt, recordCallOutcome } from './vendor-rate-limiter'
import { validateCallRequest } from './anti-spam'
import { recordCallCost, estimateSessionCost } from './cost-tracker'
import { initiateSupplierCall, initiateAdHocCall } from './twilio-actions'
import { normalizePhone } from './phone-utils'
import { broadcast } from '@/lib/realtime/broadcast'

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN

/**
 * Sourcing Session Actions
 *
 * Orchestrates batch vendor calling for ingredient sourcing.
 * "Chef needs sunchokes. System calls vendors in priority order, stops when enough confirm."
 *
 * Flow: createSession -> startSession -> placeSessionCall (per candidate) -> updateCandidateResult -> complete/cancel
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CreateSessionParams {
  ingredientQuery: string
  stopAfterConfirmations?: number
  askPrice?: boolean
  askHold?: boolean
  leaveVoicemail?: boolean
  candidates: Array<{
    vendorId?: string
    vendorName: string
    vendorPhone: string
    vendorType?: 'saved' | 'directory' | 'adhoc'
    priorityOrder?: number
  }>
}

interface ActionResult {
  success: boolean
  error?: string
  data?: any
}

// ---------------------------------------------------------------------------
// 1. createSourcingSession
// ---------------------------------------------------------------------------

export async function createSourcingSession(params: CreateSessionParams): Promise<ActionResult> {
  try {
    const chef = await requireChef()
    const db: any = createServerClient()

    if (!params.ingredientQuery?.trim()) {
      return { success: false, error: 'Ingredient query is required' }
    }

    if (!params.candidates || params.candidates.length === 0) {
      return { success: false, error: 'At least one candidate vendor is required' }
    }

    const stopAfter = params.stopAfterConfirmations ?? 3
    const estimatedCostCents = estimateSessionCost(params.candidates.length)

    // Insert session
    const { data: session, error: sessionErr } = await db
      .from('sourcing_sessions')
      .insert({
        chef_id: chef.entityId,
        ingredient_query: params.ingredientQuery.trim(),
        status: 'draft',
        stop_after_confirmations: stopAfter,
        ask_price: params.askPrice ?? true,
        ask_hold: params.askHold ?? false,
        leave_voicemail: params.leaveVoicemail ?? false,
        candidate_count: params.candidates.length,
        estimated_cost_cents: estimatedCostCents,
        total_confirmed: 0,
        total_unavailable: 0,
        total_no_answer: 0,
        total_skipped: 0,
      })
      .select()
      .single()

    if (sessionErr || !session) {
      console.error('[sourcing-session] createSourcingSession insert failed:', sessionErr)
      return { success: false, error: 'Failed to create sourcing session' }
    }

    // Insert candidates
    const candidateRows = params.candidates.map((c, idx) => ({
      session_id: session.id,
      chef_id: chef.entityId,
      vendor_id: c.vendorId || null,
      vendor_name: c.vendorName.trim(),
      vendor_phone: c.vendorPhone.trim(),
      vendor_type: c.vendorType || 'adhoc',
      priority_order: c.priorityOrder ?? idx + 1,
      status: 'pending',
    }))

    const { error: candidateErr } = await db
      .from('sourcing_session_candidates')
      .insert(candidateRows)

    if (candidateErr) {
      console.error('[sourcing-session] candidate insert failed:', candidateErr)
      // Clean up the session
      await db.from('sourcing_sessions').delete().eq('id', session.id)
      return { success: false, error: 'Failed to add candidates to session' }
    }

    return {
      success: true,
      data: {
        sessionId: session.id,
        estimatedCostCents,
        candidateCount: params.candidates.length,
      },
    }
  } catch (err) {
    console.error('[sourcing-session] createSourcingSession error:', err)
    return { success: false, error: 'Failed to create sourcing session' }
  }
}

// ---------------------------------------------------------------------------
// 2. startSourcingSession
// ---------------------------------------------------------------------------

export async function startSourcingSession(sessionId: string): Promise<ActionResult> {
  try {
    const chef = await requireChef()
    const db: any = createServerClient()

    // Verify ownership and status
    const { data: session, error: fetchErr } = await db
      .from('sourcing_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('chef_id', chef.entityId)
      .single()

    if (fetchErr || !session) {
      return { success: false, error: 'Session not found' }
    }

    if (session.status !== 'draft') {
      return { success: false, error: `Cannot start session in '${session.status}' status` }
    }

    // Update to in_progress
    const { error: updateErr } = await db
      .from('sourcing_sessions')
      .update({ status: 'in_progress', started_at: new Date().toISOString() })
      .eq('id', sessionId)

    if (updateErr) {
      console.error('[sourcing-session] startSourcingSession update failed:', updateErr)
      return { success: false, error: 'Failed to start session' }
    }

    // Fetch candidates ordered by priority
    const { data: candidates } = await db
      .from('sourcing_session_candidates')
      .select('*')
      .eq('session_id', sessionId)
      .order('priority_order', { ascending: true })

    return {
      success: true,
      data: {
        ...session,
        status: 'in_progress',
        started_at: new Date().toISOString(),
        candidates: candidates || [],
      },
    }
  } catch (err) {
    console.error('[sourcing-session] startSourcingSession error:', err)
    return { success: false, error: 'Failed to start sourcing session' }
  }
}

// ---------------------------------------------------------------------------
// 3. placeSessionCall
// ---------------------------------------------------------------------------

export async function placeSessionCall(
  sessionId: string,
  candidateId: string
): Promise<ActionResult> {
  try {
    const chef = await requireChef()
    const db: any = createServerClient()

    // Verify session is in_progress
    const { data: session } = await db
      .from('sourcing_sessions')
      .select('id, status, ingredient_query')
      .eq('id', sessionId)
      .eq('chef_id', chef.entityId)
      .single()

    if (!session) {
      return { success: false, error: 'Session not found' }
    }

    if (session.status !== 'in_progress') {
      return { success: false, error: `Session is '${session.status}', cannot place calls` }
    }

    // Get candidate
    const { data: candidate } = await db
      .from('sourcing_session_candidates')
      .select('*')
      .eq('id', candidateId)
      .eq('session_id', sessionId)
      .single()

    if (!candidate) {
      return { success: false, error: 'Candidate not found in this session' }
    }

    if (candidate.status !== 'pending') {
      return { success: false, error: `Candidate already processed (${candidate.status})` }
    }

    // Anti-spam: vendor rate limiter
    const eligibility = await checkVendorEligibility(candidate.vendor_phone)
    if (!eligibility.eligible) {
      await db
        .from('sourcing_session_candidates')
        .update({ status: 'skipped', skip_reason: eligibility.reason })
        .eq('id', candidateId)

      await db
        .from('sourcing_sessions')
        .update({ total_skipped: (session.total_skipped ?? 0) + 1 })
        .eq('id', sessionId)

      return { success: false, error: eligibility.reason }
    }

    // Anti-spam: call validator (business hours, velocity, budget)
    const validation = await validateCallRequest(candidate.vendor_phone, candidate.vendor_type)
    if (!validation.allowed) {
      await db
        .from('sourcing_session_candidates')
        .update({ status: 'skipped', skip_reason: validation.reason })
        .eq('id', candidateId)

      await db
        .from('sourcing_sessions')
        .update({ total_skipped: (session.total_skipped ?? 0) + 1 })
        .eq('id', sessionId)

      return { success: false, error: validation.reason }
    }

    // Record the attempt
    await recordCallAttempt(candidate.vendor_phone, candidate.vendor_name)

    // Place the call (use initiateSupplierCall if vendor_id exists, else ad-hoc)
    let callResult
    if (candidate.vendor_id) {
      callResult = await initiateSupplierCall(candidate.vendor_id, session.ingredient_query)
    } else {
      callResult = await initiateAdHocCall(
        candidate.vendor_phone,
        candidate.vendor_name,
        session.ingredient_query
      )
    }

    if (!callResult.success) {
      await db
        .from('sourcing_session_candidates')
        .update({ status: 'failed', skip_reason: callResult.error })
        .eq('id', candidateId)

      return { success: false, error: callResult.error }
    }

    // Update candidate to calling
    await db
      .from('sourcing_session_candidates')
      .update({
        status: 'calling',
        called_at: new Date().toISOString(),
        call_sid: callResult.callId || null,
        ai_call_id: callResult.aiCallId || null,
      })
      .eq('id', candidateId)

    return {
      success: true,
      data: {
        callId: callResult.callId,
        aiCallId: callResult.aiCallId,
      },
    }
  } catch (err) {
    console.error('[sourcing-session] placeSessionCall error:', err)
    return { success: false, error: 'Failed to place call' }
  }
}

// ---------------------------------------------------------------------------
// 4. updateCandidateResult
// ---------------------------------------------------------------------------

export async function updateCandidateResult(
  candidateId: string,
  result: {
    result: string
    priceQuoted?: string
    priceCents?: number
    quantityAvailable?: string
    unit?: string
    canHold?: boolean
    holdUntil?: string
    transcript?: string
    durationSeconds?: number
  }
): Promise<ActionResult> {
  try {
    const chef = await requireChef()
    const db: any = createServerClient()

    // Fetch candidate with session
    const { data: candidate } = await db
      .from('sourcing_session_candidates')
      .select(
        '*, sourcing_sessions!inner(id, chef_id, status, stop_after_confirmations, total_confirmed, total_unavailable, total_no_answer, total_skipped)'
      )
      .eq('id', candidateId)
      .single()

    if (!candidate) {
      return { success: false, error: 'Candidate not found' }
    }

    const session = candidate.sourcing_sessions
    if (session.chef_id !== chef.entityId) {
      return { success: false, error: 'Unauthorized' }
    }

    // Update candidate with result
    const { error: updateErr } = await db
      .from('sourcing_session_candidates')
      .update({
        status: 'completed',
        result: result.result,
        price_quoted: result.priceQuoted || null,
        price_cents: result.priceCents || null,
        quantity_available: result.quantityAvailable || null,
        unit: result.unit || null,
        can_hold: result.canHold ?? null,
        hold_until: result.holdUntil || null,
        transcript: result.transcript || null,
        duration_seconds: result.durationSeconds || null,
        completed_at: new Date().toISOString(),
      })
      .eq('id', candidateId)

    if (updateErr) {
      console.error('[sourcing-session] updateCandidateResult update failed:', updateErr)
      return { success: false, error: 'Failed to update candidate result' }
    }

    // Record call outcome for rate limiter
    const outcome =
      result.result === 'confirmed' || result.result === 'unavailable'
        ? 'answered'
        : result.result === 'no_answer'
          ? 'no_answer'
          : result.result === 'busy'
            ? 'busy'
            : 'failed'
    await recordCallOutcome(candidate.vendor_phone, outcome)

    // Record cost if we have duration
    if (result.durationSeconds && result.durationSeconds > 0) {
      await recordCallCost({
        sessionId: session.id,
        aiCallId: candidate.ai_call_id || undefined,
        callSid: candidate.call_sid || undefined,
        direction: 'outbound',
        durationSeconds: result.durationSeconds,
      })
    }

    // Update session counters
    const counterUpdates: Record<string, number> = {}
    if (result.result === 'confirmed') {
      counterUpdates.total_confirmed = (session.total_confirmed ?? 0) + 1
    } else if (result.result === 'unavailable') {
      counterUpdates.total_unavailable = (session.total_unavailable ?? 0) + 1
    } else if (result.result === 'no_answer') {
      counterUpdates.total_no_answer = (session.total_no_answer ?? 0) + 1
    }

    if (Object.keys(counterUpdates).length > 0) {
      await db.from('sourcing_sessions').update(counterUpdates).eq('id', session.id)
    }

    // Check stop condition
    const newConfirmed = counterUpdates.total_confirmed ?? session.total_confirmed ?? 0
    const shouldStop = newConfirmed >= (session.stop_after_confirmations ?? 3)

    if (shouldStop) {
      // Skip remaining pending candidates
      await db
        .from('sourcing_session_candidates')
        .update({ status: 'skipped', skip_reason: 'Stop condition met' })
        .eq('session_id', session.id)
        .eq('status', 'pending')

      // Mark session completed
      await db
        .from('sourcing_sessions')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', session.id)
    }

    // Build summary
    const { data: allCandidates } = await db
      .from('sourcing_session_candidates')
      .select('status, result')
      .eq('session_id', session.id)

    const sessionSummary = {
      totalCandidates: allCandidates?.length ?? 0,
      confirmed: allCandidates?.filter((c: any) => c.result === 'confirmed').length ?? 0,
      unavailable: allCandidates?.filter((c: any) => c.result === 'unavailable').length ?? 0,
      noAnswer: allCandidates?.filter((c: any) => c.result === 'no_answer').length ?? 0,
      pending: allCandidates?.filter((c: any) => c.status === 'pending').length ?? 0,
      skipped: allCandidates?.filter((c: any) => c.status === 'skipped').length ?? 0,
    }

    return {
      success: true,
      data: { shouldStop, sessionSummary },
    }
  } catch (err) {
    console.error('[sourcing-session] updateCandidateResult error:', err)
    return { success: false, error: 'Failed to update candidate result' }
  }
}

// ---------------------------------------------------------------------------
// 5. pauseSourcingSession
// ---------------------------------------------------------------------------

export async function pauseSourcingSession(sessionId: string): Promise<ActionResult> {
  try {
    const chef = await requireChef()
    const db: any = createServerClient()

    const { data: session } = await db
      .from('sourcing_sessions')
      .select('id, status')
      .eq('id', sessionId)
      .eq('chef_id', chef.entityId)
      .single()

    if (!session) {
      return { success: false, error: 'Session not found' }
    }

    if (session.status !== 'in_progress') {
      return { success: false, error: `Cannot pause session in '${session.status}' status` }
    }

    const { error } = await db
      .from('sourcing_sessions')
      .update({ status: 'paused' })
      .eq('id', sessionId)

    if (error) {
      console.error('[sourcing-session] pauseSourcingSession failed:', error)
      return { success: false, error: 'Failed to pause session' }
    }

    return { success: true }
  } catch (err) {
    console.error('[sourcing-session] pauseSourcingSession error:', err)
    return { success: false, error: 'Failed to pause session' }
  }
}

// ---------------------------------------------------------------------------
// 6. resumeSourcingSession
// ---------------------------------------------------------------------------

export async function resumeSourcingSession(sessionId: string): Promise<ActionResult> {
  try {
    const chef = await requireChef()
    const db: any = createServerClient()

    const { data: session } = await db
      .from('sourcing_sessions')
      .select('id, status')
      .eq('id', sessionId)
      .eq('chef_id', chef.entityId)
      .single()

    if (!session) {
      return { success: false, error: 'Session not found' }
    }

    if (session.status !== 'paused') {
      return { success: false, error: `Cannot resume session in '${session.status}' status` }
    }

    const { error } = await db
      .from('sourcing_sessions')
      .update({ status: 'in_progress' })
      .eq('id', sessionId)

    if (error) {
      console.error('[sourcing-session] resumeSourcingSession failed:', error)
      return { success: false, error: 'Failed to resume session' }
    }

    return { success: true }
  } catch (err) {
    console.error('[sourcing-session] resumeSourcingSession error:', err)
    return { success: false, error: 'Failed to resume session' }
  }
}

// ---------------------------------------------------------------------------
// 7. completeSourcingSession
// ---------------------------------------------------------------------------

export async function completeSourcingSession(sessionId: string): Promise<ActionResult> {
  try {
    const chef = await requireChef()
    const db: any = createServerClient()

    const { data: session } = await db
      .from('sourcing_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('chef_id', chef.entityId)
      .single()

    if (!session) {
      return { success: false, error: 'Session not found' }
    }

    if (session.status === 'completed' || session.status === 'cancelled') {
      return { success: false, error: `Session is already '${session.status}'` }
    }

    // Calculate actual cost from call_cost_log
    const [costResult] = await db.query(
      `SELECT COALESCE(SUM(cost_cents), 0) as total_cost FROM call_cost_log
       WHERE chef_id = $1 AND session_id = $2`,
      [chef.entityId, sessionId]
    )
    const actualCostCents = parseInt(costResult?.total_cost || '0', 10)

    // Skip remaining pending candidates
    await db
      .from('sourcing_session_candidates')
      .update({ status: 'skipped', skip_reason: 'Session completed manually' })
      .eq('session_id', sessionId)
      .eq('status', 'pending')

    const { error } = await db
      .from('sourcing_sessions')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        actual_cost_cents: actualCostCents,
      })
      .eq('id', sessionId)

    if (error) {
      console.error('[sourcing-session] completeSourcingSession failed:', error)
      return { success: false, error: 'Failed to complete session' }
    }

    return {
      success: true,
      data: {
        sessionId,
        actualCostCents,
        completedAt: new Date().toISOString(),
      },
    }
  } catch (err) {
    console.error('[sourcing-session] completeSourcingSession error:', err)
    return { success: false, error: 'Failed to complete session' }
  }
}

// ---------------------------------------------------------------------------
// 8. cancelSourcingSession
// ---------------------------------------------------------------------------

export async function cancelSourcingSession(sessionId: string): Promise<ActionResult> {
  try {
    const chef = await requireChef()
    const db: any = createServerClient()

    const { data: session } = await db
      .from('sourcing_sessions')
      .select('id, status')
      .eq('id', sessionId)
      .eq('chef_id', chef.entityId)
      .single()

    if (!session) {
      return { success: false, error: 'Session not found' }
    }

    if (session.status === 'completed' || session.status === 'cancelled') {
      return { success: false, error: `Session is already '${session.status}'` }
    }

    // Skip all pending candidates
    await db
      .from('sourcing_session_candidates')
      .update({ status: 'skipped', skip_reason: 'Session cancelled' })
      .eq('session_id', sessionId)
      .eq('status', 'pending')

    const { error } = await db
      .from('sourcing_sessions')
      .update({ status: 'cancelled', completed_at: new Date().toISOString() })
      .eq('id', sessionId)

    if (error) {
      console.error('[sourcing-session] cancelSourcingSession failed:', error)
      return { success: false, error: 'Failed to cancel session' }
    }

    return { success: true }
  } catch (err) {
    console.error('[sourcing-session] cancelSourcingSession error:', err)
    return { success: false, error: 'Failed to cancel session' }
  }
}

// ---------------------------------------------------------------------------
// 9. getSourcingSession
// ---------------------------------------------------------------------------

export async function getSourcingSession(sessionId: string): Promise<ActionResult> {
  try {
    const chef = await requireChef()
    const db: any = createServerClient()

    const { data: session, error: sessionErr } = await db
      .from('sourcing_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('chef_id', chef.entityId)
      .single()

    if (sessionErr || !session) {
      return { success: false, error: 'Session not found' }
    }

    const { data: candidates } = await db
      .from('sourcing_session_candidates')
      .select('*')
      .eq('session_id', sessionId)
      .order('priority_order', { ascending: true })

    // Cost summary
    const [costResult] = await db.query(
      `SELECT COALESCE(SUM(cost_cents), 0) as total_cost, COUNT(*) as call_count
       FROM call_cost_log WHERE chef_id = $1 AND session_id = $2`,
      [chef.entityId, sessionId]
    )

    return {
      success: true,
      data: {
        ...session,
        candidates: candidates || [],
        costSummary: {
          estimatedCents: session.estimated_cost_cents,
          actualCents: parseInt(costResult?.total_cost || '0', 10),
          callsWithCost: parseInt(costResult?.call_count || '0', 10),
        },
      },
    }
  } catch (err) {
    console.error('[sourcing-session] getSourcingSession error:', err)
    return { success: false, error: 'Failed to fetch session' }
  }
}

// ---------------------------------------------------------------------------
// 10. getRecentSessions
// ---------------------------------------------------------------------------

export async function getRecentSessions(limit?: number): Promise<ActionResult> {
  try {
    const chef = await requireChef()
    const db: any = createServerClient()

    const fetchLimit = limit ?? 10

    const { data: sessions, error } = await db
      .from('sourcing_sessions')
      .select('*')
      .eq('chef_id', chef.entityId)
      .order('created_at', { ascending: false })
      .limit(fetchLimit)

    if (error) {
      console.error('[sourcing-session] getRecentSessions failed:', error)
      return { success: false, error: 'Failed to fetch sessions' }
    }

    // Attach candidate summaries per session
    const sessionsWithSummary = await Promise.all(
      (sessions || []).map(async (s: any) => {
        const { data: candidates } = await db
          .from('sourcing_session_candidates')
          .select('status, result')
          .eq('session_id', s.id)

        return {
          ...s,
          candidateSummary: {
            total: candidates?.length ?? 0,
            confirmed: candidates?.filter((c: any) => c.result === 'confirmed').length ?? 0,
            unavailable: candidates?.filter((c: any) => c.result === 'unavailable').length ?? 0,
            noAnswer: candidates?.filter((c: any) => c.result === 'no_answer').length ?? 0,
            pending: candidates?.filter((c: any) => c.status === 'pending').length ?? 0,
          },
        }
      })
    )

    return { success: true, data: sessionsWithSummary }
  } catch (err) {
    console.error('[sourcing-session] getRecentSessions error:', err)
    return { success: false, error: 'Failed to fetch recent sessions' }
  }
}

// ---------------------------------------------------------------------------
// 11. reorderCandidates
// ---------------------------------------------------------------------------

export async function reorderCandidates(
  sessionId: string,
  orderedCandidateIds: string[]
): Promise<ActionResult> {
  try {
    const chef = await requireChef()
    const db: any = createServerClient()

    const { data: session } = await db
      .from('sourcing_sessions')
      .select('id, status')
      .eq('id', sessionId)
      .eq('chef_id', chef.entityId)
      .single()

    if (!session) {
      return { success: false, error: 'Session not found' }
    }

    if (session.status !== 'draft') {
      return { success: false, error: 'Can only reorder candidates in draft sessions' }
    }

    // Update each candidate's priority_order
    for (let i = 0; i < orderedCandidateIds.length; i++) {
      await db
        .from('sourcing_session_candidates')
        .update({ priority_order: i + 1 })
        .eq('id', orderedCandidateIds[i])
        .eq('session_id', sessionId)
    }

    return { success: true }
  } catch (err) {
    console.error('[sourcing-session] reorderCandidates error:', err)
    return { success: false, error: 'Failed to reorder candidates' }
  }
}

// ---------------------------------------------------------------------------
// 12. addCandidate
// ---------------------------------------------------------------------------

export async function addCandidate(
  sessionId: string,
  candidate: { vendorName: string; vendorPhone: string; vendorType?: string }
): Promise<ActionResult> {
  try {
    const chef = await requireChef()
    const db: any = createServerClient()

    const { data: session } = await db
      .from('sourcing_sessions')
      .select('id, status')
      .eq('id', sessionId)
      .eq('chef_id', chef.entityId)
      .single()

    if (!session) {
      return { success: false, error: 'Session not found' }
    }

    if (session.status !== 'draft' && session.status !== 'paused') {
      return { success: false, error: 'Can only add candidates to draft or paused sessions' }
    }

    if (!candidate.vendorName?.trim() || !candidate.vendorPhone?.trim()) {
      return { success: false, error: 'Vendor name and phone are required' }
    }

    // Get max priority order
    const { data: lastCandidate } = await db
      .from('sourcing_session_candidates')
      .select('priority_order')
      .eq('session_id', sessionId)
      .order('priority_order', { ascending: false })
      .limit(1)
      .maybeSingle()

    const nextOrder = (lastCandidate?.priority_order ?? 0) + 1

    const { data: newCandidate, error } = await db
      .from('sourcing_session_candidates')
      .insert({
        session_id: sessionId,
        chef_id: chef.entityId,
        vendor_name: candidate.vendorName.trim(),
        vendor_phone: candidate.vendorPhone.trim(),
        vendor_type: candidate.vendorType || 'adhoc',
        priority_order: nextOrder,
        status: 'pending',
      })
      .select()
      .single()

    if (error || !newCandidate) {
      console.error('[sourcing-session] addCandidate insert failed:', error)
      return { success: false, error: 'Failed to add candidate' }
    }

    // Update session candidate count
    await db.from('sourcing_sessions').update({ candidate_count: nextOrder }).eq('id', sessionId)

    return { success: true, data: newCandidate }
  } catch (err) {
    console.error('[sourcing-session] addCandidate error:', err)
    return { success: false, error: 'Failed to add candidate' }
  }
}

// ---------------------------------------------------------------------------
// 13. removeCandidate
// ---------------------------------------------------------------------------

export async function removeCandidate(candidateId: string): Promise<ActionResult> {
  try {
    const chef = await requireChef()
    const db: any = createServerClient()

    // Verify ownership via session join
    const { data: candidate } = await db
      .from('sourcing_session_candidates')
      .select('*, sourcing_sessions!inner(id, chef_id, status)')
      .eq('id', candidateId)
      .single()

    if (!candidate) {
      return { success: false, error: 'Candidate not found' }
    }

    const session = candidate.sourcing_sessions
    if (session.chef_id !== chef.entityId) {
      return { success: false, error: 'Unauthorized' }
    }

    if (candidate.status !== 'pending') {
      return { success: false, error: 'Can only remove pending candidates' }
    }

    if (session.status !== 'draft' && session.status !== 'paused') {
      return { success: false, error: 'Can only remove candidates from draft or paused sessions' }
    }

    const { error } = await db.from('sourcing_session_candidates').delete().eq('id', candidateId)

    if (error) {
      console.error('[sourcing-session] removeCandidate failed:', error)
      return { success: false, error: 'Failed to remove candidate' }
    }

    return { success: true }
  } catch (err) {
    console.error('[sourcing-session] removeCandidate error:', err)
    return { success: false, error: 'Failed to remove candidate' }
  }
}

// ---------------------------------------------------------------------------
// 14. getSessionSummary
// ---------------------------------------------------------------------------

export async function getSessionSummary(sessionId: string): Promise<ActionResult> {
  try {
    const chef = await requireChef()
    const db: any = createServerClient()

    const { data: session } = await db
      .from('sourcing_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('chef_id', chef.entityId)
      .single()

    if (!session) {
      return { success: false, error: 'Session not found' }
    }

    const { data: candidates } = await db
      .from('sourcing_session_candidates')
      .select('*')
      .eq('session_id', sessionId)
      .order('priority_order', { ascending: true })

    const allCandidates = candidates || []

    // Confirmed vendors with prices
    const confirmed = allCandidates
      .filter((c: any) => c.result === 'confirmed')
      .map((c: any) => ({
        vendorName: c.vendor_name,
        vendorPhone: c.vendor_phone,
        priceQuoted: c.price_quoted,
        priceCents: c.price_cents,
        quantityAvailable: c.quantity_available,
        unit: c.unit,
        canHold: c.can_hold,
        holdUntil: c.hold_until,
      }))

    // Unavailable
    const unavailable = allCandidates
      .filter((c: any) => c.result === 'unavailable')
      .map((c: any) => ({ vendorName: c.vendor_name, vendorPhone: c.vendor_phone }))

    // No answer
    const noAnswer = allCandidates
      .filter((c: any) => c.result === 'no_answer')
      .map((c: any) => ({ vendorName: c.vendor_name, vendorPhone: c.vendor_phone }))

    // Best price
    const confirmedWithPrice = confirmed.filter((c: any) => c.priceCents && c.priceCents > 0)
    const bestPrice =
      confirmedWithPrice.length > 0
        ? confirmedWithPrice.reduce((best: any, c: any) =>
            c.priceCents < best.priceCents ? c : best
          )
        : null

    // Total cost
    const [costResult] = await db.query(
      `SELECT COALESCE(SUM(cost_cents), 0) as total_cost FROM call_cost_log
       WHERE chef_id = $1 AND session_id = $2`,
      [chef.entityId, sessionId]
    )
    const totalCostCents = parseInt(costResult?.total_cost || '0', 10)

    // Duration (sum of all candidate call durations)
    const totalDurationSeconds = allCandidates.reduce(
      (sum: number, c: any) => sum + (c.duration_seconds || 0),
      0
    )

    return {
      success: true,
      data: {
        sessionId,
        ingredientQuery: session.ingredient_query,
        status: session.status,
        confirmed,
        unavailable,
        noAnswer,
        bestPrice: bestPrice
          ? {
              vendorName: bestPrice.vendorName,
              priceCents: bestPrice.priceCents,
              priceQuoted: bestPrice.priceQuoted,
            }
          : null,
        totalCostCents,
        totalDurationSeconds,
        startedAt: session.started_at,
        completedAt: session.completed_at,
      },
    }
  } catch (err) {
    console.error('[sourcing-session] getSessionSummary error:', err)
    return { success: false, error: 'Failed to build session summary' }
  }
}

// ---------------------------------------------------------------------------
// 15. retryCall - Re-initiate a failed or active call to the same vendor
// ---------------------------------------------------------------------------

export async function retryCall(callId: string): Promise<ActionResult> {
  try {
    const chef = await requireChef()
    const db: any = createServerClient()

    // Look up the original supplier_call record
    const { data: call } = await db
      .from('supplier_calls')
      .select('id, vendor_id, vendor_name, vendor_phone, ingredient_name, status, call_sid')
      .eq('id', callId)
      .eq('chef_id', chef.entityId)
      .single()

    if (!call) {
      return { success: false, error: 'Call not found' }
    }

    // End the existing Twilio call if it is still active
    if (call.call_sid && ['queued', 'ringing', 'in_progress'].includes(call.status)) {
      await terminateTwilioCall(call.call_sid)
    }

    // Mark the old call as failed so the UI updates
    await db
      .from('supplier_calls')
      .update({ status: 'failed', error_message: 'Retried by chef' })
      .eq('id', callId)

    // Place a fresh call to the same vendor
    let result
    if (call.vendor_id) {
      result = await initiateSupplierCall(call.vendor_id, call.ingredient_name)
    } else {
      result = await initiateAdHocCall(call.vendor_phone, call.vendor_name, call.ingredient_name)
    }

    if (!result.success) {
      return { success: false, error: result.error || 'Failed to retry call' }
    }

    return {
      success: true,
      data: { newCallId: result.callId, aiCallId: result.aiCallId },
    }
  } catch (err) {
    console.error('[sourcing-session] retryCall error:', err)
    return { success: false, error: 'Failed to retry call' }
  }
}

// ---------------------------------------------------------------------------
// 16. skipCall - Skip the current vendor call and mark as skipped
// ---------------------------------------------------------------------------

export async function skipCall(callId: string): Promise<ActionResult> {
  try {
    const chef = await requireChef()
    const db: any = createServerClient()

    // Look up the supplier_call record
    const { data: call } = await db
      .from('supplier_calls')
      .select('id, vendor_name, vendor_phone, call_sid, status, chef_id')
      .eq('id', callId)
      .eq('chef_id', chef.entityId)
      .single()

    if (!call) {
      return { success: false, error: 'Call not found' }
    }

    // Terminate the Twilio call if still active
    if (call.call_sid && ['queued', 'ringing', 'in_progress'].includes(call.status)) {
      await terminateTwilioCall(call.call_sid)
    }

    // Mark as skipped in supplier_calls
    await db
      .from('supplier_calls')
      .update({ status: 'failed', result: 'no', error_message: 'Skipped by chef' })
      .eq('id', callId)

    // Also update any linked ai_calls record
    await db
      .from('ai_calls')
      .update({ status: 'completed', result: 'no' })
      .eq('supplier_call_id', callId)
      .eq('chef_id', chef.entityId)

    // Broadcast skip event so the SSE-connected UI updates
    try {
      await broadcast(`calling:${chef.entityId}`, 'call_failed', {
        callId,
        vendorName: call.vendor_name,
        vendorPhone: call.vendor_phone,
      })
    } catch (err) {
      console.error('[sourcing-session] skipCall broadcast failed:', err)
    }

    return { success: true }
  } catch (err) {
    console.error('[sourcing-session] skipCall error:', err)
    return { success: false, error: 'Failed to skip call' }
  }
}

// ---------------------------------------------------------------------------
// 17. endCall - Terminate an active Twilio call
// ---------------------------------------------------------------------------

export async function endCall(callId: string): Promise<ActionResult> {
  try {
    const chef = await requireChef()
    const db: any = createServerClient()

    // Look up the supplier_call record
    const { data: call } = await db
      .from('supplier_calls')
      .select('id, vendor_name, vendor_phone, call_sid, status, chef_id')
      .eq('id', callId)
      .eq('chef_id', chef.entityId)
      .single()

    if (!call) {
      return { success: false, error: 'Call not found' }
    }

    // Terminate the Twilio call
    if (call.call_sid) {
      const terminated = await terminateTwilioCall(call.call_sid)
      if (!terminated) {
        console.error('[sourcing-session] endCall: Twilio termination failed for', call.call_sid)
      }
    }

    // Mark as completed in the DB
    await db
      .from('supplier_calls')
      .update({ status: 'completed', result: 'no', error_message: 'Ended by chef' })
      .eq('id', callId)

    // Also update any linked ai_calls record
    await db
      .from('ai_calls')
      .update({ status: 'completed', result: 'no' })
      .eq('supplier_call_id', callId)
      .eq('chef_id', chef.entityId)

    // Broadcast so the SSE-connected UI updates
    try {
      await broadcast(`calling:${chef.entityId}`, 'call_completed', {
        callId,
        vendorName: call.vendor_name,
        vendorPhone: call.vendor_phone,
        result: 'no',
      })
    } catch (err) {
      console.error('[sourcing-session] endCall broadcast failed:', err)
    }

    return { success: true }
  } catch (err) {
    console.error('[sourcing-session] endCall error:', err)
    return { success: false, error: 'Failed to end call' }
  }
}

// ---------------------------------------------------------------------------
// Helper: terminate a Twilio call by SID
// ---------------------------------------------------------------------------

async function terminateTwilioCall(callSid: string): Promise<boolean> {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) return false

  try {
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Calls/${callSid}.json`,
      {
        method: 'POST',
        headers: {
          Authorization:
            'Basic ' + Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ Status: 'completed' }).toString(),
      }
    )
    return res.ok
  } catch (err) {
    console.error('[calling] terminateTwilioCall error:', err)
    return false
  }
}
