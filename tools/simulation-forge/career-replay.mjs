import { createHash } from 'node:crypto'
import { runScenario } from './core.mjs'
import { sourceTimestamp } from './history.mjs'

const VERSION = 'career-replay-v1'
const MAX_RECORDS = 5000
const MAX_FACTS = 10000
const MAX_BYTES = 10 * 1024 * 1024
const clone = (value) => structuredClone(value)
const object = (value) => value && typeof value === 'object' && !Array.isArray(value)
const text = (value) => typeof value === 'string' && value.trim().length > 0
const canonical = (value) =>
  Array.isArray(value)
    ? value.map(canonical)
    : object(value)
      ? Object.fromEntries(
          Object.keys(value)
            .sort()
            .map((key) => [key, canonical(value[key])])
        )
      : value
const hash = (value) =>
  createHash('sha256')
    .update(JSON.stringify(canonical(value)))
    .digest('hex')
const own = (value, key) => Object.hasOwn(value, key)
const map = () => Object.create(null)
const safeKey = (value) =>
  text(value) && value.length <= 512 && !['__proto__', 'prototype', 'constructor'].includes(value)

function timestamp(value) {
  try {
    return sourceTimestamp(value, { requireTimezone: true })
  } catch {
    return null
  }
}

const transitions = {
  inquiry_received: { actor: 'client', from: null, to: 'inquiry' },
  menu_proposed: { actor: 'chef', from: ['inquiry', 'menu'], to: 'menu' },
  quote_issued: { actor: 'chef', from: ['menu', 'quoted'], to: 'quoted' },
  booking_confirmed: { actor: 'client', from: ['quoted'], to: 'booked' },
  deposit_recorded: { actor: 'chef', from: ['booked'], to: 'deposit' },
  event_planned: { actor: 'chef', from: ['deposit'], to: 'planned' },
  service_completed: { actor: 'chef', from: ['planned'], to: 'served' },
  final_payment_recorded: { actor: 'chef', from: ['served'], to: 'settled' },
  follow_up_sent: { actor: 'chef', from: ['settled'], to: 'followed_up' },
}

function initialState() {
  return {
    lastKnownAt: null,
    observedSources: 0,
    clients: map(),
    events: map(),
    knowledge: map(),
    destinationReceipts: [],
    processedEventIds: map(),
    sourceFingerprints: map(),
    gaps: [],
  }
}

/** Build chronological observations. Input records describe evidence, never platform mutations. */
export function compileCareerHistory(input) {
  if (
    !object(input) ||
    input.schemaVersion !== 1 ||
    !text(input.id) ||
    !['source-backed', 'synthetic'].includes(input.mode) ||
    !Array.isArray(input.records)
  )
    throw Error('Invalid career history schema')
  if (input.records.length > MAX_RECORDS) throw Error('Record budget exceeded')
  if (JSON.stringify(input).length > MAX_BYTES) throw Error('Input byte budget exceeded')
  const quarantined = [],
    duplicates = [],
    grouped = new Map()
  let factCount = 0
  for (const record of input.records) {
    if (!object(record) || !object(record.source) || !safeKey(record.source.id)) {
      quarantined.push({ recordId: record?.id ?? null, reason: 'missing_source_id' })
      continue
    }
    if (input.mode === 'source-backed' && record.source.kind === 'synthetic')
      throw Error('Synthetic source in source-backed history')
    if (input.mode === 'synthetic' && record.source.kind !== 'synthetic')
      throw Error('Observed source in synthetic history')
    const key = `${record.source.kind}:${record.source.id}`
    const group = grouped.get(key) ?? []
    group.push(record)
    grouped.set(key, group)
  }
  const events = []
  for (const [sourceKey, group] of grouped) {
    const fingerprints = new Set(group.map(hash))
    if (fingerprints.size !== 1) {
      quarantined.push(
        ...group.map((record) => ({
          recordId: record.id,
          sourceId: sourceKey,
          reason: 'source_conflict',
        }))
      )
      continue
    }
    const raw = group[0],
      knownAt = timestamp(raw.knownAt)
    duplicates.push(
      ...group.slice(1).map((record) => ({ recordId: record.id, sourceId: sourceKey }))
    )
    let reason = !safeKey(raw.id)
      ? 'missing_record_id'
      : !knownAt
        ? 'unknown_or_invalid_known_at'
        : !['gmail', 'organized_import', 'synthetic'].includes(raw.source.kind) ||
            !text(raw.source.evidence) ||
            raw.source.evidence.length > 2048
          ? 'missing_source_evidence'
          : !text(raw.action) || !['chef', 'client', 'unknown'].includes(raw.actor)
            ? 'invalid_action_actor'
            : raw.occurredAt != null && !timestamp(raw.occurredAt)
              ? 'invalid_occurred_at'
              : (raw.clientId != null && !safeKey(raw.clientId)) ||
                  (raw.eventId != null && !safeKey(raw.eventId))
                ? 'invalid_entity_id'
                : null
    const facts = Array.isArray(raw.facts ?? []) ? (raw.facts ?? []) : null
    if (!facts || facts.length > 100) reason = 'invalid_facts'
    const normalizedFacts = []
    for (const fact of facts ?? []) {
      if (!object(fact)) {
        reason = 'invalid_fact'
        break
      }
      const at = timestamp(fact.knownAt ?? knownAt)
      if (
        !safeKey(fact.key) ||
        !at ||
        !Array.isArray(fact.visibleTo) ||
        fact.visibleTo.length === 0 ||
        !fact.visibleTo.every((role) => ['chef', 'client'].includes(role)) ||
        !['documented', 'uncertain'].includes(fact.certainty ?? 'documented') ||
        !own(fact, 'value') ||
        JSON.stringify(fact.value) === undefined ||
        JSON.stringify(fact.value).length > 4096 ||
        at < knownAt
      ) {
        reason = 'invalid_fact'
        break
      }
      normalizedFacts.push({
        key: fact.key,
        value: clone(fact.value),
        knownAt: at,
        visibleTo: [...new Set(fact.visibleTo)].sort(),
        certainty: fact.certainty ?? 'documented',
      })
    }
    factCount += normalizedFacts.length
    if (factCount > MAX_FACTS) throw Error('Fact budget exceeded')
    if (
      raw.requiredFacts != null &&
      (!Array.isArray(raw.requiredFacts) || !raw.requiredFacts.every(safeKey))
    )
      reason = 'invalid_required_facts'
    if (
      raw.destination != null &&
      (!safeKey(raw.destination.id) ||
        !text(raw.destination.type) ||
        !timestamp(raw.destination.knownAt) ||
        timestamp(raw.destination.knownAt) < knownAt)
    )
      reason = 'invalid_destination_receipt'
    if (reason) {
      quarantined.push({ recordId: raw.id, sourceId: sourceKey, reason })
      continue
    }
    const record = {
      id: raw.id,
      source: { id: raw.source.id, kind: raw.source.kind, evidence: raw.source.evidence },
      sourceKey,
      fingerprint: hash(raw),
      knownAt,
      occurredAt: timestamp(raw.occurredAt) ?? knownAt,
      actor: raw.actor,
      action: raw.action,
      clientId: raw.clientId ?? null,
      eventId: raw.eventId ?? null,
      facts: normalizedFacts.filter((fact) => fact.knownAt === knownAt),
      requiredFacts: raw.requiredFacts ?? [],
      uncertainty: raw.uncertainty === true,
      destination: null,
    }
    events.push({ id: `${sourceKey}:record`, at: knownAt, eventKind: 'record', record })
    for (const [index, fact] of normalizedFacts.entries())
      if (fact.knownAt > knownAt)
        events.push({
          id: `${sourceKey}:fact:${index}`,
          at: fact.knownAt,
          eventKind: 'knowledge',
          record: { ...record, facts: [fact] },
        })
    if (raw.destination)
      events.push({
        id: `${sourceKey}:destination`,
        at: timestamp(raw.destination.knownAt),
        eventKind: 'destination',
        record: { ...record, facts: [], destination: clone(raw.destination) },
      })
  }
  events.sort((a, b) => a.at.localeCompare(b.at) || a.id.localeCompare(b.id))
  const scenario = {
    id: input.id,
    product: { id: 'chefflow-career-replay', version: VERSION },
    actors: [
      { id: 'chef', role: 'chef' },
      { id: 'client', role: 'client' },
    ],
    environment: {
      at: events[0]?.at ?? '2016-01-01T00:00:00.000Z',
      historicalClock: true,
      sideEffects: 'none',
    },
    initialState: initialState(),
    events,
    expectedInvariants: [
      'chronology',
      'role_visibility',
      'source_idempotency',
      'documented_workflow',
    ],
    provenance: {
      kind: input.mode === 'synthetic' ? 'synthetic' : 'observed',
      evidenceLevel: 'model_replay_only',
    },
  }
  return { scenario, quarantined, duplicates }
}

function addFacts(state, record, at) {
  for (const fact of record.facts) {
    if (fact.knownAt > at) continue
    const scope = record.eventId ?? `client:${record.clientId ?? 'unknown'}`
    state.knowledge[`${scope}:${fact.key}`] = {
      ...clone(fact),
      clientId: record.clientId,
      eventId: record.eventId,
      sourceId: record.sourceKey,
      evidence: record.source.evidence,
    }
  }
}

function visibleKnowledge(state, record, at) {
  const result = map()
  for (const fact of Object.values(state.knowledge))
    if (
      fact.knownAt <= at &&
      fact.visibleTo.includes(record.actor) &&
      fact.clientId === record.clientId &&
      (fact.eventId === record.eventId || fact.eventId === null)
    )
      result[fact.key] = clone(fact)
  return result
}

function finishStep(state, decisions = []) {
  if (JSON.stringify(state).length > MAX_BYTES)
    throw Error('Checkpoint byte budget exceeded; segment history')
  return { state, decisions, toolCalls: [] }
}

const adapter = {
  version: VERSION,
  step(state, event) {
    if (own(state.processedEventIds, event.id)) return finishStep(state)
    if (state.lastKnownAt && event.at < state.lastKnownAt) throw Error('Chronology violation')
    const record = event.record
    state.processedEventIds[event.id] = true
    state.sourceFingerprints[record.sourceKey] = record.fingerprint
    state.lastKnownAt = event.at
    addFacts(state, record, event.at)
    if (event.eventKind === 'destination') {
      state.destinationReceipts.push({
        ...clone(record.destination),
        sourceId: record.sourceKey,
        evidence: record.source.evidence,
      })
      return finishStep(state)
    }
    if (event.eventKind === 'knowledge') return finishStep(state)
    state.observedSources++
    const knowledge = visibleKnowledge(state, record, event.at)
    const decision = {
      recordId: record.id,
      actor: record.actor,
      at: event.at,
      sourceId: record.sourceKey,
      evidence: record.source.evidence,
      knowledge,
      accepted: false,
    }
    let gap = null
    const transition = transitions[record.action]
    if (record.action === 'source_observed') gap = 'workflow_not_reconstructed'
    else if (!transition) gap = 'unsupported_action'
    else if (record.uncertainty) gap = 'uncertain_action'
    else if (transition.actor !== record.actor) gap = 'wrong_role'
    else if (!record.clientId || !record.eventId) gap = 'missing_entity_link'
    else if (
      record.requiredFacts.some(
        (key) => !knowledge[key] || knowledge[key].certainty !== 'documented'
      )
    )
      gap = 'missing_known_fact'
    else {
      const previous = own(state.events, record.eventId) ? state.events[record.eventId] : null
      if (previous && previous.clientId !== record.clientId) gap = 'conflicting_client_link'
      else if (
        transition.from === null
          ? previous !== null
          : !previous || !transition.from.includes(previous.phase)
      )
        gap = 'missing_workflow_predecessor'
      else {
        state.events[record.eventId] = {
          clientId: record.clientId,
          phase: transition.to,
          updatedAt: event.at,
        }
        const client = own(state.clients, record.clientId)
          ? state.clients[record.clientId]
          : { eventIds: [] }
        if (!client.eventIds.includes(record.eventId)) client.eventIds.push(record.eventId)
        state.clients[record.clientId] = client
        decision.accepted = true
      }
    }
    if (gap) {
      const finding = {
        invariant: gap,
        recordId: record.id,
        sourceId: record.sourceKey,
        at: event.at,
        expectedAction: record.action,
        detail: 'Historical model replay did not prove this workflow operation.',
      }
      state.gaps.push(finding)
      decision.gap = gap
    }
    return finishStep(state, [decision])
  },
  evaluate(state) {
    return {
      observations: [
        {
          kind: 'historical_model_replay',
          observedSources: state.observedSources,
          dinners: Object.keys(state.events).length,
          clients: Object.keys(state.clients).length,
        },
      ],
      scores: { workflowGaps: state.gaps.length },
      violations: state.gaps,
    }
  },
}

/** Run a bounded chunk with the existing Forge engine. Resume by explicitly supplying its checkpoint. */
export async function runCareerReplay(
  input,
  { maxEvents = 25, checkpoint = null, budget = {}, commit = 'unknown' } = {}
) {
  if (!Number.isInteger(maxEvents) || maxEvents < 1 || maxEvents > 100)
    throw Error('Batch budget exceeded')
  const compiled = compileCareerHistory(input)
  let state = initialState()
  if (checkpoint) {
    if (
      checkpoint.version !== VERSION ||
      checkpoint.historyId !== input.id ||
      checkpoint.mode !== input.mode ||
      !object(checkpoint.state) ||
      !object(checkpoint.state.processedEventIds) ||
      !object(checkpoint.state.sourceFingerprints) ||
      JSON.stringify(checkpoint.state).length > MAX_BYTES
    )
      throw Error('Checkpoint identity or schema mismatch')
    state = clone(checkpoint.state)
  }
  const quarantined = [...compiled.quarantined]
  const pending = compiled.scenario.events.filter((event) => {
    const seen = state.sourceFingerprints[event.record.sourceKey]
    if (seen && seen !== event.record.fingerprint) {
      quarantined.push({ recordId: event.record.id, reason: 'checkpoint_source_changed' })
      return false
    }
    if (own(state.processedEventIds, event.id)) return false
    if (state.lastKnownAt && event.at < state.lastKnownAt) {
      quarantined.push({ recordId: event.record.id, reason: 'requires_full_replay' })
      return false
    }
    return true
  })
  // Core stores before/after snapshots. Shrink batches as checkpoint size grows to bound trace memory.
  const upcoming = pending.slice(0, maxEvents)
  const estimatedStateBytes =
    JSON.stringify(state).length +
    JSON.stringify(upcoming).length +
    upcoming.reduce(
      (bytes, event) => bytes + event.record.facts.length * event.record.source.evidence.length,
      0
    )
  const batchSize = Math.min(
    maxEvents,
    Math.max(1, Math.floor((4 * 1024 * 1024) / (2 * estimatedStateBytes)))
  )
  const events = pending.slice(0, batchSize)
  let run = null
  if (events.length) {
    run = await runScenario(
      {
        ...compiled.scenario,
        initialState: state,
        events,
        environment: { ...compiled.scenario.environment, at: events[0].at },
      },
      adapter,
      { commit, budget: { maxMs: 10000, ...budget } }
    )
    const lastTransition = run.trajectory.findLast((item) => item.kind === 'transition')
    if (lastTransition) state = lastTransition.data.after
  }
  const remainingEvents = pending.filter((event) => !own(state.processedEventIds, event.id)).length
  const engineFailed = run?.violations.some((gap) => gap.invariant === 'engine_error') ?? false
  const status =
    engineFailed || quarantined.length ? 'blocked' : remainingEvents ? 'checkpointed' : 'replayed'
  const unfinished =
    remainingEvents === 0
      ? Object.entries(state.events)
          .filter(([, event]) => event.phase !== 'followed_up')
          .map(([eventId, event]) => ({
            invariant: 'incomplete_model_workflow',
            eventId,
            phase: event.phase,
            detail: 'The supplied evidence does not reconstruct the remaining dinner lifecycle.',
          }))
      : []
  return {
    status,
    run,
    remainingEvents,
    duplicates: compiled.duplicates,
    quarantined,
    gaps: [
      ...state.gaps,
      ...unfinished,
      ...(run?.violations.filter((gap) => gap.invariant === 'engine_error') ?? []),
    ],
    checkpoint: { version: VERSION, historyId: input.id, mode: input.mode, state },
    proof: {
      history: input.mode === 'synthetic' ? 'synthetic_only' : 'source_backed_model_only',
      ui: 'unverified',
      authentication: 'unverified',
      externalPayments: 'not_executed',
      sideEffects: 'none',
    },
  }
}

/** Project the existing BusinessHistoryFinding read model; classification is not an executed action. */
export function findingsToCareerHistory(findings, { id = 'gmail-business-history' } = {}) {
  if (!Array.isArray(findings)) throw Error('Findings must be an array')
  return {
    schemaVersion: 1,
    id,
    mode: 'source-backed',
    records: findings.map((finding) => {
      const sourceKind = finding.source ?? 'gmail'
      const sourceId = finding.gmail_message_id
        ? `${finding.mailbox_id ?? 'unknown-mailbox'}:${finding.gmail_message_id}:${finding.classification ?? finding.category ?? 'unknown'}`
        : finding.id
      const receivedAt = finding.receivedAt ?? finding.received_at ?? null
      const importedId = finding.importedInquiryId ?? finding.imported_inquiry_id ?? null
      const reviewedAt = finding.reviewedAt ?? finding.reviewed_at ?? null
      return {
        id: finding.id,
        source: {
          id: sourceId,
          kind: sourceKind,
          evidence:
            finding.sourceUrl ??
            (finding.gmail_message_id
              ? `gmail-message:${sourceId}`
              : `business-history-finding:${finding.id}`),
        },
        knownAt: receivedAt,
        occurredAt: receivedAt,
        action: 'source_observed',
        actor: 'unknown',
        clientId: null,
        eventId: null,
        facts: [],
        uncertainty: finding.confidence !== 'high',
        destination:
          finding.status === 'imported' && importedId
            ? { type: 'inquiry', id: importedId, knownAt: reviewedAt }
            : null,
      }
    }),
  }
}
