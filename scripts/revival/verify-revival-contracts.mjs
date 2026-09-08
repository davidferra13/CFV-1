import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { validateManifest } from './build-capability-ledger.mjs'

function readJson(repoRoot, relativePath) {
  return JSON.parse(readFileSync(path.resolve(repoRoot, relativePath), 'utf8'))
}

export function verifyContracts(repoRoot = process.cwd()) {
  const manifest = validateManifest(readJson(repoRoot, 'docs/revival/product-role-manifest.json'))
  const decisions = readJson(repoRoot, 'docs/revival/recovery-decisions.json')
  const loop = readJson(repoRoot, 'docs/revival/dfpc-operating-loop.json')

  assert.equal(manifest.canonical_product, 'chefflow')
  assert.equal(manifest.operational_truth_source, 'dfpc')
  assert.deepEqual(
    manifest.projects.map((project) => project.role),
    [
      'canonical-platform',
      'live-reference-implementation',
      'default-chefflow-workspace',
      'network-referral-commission-layer',
      'second-chef-validation-case',
    ],
  )

  assert.equal(decisions.schema_version, 1)
  assert.deepEqual([...decisions.allowed_dispositions].sort(), ['adopt', 'archive', 'rebuild'])
  assert.equal(new Set(decisions.decisions.map((decision) => decision.id)).size, decisions.decisions.length)
  for (const decision of decisions.decisions) {
    assert.ok(decisions.allowed_dispositions.includes(decision.disposition))
    assert.ok(decision.reason)
    assert.ok(Array.isArray(decision.evidence) && decision.evidence.length > 0)
  }

  assert.equal(loop.schema_version, 1)
  assert.equal(loop.stages.length, 12)
  assert.deepEqual(loop.stages.map((stage) => stage.order), Array.from({ length: 12 }, (_, index) => index + 1))
  assert.equal(new Set(loop.stages.map((stage) => stage.id)).size, loop.stages.length)
  for (const stage of loop.stages) {
    assert.ok(stage.domain_entities.length > 0)
    assert.ok(stage.required_evidence.length > 0)
    assert.ok(stage.pass_condition)
    assert.ok(stage.failure_state)
  }
  assert.match(loop.stages.at(-1).failure_state, /without David's approval/)

  return {
    projects: manifest.projects.length,
    recovery_decisions: decisions.decisions.length,
    operating_loop_stages: loop.stages.length,
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    console.log(JSON.stringify(verifyContracts()))
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  }
}
