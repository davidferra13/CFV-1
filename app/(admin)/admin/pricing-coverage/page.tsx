import { Metadata } from 'next'
import { PricingCoverageClient } from './pricing-coverage-client'

export const metadata: Metadata = {
  title: 'Pricing Coverage | Admin',
}

export default function PricingCoveragePage() {
  return <PricingCoverageClient />
}
