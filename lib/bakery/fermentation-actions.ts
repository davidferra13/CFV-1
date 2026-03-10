'use server'

import { requireChef } from '@/lib/auth/get-user'
import { STAGE_ORDER, type FermentationStage } from '@/lib/bakery/fermentation-shared'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ---- Types ----

export type FermentationLog = {
  id: string
  tenant_id: string
  batch_id: string | null
  recipe_name: string
  stage: FermentationStage
  start_time: string
  end_time: string | null
  target_duration_minutes: number | null
  temperature_f: number | null
  ambient_temp_f: number | null
  humidity_percent: number | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type AverageTime = {
  stage: FermentationStage
  avg_duration_minutes: number
  count: number
}

// ---- Actions ----

export async function startStage(input: {
  batch_id?: string
  recipe_name: string
  stage: FermentationStage
  target_duration_minutes?: number
  temperature_f?: number
  ambient_temp_f?: number
  humidity_percent?: number
  notes?: string
}): Promise<FermentationLog> {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('fermentation_logs')
    .insert({
      tenant_id: user.entityId!,
      batch_id: input.batch_id ?? null,
      recipe_name: input.recipe_name,
      stage: input.stage,
      start_time: new Date().toISOString(),
      target_duration_minutes: input.target_duration_minutes ?? null,
      temperature_f: input.temperature_f ?? null,
      ambient_temp_f: input.ambient_temp_f ?? null,
      humidity_percent: input.humidity_percent ?? null,
      notes: input.notes ?? null,
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to start stage: ${error.message}`)
  revalidatePath('/bakery/fermentation')
  return data as unknown as FermentationLog
}

export async function endStage(id: string): Promise<FermentationLog> {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('fermentation_logs')
    .update({
      end_time: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('tenant_id', user.entityId!)
    .select()
    .single()

  if (error) throw new Error(`Failed to end stage: ${error.message}`)
  revalidatePath('/bakery/fermentation')
  return data as unknown as FermentationLog
}

export async function logTemperature(
  id: string,
  temperature_f: number,
  ambient_temp_f?: number
): Promise<FermentationLog> {
  const user = await requireChef()
  const supabase = createServerClient()

  const update: Record<string, unknown> = {
    temperature_f,
    updated_at: new Date().toISOString(),
  }
  if (ambient_temp_f !== undefined) {
    update.ambient_temp_f = ambient_temp_f
  }

  const { data, error } = await supabase
    .from('fermentation_logs')
    .update(update)
    .eq('id', id)
    .eq('tenant_id', user.entityId!)
    .select()
    .single()

  if (error) throw new Error(`Failed to log temperature: ${error.message}`)
  revalidatePath('/bakery/fermentation')
  return data as unknown as FermentationLog
}

export async function getActiveStages(): Promise<FermentationLog[]> {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('fermentation_logs')
    .select('*')
    .eq('tenant_id', user.entityId!)
    .is('end_time', null)
    .order('start_time', { ascending: false })

  if (error) throw new Error(`Failed to fetch active stages: ${error.message}`)
  return (data ?? []) as unknown as FermentationLog[]
}

export async function getLogForBatch(batchId: string): Promise<FermentationLog[]> {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('fermentation_logs')
    .select('*')
    .eq('tenant_id', user.entityId!)
    .eq('batch_id', batchId)
    .order('start_time', { ascending: true })

  if (error) throw new Error(`Failed to fetch batch logs: ${error.message}`)
  return (data ?? []) as unknown as FermentationLog[]
}

export async function getRecentLogs(days: number = 7): Promise<FermentationLog[]> {
  const user = await requireChef()
  const supabase = createServerClient()

  const since = new Date()
  since.setDate(since.getDate() - days)

  const { data, error } = await supabase
    .from('fermentation_logs')
    .select('*')
    .eq('tenant_id', user.entityId!)
    .gte('start_time', since.toISOString())
    .order('start_time', { ascending: false })

  if (error) throw new Error(`Failed to fetch recent logs: ${error.message}`)
  return (data ?? []) as unknown as FermentationLog[]
}

export async function getAverageTimes(recipeName: string): Promise<AverageTime[]> {
  const user = await requireChef()
  const supabase = createServerClient()

  // Get all completed stages for this recipe
  const { data, error } = await supabase
    .from('fermentation_logs')
    .select('stage, start_time, end_time')
    .eq('tenant_id', user.entityId!)
    .eq('recipe_name', recipeName)
    .not('end_time', 'is', null)

  if (error) throw new Error(`Failed to fetch averages: ${error.message}`)
  if (!data || data.length === 0) return []

  // Group by stage and compute average duration (deterministic math)
  const stageMap = new Map<string, { totalMinutes: number; count: number }>()

  for (const log of data) {
    const start = new Date(log.start_time).getTime()
    const end = new Date(log.end_time!).getTime()
    const durationMinutes = (end - start) / (1000 * 60)

    if (durationMinutes <= 0) continue

    const existing = stageMap.get(log.stage)
    if (existing) {
      existing.totalMinutes += durationMinutes
      existing.count += 1
    } else {
      stageMap.set(log.stage, { totalMinutes: durationMinutes, count: 1 })
    }
  }

  const results: AverageTime[] = []
  for (const [stage, stats] of stageMap) {
    results.push({
      stage: stage as FermentationStage,
      avg_duration_minutes: Math.round(stats.totalMinutes / stats.count),
      count: stats.count,
    })
  }

  // Sort by stage order
  return results.sort((a, b) => STAGE_ORDER.indexOf(a.stage) - STAGE_ORDER.indexOf(b.stage))
}
