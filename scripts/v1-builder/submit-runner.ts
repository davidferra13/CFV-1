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

const dependencies = typeof args.dependencies === 'string'
  ? args.dependencies.split(',').map((item) => item.trim()).filter(Boolean)
  : []

const result = await submitQueueRecord({
  id: typeof args.id === 'string' ? args.id : undefined,
  title: requireArg(args, 'title'),
  reason: requireArg(args, 'reason'),
  classification: typeof args.classification === 'string' ? args.classification as never : undefined,
  source: typeof args.source === 'string' ? args.source as never : 'developer',
  sourcePath: typeof args.sourcePath === 'string' ? args.sourcePath : null,
  canonicalOwner: typeof args.canonicalOwner === 'string' ? args.canonicalOwner : null,
  activeLane: typeof args.activeLane === 'string' ? args.activeLane : undefined,
  dependencies,
  risk: typeof args.risk === 'string' ? args.risk as never : undefined,
  pricingRelevant: toBoolean(args.pricingRelevant),
  overrideId: typeof args.overrideId === 'string' ? args.overrideId : null,
  v1GovernorApproved: toBoolean(args['v1-governor-approved']),
}, root)

printResult({ ok: true, ...result })
