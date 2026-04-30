import { escalationRecordSchema, type EscalationRecord } from './types'
import { appendJsonl, readJsonl, resolveBuilderPath } from './store'

export async function readEscalations(root = process.cwd()) {
  return readJsonl(resolveBuilderPath('escalations.jsonl', root), escalationRecordSchema)
}

export async function readOpenEscalations(root = process.cwd()) {
  const result = await readEscalations(root)
  return {
    ...result,
    records: result.records.filter((record) => record.status === 'open'),
  }
}

export async function appendEscalation(escalation: EscalationRecord, root = process.cwd()) {
  const path = resolveBuilderPath('escalations.jsonl', root)
  await appendJsonl(path, escalationRecordSchema, escalation)
  return path
}
