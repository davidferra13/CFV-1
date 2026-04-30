import assert from 'node:assert/strict'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import {
  buildContinuityReport,
  extractContinuityTerms,
  loadCanonicalSurfaces,
  writeMemoryPacket,
} from '../../devtools/context-continuity-lib.mjs'

test('extractContinuityTerms keeps domain terms and removes filler', () => {
  const terms = extractContinuityTerms(
    'Build the homepage continuity guard and attach to Obsidian memory'
  )
  assert.ok(terms.includes('homepage'))
  assert.ok(terms.includes('continuity'))
  assert.ok(terms.includes('obsidian'))
  assert.equal(terms.includes('build'), false)
})

test('canonical registry includes homepage and context continuity owners', () => {
  const registry = loadCanonicalSurfaces()
  const ids = registry.surfaces.map((surface) => surface.id)
  assert.ok(ids.includes('public-homepage'))
  assert.ok(ids.includes('context-continuity'))
})

test('continuity report flags homepage duplicate risk', () => {
  const report = buildContinuityReport({
    prompt: 'Build another homepage variant and improve the public landing page',
    limit: 5,
  })
  assert.equal(report.continuity.decision, 'merge-candidate')
  assert.equal(report.continuity.stop_required, true)
  assert.ok(report.duplicate_risks.some((risk) => risk.owner === 'public-homepage'))
})

test('memory packet writes a compact markdown file', () => {
  const result = writeMemoryPacket({
    title: 'Context Continuity Test Packet',
    userIntent: 'Preserve decisions',
    canonicalHome: '.claude/skills/context-continuity/SKILL.md',
    duplicateRisk: 'Low',
    existingRelatedSurfaces: ['context-continuity'],
    links: ['devtools/context-continuity-scan.mjs'],
    dir: path.join(os.tmpdir(), 'chefflow-context-continuity-test'),
  })
  assert.match(result.file.replaceAll('\\', '/'), /context-continuity-test-packet/)
  assert.equal(result.vault_used, false)
  assert.equal(result.vault_file, null)
  assert.deepEqual(result.index_files, [])
})

test('memory packet mirrors into Obsidian indexes when a vault is supplied', () => {
  const root = path.join(os.tmpdir(), 'chefflow-obsidian-memory-test')
  const dir = path.join(root, 'repo-memory')
  const vault = path.join(root, 'vault')
  const result = writeMemoryPacket({
    title: 'Obsidian Memory Test Packet',
    userIntent: 'Wire packets into vault notes',
    canonicalHome: '.claude/skills/context-continuity/SKILL.md',
    duplicateRisk: 'Low',
    existingRelatedSurfaces: ['context-continuity', 'agent-skill-system'],
    links: ['devtools/obsidian-memory-packet.mjs'],
    dir,
    vault,
  })

  assert.match(result.file.replaceAll('\\', '/'), /obsidian-memory-test-packet/)
  assert.match(result.vault_file.replaceAll('\\', '/'), /Obsidian Memory Test Packet/)
  assert.ok(result.index_files.some((file) => file.endsWith('ChefFlow Index.md')))
  assert.ok(result.index_files.some((file) => file.endsWith('Codex Workflow Index.md')))
  assert.ok(result.index_files.some((file) => file.endsWith('ChefFlow Decisions.md')))
})
