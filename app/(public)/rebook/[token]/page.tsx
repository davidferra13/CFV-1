import Link from 'next/link'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PublicInquiryForm } from '@/components/public/public-inquiry-form'
import { getPublicChefProfile } from '@/lib/profile/actions'
import { getRebookLandingData } from '@/lib/rebook/actions'

type Props = {
  params: { token: string }
}

function buildBackgroundStyle(profile: Awaited<ReturnType<typeof getPublicChefProfile>>) {
  const primaryColor = profile?.chef.portal_primary_color || '#1c1917'
  const backgroundColor = profile?.chef.portal_background_color || '#fafaf9'
  const backgroundImageUrl = profile?.chef.portal_background_image_url

  return {
    primaryColor,
    pageBackgroundStyle: backgroundImageUrl
      ? {
          backgroundColor,
          backgroundImage: `linear-gradient(to bottom, rgba(255,255,255,0.82), rgba(255,255,255,0.94)), url(${backgroundImageUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed' as const,
        }
      : { backgroundColor },
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = await getRebookLandingData(params.token)
  if (data.state === 'invalid') {
    return { title: 'Rebook - ChefFlow' }
  }

  return {
    title:
      data.state === 'ready'
        ? `Book Again with ${data.chefName}`
        : `Rebook Link Unavailable - ${data.chefName}`,
    description:
      data.state === 'ready'
        ? `Book another experience with ${data.chefName}.`
        : `This rebook link is no longer available.`,
  }
}

export default async function RebookPage({ params }: Props) {
  const data = await getRebookLandingData(params.token)
  if (data.state === 'invalid') notFound()

  const profile = data.chefSlug ? await getPublicChefProfile(data.chefSlug) : null
  const { primaryColor, pageBackgroundStyle } = buildBackgroundStyle(profile)

  if (data.state !== 'ready') {
    return (
      <div className="min-h-screen" style={pageBackgroundStyle}>
        <section className="container mx-auto px-4 py-16">
          <div className="mx-auto max-w-xl">
            <Card className="bg-stone-900/90">
              <CardHeader>
                <CardTitle className="text-stone-100">This rebook link is unavailable</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-stone-400">
                <p>
                  {data.state === 'used'
                    ? 'This link was already used to submit a new inquiry.'
                    : 'This link has expired.'}
                </p>
                {data.chefSlug && (
                  <Link
                    href={`/chef/${data.chefSlug}/inquire`}
                    className="inline-flex rounded-lg px-4 py-2 font-medium text-white"
                    style={{ backgroundColor: primaryColor }}
                  >
                    Start a new inquiry
                  </Link>
                )}
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    )
  }

  const rememberedDietary =
    data.initialValues.allergies_food_restrictions?.trim() || 'No saved dietary notes'
  const guestCountLabel = data.initialValues.guest_count
    ? `${data.initialValues.guest_count} guests`
    : 'Guest count not saved'

  return (
    <div className="min-h-screen" style={pageBackgroundStyle}>
      <section className="container mx-auto px-4 py-12 md:py-16">
        <div className="mx-auto max-w-2xl space-y-6">
          <Card className="border-stone-700 bg-stone-900/90">
            <CardHeader>
              <CardTitle className="text-stone-100">Book again with {data.chefName}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-stone-300">
              <p>
                We saved the basics from your last event so you can start the next inquiry faster.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-stone-700 bg-stone-950/60 p-3">
                  <p className="text-xs uppercase tracking-wide text-stone-500">Last event</p>
                  <p className="mt-1 font-medium text-stone-100">{data.eventTitle}</p>
                  <p className="mt-1 text-stone-400">
                    {new Date(`${data.eventDate}T00:00:00`).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                </div>
                <div className="rounded-lg border border-stone-700 bg-stone-950/60 p-3">
                  <p className="text-xs uppercase tracking-wide text-stone-500">Remembered</p>
                  <p className="mt-1 font-medium text-stone-100">{guestCountLabel}</p>
                  <p className="mt-1 text-stone-400">{rememberedDietary}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <PublicInquiryForm
            chefSlug={data.chefSlug || ''}
            chefName={data.chefName}
            primaryColor={primaryColor}
            initialValues={data.initialValues}
            campaignSource="rebook_qr"
            rebookToken={params.token}
            formTitle="Book your next dinner"
            formDescription="Pick a new date, adjust anything that changed, and send it through."
            successTitle="Rebook request sent"
            successDescription={`${data.chefName} has your returning-client request and will follow up shortly.`}
            prefillNotice="Your previous event details were loaded into this form."
            submitLabel="Send rebook request"
          />
        </div>
      </section>
    </div>
  )
}
