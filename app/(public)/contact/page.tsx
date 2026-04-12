import type { Metadata } from 'next'
import dynamic from 'next/dynamic'
import { Suspense } from 'react'
import { PublicSecondaryEntryCluster } from '@/components/public/public-secondary-entry-cluster'
import { PUBLIC_SECONDARY_ENTRY_CONFIG } from '@/lib/public/public-secondary-entry-config'
import { getBusinessHoursForChef } from '@/lib/communication/business-hours'
import { buildContactSupportInfo } from '@/lib/contact/public-support'
import { createServerClient } from '@/lib/db/server'
import { resolveOwnerIdentity } from '@/lib/platform/owner-account'

export const revalidate = 60

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://cheflowhq.com'
const SUPPORT_EMAIL = 'support@cheflowhq.com'

export const metadata: Metadata = {
  title: 'Contact Us',
  description: 'Have questions about ChefFlow? Get in touch with our team.',
  openGraph: {
    title: 'Contact Us',
    description: 'Have questions about ChefFlow? Get in touch with our team.',
    url: `${BASE_URL}/contact`,
    siteName: 'ChefFlow',
    type: 'website',
  },
  alternates: {
    canonical: `${BASE_URL}/contact`,
  },
}

const ContactForm = dynamic(() => import('./_components/contact-form'), {
  loading: () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
      <div className="lg:col-span-2">
        <div className="border border-stone-700/60 rounded-lg p-6 space-y-6">
          <div className="h-6 w-48 loading-bone" />
          {[1, 2, 3, 4].map((i) => (
            <div key={i}>
              <div className="h-4 w-20 bg-stone-800 rounded animate-pulse mb-2" />
              <div className="h-10 bg-stone-800 rounded animate-pulse" />
            </div>
          ))}
          <div className="h-12 bg-stone-800 rounded animate-pulse" />
        </div>
      </div>
      <div className="lg:col-span-1">
        <div className="border border-stone-700/60 rounded-lg p-6">
          <div className="h-6 w-40 loading-bone mb-6" />
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-10 h-10 bg-stone-800 rounded-lg animate-pulse flex-shrink-0" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 w-24 loading-bone" />
                  <div className="h-3 w-full bg-stone-800 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  ),
})

async function getSupportInfo() {
  try {
    const db = createServerClient({ admin: true })
    const ownerIdentity = await resolveOwnerIdentity(db)
    const businessHours = ownerIdentity.ownerChefId
      ? await getBusinessHoursForChef(ownerIdentity.ownerChefId)
      : null

    return buildContactSupportInfo({
      supportEmail: SUPPORT_EMAIL,
      businessHoursConfig: businessHours,
    })
  } catch (err) {
    console.error('[contact/page] Failed to load support info:', err)
    return buildContactSupportInfo({ supportEmail: SUPPORT_EMAIL })
  }
}

export default async function ContactPage() {
  const supportInfo = await getSupportInfo()

  return (
    <main>
      {/* Page Header - server rendered */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-stone-100 mb-4">Get in Touch</h1>
          <p className="text-lg md:text-xl text-stone-300">
            Have questions? We&apos;re here to help.
          </p>
        </div>
      </section>

      {/* Contact Form and Info - lazy loaded */}
      <section className="container mx-auto px-4 pb-16 md:pb-24">
        <div className="max-w-4xl mx-auto">
          <Suspense>
            <ContactForm supportInfo={supportInfo} />
          </Suspense>
          <PublicSecondaryEntryCluster
            links={PUBLIC_SECONDARY_ENTRY_CONFIG.contact}
            heading="Ready to move forward?"
            theme="dark"
          />
        </div>
      </section>
    </main>
  )
}
