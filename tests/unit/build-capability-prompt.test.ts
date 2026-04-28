import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import type { BuildCapabilityDefinition } from '../../lib/build-queue/capability-registry'
import {
  formatBuildCapabilityPromptContext,
  getBuildCapabilityPromptContext,
} from '../../lib/build-queue/capability-prompt'

const sampleCapabilities: readonly BuildCapabilityDefinition[] = [
  {
    id: '001-high-alpha',
    title: 'Alpha Coverage',
    category: 'ops',
    priority: 'high',
    source: 'unit',
    confidence: 'high',
    queuePath: 'system/build-queue/001-high-alpha.md',
    affectedFiles: [],
    searchHints: [],
    firstPassScope: 'First-pass build registry entry',
  },
  {
    id: '002-medium-beta',
    title: 'Beta Coverage',
    category: 'finance',
    priority: 'medium',
    source: 'unit',
    confidence: 'medium',
    queuePath: 'system/build-queue/002-medium-beta.md',
    affectedFiles: ['lib/example.ts'],
    searchHints: ['beta'],
    firstPassScope: 'First-pass build registry entry',
  },
  {
    id: '003-low-gamma',
    title: 'Gamma Coverage',
    category: 'ops',
    priority: 'low',
    source: 'unit',
    confidence: 'low',
    queuePath: 'system/build-queue/003-low-gamma.md',
    affectedFiles: [],
    searchHints: ['gamma'],
    firstPassScope: 'First-pass build registry entry',
  },
]

describe('build capability prompt context', () => {
  it('returns deterministic summary counts and selected capability fields', () => {
    const context = getBuildCapabilityPromptContext(2, sampleCapabilities)

    assert.equal(context.total, 3)
    assert.equal(context.categoryCount, 2)
    assert.deepEqual(context.priorityCounts, { high: 1, medium: 1, low: 1 })
    assert.deepEqual(context.selectedCapabilities, [
      {
        id: '001-high-alpha',
        title: 'Alpha Coverage',
        category: 'ops',
        queuePath: 'system/build-queue/001-high-alpha.md',
      },
      {
        id: '002-medium-beta',
        title: 'Beta Coverage',
        category: 'finance',
        queuePath: 'system/build-queue/002-medium-beta.md',
      },
    ])
  })

  it('formats concise text for downstream prompts', () => {
    const text = formatBuildCapabilityPromptContext(
      getBuildCapabilityPromptContext(1, sampleCapabilities)
    )

    assert.match(text, /^Build capability first-pass coverage/)
    assert.match(text, /Total capabilities: 3/)
    assert.match(text, /Categories: 2/)
    assert.match(text, /Priorities: high=1, medium=1, low=1/)
    assert.match(
      text,
      /- 001-high-alpha \| Alpha Coverage \| ops \| system\/build-queue\/001-high-alpha\.md/
    )
    assert.doesNotMatch(text, /affectedFiles/)
    assert.doesNotMatch(text, /searchHints/)
  })

  it('fails closed when no capabilities are supplied', () => {
    const context = getBuildCapabilityPromptContext(10, [])
    const text = formatBuildCapabilityPromptContext(context)

    assert.deepEqual(context, {
      total: 0,
      categoryCount: 0,
      priorityCounts: { high: 0, medium: 0, low: 0 },
      selectedCapabilities: [],
    })
    assert.match(text, /Total capabilities: 0/)
    assert.match(text, /Selected capabilities:\n- none/)
  })

  it('normalizes invalid limits to no selected rows', () => {
    assert.equal(
      getBuildCapabilityPromptContext(0, sampleCapabilities).selectedCapabilities.length,
      0
    )
    assert.equal(
      getBuildCapabilityPromptContext(Number.NaN, sampleCapabilities).selectedCapabilities.length,
      0
    )
    assert.equal(
      getBuildCapabilityPromptContext(1.9, sampleCapabilities).selectedCapabilities.length,
      1
    )
  })
})
