import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PublicInquiryForm } from '@/components/public/public-inquiry-form'
import { getPublicChefProfile } from '@/lib/profile/actions'
import { getReferralLandingContext } from '@/lib/referrals/actions'

type Props = {
  params: { chefSlug: string }
  searchParams?: { ref?: string }
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
  const profile = await getPublicChefProfile(params.chefSlug)
  if (!profile) return { title: 'Referral Booking - ChefFlow' }

  return {
    title: `Book ${profile.chef.display_name}`,
    description: `Start a referral booking inquiry with ${profile.chef.display_name}.`,
  }
}

export default async function ReferralPage({ params, searchParams }: Props) {
  const profile = await getPublicChefProfile(params.chefSlug)
  if (!profile) notFound()

  const referralCode = typeof searchParams?.ref === 'string' ? searchParams.ref : null
  const referralContext = await getReferralLandingContext(profile.chef.id, referralCode)
  const { primaryColor, pageBackgroundStyle } = buildBackgroundStyle(profile)

  return (
    <div className="min-h-screen" style={pageBackgroundStyle}>
      <section className="container mx-auto px-4 py-12 md:py-16">
        <div className="mx-auto max-w-2xl space-y-6">
          <Card className="border-stone-700 bg-stone-900/90">
            <CardHeader>
              <CardTitle className="text-stone-100">
                {referralContext.isValid && referralContext.referrerName
                  ? `Referred by ${referralContext.referrerName}`
                  : `Book ${profile.chef.display_name}`}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-stone-300">
              <p>
                {referralContext.isValid
                  ? `${referralContext.referrerName} sent you here. Tell us about the dinner you want and the referral will be attached automatically.`
                  : `Tell ${profile.chef.display_name} about your event and they will follow up with next steps.`}
              </p>
              {!referralContext.isValid && referralCode && (
                <p className="rounded-lg border border-amber-800 bg-amber-950/60 px-3 py-2 text-amber-400">
                  This referral code is no longer valid, but you can still submit an inquiry.
                </p>
              )}
            </CardContent>
          </Card>

          <PublicInquiryForm
            chefSlug={params.chefSlug}
            chefName={profile.chef.display_name}
            primaryColor={primaryColor}
            campaignSource={referralContext.isValid ? 'referral_qr' : 'public_profile'}
            referralCode={referralContext.isValid ? referralContext.referralCode || undefined : undefined}
            formTitle="Start your booking inquiry"
            formDescription={
              referralContext.isValid
                ? 'Share the event basics and we will keep the referral attached.'
                : "Share the basics and we'll follow up."
            }
            prefillNotice={
              referralContext.isValid && referralContext.referrerName
                ? `Referral credited to ${referralContext.referrerName}.`
                : null
            }
            submitLabel="Send inquiry"
          />
        </div>
      </section>
    </div>
  )
}
