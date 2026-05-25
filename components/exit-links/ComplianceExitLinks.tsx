/**
 * Server component that fetches chef location/profile context
 * and renders government + professional-growth exit link panels
 * for compliance and protection settings pages.
 */

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { ExitLinkPanel } from './ExitLinkPanel'

async function getChefExitContext(): Promise<Record<string, string>> {
  const chef = await requireChef()
  const db: any = createServerClient()

  const { data: profile } = await db
    .from('chefs')
    .select('home_city, home_state, home_zip, home_address')
    .eq('id', chef.entityId)
    .single()

  // Also try chef_settings for lawyer/insurance portal if available
  const { data: settings } = await db
    .from('chef_settings')
    .select('*')
    .eq('chef_id', chef.entityId)
    .single()
    .catch(() => ({ data: null }))

  const str = (v: unknown) => (v ? String(v) : '')

  return {
    state: str(profile?.home_state),
    city: str(profile?.home_city),
    county: '', // not stored on chefs table; links requiring county will be skipped
    zip: str(profile?.home_zip),
    homeAddress: str(profile?.home_address),
    insurancePortalUrl: str(settings?.insurance_portal_url ?? settings?.insurance_url),
    lawyerPhone: str(settings?.lawyer_phone ?? settings?.attorney_phone),
    lawyerEmail: str(settings?.lawyer_email ?? settings?.attorney_email),
  }
}

/**
 * Government exit links (exits 61-67): food handler renewal, cottage food laws,
 * business license, insurance quote, health inspection, manage insurance, contact lawyer.
 */
export async function GovernmentExitLinks({ className }: { className?: string }) {
  const context = await getChefExitContext()

  return (
    <ExitLinkPanel
      category="government"
      context={context}
      title="Government & Legal Resources"
      maxVisible={7}
      className={className}
    />
  )
}

/**
 * Professional growth exit links (exit 84): ServSafe renewal + find courses.
 */
export async function ProfessionalGrowthExitLinks({ className }: { className?: string }) {
  const context = await getChefExitContext()

  return (
    <ExitLinkPanel
      category="professional-growth"
      context={context}
      title="Professional Growth"
      maxVisible={5}
      className={className}
    />
  )
}
