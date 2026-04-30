import type { Metadata } from 'next'
import { InstallGuideClient } from '@/components/pwa/install-guide-client'
import { buildMarketingMetadata } from '@/lib/site/public-site'

const installMetadata = buildMarketingMetadata({
  title: 'Install ChefFlow',
  description:
    'Install ChefFlow from your browser for app-style access, offline capture, push-ready workflows, and faster launch from your phone or desktop.',
  path: '/install',
  imagePath: '/social/chefflow-home.png',
  imageAlt: 'ChefFlow install page preview',
})

export const metadata: Metadata = {
  ...installMetadata,
  robots: {
    index: true,
    follow: true,
  },
}

export default function InstallPage() {
  return (
    <main id="main-content" className="min-h-screen bg-stone-950 text-stone-100">
      <InstallGuideClient />
    </main>
  )
}
