'use server'

// Knowledge explore/sharing (stub, pending full implementation)

import type { ChefTip } from '@/lib/chef/knowledge/tip-types'
import type { ChefNote } from '@/lib/chef/knowledge/note-types'

export async function getSharedTips(_opts?: {
  tag?: string
  limit?: number
}): Promise<{ tips: ChefTip[]; total: number }> {
  return { tips: [], total: 0 }
}

export async function getSharedNotes(_opts?: {
  tag?: string
  limit?: number
}): Promise<{ notes: ChefNote[]; total: number }> {
  return { notes: [], total: 0 }
}

export async function getMatchingChefsByTags(
  _tags?: string[]
): Promise<{ id: string; name: string; matchedTags: string[] }[]> {
  return []
}
