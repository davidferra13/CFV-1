import { createHash } from 'crypto'
import { promises as fs } from 'fs'
import path from 'path'
import { z } from 'zod'
import type { RemyMemory } from '@/lib/ai/remy-memory-types'

const RUNTIME_MEMORY_FILE = path.join(process.cwd(), 'memory', 'runtime', 'remy.json')

const RuntimeMemoryEntrySchema = z.object({
  id: z.string().min(1).optional(),
  category: z.enum([
    'chef_preference',
    'client_insight',
    'business_rule',
    'communication_style',
    'culinary_note',
    'scheduling_pattern',
    'pricing_pattern',
    'workflow_preference',
  ]),
  content: z.string().min(1),
  importance: z.number().int().min(1).max(10).optional(),
  relatedClientName: z.string().min(1).optional(),
  enabled: z.boolean().optional(),
})

const RuntimeMemoryFileSchema = z.object({
  memories: z.array(RuntimeMemoryEntrySchema).default([]),
})

function runtimeMemoryIsEnabled(): boolean {
  return process.env.NODE_ENV !== 'production' || process.env.REMY_RUNTIME_MEMORY_ENABLED === '1'
}

function buildRuntimeMemoryId(parts: string): string {
  return createHash('sha1').update(parts).digest('hex').slice(0, 16)
}

function resolveRuntimeMemoryFile(filePath?: string): string {
  return filePath ?? process.env.REMY_RUNTIME_MEMORY_FILE ?? RUNTIME_MEMORY_FILE
}

export async function listRuntimeFileMemories(filePath?: string): Promise<RemyMemory[]> {
  if (!runtimeMemoryIsEnabled()) return []

  const resolvedPath = resolveRuntimeMemoryFile(filePath)

  let raw: string
  try {
    raw = await fs.readFile(resolvedPath, 'utf8')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []
    throw error
  }

  let json: unknown
  try {
    json = JSON.parse(raw)
  } catch (error) {
    console.error(`[remy-runtime-memory] Invalid JSON in ${resolvedPath}:`, error)
    return []
  }

  const parsed = RuntimeMemoryFileSchema.safeParse(json)
  if (!parsed.success) {
    console.error(
      `[remy-runtime-memory] Invalid memory schema in ${resolvedPath}:`,
      parsed.error.flatten()
    )
    return []
  }

  const stat = await fs.stat(resolvedPath).catch(() => null)
  const timestamp = stat?.mtime.toISOString() ?? new Date().toISOString()

  return parsed.data.memories
    .filter((entry) => entry.enabled !== false)
    .map((entry, index) => ({
      id: `runtime:${entry.id ?? buildRuntimeMemoryId(`${index}:${entry.category}:${entry.content}`)}`,
      category: entry.category,
      content: entry.content.trim(),
      importance: entry.importance ?? 5,
      accessCount: 0,
      relatedClientId: null,
      relatedClientName: entry.relatedClientName?.trim() ?? null,
      createdAt: timestamp,
      lastAccessedAt: timestamp,
      source: 'runtime_file',
      editable: false,
    }))
}
