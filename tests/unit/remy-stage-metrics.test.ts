import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import {
  getRemyStageMetrics,
  recordRemyStageBatch,
  resetRemyStageMetrics,
} from '../../lib/ai/remy-stage-metrics'

describe('Remy stage metrics', () => {
  beforeEach(() => {
    resetRemyStageMetrics()
  })

  it('aggregates count, average, p95, and max per stage', () => {
    recordRemyStageBatch({
      'setup.context': 120,
      'setup.classification': 40,
    })
    recordRemyStageBatch({
      'setup.context': 180,
      'setup.classification': 60,
    })

    const metrics = getRemyStageMetrics()

    assert.equal(metrics['setup.context']?.count, 2)
    assert.equal(metrics['setup.context']?.avgMs, 150)
    assert.equal(metrics['setup.context']?.maxMs, 180)
    assert.ok((metrics['setup.context']?.p95Ms ?? 0) >= 120)
    assert.equal(metrics['setup.classification']?.avgMs, 50)
  })
})
