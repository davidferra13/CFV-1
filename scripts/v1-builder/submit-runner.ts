import { readFile } from 'node:fs/promises'
import { parseArgs, printResult, requireArg, toBoolean } from './cli-utils'

const storeModule = await import('../../lib/v1-builder/store')
const submissionsModule = await import('../../lib/v1-builder/submissions')
const storeRuntime = storeModule as typeof storeModule & { default?: typeof storeModule }
const submissionsRuntime = submissionsModule as typeof submissionsModule & { default?: typeof submissionsModule }
const { ensureBuilderState } = storeRuntime.default ?? storeRuntime
const { submitQueueRecord } = submissionsRuntime.default ?? submissionsRuntime

const args = parseArgs()
const root = typeof args.root === 'string' ? args.root : process.cwd()
await ensureBuilderState(root)

const payload = typeof args.payloadPath === 'string'
  ? JSON.parse(await readFile(args.payloadPath, 'utf8')) as Record<string, unknown>
  : null

function stringValue(name: string) {
  const payloadValue = payload?.[name]
  if (typeof payloadValue === 'string') return payloadValue
  const argValue = args[name]
  if (typeof argValue === 'string') return argValue
  return undefined
}

function requiredStringValue(name: string) {
  const value = stringValue(name)
  if (typeof value === 'string' && value.trim()) return value.trim()
  return requireArg(args, name)
}

function booleanValue(name: string) {
  const payloadValue = payload?.[name]
  if (typeof payloadValue === 'boolean') return payloadValue
  return toBoolean(args[name])
}

const source = stringValue('source')
const dependencies = Array.isArray(payload?.dependencies)
  ? payload.dependencies.filter((item): item is string => typeof item === 'string' && Boolean(item.trim()))
  : typeof args.dependencies === 'string'
  ? args.dependencies.split(',').map((item) => item.trim()).filter(Boolean)
  : []

const result = await submitQueueRecord({
  id: stringValue('id'),
  title: requiredStringValue('title'),
  reason: requiredStringValue('reason'),
  classification: stringValue('classification') as never,
  source: typeof source === 'string' ? source as never : 'developer',
  sourcePath: stringValue('sourcePath') ?? null,
  canonicalOwner: stringValue('canonicalOwner') ?? null,
  activeLane: stringValue('activeLane'),
  dependencies,
  risk: stringValue('risk') as never,
  pricingRelevant: booleanValue('pricingRelevant'),
  overrideId: stringValue('overrideId') ?? null,
  v1GovernorApproved: booleanValue('v1GovernorApproved') || toBoolean(args['v1-governor-approved']),
}, root)

printResult({ ok: true, ...result })
