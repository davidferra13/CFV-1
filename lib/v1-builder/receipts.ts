import { join } from 'node:path'
import { receiptRecordSchema, type ReceiptRecord } from './types'
import { readJsonFiles, resolveBuilderPath, toFileStamp, writeJsonFileOnce } from './store'

export async function readReceipts(root = process.cwd()) {
  const result = await readJsonFiles(resolveBuilderPath('receipts', root), receiptRecordSchema)
  return {
    ...result,
    records: result.records.sort((a, b) => new Date(b.finishedAt).getTime() - new Date(a.finishedAt).getTime()),
  }
}

export async function writeReceipt(receipt: ReceiptRecord, root = process.cwd(), now = new Date()) {
  const safeTaskId = receipt.taskId.replace(/[^a-zA-Z0-9._-]/g, '-')
  const path = join(resolveBuilderPath('receipts', root), `${toFileStamp(now)}-${safeTaskId}.json`)
  await writeJsonFileOnce(path, receiptRecordSchema, receipt)
  return path
}
