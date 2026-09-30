#!/usr/bin/env node

import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const MANIFEST_PATH = resolve(ROOT, 'config', 'chef-os-coverage.json')
const VALID_STATES = new Set(['not_built', 'partial', 'functional', 'closed_loop_verified'])
const REQUIRED_PHASES = new Set([
  'foundation',
  'ingredients',
  'vendors',
  'culinary',
  'planning',
  'procurement',
  'receiving',
  'inventory',
  'kitchen',
  'food-safety',
  'service',
  'closeout',
  'finance',
  'people',
  'facilities',
  'compliance',
  'documents',
  'management',
  'platform',
])
const MINIMUM_WORKFLOW_COUNT = 100

function parseArgs(argv) {
  return {
    strict: argv.includes('--strict'),
    json: argv.includes('--json'),
  }
}

function addError(errors, condition, message) {
  if (!condition) errors.push(message)
}

function summarize(workflows) {
  const byStatus = Object.fromEntries([...VALID_STATES].map((state) => [state, 0]))
  const byPhase = {}

  for (const workflow of workflows) {
    byStatus[workflow.status] = (byStatus[workflow.status] ?? 0) + 1
    byPhase[workflow.phase] = (byPhase[workflow.phase] ?? 0) + 1
  }

  return {
    total: workflows.length,
    byStatus,
    byPhase,
    manualExternalSteps: workflows.filter((workflow) => workflow.requiresManualExternalStep).length,
    remainingToClose: workflows.filter((workflow) => workflow.status !== 'closed_loop_verified').length,
  }
}
function validate(manifest) {
  const errors = []
  addError(errors, manifest?.schemaVersion === 1, 'schemaVersion must equal 1')
  addError(errors, typeof manifest?.productRule === 'string' && manifest.productRule.length > 20, 'productRule is required')
  addError(errors, Array.isArray(manifest?.workflows), 'workflows must be an array')

  const workflows = Array.isArray(manifest?.workflows) ? manifest.workflows : []
  addError(
    errors,
    workflows.length >= MINIMUM_WORKFLOW_COUNT,
    'coverage manifest must contain at least ' + MINIMUM_WORKFLOW_COUNT + ' workflows'
  )

  const seenIds = new Set()
  const seenPhases = new Set()

  for (const workflow of workflows) {
    addError(errors, typeof workflow.id === 'string' && workflow.id.length > 0, 'every workflow requires an id')
    addError(errors, !seenIds.has(workflow.id), 'duplicate workflow id: ' + workflow.id)
    seenIds.add(workflow.id)
    seenPhases.add(workflow.phase)

    addError(errors, typeof workflow.name === 'string' && workflow.name.length > 0, workflow.id + ': name is required')
    addError(errors, REQUIRED_PHASES.has(workflow.phase), workflow.id + ': invalid phase ' + workflow.phase)
    addError(errors, VALID_STATES.has(workflow.status), workflow.id + ': invalid status ' + workflow.status)
    addError(
      errors,
      typeof workflow.requiresManualExternalStep === 'boolean',
      workflow.id + ': requiresManualExternalStep must be boolean'
    )
    addError(
      errors,
      Array.isArray(workflow.evidence) && workflow.evidence.length > 0,
      workflow.id + ': at least one evidence reference is required'
    )
    addError(errors, typeof workflow.gap === 'string' && workflow.gap.length > 0, workflow.id + ': gap is required')

    if (workflow.status === 'closed_loop_verified') {
      addError(
        errors,
        workflow.requiresManualExternalStep === false,
        workflow.id + ': closed_loop_verified cannot require a manual external step'
      )
      addError(
        errors,
        Array.isArray(workflow.verification) && workflow.verification.length > 0,
        workflow.id + ': closed_loop_verified requires current verification evidence'
      )
    }
  }

  for (const phase of REQUIRED_PHASES) {
    addError(errors, seenPhases.has(phase), 'missing required phase: ' + phase)
  }

  return errors
}
async function main() {
  const args = parseArgs(process.argv.slice(2))
  const raw = await readFile(MANIFEST_PATH, 'utf8')
  const manifest = JSON.parse(raw)
  const errors = validate(manifest)
  const summary = summarize(manifest.workflows ?? [])

  if (args.strict) {
    const incomplete = (manifest.workflows ?? []).filter(
      (workflow) => workflow.status !== 'closed_loop_verified' || workflow.requiresManualExternalStep
    )
    if (incomplete.length > 0) {
      errors.push(
        'strict completeness failed: ' +
          incomplete.length +
          ' workflow(s) are not closed-loop verified inside ChefFlow'
      )
    }
  }

  const result = {
    ok: errors.length === 0,
    strict: args.strict,
    manifest: 'config/chef-os-coverage.json',
    productRule: manifest.productRule,
    summary,
    errors,
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log(
      '[chef-os-coverage] total=' +
        summary.total +
        ' closed=' +
        summary.byStatus.closed_loop_verified +
        ' functional=' +
        summary.byStatus.functional +
        ' partial=' +
        summary.byStatus.partial +
        ' not_built=' +
        summary.byStatus.not_built +
        ' manual_external=' +
        summary.manualExternalSteps
    )

    if (errors.length === 0) {
      console.log(args.strict ? '[chef-os-coverage] COMPLETE' : '[chef-os-coverage] MANIFEST VALID')
    } else {
      console.error('[chef-os-coverage] FAIL')
      for (const error of errors) console.error('- ' + error)
    }
  }

  if (errors.length > 0) process.exitCode = 1
}

main().catch((error) => {
  console.error('[chef-os-coverage] ERROR ' + (error.stack || error.message))
  process.exitCode = 1
})
