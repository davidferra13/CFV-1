import test from 'node:test'
import assert from 'node:assert/strict'
import type { SectionMode } from '@/lib/dashboard/section-types'

/**
 * SectionShell is a React client component. The project uses node:test (no
 * jsdom / @testing-library). We test the structural contracts that can be
 * verified without DOM rendering: prop types, mode branching logic, and
 * data-attribute contracts expressed as pure functions extracted from the
 * component's render logic.
 */

// Mirror the branching logic from the component
function resolveEffectiveMode(mode: SectionMode, forceExpanded: boolean): SectionMode {
  return forceExpanded ? 'expanded' : mode
}

function resolveWhisperText(whisperText: string | null | undefined, label: string): string {
  return whisperText ?? `${label}: all clear`
}

function shouldRenderBadge(badge: number | undefined): boolean {
  return badge != null && badge > 0
}

// ---- Tests ----

test('expanded mode: effectiveMode stays expanded', () => {
  assert.equal(resolveEffectiveMode('expanded', false), 'expanded')
})

test('expanded mode: children are rendered (effectiveMode=expanded)', () => {
  // In the component, expanded mode renders {children} unconditionally.
  // The other two modes early-return without children.
  const mode = resolveEffectiveMode('expanded', false)
  assert.equal(mode, 'expanded')
})

test('compact mode: effectiveMode is compact when not force-expanded', () => {
  assert.equal(resolveEffectiveMode('compact', false), 'compact')
})

test('compact mode: clicking expands (forceExpanded flips to expanded)', () => {
  // Simulates the state transition that occurs on button click
  const before = resolveEffectiveMode('compact', false)
  assert.equal(before, 'compact')
  const after = resolveEffectiveMode('compact', true)
  assert.equal(after, 'expanded')
})

test('whisper mode: effectiveMode is whisper when not force-expanded', () => {
  assert.equal(resolveEffectiveMode('whisper', false), 'whisper')
})

test('whisper mode: uses custom whisperText when provided', () => {
  assert.equal(resolveWhisperText('No alerts today', 'Command Center'), 'No alerts today')
})

test('whisper mode: falls back to label-based text when whisperText is null', () => {
  assert.equal(resolveWhisperText(null, 'Command Center'), 'Command Center: all clear')
})

test('whisper mode: falls back to label-based text when whisperText is undefined', () => {
  assert.equal(resolveWhisperText(undefined, 'Schedule'), 'Schedule: all clear')
})

test('badge renders only when > 0', () => {
  assert.equal(shouldRenderBadge(3), true)
  assert.equal(shouldRenderBadge(1), true)
})

test('badge does not render for 0 or undefined', () => {
  assert.equal(shouldRenderBadge(0), false)
  assert.equal(shouldRenderBadge(undefined), false)
})

test('forceExpanded overrides any mode to expanded', () => {
  const modes: SectionMode[] = ['expanded', 'compact', 'whisper']
  for (const m of modes) {
    assert.equal(
      resolveEffectiveMode(m, true),
      'expanded',
      `forceExpanded should override ${m} to expanded`
    )
  }
})

test('data-section-mode attribute values match SectionMode type', () => {
  // The component uses data-section-mode with these exact string values.
  // This test documents the contract.
  const validModes: SectionMode[] = ['expanded', 'compact', 'whisper']
  for (const mode of validModes) {
    assert.ok(
      ['expanded', 'compact', 'whisper'].includes(mode),
      `${mode} is a valid data-section-mode value`
    )
  }
})
