import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import {
  BUILD_CAPABILITY_REGISTRY,
  formatBuildCapabilityPromptContext,
  getBuildCapabilityPromptContext,
  parseBuildQueueMarkdown,
  summarizeBuildQueueStatuses,
} from '../../lib/build-queue'

describe('build queue public module exports', () => {
  it('exports registry, prompt, and status helpers through one stable module', () => {
    assert.ok(BUILD_CAPABILITY_REGISTRY.length > 0)

    const context = getBuildCapabilityPromptContext(1)
    assert.equal(context.selectedCapabilities.length, 1)
    assert.match(
      formatBuildCapabilityPromptContext(context),
      /Build capability first-pass coverage/
    )

    const parsed = parseBuildQueueMarkdown(
      'system/build-queue/example.md',
      '---\nstatus: "built"\npriority: "high"\n---\n# Example\n'
    )
    assert.equal(parsed.status, 'built')

    const summary = summarizeBuildQueueStatuses([parsed])
    assert.equal(summary.built, 1)
  })
})
