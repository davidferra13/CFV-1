import { constants as fsConstants } from 'node:fs'
import { access, appendFile, mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import type { z } from 'zod'
import type { JsonlReadResult } from './types'

export const V1_BUILDER_DIR = join(process.cwd(), 'system', 'v1-builder')

export function resolveBuilderPath(relativePath: string, root = process.cwd()) {
  return join(root, 'system', 'v1-builder', relativePath)
}

export async function pathExists(path: string) {
  try {
    await access(path, fsConstants.F_OK)
    return true
  } catch {
    return false
  }
}

export async function ensureBuilderState(root = process.cwd()) {
  const dir = resolveBuilderPath('', root)
  await mkdir(join(dir, 'claims'), { recursive: true })
  await mkdir(join(dir, 'receipts'), { recursive: true })

  const jsonlFiles = [
    'approved-queue.jsonl',
    'blocked.jsonl',
    'research-queue.jsonl',
    'parked-v2.jsonl',
    'escalations.jsonl',
    'overrides.jsonl',
  ]

  for (const file of jsonlFiles) {
    const path = resolveBuilderPath(file, root)
    if (!(await pathExists(path))) {
      await writeFile(path, '', 'utf-8')
    }
  }

  for (const file of ['claims/.gitkeep', 'receipts/.gitkeep']) {
    const path = resolveBuilderPath(file, root)
    if (!(await pathExists(path))) {
      await writeFile(path, '', 'utf-8')
    }
  }
}

export async function readJsonl<T>(
  path: string,
  schema: z.ZodType<T>,
): Promise<JsonlReadResult<T>> {
  let content = ''
  try {
    content = await readFile(path, 'utf-8')
  } catch (err) {
    return {
      ok: false,
      records: [],
      errors: [`${path}: ${(err as Error).message}`],
    }
  }

  const records: T[] = []
  const errors: string[] = []
  const lines = content.split(/\r?\n/)

  lines.forEach((line, index) => {
    const trimmed = line.trim()
    if (!trimmed) return

    try {
      const parsed = JSON.parse(trimmed)
      const result = schema.safeParse(parsed)
      if (result.success) {
        records.push(result.data)
      } else {
        errors.push(`${path}:${index + 1}: ${result.error.issues.map((issue) => issue.message).join('; ')}`)
      }
    } catch (err) {
      errors.push(`${path}:${index + 1}: ${(err as Error).message}`)
    }
  })

  return errors.length > 0 ? { ok: false, records, errors } : { ok: true, records, errors: [] }
}

export async function appendJsonl<T>(path: string, schema: z.ZodType<T>, record: T) {
  const result = schema.safeParse(record)
  if (!result.success) {
    throw new Error(result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; '))
  }
  await mkdir(dirname(path), { recursive: true })
  await appendFile(path, `${JSON.stringify(result.data)}\n`, 'utf-8')
}

export async function writeJsonFileOnce<T>(path: string, schema: z.ZodType<T>, record: T) {
  if (await pathExists(path)) {
    throw new Error(`Refusing to overwrite existing append-only record: ${path}`)
  }

  const result = schema.safeParse(record)
  if (!result.success) {
    throw new Error(result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; '))
  }

  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, `${JSON.stringify(result.data, null, 2)}\n`, 'utf-8')
}

export async function readJsonFiles<T>(dir: string, schema: z.ZodType<T>) {
  const records: T[] = []
  const errors: string[] = []

  try {
    const entries = await readdir(dir, { withFileTypes: true })
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith('.json')) continue
      const path = join(dir, entry.name)
      try {
        const parsed = JSON.parse(await readFile(path, 'utf-8'))
        const result = schema.safeParse(parsed)
        if (result.success) {
          records.push(result.data)
        } else {
          errors.push(`${path}: ${result.error.issues.map((issue) => issue.message).join('; ')}`)
        }
      } catch (err) {
        errors.push(`${path}: ${(err as Error).message}`)
      }
    }
  } catch (err) {
    return { ok: false as const, records, errors: [`${dir}: ${(err as Error).message}`] }
  }

  return errors.length > 0
    ? { ok: false as const, records, errors }
    : { ok: true as const, records, errors: [] }
}

export function toFileStamp(date = new Date()) {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')
}
