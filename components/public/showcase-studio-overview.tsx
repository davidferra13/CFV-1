import Link from 'next/link'

type ShowcaseStudioOverviewProps = {
  publicSlug: string | null
  hasTagline: boolean
  hasHeroImage: boolean
  visiblePartnerCount: number
  acceptingInquiries: boolean
}

const studioSteps = [
  {
    label: 'Identity',
    href: '/settings/my-profile',
    detail: 'Bio, photo, links, website, Google review URL',
  },
  {
    label: 'Services',
    href: '/settings/my-services',
    detail: 'Published service language, minimums, policies, and buyer expectations',
  },
  {
    label: 'Portfolio',
    href: '/portfolio',
    detail: 'Public-safe photos, collections, and event stories',
  },
  {
    label: 'Proof',
    href: '/settings/credentials',
    detail: 'Career history, awards, charity impact, and public credentials',
  },
  {
    label: 'Preview',
    href: '/settings/client-preview',
    detail: 'Inspect the public/client view before sending traffic',
  },
]

export function ShowcaseStudioOverview({
  publicSlug,
  hasTagline,
  hasHeroImage,
  visiblePartnerCount,
  acceptingInquiries,
}: ShowcaseStudioOverviewProps) {
  const readiness = [
    { label: 'Public URL', ready: Boolean(publicSlug) },
    { label: 'Tagline', ready: hasTagline },
    { label: 'Hero media', ready: hasHeroImage },
    { label: 'Inquiry path', ready: acceptingInquiries },
    { label: 'Partner proof', ready: visiblePartnerCount > 0 },
  ]
  const readyCount = readiness.filter((item) => item.ready).length

  return (
    <section className="rounded-2xl border border-stone-700 bg-stone-950/70 p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-300">
            Showcase Studio
          </p>
          <h2 className="mt-2 text-xl font-semibold text-stone-100">
            Public identity control surface
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-400">
            This page controls publishing, discovery settings, partner proof, and preview links. The
            surrounding editors manage the source content that appears on the public chef page.
          </p>
        </div>
        <div className="rounded-xl border border-stone-700 bg-stone-900 px-4 py-3 text-sm">
          <p className="font-semibold text-stone-100">
            {readyCount}/{readiness.length} ready
          </p>
          <p className="mt-1 text-xs text-stone-500">Public surface checklist</p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-5">
        {readiness.map((item) => (
          <div
            key={item.label}
            className="rounded-xl border border-stone-800 bg-stone-900/70 px-3 py-3"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">
              {item.label}
            </p>
            <p
              className={
                item.ready ? 'mt-2 text-sm text-emerald-300' : 'mt-2 text-sm text-amber-300'
              }
            >
              {item.ready ? 'Published' : 'Needs work'}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-5">
        {studioSteps.map((step) => (
          <Link
            key={step.label}
            href={step.href}
            className="rounded-xl border border-stone-800 bg-stone-900/60 p-4 transition-colors hover:border-stone-600 hover:bg-stone-900"
          >
            <p className="text-sm font-semibold text-stone-100">{step.label}</p>
            <p className="mt-2 text-xs leading-relaxed text-stone-500">{step.detail}</p>
          </Link>
        ))}
      </div>
    </section>
  )
}
