import { parseArgs, printResult, requireArg, toBoolean } from './cli-utils'

const storeModule = await import('../../lib/v1-builder/store')
const submissionsModule = await import('../../lib/v1-builder/submissions')
const storeRuntime = storeModule as typeof storeModule & { default?: typeof storeModule }
const submissionsRuntime = submissionsModule as typeof submissionsModule & { default?: typeof submissionsModule }
const { ensureBuilderState } = storeRuntime.default ?? storeRuntime
const { promoteQueueRecord } = submissionsRuntime.default ?? submissionsRuntime

const args = parseArgs()
const root = typeof args.root === 'string' ? args.root : process.cwd()
await ensureBuilderState(root)

const result = await promoteQueueRecord({
  fromId: requireArg(args, 'from'),
  classification: requireArg(args, 'classification') as never,
  reason: typeof args.reason === 'string' ? args.reason : undefined,
  canonicalOwner: typeof args.canonicalOwner === 'string' ? args.canonicalOwner : undefined,
  activeLane: typeof args.activeLane === 'string' ? args.activeLane : undefined,
  risk: typeof args.risk === 'string' ? args.risk as never : undefined,
  pricingRelevant: args.pricingRelevant === undefined ? undefined : toBoolean(args.pricingRelevant),
  overrideId: typeof args.overrideId === 'string' ? args.overrideId : undefined,
  v1GovernorApproved: toBoolean(args['v1-governor-approved']),
}, root)

printResult({ ok: true, ...result })
