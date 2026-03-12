import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { getMarketplaceChefBySlug } from '@/lib/marketplace/chef-search-actions'

type Props = {
  params: Promise<{ chefSlug: string }>
}

export async function generateMetadata({ params }: Props) {
  const { chefSlug } = await params
  const chef = await getMarketplaceChefBySlug(chefSlug)

  if (!chef) return { title: 'Chef Not Found' }

  return {
    title: `${chef.displayName} | ChefFlow Marketplace`,
    description: chef.tagline || `Book ${chef.displayName} for your next private chef experience.`,
  }
}

export default async function ChefProfilePage({ params }: Props) {
  const { chefSlug } = await params
  const chef = await getMarketplaceChefBySlug(chefSlug)

  if (!chef) notFound()

  const imageUrl = chef.heroImageUrl || chef.profileImageUrl

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Back link */}
      <Link
        href="/marketplace"
        className="mb-6 inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
      >
        ← Back to marketplace
      </Link>

      {/* Hero section */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        {imageUrl && (
          <div className="relative h-64 w-full sm:h-80">
            <Image
              src={imageUrl}
              alt={chef.displayName}
              fill
              className="object-cover"
              sizes="(max-width: 896px) 100vw, 896px"
              priority
            />
          </div>
        )}

        <div className="p-6 sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">{chef.displayName}</h1>
              {chef.businessName && chef.businessName !== chef.displayName && (
                <p className="mt-1 text-lg text-gray-500">{chef.businessName}</p>
              )}
              {chef.serviceAreaCity && (
                <p className="mt-1 text-sm text-gray-500">
                  {chef.serviceAreaCity}
                  {chef.serviceAreaState ? `, ${chef.serviceAreaState}` : ''}
                </p>
              )}
            </div>

            <div className="flex flex-col items-end gap-2">
              {chef.reviewCount > 0 && (
                <div className="flex items-center gap-1">
                  <span className="text-lg text-yellow-500">★</span>
                  <span className="text-lg font-semibold">{chef.avgRating.toFixed(1)}</span>
                  <span className="text-sm text-gray-400">
                    ({chef.reviewCount} review{chef.reviewCount !== 1 ? 's' : ''})
                  </span>
                </div>
              )}

              {chef.acceptingInquiries && (
                <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700">
                  Accepting inquiries
                </span>
              )}
            </div>
          </div>

          {/* Tagline / highlight */}
          {(chef.tagline || chef.highlightText) && (
            <p className="mt-4 text-gray-700">{chef.highlightText || chef.tagline}</p>
          )}

          {/* Cuisine tags */}
          {chef.cuisineTypes.length > 0 && (
            <div className="mt-6">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                Cuisine
              </h2>
              <div className="mt-2 flex flex-wrap gap-2">
                {chef.cuisineTypes.map((cuisine) => (
                  <span
                    key={cuisine}
                    className="rounded-full bg-orange-50 px-3 py-1 text-sm font-medium text-orange-700"
                  >
                    {cuisine}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Service types */}
          {chef.serviceTypes.length > 0 && (
            <div className="mt-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                Services
              </h2>
              <div className="mt-2 flex flex-wrap gap-2">
                {chef.serviceTypes.map((service) => (
                  <span
                    key={service}
                    className="rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700"
                  >
                    {service}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Details grid */}
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {chef.priceRange && <DetailCard label="Price Range" value={chef.priceRange} />}
            {(chef.minGuestCount || chef.maxGuestCount) && (
              <DetailCard
                label="Guest Count"
                value={
                  chef.minGuestCount && chef.maxGuestCount
                    ? `${chef.minGuestCount} - ${chef.maxGuestCount}`
                    : chef.maxGuestCount
                      ? `Up to ${chef.maxGuestCount}`
                      : `${chef.minGuestCount}+`
                }
              />
            )}
            {chef.nextAvailableDate && (
              <DetailCard
                label="Next Available"
                value={new Date(chef.nextAvailableDate).toLocaleDateString()}
              />
            )}
          </div>

          {/* CTA */}
          {chef.acceptingInquiries && chef.slug && (
            <div className="mt-8">
              <Link
                href={`/book/${chef.slug}`}
                className="inline-flex items-center rounded-lg bg-orange-600 px-6 py-3 text-base font-medium text-white shadow-sm hover:bg-orange-700"
              >
                Send Inquiry
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function DetailCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-gray-50 p-3">
      <p className="text-xs font-medium uppercase text-gray-500">{label}</p>
      <p className="mt-1 text-sm font-semibold capitalize text-gray-900">{value}</p>
    </div>
  )
}
