import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import test from 'node:test'

import {
  CHEFFLOW_CAPABILITY_REGISTRY,
  applyCapabilityProof,
  evaluateCapabilityProof,
  evaluateCapabilityProofFile,
  type CapabilityProofReceipt,
  type ChefFlowCapability,
} from '@/lib/capabilities'

function sha256(path: string): string {
  return createHash('sha256').update(readFileSync(path)).digest('hex')
}

function withRepo(run: (root: string) => void): void {
  const root = mkdtempSync(join(tmpdir(), 'chefflow-proof-'))
  try {
    run(root)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
}

function write(root: string, path: string, content: string): string {
  const absolute = join(root, path)
  mkdirSync(dirname(absolute), { recursive: true })
  writeFileSync(absolute, content)
  return absolute
}

function completeReceipt(root: string, capabilityId: string): CapabilityProofReceipt {
  const implementationPath = 'proof-fixtures/implementation.ts'
  const testPath = 'proof-fixtures/implementation.test.ts'
  const runtimePath = 'proof-fixtures/runtime.json'
  const implementation = write(root, implementationPath, 'export const implemented = true\n')
  const testEvidence = write(root, testPath, "test('works', () => true)\n")
  const runtime = write(root, runtimePath, '{"ok":true}\n')
  return {
    schemaVersion: 1,
    capabilityId,
    verifiedAt: new Date().toISOString(),
    verifierVersion: 'capability-proof-test/1',
    implementationEvidence: [{ path: implementationPath, sha256: sha256(implementation) }],
    testEvidence: [{ path: testPath, sha256: sha256(testEvidence) }],
    runtimeEvidence: [{ path: runtimePath, sha256: sha256(runtime) }],
    stackElimination: {
      scenario: 'Complete the chef job entirely inside ChefFlow',
      completedInsideChefFlow: true,
      externalAppSwitches: [],
    },
  }
}

const baseCapability = CHEFFLOW_CAPABILITY_REGISTRY[0] as ChefFlowCapability

test('missing receipts fail closed', () => {
  withRepo((root) => {
    const result = evaluateCapabilityProof(baseCapability, root, undefined)
    assert.equal(result.state, 'MISSING')
  })
})

test('malformed identity, hashes, and unsafe paths are invalid', () => {
  withRepo((root) => {
    const mismatch = completeReceipt(root, 'wrong-capability')
    assert.equal(evaluateCapabilityProof(baseCapability, root, mismatch).state, 'INVALID')

    const malformed = {
      ...completeReceipt(root, baseCapability.id),
      implementationEvidence: [{ path: 'proof-fixtures/implementation.ts', sha256: 'bad' }],
    }
    assert.equal(evaluateCapabilityProof(baseCapability, root, malformed).state, 'INVALID')

    const unsafe = completeReceipt(root, baseCapability.id)
    unsafe.runtimeEvidence[0] = { path: '../outside.json', sha256: 'a'.repeat(64) }
    assert.equal(evaluateCapabilityProof(baseCapability, root, unsafe).state, 'INVALID')
  })
})

test('changed or missing evidence makes a receipt stale', () => {
  withRepo((root) => {
    const receipt = completeReceipt(root, baseCapability.id)
    write(root, receipt.implementationEvidence[0].path, 'export const implemented = false\n')
    const result = evaluateCapabilityProof(baseCapability, root, receipt)
    assert.equal(result.state, 'STALE')
    assert.ok(result.reasons.some((reason) => reason.startsWith('hash changed:')))
  })
})

test('current evidence without stack elimination is incomplete', () => {
  withRepo((root) => {
    const receipt = completeReceipt(root, baseCapability.id)
    receipt.stackElimination.externalAppSwitches = ['External scheduling app']
    assert.equal(evaluateCapabilityProof(baseCapability, root, receipt).state, 'INCOMPLETE')
  })
})

test('verified proof derives completion without mutating the registry row', () => {
  withRepo((root) => {
    const receipt = completeReceipt(root, baseCapability.id)
    const evaluation = evaluateCapabilityProof(baseCapability, root, receipt)
    assert.equal(evaluation.state, 'VERIFIED')
    const promoted = applyCapabilityProof(baseCapability, evaluation)
    assert.equal(promoted.buildStatus, 'VERIFIED')
    assert.equal(promoted.testStatus, 'VERIFIED')
    assert.equal(promoted.externalInteractionRemaining, '')
    assert.equal(promoted.productDebt, false)
    assert.notEqual(promoted, baseCapability)
  })
})

test('LAUNCH_ONLY stays debt even with otherwise complete proof', () => {
  withRepo((root) => {
    const capability = {
      ...baseCapability,
      strategy: 'LAUNCH_ONLY' as const,
      productDebt: true,
      externalInteractionRemaining: 'External payroll provider',
    }
    const receipt = completeReceipt(root, capability.id)
    const evaluation = evaluateCapabilityProof(capability, root, receipt)
    assert.equal(evaluation.state, 'INCOMPLETE')
    assert.equal(applyCapabilityProof(capability, evaluation).productDebt, true)
    assert.equal(
      applyCapabilityProof(capability, { ...evaluation, state: 'VERIFIED', reasons: [] })
        .productDebt,
      true
    )
  })
})

test('receipt files are loaded from the canonical proof directory', () => {
  withRepo((root) => {
    const receipt = completeReceipt(root, baseCapability.id)
    const path = join(root, '.agents', 'capability-proofs', `${baseCapability.id}.json`)
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, JSON.stringify(receipt))
    assert.equal(evaluateCapabilityProofFile(baseCapability, root).state, 'VERIFIED')
  })
})
