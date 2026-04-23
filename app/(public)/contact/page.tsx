import dynamic from 'next/dynamic'
import Image from 'next/image'
import { Suspense } from 'react'
import { PublicPageView } from '@/components/analytics/public-page-view'
import { TrackedLink } from '@/components/analytics/tracked-link'
import { PublicSecondaryEntryCluster } from '@/components/public/public-secondary-entry-cluster'
import { PUBLIC_SECONDARY_ENTRY_CONFIG } from '@/lib/public/public-secondary-entry-config'
import { getBusinessHoursForChef } from '@/lib/communication/business-hours'
import { buildContactSupportInfo } from '@/lib/contact/public-support'
import { createServerClient } from '@/lib/db/server'
import { resolveOwnerIdentity } from '@/lib/platform/owner-account'
import { PUBLIC_REQUEST_ROUTING_COPY } from '@/lib/public/public-market-copy'
import { PUBLIC_MARKET_SCOPE, SUPPORT_EMAIL, getFounderProfile } from '@/lib/site/public-site'

export const revalidate = 60

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
  const [supportInfo, founder] = await Promise.all([getSupportInfo(), getFounderProfile()])

  return (
    <main>
      <PublicPageView
        pageName="contact"
        properties={{ section: 'public_growth', market_scope: PUBLIC_MARKET_SCOPE }}
      />
      {/* Page Header - server rendered */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-stone-100 mb-4">Get in Touch</h1>
          <p className="text-lg md:text-xl text-stone-300">
            Questions about booking, operator setup, or support expectations? The company details
            are explicit below.
          </p>
        </div>
      </section>

      {/* Contact Form and Info - lazy loaded */}
      <section className="container mx-auto px-4 pb-16 md:pb-24">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-stone-700/60 bg-stone-900/50 p-5">
              <div className="flex items-center gap-3">
                {founder.headshotUrl ? (
                  <Image
                    src={founder.headshotUrl}
                    alt={founder.fullName}
                    width={56}
                    height={56}
                    className="h-14 w-14 rounded-2xl object-cover ring-1 ring-stone-700"
                  />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-stone-800 text-lg font-semibold text-stone-300">
                    {founder.fullName.charAt(0)}
                  </div>
                )}
                <div>
                  <p className="text-sm font-semibold text-stone-100">{founder.fullName}</p>
                  <p className="text-xs uppercase tracking-wide text-brand-300">{founder.role}</p>
                </div>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-stone-400">
                Founder-led support and product decisions remain tied to live operator workflows.
              </p>
            </div>
            <div className="rounded-2xl border border-stone-700/60 bg-stone-900/50 p-5">
              <p className="text-xs uppercase tracking-wide text-stone-500">Company location</p>
              <p className="mt-2 text-sm font-semibold text-stone-100">{founder.location}</p>
              <p className="mt-3 text-sm leading-relaxed text-stone-400">
                {PUBLIC_REQUEST_ROUTING_COPY}
              </p>
            </div>
            <div className="rounded-2xl border border-stone-700/60 bg-stone-900/50 p-5">
              <p className="text-xs uppercase tracking-wide text-stone-500">Company contact</p>
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="mt-2 inline-flex text-sm font-semibold text-brand-400 transition-colors hover:text-brand-300"
              >
                {SUPPORT_EMAIL}
              </a>
              <p className="mt-3 text-sm leading-relaxed text-stone-400">
                Typical response target is one business day. For trust details, start with the
                public trust center.
              </p>
              <TrackedLink
                href="/trust"
                analyticsName="contact_trust_link"
                analyticsProps={{ section: 'contact_company_block' }}
                className="mt-4 inline-flex text-sm font-medium text-stone-200 underline decoration-stone-600 underline-offset-4 hover:text-white"
              >
                Review trust center
              </TrackedLink>
            </div>
          </div>
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
