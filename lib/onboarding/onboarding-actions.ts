'use server'

import { createServerClient } from '@/lib/supabase/server'
import { requireChef } from '@/lib/auth/get-user'
import { revalidatePath } from 'next/cache'
import { WIZARD_STEPS, type OnboardingStepKey } from './onboarding-constants'

// ============================================
// SERVER ACTIONS
// ============================================

export async function getOnboardingProgress() {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const supabase: any = createServerClient()

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
  const supabase: any = createServerClient()

  const { error } = await supabase.from('onboarding_progress').upsert(
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
  const supabase: any = createServerClient()

  const { error } = await supabase.from('onboarding_progress').upsert(
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
  const supabase: any = createServerClient()

  const { error } = await supabase.from('onboarding_progress').delete().eq('chef_id', tenantId)

  if (error) {
    console.error('[onboarding] Failed to reset onboarding', error)
    return { success: false, error: 'Failed to reset onboarding' }
  }

  revalidatePath('/dashboard')
  return { success: true }
}

export async function getOnboardingStatus() {
  const progress = await getOnboardingProgress()

  // Count only against the 3 required wizard steps for banner/status purposes
  const totalSteps = WIZARD_STEPS.length
  const wizardKeys = new Set(WIZARD_STEPS.map((s) => s.key))
  const wizardProgress = progress.filter((p: any) => wizardKeys.has(p.step_key))
  const completed = wizardProgress.filter((p: any) => p.completed_at).length
  const skipped = wizardProgress.filter((p: any) => p.skipped).length
  const percentComplete = Math.round((completed / totalSteps) * 100)

  // Find the first wizard step not yet completed or skipped
  const doneKeys = new Set(progress.map((p: any) => p.step_key))
  const currentStep = WIZARD_STEPS.find((s) => !doneKeys.has(s.key))?.key ?? null

  return {
    totalSteps,
    completed,
    skipped,
    percentComplete,
    currentStep,
    progress,
  }
}
