const storeModule = await import('../../lib/v1-builder/store')
const typesModule = await import('../../lib/v1-builder/types')
const claimsModule = await import('../../lib/v1-builder/claims')
const receiptsModule = await import('../../lib/v1-builder/receipts')
const escalationsModule = await import('../../lib/v1-builder/escalations')
const summaryModule = await import('../../lib/v1-builder/cockpit-summary')
const storeRuntime = storeModule as typeof storeModule & { default?: typeof storeModule }
const typesRuntime = typesModule as typeof typesModule & { default?: typeof typesModule }
const claimsRuntime = claimsModule as typeof claimsModule & { default?: typeof claimsModule }
const receiptsRuntime = receiptsModule as typeof receiptsModule & { default?: typeof receiptsModule }
const escalationsRuntime = escalationsModule as typeof escalationsModule & { default?: typeof escalationsModule }
const summaryRuntime = summaryModule as typeof summaryModule & { default?: typeof summaryModule }
const { ensureBuilderState, readJsonl, resolveBuilderPath } = storeRuntime.default ?? storeRuntime
const { queueRecordSchema } = typesRuntime.default ?? typesRuntime
const { getClaimState } = claimsRuntime.default ?? claimsRuntime
const { readReceipts } = receiptsRuntime.default ?? receiptsRuntime
const { readOpenEscalations } = escalationsRuntime.default ?? escalationsRuntime
const { buildCockpitSummary } = summaryRuntime.default ?? summaryRuntime

export {}

async function readQueue() {
  const approved = await readJsonl(resolveBuilderPath('approved-queue.jsonl', process.cwd()), queueRecordSchema)
  const blocked = await readJsonl(resolveBuilderPath('blocked.jsonl', process.cwd()), queueRecordSchema)
  const research = await readJsonl(resolveBuilderPath('research-queue.jsonl', process.cwd()), queueRecordSchema)
  const parkedV2 = await readJsonl(resolveBuilderPath('parked-v2.jsonl', process.cwd()), queueRecordSchema)
  return {
    ok: approved.ok && blocked.ok && research.ok && parkedV2.ok,
    approved: approved.records,
    blocked: blocked.records,
    research: research.records,
    parkedV2: parkedV2.records,
    errors: [...approved.errors, ...blocked.errors, ...research.errors, ...parkedV2.errors],
  }
}

await ensureBuilderState(process.cwd())

const kind = process.argv[2] || 'summary'
const result = kind === 'summary'
  ? await buildCockpitSummary(process.cwd())
  : kind === 'queue'
    ? await readQueue()
    : kind === 'claims'
      ? await getClaimState(process.cwd())
      : kind === 'receipts'
        ? await readReceipts(process.cwd())
        : kind === 'escalations'
          ? await readOpenEscalations(process.cwd())
          : { ok: false, error: `Unknown V1 builder API kind: ${kind}` }

process.stdout.write(`${JSON.stringify(result)}\n`)
