'use server'

import { createServerClient } from '@/lib/db/server'
import type { DefaultMealTimes } from '../types'
import type { GroupAccessInput } from './shared'
import {
  hasManagerAccess,
  normalizeGroupAccessInput,
  requireChefOrAdmin,
  resolveProfile,
} from './shared'

export async function updateGroupDefaultHeadCount(input: {
  groupId: string
  profileToken: string
  defaultHeadCount: number
}): Promise<{ success: boolean; error?: string }> {
  try {
    const db: any = createServerClient({ admin: true })
    const profile = await resolveProfile(db, input.profileToken)
    await requireChefOrAdmin(db, input.groupId, profile.id)

    const { error } = await db
      .from('hub_groups')
      .update({ default_head_count: input.defaultHeadCount, updated_at: new Date().toISOString() })
      .eq('id', input.groupId)

    if (error) throw new Error(error.message)
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function getGroupDefaultHeadCount(
  input: string | GroupAccessInput
): Promise<number | null> {
  const { groupId, profileToken } = normalizeGroupAccessInput(input)
  const db: any = createServerClient({ admin: true })
  if (!(await hasManagerAccess(db, groupId, profileToken))) return null

  const { data } = await db
    .from('hub_groups')
    .select('default_head_count')
    .eq('id', groupId)
    .single()
  return data?.default_head_count ?? null
}

// ===========================================================================
// DEFAULT MEAL TIMES
// ===========================================================================

export async function getDefaultMealTimes(
  input: string | GroupAccessInput
): Promise<DefaultMealTimes | null> {
  const { groupId, profileToken } = normalizeGroupAccessInput(input)
  const db: any = createServerClient({ admin: true })
  if (!(await hasManagerAccess(db, groupId, profileToken))) return null

  const { data } = await db
    .from('hub_groups')
    .select('default_meal_times')
    .eq('id', groupId)
    .single()
  return data?.default_meal_times ?? null
}

export async function updateDefaultMealTimes(input: {
  groupId: string
  profileToken: string
  times: DefaultMealTimes
}): Promise<{ success: boolean; error?: string }> {
  try {
    const db: any = createServerClient({ admin: true })
    const profile = await resolveProfile(db, input.profileToken)
    await requireChefOrAdmin(db, input.groupId, profile.id)

    const { error } = await db
      .from('hub_groups')
      .update({
        default_meal_times: input.times,
        updated_at: new Date().toISOString(),
      })
      .eq('id', input.groupId)

    if (error) throw new Error(error.message)
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}
