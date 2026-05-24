'use server'

import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { requireChef } from '@/lib/auth/get-user'
import type { BodyMap, BodyMapSummary } from './body-map-types'

const BODY_MAP_PATH = join(process.cwd(), 'docs', 'body-map.json')

function loadBodyMap(): BodyMap {
  if (!existsSync(BODY_MAP_PATH)) {
    throw new Error('body-map.json not found. Run: npx tsx scripts/generate-body-map.ts')
  }
  return JSON.parse(readFileSync(BODY_MAP_PATH, 'utf-8')) as BodyMap
}

export async function getBodyMap(): Promise<BodyMap> {
  await requireChef()
  return loadBodyMap()
}

export async function getBodyMapSummary(): Promise<BodyMapSummary> {
  await requireChef()
  const map = loadBodyMap()
  const sorted = [...map.organs].sort((a, b) => b.fileCount - a.fileCount)
  const mapped = map.totalFiles - map.unmappedFiles.length
  return {
    organCount: map.organs.length,
    totalFiles: map.totalFiles,
    coveragePercent: map.totalFiles > 0 ? Math.round((mapped / map.totalFiles) * 1000) / 10 : 0,
    largestOrgan: sorted[0]?.name ?? 'none',
    smallestOrgan: sorted[sorted.length - 1]?.name ?? 'none',
  }
}

export async function getOrganFiles(organName: string): Promise<string[]> {
  await requireChef()
  const map = loadBodyMap()
  const organ = map.organs.find((o) => o.name === organName)
  if (!organ) return []
  return [...organ.files, ...organ.routes, ...organ.components]
}

export async function getUnmappedFiles(): Promise<string[]> {
  await requireChef()
  const map = loadBodyMap()
  return map.unmappedFiles
}
