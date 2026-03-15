'use server'

import { createServerClient } from '@/lib/supabase/server'
import { requireChef } from '@/lib/auth/get-user'
import { revalidatePath } from 'next/cache'

// ============================================
// ONBOARDING STEPS (ordered)
// ============================================

export const ONBOARDING_STEPS = [
  {
    key: 'profile',
    title: 'Your Business',
    description: 'Business name, cuisine, service area',
    icon: 'user',
  },
  {
    key: 'services',
    title: 'Your Services',
    description: 'What services you offer (private dining, meal prep, catering, classes)',
    icon: 'briefcase',
  },
  {
    key: 'first_client',
    title: 'First Client',
    description: 'Add your first client (name, email, dietary)',
    icon: 'users',
  },
  {
    key: 'first_recipe',
    title: 'First Recipe',
    description: 'Add your first recipe or import one',
    icon: 'book-open',
  },
  {
    key: 'first_event',
    title: 'First Event',
    description: 'Create your first event',
    icon: 'calendar',
  },
  {
    key: 'pricing',
    title: 'Pricing',
    description: 'Set base rates and pricing',
    icon: 'dollar-sign',
  },
  {
    key: 'calendar',
    title: 'Availability',
    description: 'Set your availability and working hours',
    icon: 'clock',
  },
  {
    key: 'communication',
    title: 'Communication',
    description: 'Set up email and inquiry preferences',
    icon: 'mail',
  },
] as const

export type OnboardingStepKey = (typeof ONBOARDING_STEPS)[number]['key']

// ============================================
// SERVER ACTIONS
// ============================================

export async function getOnboardingProgress() {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('onboarding_progress')
    .select('step_key, completed_at, skipped, data')
    .eq('chef_id', tenantId)

  if (error) {
    console.error('[onboarding] Failed to get progress', error)
    return []
  }

  return data ?? []
}

export async function completeStep(stepKey: string, data?: Record<string, unknown>) {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const supabase = createServerClient()

  const { error } = await supabase
    .from('onboarding_progress')
    .upsert(
      {
        chef_id: tenantId,
        step_key: stepKey,
        completed_at: new Date().toISOString(),
        skipped: false,
        data: data ?? {},
      },
      { onConflict: 'chef_id,step_key' }
    )

  if (error) {
    console.error('[onboarding] Failed to complete step', error)
    return { success: false, error: 'Failed to save progress' }
  }

  revalidatePath('/dashboard')
  return { success: true }
}

export async function skipStep(stepKey: string) {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const supabase = createServerClient()

  const { error } = await supabase
    .from('onboarding_progress')
    .upsert(
      {
        chef_id: tenantId,
        step_key: stepKey,
        skipped: true,
        data: {},
      },
      { onConflict: 'chef_id,step_key' }
    )

  if (error) {
    console.error('[onboarding] Failed to skip step', error)
    return { success: false, error: 'Failed to save progress' }
  }

  revalidatePath('/dashboard')
  return { success: true }
}

export async function resetOnboarding() {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const supabase = createServerClient()

  const { error } = await supabase
    .from('onboarding_progress')
    .delete()
    .eq('chef_id', tenantId)

  if (error) {
    console.error('[onboarding] Failed to reset onboarding', error)
    return { success: false, error: 'Failed to reset onboarding' }
  }

  revalidatePath('/dashboard')
  return { success: true }
}

export async function getOnboardingStatus() {
  const progress = await getOnboardingProgress()

  const totalSteps = ONBOARDING_STEPS.length
  const completed = progress.filter((p) => p.completed_at).length
  const skipped = progress.filter((p) => p.skipped).length
  const percentComplete = Math.round((completed / totalSteps) * 100)

  // Find the first step that hasn't been completed or skipped
  const doneKeys = new Set(progress.map((p) => p.step_key))
  const currentStep =
    ONBOARDING_STEPS.find((s) => !doneKeys.has(s.key))?.key ?? null

  return {
    totalSteps,
    completed,
    skipped,
    percentComplete,
    currentStep,
    progress,
  }
}
