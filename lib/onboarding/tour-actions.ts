'use server'

// Product Tour Server Actions
// Read and write tour progress for the current user.

import { requireAuth } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidateTag } from 'next/cache'

export type TourProgress = {
  completedSteps: string[]
  welcomeSeenAt: string | null
  checklistDismissedAt: string | null
  tourDismissedAt: string | null
}

const EMPTY_PROGRESS: TourProgress = {
  completedSteps: [],
  welcomeSeenAt: null,
  checklistDismissedAt: null,
  tourDismissedAt: null,
}

export async function getTourProgress(): Promise<TourProgress> {
  const user = await requireAuth()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('product_tour_progress')
    .select('completed_steps, welcome_seen_at, checklist_dismissed_at, tour_dismissed_at')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (error || !data) return EMPTY_PROGRESS

  return {
    completedSteps: data.completed_steps ?? [],
    welcomeSeenAt: data.welcome_seen_at,
    checklistDismissedAt: data.checklist_dismissed_at,
    tourDismissedAt: data.tour_dismissed_at,
  }
}

export async function completeStep(stepId: string): Promise<void> {
  const user = await requireAuth()
  const db: any = createServerClient()

  // Upsert: create row if not exists, append step if not already in array
  const { data: existing } = await db
    .from('product_tour_progress')
    .select('id, completed_steps')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (existing) {
    const steps: string[] = existing.completed_steps ?? []
    if (steps.includes(stepId)) return // already done

    await db
      .from('product_tour_progress')
      .update({
        completed_steps: [...steps, stepId],
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
  } else {
    await db.from('product_tour_progress').insert({
      auth_user_id: user.id,
      role: user.role,
      completed_steps: [stepId],
    })
  }

  revalidateTag(`tour-progress-${user.id}`)
}

export async function completeMultipleSteps(stepIds: string[]): Promise<void> {
  const user = await requireAuth()
  const db: any = createServerClient()

  const { data: existing } = await db
    .from('product_tour_progress')
    .select('id, completed_steps')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (existing) {
    const current: string[] = existing.completed_steps ?? []
    const newSteps = stepIds.filter((s) => !current.includes(s))
    if (newSteps.length === 0) return

    await db
      .from('product_tour_progress')
      .update({
        completed_steps: [...current, ...newSteps],
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
  } else {
    await db.from('product_tour_progress').insert({
      auth_user_id: user.id,
      role: user.role,
      completed_steps: stepIds,
    })
  }

  revalidateTag(`tour-progress-${user.id}`)
}

export async function markWelcomeSeen(): Promise<void> {
  const user = await requireAuth()
  const db: any = createServerClient()

  const { data: existing } = await db
    .from('product_tour_progress')
    .select('id')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (existing) {
    await db
      .from('product_tour_progress')
      .update({
        welcome_seen_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
  } else {
    await db.from('product_tour_progress').insert({
      auth_user_id: user.id,
      role: user.role,
      welcome_seen_at: new Date().toISOString(),
    })
  }

  revalidateTag(`tour-progress-${user.id}`)
}

export async function dismissChecklist(): Promise<void> {
  const user = await requireAuth()
  const db: any = createServerClient()

  const { data: existing } = await db
    .from('product_tour_progress')
    .select('id')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (existing) {
    await db
      .from('product_tour_progress')
      .update({
        checklist_dismissed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
  } else {
    await db.from('product_tour_progress').insert({
      auth_user_id: user.id,
      role: user.role,
      checklist_dismissed_at: new Date().toISOString(),
    })
  }

  revalidateTag(`tour-progress-${user.id}`)
}

export async function dismissTour(): Promise<void> {
  const user = await requireAuth()
  const db: any = createServerClient()

  const { data: existing } = await db
    .from('product_tour_progress')
    .select('id')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (existing) {
    await db
      .from('product_tour_progress')
      .update({
        tour_dismissed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
  } else {
    await db.from('product_tour_progress').insert({
      auth_user_id: user.id,
      role: user.role,
      tour_dismissed_at: new Date().toISOString(),
    })
  }

  revalidateTag(`tour-progress-${user.id}`)
}

export async function resetTourProgress(): Promise<void> {
  const user = await requireAuth()
  const db: any = createServerClient()

  await db.from('product_tour_progress').delete().eq('auth_user_id', user.id)

  revalidateTag(`tour-progress-${user.id}`)
}
