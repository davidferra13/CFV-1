import { TrackedLink } from '@/components/analytics/tracked-link'
import type { PublicServicePackage } from '@/lib/showcase/public-read-model'

type Props = {
  packages: PublicServicePackage[]
  publicSlug: string
  primaryColor: string
}

export function PublicShowcasePackageCards({ packages, publicSlug, primaryColor }: Props) {
  if (packages.length === 0) return null

  return (
    <section id="packages" className="px-6 py-12 bg-stone-900/70">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-bold text-stone-100">Service Packages</h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-stone-300">
            Public package cards use published service and pricing signals only. Final fit,
            availability, and written terms are confirmed in inquiry.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {packages.map((pkg) => {
            const href = `/chef/${publicSlug}/inquire?package=${encodeURIComponent(pkg.id)}&package_label=${encodeURIComponent(pkg.title)}`

            return (
              <article
                key={pkg.id}
                className="flex h-full flex-col rounded-2xl border border-stone-700 bg-stone-950/80 p-5"
              >
                <div className="flex-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                    Public package
                  </p>
                  <h3 className="mt-3 text-xl font-semibold text-stone-100">{pkg.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-stone-300">{pkg.description}</p>
                  <p className="mt-4 text-sm font-semibold text-brand-300">{pkg.priceLabel}</p>

                  {pkg.inclusions.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {pkg.inclusions.slice(0, 6).map((item) => (
                        <span
                          key={item}
                          className="rounded-full border border-stone-700 bg-stone-900 px-2.5 py-1 text-xs text-stone-200"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  )}

                  {pkg.constraints.length > 0 && (
                    <ul className="mt-4 space-y-1 text-xs leading-relaxed text-stone-500">
                      {pkg.constraints.slice(0, 3).map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  )}
                </div>

                <TrackedLink
                  href={href}
                  analyticsName="public_showcase_package_inquiry"
                  analyticsProps={{ chef_slug: publicSlug, package_id: pkg.id }}
                  className="mt-5 inline-flex min-h-[44px] items-center justify-center rounded-xl px-4 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                  style={{ backgroundColor: primaryColor }}
                >
                  {pkg.inquiryLabel}
                </TrackedLink>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}
