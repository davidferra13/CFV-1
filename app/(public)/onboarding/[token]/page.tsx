import { getOnboardingData } from '@/lib/clients/onboarding'
import { OnboardingForm } from '@/components/clients/onboarding-form'

export const metadata = { title: 'Welcome' }

export default async function OnboardingPage({ params }: { params: { token: string } }) {
  const data = await getOnboardingData(params.token)

  if (!data) {
    return (
      <div className="min-h-screen bg-stone-950 flex items-center justify-center p-4">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-bold text-stone-100 mb-2">Link Expired</h1>
          <p className="text-stone-400">
            This onboarding link is no longer valid. Please contact your chef for a new one.
          </p>
        </div>
      </div>
    )
  }

  if (data.alreadyCompleted) {
    return (
      <div className="min-h-screen bg-stone-950 flex items-center justify-center p-4">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-bold text-stone-100 mb-2">All Set!</h1>
          <p className="text-stone-400">
            Your preferences are saved. {data.chefName} will use them to customize every experience
            just for you.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-stone-950 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-stone-100">
            Welcome, {data.client.full_name.split(' ')[0]}!
          </h1>
          <p className="text-stone-400 mt-2">
            {data.chefName} wants to learn about your preferences to make every meal perfect. This
            takes about 3 minutes.
          </p>
        </div>

        <OnboardingForm token={params.token} client={data.client} chefName={data.chefName} />
      </div>
    </div>
  )
}
