// CIL - Signal-to-graph ingestion pipeline
// Converts raw signals into entities and relations

import type Database from 'better-sqlite3'
import type { ConfidenceLabel, EntityType, RelationType, SignalSource } from './types'

interface RawSignal {
  id: string
  source: string
  entity_ids: string
  payload: string
  timestamp: number
}

// Upsert an entity: create if new, update observation if existing
function upsertEntity(
  db: Database.Database,
  id: string,
  type: EntityType,
  label: string,
  state: Record<string, unknown>,
  now: number
): void {
  const existing = db
    .prepare('SELECT id, observation_count, state FROM entities WHERE id = ?')
    .get(id) as { id: string; observation_count: number; state: string } | undefined

  if (existing) {
    // Merge state: new keys override, old keys preserved
    const oldState = JSON.parse(existing.state)
    const merged = { ...oldState, ...state }
    db.prepare(
      `
      UPDATE entities
      SET state = ?, last_observed = ?, observation_count = observation_count + 1, label = ?
      WHERE id = ?
    `
    ).run(JSON.stringify(merged), now, label, id)
  } else {
    db.prepare(
      `
      INSERT INTO entities (id, type, label, state, velocity, last_observed, created_at, observation_count)
      VALUES (?, ?, ?, ?, '{}', ?, ?, 1)
    `
    ).run(id, type, label, JSON.stringify(state), now, now)
  }
}

// Upsert a relation: create if new, reinforce if existing
function upsertRelation(
  db: Database.Database,
  fromEntity: string,
  toEntity: string,
  type: RelationType,
  confidence: ConfidenceLabel,
  confidenceScore: number,
  signalId: string,
  now: number
): void {
  const id = `${fromEntity}_${type}_${toEntity}`

  const existing = db
    .prepare('SELECT id, strength, confidence, evidence FROM relations WHERE id = ?')
    .get(id) as { id: string; strength: number; confidence: string; evidence: string } | undefined

  if (existing) {
    // Reinforce: asymptotic approach to 1.0
    const newStrength = Math.min(1.0, existing.strength + (1.0 - existing.strength) * 0.1)
    const evidence = JSON.parse(existing.evidence) as string[]
    // Keep last 50 evidence entries
    evidence.push(signalId)
    if (evidence.length > 50) evidence.shift()

    // Promote confidence if reinforced enough
    let newConfidence = existing.confidence as ConfidenceLabel
    let newScore = confidenceScore
    if (existing.confidence === 'AMBIGUOUS' && evidence.length >= 3) {
      newConfidence = 'INFERRED'
      newScore = Math.max(confidenceScore, 0.5)
    }

    db.prepare(
      `
      UPDATE relations
      SET strength = ?, confidence = ?, confidence_score = ?, evidence = ?, last_reinforced = ?
      WHERE id = ?
    `
    ).run(newStrength, newConfidence, newScore, JSON.stringify(evidence), now, id)
  } else {
    // Verify both entities exist before creating relation
    const fromExists = db.prepare('SELECT 1 FROM entities WHERE id = ?').get(fromEntity)
    const toExists = db.prepare('SELECT 1 FROM entities WHERE id = ?').get(toEntity)
    if (!fromExists || !toExists) return

    db.prepare(
      `
      INSERT INTO relations (id, from_entity, to_entity, type, strength, confidence, confidence_score, evidence, periodicity, chef_override, created_at, last_reinforced)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, 0, ?, ?)
    `
    ).run(
      id,
      fromEntity,
      toEntity,
      type,
      confidenceScore,
      confidence,
      confidenceScore,
      JSON.stringify([signalId]),
      now,
      now
    )
  }
}

// Parse entity ID to extract type
function entityType(entityId: string): EntityType | null {
  const prefix = entityId.split('_')[0]
  const valid: EntityType[] = ['chef', 'client', 'event', 'ingredient', 'vendor', 'recipe', 'staff']
  return valid.includes(prefix as EntityType) ? (prefix as EntityType) : null
}

// Infer a label from entity ID when no explicit label provided
function inferLabel(entityId: string): string {
  // "client_abc123" -> "client abc123"
  return entityId.replace('_', ' ')
}

// Source-specific ingestion strategies
const INGESTORS: Record<
  SignalSource,
  (db: Database.Database, signal: RawSignal, now: number) => void
> = {
  db_mutation(db, signal, now) {
    const payload = JSON.parse(signal.payload)
    const entityIds = JSON.parse(signal.entity_ids) as string[]

    for (const eid of entityIds) {
      const type = entityType(eid)
      if (!type) continue
      const label = payload.summary || payload.label || inferLabel(eid)
      const state: Record<string, unknown> = {}
      if (payload.action) state.last_action = payload.action
      if (payload.domain) state.last_domain = payload.domain
      upsertEntity(db, eid, type, label, state, now)
    }

    // If there's a client and a chef in the same signal, they interact
    const clientId = entityIds.find((e) => e.startsWith('client_'))
    const chefId = entityIds.find((e) => e.startsWith('chef_'))
    if (clientId && chefId) {
      upsertRelation(db, clientId, chefId, 'books', 'INFERRED', 0.5, signal.id, now)
    }
  },

  event_transition(db, signal, now) {
    const payload = JSON.parse(signal.payload)
    const entityIds = JSON.parse(signal.entity_ids) as string[]

    const eventId = entityIds.find((e) => e.startsWith('event_'))
    const clientId = entityIds.find((e) => e.startsWith('client_'))

    if (eventId) {
      upsertEntity(
        db,
        eventId,
        'event',
        payload.occasion || inferLabel(eventId),
        {
          status: payload.toStatus,
          from_status: payload.fromStatus,
        },
        now
      )
    }

    if (clientId) {
      upsertEntity(
        db,
        clientId,
        'client',
        payload.clientName || inferLabel(clientId),
        {
          last_event_status: payload.toStatus,
        },
        now
      )
    }

    // Client books event (EXTRACTED: directly observed from FSM)
    if (clientId && eventId) {
      upsertRelation(db, clientId, eventId, 'books', 'EXTRACTED', 1.0, signal.id, now)
    }
  },

  ledger(db, signal, now) {
    const payload = JSON.parse(signal.payload)
    const entityIds = JSON.parse(signal.entity_ids) as string[]

    const eventId = entityIds.find((e) => e.startsWith('event_'))
    if (eventId) {
      const state: Record<string, unknown> = {}
      if (payload.amount_cents != null) state.last_ledger_amount = payload.amount_cents
      if (payload.entry_type) state.last_ledger_type = payload.entry_type
      upsertEntity(db, eventId, 'event', payload.occasion || inferLabel(eventId), state, now)
    }

    // Client pays for event
    const clientId = entityIds.find((e) => e.startsWith('client_'))
    if (clientId && eventId && payload.entry_type === 'payment') {
      upsertRelation(db, clientId, eventId, 'pays', 'EXTRACTED', 1.0, signal.id, now)
    }
  },

  memory(db, signal, now) {
    const payload = JSON.parse(signal.payload)
    const entityIds = JSON.parse(signal.entity_ids) as string[]

    for (const eid of entityIds) {
      const type = entityType(eid)
      if (!type) continue
      const state: Record<string, unknown> = {}
      if (payload.category) state.memory_category = payload.category
      if (payload.content) state.last_memory = payload.content
      upsertEntity(db, eid, type, payload.label || inferLabel(eid), state, now)
    }

    // Remy memory about a client preference -> weak AMBIGUOUS relation
    const clientId = entityIds.find((e) => e.startsWith('client_'))
    const ingredientId = entityIds.find((e) => e.startsWith('ingredient_'))
    if (clientId && ingredientId) {
      upsertRelation(db, clientId, ingredientId, 'prefers', 'AMBIGUOUS', 0.3, signal.id, now)
    }
  },

  automation(db, signal, now) {
    const payload = JSON.parse(signal.payload)
    const entityIds = JSON.parse(signal.entity_ids) as string[]

    for (const eid of entityIds) {
      const type = entityType(eid)
      if (!type) continue
      upsertEntity(
        db,
        eid,
        type,
        payload.label || inferLabel(eid),
        {
          last_automation: payload.rule_name,
        },
        now
      )
    }
  },

  inventory(db, signal, now) {
    const payload = JSON.parse(signal.payload)
    const entityIds = JSON.parse(signal.entity_ids) as string[]

    const ingredientId = entityIds.find((e) => e.startsWith('ingredient_'))
    if (ingredientId) {
      upsertEntity(
        db,
        ingredientId,
        'ingredient',
        payload.name || inferLabel(ingredientId),
        {
          last_transaction_type: payload.transaction_type,
          last_quantity: payload.quantity,
        },
        now
      )
    }

    // Chef uses ingredient
    const chefId = entityIds.find((e) => e.startsWith('chef_'))
    if (chefId && ingredientId) {
      upsertRelation(db, chefId, ingredientId, 'uses', 'INFERRED', 0.7, signal.id, now)
    }
  },

  sse(db, signal, now) {
    // SSE events are catch-all. Extract entities from payload if present.
    const payload = JSON.parse(signal.payload)
    const entityIds = JSON.parse(signal.entity_ids) as string[]

    for (const eid of entityIds) {
      const type = entityType(eid)
      if (!type) continue
      upsertEntity(
        db,
        eid,
        type,
        payload.label || inferLabel(eid),
        {
          sse_event: payload.event_type,
        },
        now
      )
    }
  },
}

export function ingestSignal(db: Database.Database, signal: RawSignal): void {
  const source = signal.source as SignalSource
  const ingestor = INGESTORS[source]

  if (!ingestor) {
    // Unknown source: mark skipped
    db.prepare('UPDATE signals SET interpretation_status = ? WHERE id = ?').run(
      'skipped',
      signal.id
    )
    return
  }

  const now = signal.timestamp || Date.now()

  // Run ingestion in a transaction for atomicity
  const runIngest = db.transaction(() => {
    ingestor(db, signal, now)
    db.prepare('UPDATE signals SET interpretation_status = ? WHERE id = ?').run(
      'interpreted',
      signal.id
    )
  })

  runIngest()
}
