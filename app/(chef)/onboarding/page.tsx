import { getOnboardingProgress } from '@/lib/onboarding/progress-actions'
import { OnboardingWizard } from '@/components/onboarding/onboarding-wizard'
import { OnboardingHub } from '@/components/onboarding/onboarding-hub'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { WIZARD_STEPS } from '@/lib/onboarding/onboarding-constants'

export const metadata = { title: 'Setup | ChefFlow' }

async function getWizardDone(tenantId: string): Promise<boolean> {
  const db: any = createServerClient()
  const { data } = await db.from('onboarding_progress').select('step_key').eq('chef_id', tenantId)

  if (!data || data.length === 0) return false
  const doneKeys = new Set(data.map((r: any) => r.step_key))
  return WIZARD_STEPS.every((s) => doneKeys.has(s.key))
}

export default async function OnboardingPage() {
  const user = await requireChef()
  const wizardDone = await getWizardDone(user.tenantId!).catch(() => false)

  if (!wizardDone) {
    return <OnboardingWizard />
  }

  const progress = await getOnboardingProgress()
  return <OnboardingHub progress={progress} />
}
