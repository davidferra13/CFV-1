'use server'

import { requireAdmin } from '@/lib/auth/admin'
import { pgClient } from '@/lib/db'
import { promises as fs } from 'fs'
import path from 'path'
import type {
  ArchiveDigesterJob,
  CreateDigesterJobInput,
  DigesterJobListResult,
  DigesterProcessResult,
  DigesterExtractedData,
  DigesterFileType,
  ExtractedLineItem,
} from './archive-digester-types'

// ---------------------------------------------------------------------------
// OpenClaw Archive Digester (OPENCLAW #2)
// Pipeline: upload -> classify -> extract -> store
// No external APIs. Pure local FS + regex extraction.
// ---------------------------------------------------------------------------

/**
 * Create a new digester job for a local file path.
 */
export async function createDigesterJob(
  input: CreateDigesterJobInput
): Promise<ArchiveDigesterJob> {
  await requireAdmin()

  const rows = await pgClient`
    INSERT INTO archive_digester_jobs (file_path, file_type, status, tenant_id)
    VALUES (
      ${input.filePath},
      ${classifyFileType(input.filePath)},
      'pending',
      ${input.tenantId ?? null}
    )
    RETURNING
      job_id, file_path, file_type, status,
      extracted_data, tenant_id, error_message,
      created_at, updated_at
  `

  return mapRow(rows[0] as DbRow)
}

/**
 * List digester jobs, optionally filtered by tenant.
 */
export async function listDigesterJobs(
  tenantId?: string,
  limit = 50
): Promise<DigesterJobListResult> {
  await requireAdmin()

  const rows = tenantId
    ? await pgClient`
        SELECT job_id, file_path, file_type, status,
               extracted_data, tenant_id, error_message,
               created_at, updated_at
        FROM archive_digester_jobs
        WHERE tenant_id = ${tenantId}
        ORDER BY created_at DESC
        LIMIT ${limit}
      `
    : await pgClient`
        SELECT job_id, file_path, file_type, status,
               extracted_data, tenant_id, error_message,
               created_at, updated_at
        FROM archive_digester_jobs
        ORDER BY created_at DESC
        LIMIT ${limit}
      `

  const countRows = tenantId
    ? await pgClient`SELECT COUNT(*)::int AS count FROM archive_digester_jobs WHERE tenant_id = ${tenantId}`
    : await pgClient`SELECT COUNT(*)::int AS count FROM archive_digester_jobs`

  return {
    jobs: (rows as unknown as DbRow[]).map(mapRow),
    total: (countRows[0] as { count: number }).count,
    runAt: new Date().toISOString(),
  }
}

/**
 * Process a pending digester job: classify -> extract -> store results.
 */
export async function processDigesterJob(jobId: string): Promise<DigesterProcessResult> {
  await requireAdmin()

  // Claim the job
  await pgClient`
    UPDATE archive_digester_jobs
    SET status = 'processing', updated_at = now()
    WHERE job_id = ${jobId} AND status = 'pending'
  `

  const jobRows = await pgClient`
    SELECT job_id, file_path, file_type, tenant_id
    FROM archive_digester_jobs
    WHERE job_id = ${jobId}
  `

  if (!jobRows.length) {
    return { jobId, success: false, extractedItemCount: 0, error: 'Job not found' }
  }

  const job = jobRows[0] as unknown as {
    job_id: string
    file_path: string
    file_type: string
    tenant_id: string | null
  }

  try {
    const extractedData = await extractFromFile(job.file_path, job.file_type as DigesterFileType)

    await pgClient`
      UPDATE archive_digester_jobs
      SET
        status = 'completed',
        extracted_data = ${pgClient.json(extractedData as any)},
        updated_at = now()
      WHERE job_id = ${jobId}
    `

    return {
      jobId,
      success: true,
      extractedItemCount: extractedData.items.length,
    }
  } catch (err) {
    const errMsg = String(err)
    await pgClient`
      UPDATE archive_digester_jobs
      SET status = 'failed', error_message = ${errMsg}, updated_at = now()
      WHERE job_id = ${jobId}
    `
    return {
      jobId,
      success: false,
      extractedItemCount: 0,
      error: errMsg,
    }
  }
}

/**
 * Run all pending digester jobs in the queue (up to batchSize at once).
 */
export async function runDigesterBatch(batchSize = 10): Promise<DigesterProcessResult[]> {
  await requireAdmin()

  const pendingRows = await pgClient`
    SELECT job_id FROM archive_digester_jobs
    WHERE status = 'pending'
    ORDER BY created_at ASC
    LIMIT ${batchSize}
  `

  const results = await Promise.all(
    (pendingRows as unknown as { job_id: string }[]).map((r) => processDigesterJob(r.job_id))
  )

  return results
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function classifyFileType(filePath: string): DigesterFileType {
  const lower = filePath.toLowerCase()
  if (lower.includes('invoice')) return 'invoice'
  if (lower.includes('receipt')) return 'receipt'
  if (lower.includes('price') || lower.includes('pricelist')) return 'price_list'
  if (lower.includes('catalog') || lower.includes('catalogue')) return 'catalog'
  if (lower.includes('menu')) return 'menu'
  return 'unknown'
}

async function extractFromFile(
  filePath: string,
  fileType: DigesterFileType
): Promise<DigesterExtractedData> {
  const absPath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath)

  const content = await fs.readFile(absPath, 'utf-8')
  const lines = content.split('\n')
  const items: ExtractedLineItem[] = []

  // Simple line-item extraction: match patterns like "2x Chicken Breast @ $12.50"
  const lineItemPattern = /(\d+(?:\.\d+)?)\s*x?\s+(.+?)\s+[@$]\s*(\d+(?:\.\d+)?)/gi
  for (const line of lines) {
    let match
    while ((match = lineItemPattern.exec(line)) !== null) {
      items.push({
        quantity: parseFloat(match[1]),
        name: match[2].trim(),
        unitPrice: parseFloat(match[3]),
      })
    }
  }

  // Fall back: extract any dollar amounts with adjacent text
  if (items.length === 0) {
    const pricePattern = /(.{3,40}?)\s+\$(\d+(?:\.\d{2})?)/g
    for (const line of lines.slice(0, 100)) {
      let match
      while ((match = pricePattern.exec(line)) !== null) {
        items.push({
          name: match[1].trim(),
          unitPrice: parseFloat(match[2]),
        })
      }
    }
  }

  return {
    fileType,
    items: items.slice(0, 200), // cap items per job
    rawText: content.slice(0, 2000),
    confidence: items.length > 0 ? 0.7 : 0.2,
  }
}

interface DbRow {
  job_id: string
  file_path: string
  file_type: string
  status: string
  extracted_data: DigesterExtractedData | null
  tenant_id: string | null
  error_message: string | null
  created_at: Date
  updated_at: Date
}

function mapRow(row: DbRow): ArchiveDigesterJob {
  return {
    jobId: row.job_id,
    filePath: row.file_path,
    fileType: row.file_type as DigesterFileType,
    status: row.status as ArchiveDigesterJob['status'],
    extractedData: row.extracted_data,
    tenantId: row.tenant_id,
    errorMessage: row.error_message,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  }
}
