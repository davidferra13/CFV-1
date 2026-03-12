import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getMarketplaceChefBySlug } from '@/lib/marketplace/chef-search-actions'
import { MarketplaceInquiryForm } from './inquiry-form'

type Props = {
  params: Promise<{ chefSlug: string }>
}

export async function generateMetadata({ params }: Props) {
  const { chefSlug } = await params
  const chef = await getMarketplaceChefBySlug(chefSlug)

  if (!chef) return { title: 'Chef Not Found' }

  return {
    title: `Send Inquiry to ${chef.displayName} | ChefFlow Marketplace`,
    description: `Request a private chef experience with ${chef.displayName}.`,
  }
}

export default async function MarketplaceInquirePage({ params }: Props) {
  const { chefSlug } = await params
  const chef = await getMarketplaceChefBySlug(chefSlug)

  if (!chef) notFound()

  if (!chef.acceptingInquiries) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-gray-900">Not Accepting Inquiries</h1>
        <p className="mt-2 text-gray-600">
          {chef.displayName} is not currently accepting new inquiries.
        </p>
        <Link
          href={`/marketplace/${chefSlug}`}
          className="mt-6 inline-flex items-center text-sm text-orange-600 hover:text-orange-700"
        >
          Back to profile
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Back link */}
      <Link
        href={`/marketplace/${chefSlug}`}
        className="mb-6 inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
      >
        ← Back to {chef.displayName}
      </Link>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
          Send an Inquiry to {chef.displayName}
        </h1>
        {chef.serviceAreaCity && (
          <p className="mt-1 text-sm text-gray-500">
            {chef.serviceAreaCity}
            {chef.serviceAreaState ? `, ${chef.serviceAreaState}` : ''}
          </p>
        )}
        <p className="mt-2 text-gray-600">
          Fill out the form below and {chef.displayName} will get back to you.
        </p>
      </div>

      <MarketplaceInquiryForm
        chefId={chef.chefId}
        chefName={chef.displayName}
        chefSlug={chefSlug}
        cuisineTypes={chef.cuisineTypes}
      />
    </div>
  )
}
