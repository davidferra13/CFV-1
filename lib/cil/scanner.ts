// CIL Phase 2 - Pattern Recognizer
// Pure math. Zero Ollama calls. Reads the graph, finds anomalies.
// Runs hourly via scheduled job or on-demand from Remy context.

import type Database from 'better-sqlite3'

export interface CILInsight {
  type: 'anomaly' | 'gap' | 'opportunity' | 'drift' | 'milestone'
  severity: 'low' | 'medium' | 'high'
  title: string
  detail: string
  entityIds: string[]
}

export interface ScanResult {
  insights: CILInsight[]
  stats: {
    totalEntities: number
    totalRelations: number
    totalSignals: number
    avgRelationStrength: number
    weakRelationCount: number
    isolatedEntityCount: number
  }
  scannedAt: number
}

interface EntityRow {
  id: string
  type: string
  label: string
  state: string
  last_observed: number
  observation_count: number
}

interface RelationRow {
  id: string
  from_entity: string
  to_entity: string
  type: string
  strength: number
  confidence: string
  confidence_score: number
  last_reinforced: number
}

const MS_PER_DAY = 86_400_000

export function scanGraph(db: Database.Database): ScanResult {
  const now = Date.now()
  const insights: CILInsight[] = []

  // Load graph
  const entities = db.prepare('SELECT * FROM entities').all() as EntityRow[]
  const relations = db.prepare('SELECT * FROM relations').all() as RelationRow[]
  const signalCount = (db.prepare('SELECT COUNT(*) as c FROM signals').get() as { c: number }).c

  if (entities.length === 0) {
    return {
      insights: [],
      stats: {
        totalEntities: 0,
        totalRelations: 0,
        totalSignals: signalCount,
        avgRelationStrength: 0,
        weakRelationCount: 0,
        isolatedEntityCount: 0,
      },
      scannedAt: now,
    }
  }

  // Build adjacency index
  const adjacency = new Map<string, string[]>()
  for (const e of entities) adjacency.set(e.id, [])
  for (const r of relations) {
    adjacency.get(r.from_entity)?.push(r.to_entity)
    adjacency.get(r.to_entity)?.push(r.from_entity)
  }

  // ── 1. Dormant clients (observed but no activity in 60+ days) ──────────
  const clients = entities.filter((e) => e.type === 'client')
  for (const client of clients) {
    const daysSince = (now - client.last_observed) / MS_PER_DAY
    if (daysSince > 60 && client.observation_count >= 3) {
      insights.push({
        type: 'opportunity',
        severity: daysSince > 120 ? 'high' : 'medium',
        title: `Dormant client: ${client.label}`,
        detail: `No activity in ${Math.round(daysSince)} days. ${client.observation_count} past interactions.`,
        entityIds: [client.id],
      })
    }
  }

  // ── 2. Weakening relations (strength dropped below 0.3) ────────────────
  for (const rel of relations) {
    if (rel.strength < 0.3 && rel.confidence !== 'AMBIGUOUS') {
      const daysSinceReinforced = (now - rel.last_reinforced) / MS_PER_DAY
      if (daysSinceReinforced > 30) {
        insights.push({
          type: 'drift',
          severity: rel.strength < 0.15 ? 'high' : 'medium',
          title: `Weakening ${rel.type} relationship`,
          detail: `${rel.from_entity} -> ${rel.to_entity}: strength ${(rel.strength * 100).toFixed(0)}%, not reinforced in ${Math.round(daysSinceReinforced)} days.`,
          entityIds: [rel.from_entity, rel.to_entity],
        })
      }
    }
  }

  // ── 3. Isolated entities (zero connections) ────────────────────────────
  const isolated: EntityRow[] = []
  for (const entity of entities) {
    const neighbors = adjacency.get(entity.id) ?? []
    if (neighbors.length === 0 && entity.observation_count >= 2) {
      isolated.push(entity)
    }
  }
  if (isolated.length > 0 && isolated.length <= 10) {
    for (const e of isolated) {
      insights.push({
        type: 'gap',
        severity: 'low',
        title: `Isolated ${e.type}: ${e.label}`,
        detail: `Observed ${e.observation_count} times but has no connections to other entities.`,
        entityIds: [e.id],
      })
    }
  } else if (isolated.length > 10) {
    insights.push({
      type: 'gap',
      severity: 'medium',
      title: `${isolated.length} isolated entities`,
      detail: `These entities have been observed but have no connections. May indicate missing data or incomplete workflows.`,
      entityIds: isolated.slice(0, 5).map((e) => e.id),
    })
  }

  // ── 4. High-velocity entities (observation spikes) ─────────────────────
  // Entities with 10+ observations in last 24h might indicate issues or high activity
  const recentSignals = db
    .prepare('SELECT entity_ids FROM signals WHERE timestamp > ? ORDER BY timestamp DESC LIMIT 500')
    .all(now - MS_PER_DAY) as { entity_ids: string }[]

  const recentCounts = new Map<string, number>()
  for (const s of recentSignals) {
    const ids = JSON.parse(s.entity_ids) as string[]
    for (const id of ids) {
      recentCounts.set(id, (recentCounts.get(id) ?? 0) + 1)
    }
  }

  for (const [entityId, count] of recentCounts) {
    if (count >= 15) {
      const entity = entities.find((e) => e.id === entityId)
      if (entity) {
        insights.push({
          type: 'anomaly',
          severity: count >= 30 ? 'high' : 'medium',
          title: `High activity: ${entity.label}`,
          detail: `${count} signals in last 24 hours. Unusually high compared to normal activity.`,
          entityIds: [entityId],
        })
      }
    }
  }

  // ── 5. Milestones (entity reaches observation thresholds) ──────────────
  const milestoneThresholds = [10, 25, 50, 100]
  for (const entity of entities) {
    for (const threshold of milestoneThresholds) {
      // Only fire milestone once: count is at threshold or just past it (within 3)
      if (entity.observation_count >= threshold && entity.observation_count < threshold + 3) {
        insights.push({
          type: 'milestone',
          severity: 'low',
          title: `${entity.label} reached ${threshold} interactions`,
          detail: `${entity.type} "${entity.label}" has been observed ${entity.observation_count} times. CIL confidence in patterns is growing.`,
          entityIds: [entity.id],
        })
        break // Only show highest milestone
      }
    }
  }

  // ── 6. Cohesiveness gaps (clients with events but no payment relations) ──
  for (const client of clients) {
    const neighbors = adjacency.get(client.id) ?? []
    const hasBooking = relations.some(
      (r) => (r.from_entity === client.id || r.to_entity === client.id) && r.type === 'books'
    )
    const hasPayment = relations.some(
      (r) => (r.from_entity === client.id || r.to_entity === client.id) && r.type === 'pays'
    )
    if (hasBooking && !hasPayment && client.observation_count >= 5) {
      insights.push({
        type: 'gap',
        severity: 'medium',
        title: `No payment relation: ${client.label}`,
        detail: `Client has booking history but no recorded payments. May indicate cash/offline payments not logged.`,
        entityIds: [client.id],
      })
    }
  }

  // ── Stats ──────────────────────────────────────────────────────────────
  const avgStrength =
    relations.length > 0 ? relations.reduce((sum, r) => sum + r.strength, 0) / relations.length : 0

  const weakCount = relations.filter((r) => r.strength < 0.3).length

  // Sort by severity (high first), then limit
  const severityOrder = { high: 0, medium: 1, low: 2 }
  insights.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])

  return {
    insights: insights.slice(0, 20), // Cap at 20 insights per scan
    stats: {
      totalEntities: entities.length,
      totalRelations: relations.length,
      totalSignals: signalCount,
      avgRelationStrength: Math.round(avgStrength * 100) / 100,
      weakRelationCount: weakCount,
      isolatedEntityCount: isolated.length,
    },
    scannedAt: now,
  }
}
