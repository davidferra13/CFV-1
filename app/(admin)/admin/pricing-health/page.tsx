import { requireAdmin } from '@/lib/auth/admin'
import { isFounderEmail } from '@/lib/platform/owner-account'
import { notFound } from 'next/navigation'
import { getPricingEngineCoverage } from '@/lib/pricing/region-coverage-actions'
import { PricingHealthDashboard } from './pricing-health-dashboard'

export const metadata = {
  title: 'Pricing Engine Health | Admin',
}

export default async function PricingHealthPage() {
  const admin = await requireAdmin()
  if (!isFounderEmail(admin.email)) {
    notFound()
  }

  const coverage = await getPricingEngineCoverage()

  return <PricingHealthDashboard data={coverage} />
}
